import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.main import app

client = TestClient(app)

# Test API key from conftest.py
DEV_KEY = "zn_test_devkey1234"

REVOKED_KEY = "zn_test_postal_revoked_key_7777"


@pytest.fixture(scope="module")
def setup_test_postal_code():
    """Set up a test postal code linked to an area, for authentication tests."""
    with SessionLocal() as db:
        db.execute(
            text(
                """
                INSERT INTO postal_codes (code, metadata)
                VALUES ('12345', '{"source":"test","status":"OFFICIAL"}')
                ON CONFLICT (code) DO NOTHING
                """
            )
        )

        # Link to the level 1 province area.
        db.execute(
            text(
                """
                INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
                SELECT pc.id, aa.id
                FROM postal_codes pc
                CROSS JOIN administrative_areas aa
                WHERE pc.code = '12345' AND aa.code = '31'
                ON CONFLICT DO NOTHING
                """
            )
        )
        db.commit()
    yield
    with SessionLocal() as db:
        db.execute(
            text(
                "DELETE FROM postal_code_areas WHERE postal_code_id IN "
                "(SELECT id FROM postal_codes WHERE code = '12345')"
            )
        )
        db.execute(text("DELETE FROM postal_codes WHERE code = '12345'"))
        db.commit()


@pytest.fixture
def revoked_key():
    """Insert a revoked key for this module, then remove it."""
    key_hash = hashlib.sha256(REVOKED_KEY.encode()).hexdigest()
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.execute(text("DELETE FROM tenants WHERE name = 'Postal Revoked Test'"))
        db.execute(
            text(
                "INSERT INTO tenants (name) "
                "SELECT 'Postal Revoked Test' WHERE NOT EXISTS "
                "(SELECT 1 FROM tenants WHERE name = 'Postal Revoked Test')"
            )
        )
        db.execute(
            text(
                "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, revoked_at) "
                "SELECT id, 'Postal revoked key', 'zn_postal_rev', :h, now() "
                "FROM tenants WHERE name = 'Postal Revoked Test' LIMIT 1"
            ),
            {"h": key_hash},
        )
        db.commit()
    yield REVOKED_KEY
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.execute(text("DELETE FROM tenants WHERE name = 'Postal Revoked Test'"))
        db.commit()


class TestPostalCodeLookupAuth:
    """Test authentication for GET /v1/postal-codes/{code}"""

    def test_valid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": f"Bearer {DEV_KEY}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert set(data) == {"data"}
        assert data["data"]["code"] == "12345"
        assert isinstance(data["data"]["areas"], list)

    def test_missing_api_key(self, setup_test_postal_code):
        response = client.get("/v1/postal-codes/12345")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": "Bearer invalid_key_12345"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_API_KEY"

    def test_revoked_api_key(self, setup_test_postal_code, revoked_key):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": f"Bearer {revoked_key}"},
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "API_KEY_REVOKED"

    def test_malformed_authorization_header(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/12345",
            headers={"Authorization": "BadFormat token"},
        )
        assert response.status_code == 401

    def test_unknown_postal_code(self):
        response = client.get(
            "/v1/postal-codes/99999",
            headers={"Authorization": f"Bearer {DEV_KEY}"},
        )
        assert response.status_code == 404
        error = response.json()["error"]
        assert error["code"] == "POSTAL_CODE_NOT_FOUND"
        assert "message" in error


class TestPostalCodeSearchAuth:
    """Test authentication for GET /v1/postal-codes/search"""

    def test_valid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/postal-codes/search?q=123",
            headers={"Authorization": f"Bearer {DEV_KEY}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert set(data) == {"data", "meta"}
        assert isinstance(data["data"], list)
        assert data["meta"]["count"] == 1

    def test_missing_api_key(self):
        response = client.get("/v1/postal-codes/search?q=123")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self):
        response = client.get(
            "/v1/postal-codes/search?q=123",
            headers={"Authorization": "Bearer invalid_key_12345"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_API_KEY"

    def test_revoked_api_key(self, revoked_key):
        response = client.get(
            "/v1/postal-codes/search?q=123",
            headers={"Authorization": f"Bearer {revoked_key}"},
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "API_KEY_REVOKED"


class TestAreaPostalCodesAuth:
    """Test authentication for GET /v1/areas/{code}/postal-codes"""

    def test_valid_api_key(self, setup_test_postal_code):
        response = client.get(
            "/v1/areas/31/postal-codes",
            headers={"Authorization": f"Bearer {DEV_KEY}"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "code" in data
        assert "postal_codes" in data
        assert "12345" in data["postal_codes"]

    def test_missing_api_key(self):
        response = client.get("/v1/areas/31/postal-codes")
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self):
        response = client.get(
            "/v1/areas/31/postal-codes",
            headers={"Authorization": "Bearer invalid_key_12345"},
        )
        assert response.status_code == 401
        assert response.json()["error"]["code"] == "INVALID_API_KEY"

    def test_revoked_api_key(self, revoked_key):
        response = client.get(
            "/v1/areas/31/postal-codes",
            headers={"Authorization": f"Bearer {revoked_key}"},
        )
        assert response.status_code == 403
        assert response.json()["error"]["code"] == "API_KEY_REVOKED"

    def test_unknown_area(self):
        response = client.get(
            "/v1/areas/99999999/postal-codes",
            headers={"Authorization": f"Bearer {DEV_KEY}"},
        )
        assert response.status_code == 404
        error = response.json()["error"]
        assert error["code"] == "AREA_NOT_FOUND"
        assert "message" in error
