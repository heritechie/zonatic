import uuid
import hashlib

import pytest
from fastapi import Depends, FastAPI
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.dependencies import get_current_tenant
from apps.api.exceptions import ZonaticException
from apps.api.main import zonatic_exception_handler
from fastapi.testclient import TestClient

DEV_KEY = "zn_test_devkey1234"
DEV_KEY_HASH = hashlib.sha256(DEV_KEY.encode()).hexdigest()

_test_app = FastAPI()
_test_app.add_exception_handler(ZonaticException, zonatic_exception_handler)


@_test_app.get("/protected")
def _protected(tenant_id: uuid.UUID = Depends(get_current_tenant)) -> dict:
    return {"tenant_id": tenant_id}


client = TestClient(_test_app)


def _reset_areas():
    with SessionLocal() as db:
        db.execute(text("DELETE FROM administrative_areas"))
        db.execute(
            text(
                """
                INSERT INTO administrative_areas (code, name, level, parent_code, metadata) VALUES
                ('31', 'DKI Jakarta', 1, NULL, '{"source":"test"}'),
                ('3171', 'Jakarta Pusat', 2, '31', '{"source":"test"}')
                """
            )
        )
        db.commit()


@pytest.fixture(autouse=True)
def _setup(_apply_migration, _seed_test_api_key):
    _reset_areas()


def _auth_header(key: str = DEV_KEY) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def test_valid_api_key():
    resp = client.get("/protected", headers=_auth_header())
    assert resp.status_code == 200
    tenant = resp.json()["tenant_id"]; assert isinstance(tenant, str)


def test_invalid_api_key():
    resp = client.get("/protected", headers={"Authorization": "Bearer invalid_key_abc"})
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "INVALID_API_KEY"


def test_missing_authorization_header():
    resp = client.get("/protected")
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "INVALID_API_KEY"


def test_malformed_authorization_header():
    resp = client.get("/protected", headers={"Authorization": "Token abc123"})
    assert resp.status_code == 401
    body = resp.json()
    assert body["error"]["code"] == "INVALID_API_KEY"


def test_revoked_api_key():
    with SessionLocal() as db:
        db.execute(
            text("UPDATE api_keys SET revoked_at = now() WHERE key_hash = :h"),
            {"h": DEV_KEY_HASH},
        )
        db.commit()

    try:
        resp = client.get("/protected", headers=_auth_header())
        assert resp.status_code == 403
        body = resp.json()
        assert body["error"]["code"] == "API_KEY_REVOKED"
    finally:
        with SessionLocal() as db:
            db.execute(
                text("UPDATE api_keys SET revoked_at = NULL WHERE key_hash = :h"),
                {"h": DEV_KEY_HASH},
            )
            db.commit()


def test_error_response_structure():
    resp = client.get("/protected", headers={"Authorization": "Bearer bad"})
    assert resp.status_code == 401
    body = resp.json()
    assert "error" in body
    assert "code" in body["error"]
    assert "message" in body["error"]
    assert isinstance(body["error"]["code"], str)
    assert isinstance(body["error"]["message"], str)
