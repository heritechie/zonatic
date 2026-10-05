"""Tests for GET /v1/areas/{code}."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.dependencies import TEST_API_KEY
from apps.api.main import app
from tests.conftest import _apply_migration, _seed_test_api_key, DEV_KEY_HASH

client = TestClient(app)

AREAS_SQL = """
INSERT INTO administrative_areas (code, name, level, parent_code, metadata) VALUES
    ('31', 'DKI Jakarta', 1, NULL, '{"source":"test"}'),
    ('3171', 'Jakarta Pusat', 2, '31', '{"source":"test"}'),
    ('317101', 'Tanah Abang', 3, '3171', '{"source":"test"}'),
    ('3171011001', 'Gelora', 4, '317101', '{"source":"test"}'),
    ('3171011002', 'Karet', 4, '317101', '{"source":"test"}'),
    ('3172', 'Jakarta Selatan', 2, '31', '{"source":"test"}'),
    ('32', 'Jawa Barat', 1, NULL, '{"source":"test"}'),
    ('3273', 'Kota Bandung', 2, '32', '{"source":"test"}'),
    ('327301', 'Bandung Wetan', 3, '3273', '{"source":"test"}'),
    ('3273011001', 'Cihapit', 4, '327301', '{"source":"test"}')
ON CONFLICT (code) DO NOTHING
"""


def _reset():
    with SessionLocal() as db:
        db.execute(text("DELETE FROM administrative_areas"))
        db.execute(text(AREAS_SQL))
        db.commit()


def _auth(key: str = TEST_API_KEY) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


@pytest.fixture(autouse=True)
def _setup(_apply_migration, _seed_test_api_key):
    _reset()


# ---------------------------------------------------------------------------
# Lookup by level
# ---------------------------------------------------------------------------


class TestLookupByLevel:
    def test_province(self):
        resp = client.get("/v1/areas/31", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert body["code"] == "31"
        assert body["name"] == "DKI Jakarta"
        assert body["level"] == "province"

    def test_regency(self):
        resp = client.get("/v1/areas/3171", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert body["code"] == "3171"
        assert body["name"] == "Jakarta Pusat"
        assert body["level"] == "regency"

    def test_district(self):
        resp = client.get("/v1/areas/317101", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert body["code"] == "317101"
        assert body["name"] == "Tanah Abang"
        assert body["level"] == "district"

    def test_village(self):
        resp = client.get("/v1/areas/3171011001", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert body["code"] == "3171011001"
        assert body["name"] == "Gelora"
        assert body["level"] == "village"


# ---------------------------------------------------------------------------
# Hierarchy
# ---------------------------------------------------------------------------


class TestHierarchy:
    """`hierarchy` is a dict (province/regency/district/village) keyed by level
    name, containing the matching area itself and all of its ancestors.
    """

    def test_province_has_self(self):
        resp = client.get("/v1/areas/31", headers=_auth())
        body = resp.json()["data"]
        h = body["hierarchy"]
        assert set(h.keys()) == {"province"}
        assert h["province"]["code"] == "31"
        assert h["province"]["name"] == "DKI Jakarta"
        assert body["level"] == "province"

    def test_regency_has_province_then_self(self):
        resp = client.get("/v1/areas/3171", headers=_auth())
        body = resp.json()["data"]
        h = body["hierarchy"]
        assert set(h.keys()) == {"province", "regency"}
        assert h["province"]["code"] == "31"
        assert h["regency"]["code"] == "3171"
        assert body["level"] == "regency"

    def test_district_three_levels(self):
        resp = client.get("/v1/areas/317101", headers=_auth())
        body = resp.json()["data"]
        h = body["hierarchy"]
        assert set(h.keys()) == {"province", "regency", "district"}
        assert [h[k]["code"] for k in ("province", "regency", "district")] == [
            "31",
            "3171",
            "317101",
        ]
        assert body["level"] == "district"

    def test_village_four_levels(self):
        resp = client.get("/v1/areas/3171011001", headers=_auth())
        body = resp.json()["data"]
        h = body["hierarchy"]
        assert set(h.keys()) == {"province", "regency", "district", "village"}
        assert [h[k]["code"] for k in ("province", "regency", "district", "village")] == [
            "31",
            "3171",
            "317101",
            "3171011001",
        ]
        assert body["level"] == "village"

    def test_no_null_hierarchy_levels(self):
        # Each hierarchy key must carry a concrete code/name pair; empty
        # entries must not be emitted.
        resp = client.get("/v1/areas/317101", headers=_auth())
        h = resp.json()["data"]["hierarchy"]
        for key, node in h.items():
            assert node["code"], f"empty code for {key}"
            assert node["name"], f"empty name for {key}"

    def test_hierarchy_includes_self_for_each_level(self):
        for code, level in [
            ("31", "province"),
            ("3171", "regency"),
            ("317101", "district"),
            ("3171011001", "village"),
        ]:
            resp = client.get(f"/v1/areas/{code}", headers=_auth())
            h = resp.json()["data"]["hierarchy"]
            assert h[level]["code"] == code


# ---------------------------------------------------------------------------
# Canonical code preservation
# ---------------------------------------------------------------------------


class TestCanonicalCode:
    def test_response_code_matches_request(self):
        resp = client.get("/v1/areas/3171011002", headers=_auth())
        assert resp.json()["data"]["code"] == "3171011002"

    def test_dot_separated_code_not_found(self):
        resp = client.get("/v1/areas/31.71", headers=_auth())
        assert resp.status_code == 404

    def test_sister_village_same_parent(self):
        resp = client.get("/v1/areas/3171011002", headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["data"]["name"] == "Karet"


# ---------------------------------------------------------------------------
# Not found
# ---------------------------------------------------------------------------


class TestNotFound:
    def test_unknown_code(self):
        resp = client.get("/v1/areas/999999", headers=_auth())
        assert resp.status_code == 404
        body = resp.json()
        assert body["error"]["code"] == "AREA_NOT_FOUND"

    def test_empty_string_code(self):
        # `/v1/areas/` normalises to `/v1/areas`, which now requires `q`, so the
        # rejection is a validation error rather than a route miss.
        resp = client.get("/v1/areas/", headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_non_numeric_code(self):
        resp = client.get("/v1/areas/abcdef", headers=_auth())
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


class TestAuthentication:
    def test_missing_api_key(self):
        resp = client.get("/v1/areas/31")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key(self):
        resp = client.get("/v1/areas/31", headers={"Authorization": "Bearer bad_key"})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_malformed_header(self):
        resp = client.get("/v1/areas/31", headers={"Authorization": "Token abc"})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_revoked_api_key(self):
        with SessionLocal() as db:
            db.execute(
                text("UPDATE api_keys SET revoked_at = now() WHERE key_hash = :h"),
                {"h": DEV_KEY_HASH},
            )
            db.commit()
        try:
            resp = client.get("/v1/areas/31", headers=_auth())
            assert resp.status_code == 403
            assert resp.json()["error"]["code"] == "API_KEY_REVOKED"
        finally:
            with SessionLocal() as db:
                db.execute(
                    text("UPDATE api_keys SET revoked_at = NULL WHERE key_hash = :h"),
                    {"h": DEV_KEY_HASH},
                )
                db.commit()


# ---------------------------------------------------------------------------
# Response structure
# ---------------------------------------------------------------------------


class TestResponseStructure:
    def test_top_level_has_data_key(self):
        resp = client.get("/v1/areas/31", headers=_auth())
        assert "data" in resp.json()

    def test_data_has_required_fields(self):
        resp = client.get("/v1/areas/31", headers=_auth())
        data = resp.json()["data"]
        assert "code" in data
        assert "name" in data
        assert "level" in data
        assert "hierarchy" in data

    def test_hierarchy_items_have_required_fields(self):
        resp = client.get("/v1/areas/3171011001", headers=_auth())
        h = resp.json()["data"]["hierarchy"]
        for level, item in h.items():
            assert "code" in item
            assert "name" in item

    def test_hierarchy_level_is_string(self):
        resp = client.get("/v1/areas/3171011001", headers=_auth())
        h = resp.json()["data"]["hierarchy"]
        for key, node in h.items():
            assert isinstance(node["code"], str)
            assert isinstance(node["name"], str)

    def test_error_response_structure(self):
        resp = client.get("/v1/areas/999999", headers=_auth())
        body = resp.json()
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_area(code: str) -> dict | None:
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT code, parent_code FROM administrative_areas WHERE code = :c"),
            {"c": code},
        ).mappings().first()
        return dict(row) if row else None
