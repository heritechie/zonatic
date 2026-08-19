"""Tests for GET /v1/areas/search."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import SessionLocal
from app.dependencies import TEST_API_KEY
from app.main import app
from tests.conftest import _apply_migration, _seed_test_api_key

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
# Basic search
# ---------------------------------------------------------------------------


class TestBasicSearch:
    def test_finds_match(self):
        resp = client.get("/v1/areas/search", params={"q": "Tanah"}, headers=_auth())
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) >= 1
        assert any(d["code"] == "317101" for d in data)

    def test_returns_code_name_level_breadcrumb(self):
        resp = client.get("/v1/areas/search", params={"q": "Gelora"}, headers=_auth())
        item = resp.json()["data"][0]
        assert "code" in item
        assert "name" in item
        assert "level" in item
        assert "breadcrumb" in item

    def test_single_result(self):
        resp = client.get("/v1/areas/search", params={"q": "Gelora"}, headers=_auth())
        assert len(resp.json()["data"]) == 1


# ---------------------------------------------------------------------------
# Case-insensitive
# ---------------------------------------------------------------------------


class TestCaseInsensitive:
    def test_uppercase(self):
        resp = client.get("/v1/areas/search", params={"q": "TANAH"}, headers=_auth())
        assert resp.status_code == 200
        assert any(d["code"] == "317101" for d in resp.json()["data"])

    def test_mixed_case(self):
        resp = client.get("/v1/areas/search", params={"q": "tAnAh"}, headers=_auth())
        assert resp.status_code == 200
        assert any(d["code"] == "317101" for d in resp.json()["data"])


# ---------------------------------------------------------------------------
# Prefix matching
# ---------------------------------------------------------------------------


class TestPrefixMatching:
    def test_prefix_matches(self):
        resp = client.get("/v1/areas/search", params={"q": "Jak"}, headers=_auth())
        codes = [d["code"] for d in resp.json()["data"]]
        assert "31" in codes or "3171" in codes or "3172" in codes

    def test_full_name_matches(self):
        resp = client.get("/v1/areas/search", params={"q": "DKI Jakarta"}, headers=_auth())
        assert any(d["code"] == "31" for d in resp.json()["data"])

    def test_no_middle_match(self):
        resp = client.get("/v1/areas/search", params={"q": "Abang"}, headers=_auth())
        codes = [d["code"] for d in resp.json()["data"]]
        assert "317101" not in codes


# ---------------------------------------------------------------------------
# Level filter
# ---------------------------------------------------------------------------


class TestLevelFilter:
    def test_no_level_filter_returns_all_levels(self):
        resp = client.get("/v1/areas/search", params={"q": "J", "limit": 50}, headers=_auth())
        levels = {d["level"] for d in resp.json()["data"]}
        assert len(levels) > 1

    def test_filter_province(self):
        resp = client.get("/v1/areas/search", params={"q": "Jak", "level": "province"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "province"

    def test_filter_regency(self):
        resp = client.get("/v1/areas/search", params={"q": "Jak", "level": "regency"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "regency"

    def test_filter_district(self):
        resp = client.get("/v1/areas/search", params={"q": "Tan", "level": "district"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "district"

    def test_filter_village(self):
        resp = client.get("/v1/areas/search", params={"q": "Ge", "level": "village"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "village"

    def test_invalid_level(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "level": "invalid"}, headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_LEVEL"


# ---------------------------------------------------------------------------
# parent_code filter
# ---------------------------------------------------------------------------


class TestParentCodeFilter:
    def test_filters_by_parent(self):
        resp = client.get(
            "/v1/areas/search", params={"q": "Karet", "parent_code": "317101"}, headers=_auth()
        )
        for d in resp.json()["data"]:
            area = _get_area(d["code"])
            assert area["parent_code"] == "317101"

    def test_direct_parent_only(self):
        resp = client.get(
            "/v1/areas/search", params={"q": "Jak", "parent_code": "31"}, headers=_auth()
        )
        codes = [d["code"] for d in resp.json()["data"]]
        assert "3171" in codes
        assert "317101" not in codes

    def test_unknown_parent_returns_404(self):
        resp = client.get(
            "/v1/areas/search", params={"q": "a", "parent_code": "999999"}, headers=_auth()
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_empty_parent_code_ignored(self):
        resp = client.get(
            "/v1/areas/search", params={"q": "Gelora", "parent_code": ""}, headers=_auth()
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Limit
# ---------------------------------------------------------------------------


class TestLimit:
    def test_default_limit(self):
        resp = client.get("/v1/areas/search", params={"q": "a"}, headers=_auth())
        meta = resp.json()["meta"]
        assert meta["limit"] == 20

    def test_custom_limit(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "limit": "2"}, headers=_auth())
        assert len(resp.json()["data"]) <= 2
        assert resp.json()["meta"]["limit"] == 2

    def test_limit_zero(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "limit": "0"}, headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_LIMIT"

    def test_limit_over_max(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "limit": "101"}, headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_LIMIT"

    def test_limit_non_numeric(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "limit": "abc"}, headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_LIMIT"

    def test_limit_negative(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "limit": "-5"}, headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_LIMIT"


# ---------------------------------------------------------------------------
# Query parameter validation
# ---------------------------------------------------------------------------


class TestQueryValidation:
    def test_missing_q(self):
        resp = client.get("/v1/areas/search", headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_empty_q(self):
        resp = client.get("/v1/areas/search", params={"q": ""}, headers=_auth())
        assert resp.status_code == 400
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_error_envelope_format(self):
        resp = client.get("/v1/areas/search", headers=_auth())
        body = resp.json()
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]


# ---------------------------------------------------------------------------
# Empty result
# ---------------------------------------------------------------------------


class TestEmptyResult:
    def test_returns_200_with_empty_data(self):
        resp = client.get("/v1/areas/search", params={"q": "zzz_nonexistent"}, headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["meta"]["count"] == 0


# ---------------------------------------------------------------------------
# Breadcrumb
# ---------------------------------------------------------------------------


class TestBreadcrumb:
    def test_village_has_full_breadcrumb(self):
        resp = client.get("/v1/areas/search", params={"q": "Gelora", "level": "village"}, headers=_auth())
        bc = resp.json()["data"][0]["breadcrumb"]
        assert len(bc) == 4
        assert bc[0]["level"] == "province"
        assert bc[1]["level"] == "regency"
        assert bc[2]["level"] == "district"
        assert bc[3]["level"] == "village"

    def test_province_has_self_breadcrumb(self):
        resp = client.get("/v1/areas/search", params={"q": "DKI Jakarta", "level": "province"}, headers=_auth())
        bc = resp.json()["data"][0]["breadcrumb"]
        assert len(bc) == 1
        assert bc[0]["code"] == "31"

    def test_breadcrumb_matches_get_area(self):
        search_resp = client.get("/v1/areas/search", params={"q": "Gelora"}, headers=_auth())
        search_bc = search_resp.json()["data"][0]["breadcrumb"]
        detail_resp = client.get("/v1/areas/3171011001", headers=_auth())
        detail_bc = detail_resp.json()["data"]["breadcrumb"]
        assert search_bc == detail_bc


# ---------------------------------------------------------------------------
# Ordering
# ---------------------------------------------------------------------------


class TestOrdering:
    def test_deterministic_order(self):
        resp1 = client.get("/v1/areas/search", params={"q": "Jak"}, headers=_auth())
        resp2 = client.get("/v1/areas/search", params={"q": "Jak"}, headers=_auth())
        codes1 = [d["code"] for d in resp1.json()["data"]]
        codes2 = [d["code"] for d in resp2.json()["data"]]
        assert codes1 == codes2

    def test_provinces_before_regencies(self):
        resp = client.get("/v1/areas/search", params={"q": "Jak"}, headers=_auth())
        levels = [d["level"] for d in resp.json()["data"]]
        province_seen = False
        for lv in levels:
            if lv == "regency":
                assert not province_seen
            if lv == "province":
                province_seen = True


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------


class TestAuthentication:
    def test_valid_key(self):
        resp = client.get("/v1/areas/search", params={"q": "Gelora"}, headers=_auth())
        assert resp.status_code == 200

    def test_missing_key(self):
        resp = client.get("/v1/areas/search", params={"q": "Gelora"})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_key(self):
        resp = client.get(
            "/v1/areas/search", params={"q": "Gelora"},
            headers={"Authorization": "Bearer bad_key"},
        )
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_revoked_key(self):
        with SessionLocal() as db:
            h = db.execute(text("SELECT key_hash FROM api_keys LIMIT 1")).scalar_one()
            db.execute(
                text("UPDATE api_keys SET revoked_at = now() WHERE key_hash = :h"), {"h": h}
            )
            db.commit()
        try:
            resp = client.get("/v1/areas/search", params={"q": "Gelora"}, headers=_auth())
            assert resp.status_code == 403
            assert resp.json()["error"]["code"] == "API_KEY_REVOKED"
        finally:
            with SessionLocal() as db:
                db.execute(
                    text("UPDATE api_keys SET revoked_at = NULL WHERE key_hash = :h"), {"h": h}
                )
                db.commit()


# ---------------------------------------------------------------------------
# Meta
# ---------------------------------------------------------------------------


class TestMeta:
    def test_meta_has_limit_and_count(self):
        resp = client.get("/v1/areas/search", params={"q": "Jak"}, headers=_auth())
        meta = resp.json()["meta"]
        assert "limit" in meta
        assert "count" in meta
        assert meta["count"] == len(resp.json()["data"])

    def test_count_reflects_limit(self):
        resp = client.get("/v1/areas/search", params={"q": "a", "limit": 3}, headers=_auth())
        assert resp.json()["meta"]["count"] <= 3


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
