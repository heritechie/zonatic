"""Tests for GET /v1/areas (search/list administrative areas)."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.dependencies import TEST_API_KEY
from apps.api.main import app
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
        resp = client.get("/v1/areas", params={"q": "Tanah"}, headers=_auth())
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert len(data) >= 1
        assert any(d["code"] == "317101" for d in data)

    def test_returns_code_name_level_hierarchy(self):
        resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
        item = resp.json()["data"][0]
        assert "code" in item
        assert "name" in item
        assert "level" in item
        assert "hierarchy" in item

    def test_single_result(self):
        resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
        assert len(resp.json()["data"]) == 1


# ---------------------------------------------------------------------------
# Case-insensitive
# ---------------------------------------------------------------------------


class TestCaseInsensitive:
    def test_uppercase(self):
        resp = client.get("/v1/areas", params={"q": "TANAH"}, headers=_auth())
        assert resp.status_code == 200
        assert any(d["code"] == "317101" for d in resp.json()["data"])

    def test_mixed_case(self):
        resp = client.get("/v1/areas", params={"q": "tAnAh"}, headers=_auth())
        assert resp.status_code == 200
        assert any(d["code"] == "317101" for d in resp.json()["data"])


# ---------------------------------------------------------------------------
# Prefix matching
# ---------------------------------------------------------------------------


class TestPrefixMatching:
    def test_prefix_matches(self):
        resp = client.get("/v1/areas", params={"q": "Jak"}, headers=_auth())
        codes = [d["code"] for d in resp.json()["data"]]
        assert "31" in codes or "3171" in codes or "3172" in codes

    def test_full_name_matches(self):
        resp = client.get("/v1/areas", params={"q": "DKI Jakarta"}, headers=_auth())
        assert any(d["code"] == "31" for d in resp.json()["data"])

    def test_no_middle_match(self):
        resp = client.get("/v1/areas", params={"q": "Abang"}, headers=_auth())
        codes = [d["code"] for d in resp.json()["data"]]
        assert "317101" not in codes


# ---------------------------------------------------------------------------
# Level filter
# ---------------------------------------------------------------------------


class TestLevelFilter:
    def test_no_level_filter_returns_all_levels(self):
        resp = client.get("/v1/areas", params={"q": "J", "limit": 50}, headers=_auth())
        levels = {d["level"] for d in resp.json()["data"]}
        assert len(levels) > 1

    def test_filter_province(self):
        resp = client.get("/v1/areas", params={"q": "Jak", "level": "province"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "province"

    def test_filter_regency(self):
        resp = client.get("/v1/areas", params={"q": "Jak", "level": "regency"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "regency"

    def test_filter_district(self):
        resp = client.get("/v1/areas", params={"q": "Tan", "level": "district"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "district"

    def test_filter_village(self):
        resp = client.get("/v1/areas", params={"q": "Ge", "level": "village"}, headers=_auth())
        for d in resp.json()["data"]:
            assert d["level"] == "village"

    def test_invalid_level(self):
        resp = client.get("/v1/areas", params={"q": "a", "level": "invalid"}, headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"


# ---------------------------------------------------------------------------
# parent_code filter
# ---------------------------------------------------------------------------


class TestParentCodeFilter:
    def test_filters_by_parent(self):
        resp = client.get(
            "/v1/areas", params={"q": "Karet", "parent_code": "317101"}, headers=_auth()
        )
        for d in resp.json()["data"]:
            area = _get_area(d["code"])
            assert area["parent_code"] == "317101"

    def test_direct_parent_only(self):
        resp = client.get(
            "/v1/areas", params={"q": "Jak", "parent_code": "31"}, headers=_auth()
        )
        codes = [d["code"] for d in resp.json()["data"]]
        assert "3171" in codes
        assert "317101" not in codes

    def test_unknown_parent_returns_empty_result(self):
        """`parent_code` is a filter, not a lookup. An unknown parent matches
        nothing; it must not be reported as a missing area."""
        resp = client.get(
            "/v1/areas", params={"q": "a", "parent_code": "999999"}, headers=_auth()
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["meta"]["count"] == 0
        assert body["meta"]["limit"] == 20

    def test_unknown_parent_does_not_error_even_without_q_match(self):
        resp = client.get(
            "/v1/areas", params={"q": "Gelora", "parent_code": "999999"}, headers=_auth()
        )
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_empty_parent_code_ignored(self):
        resp = client.get(
            "/v1/areas", params={"q": "Gelora", "parent_code": ""}, headers=_auth()
        )
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1


# ---------------------------------------------------------------------------
# Limit
# ---------------------------------------------------------------------------


class TestLimit:
    def test_default_limit(self):
        resp = client.get("/v1/areas", params={"q": "a"}, headers=_auth())
        meta = resp.json()["meta"]
        assert meta["limit"] == 20

    def test_custom_limit(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 2}, headers=_auth())
        assert len(resp.json()["data"]) <= 2
        assert resp.json()["meta"]["limit"] == 2

    def test_limit_one_is_allowed(self):
        resp = client.get("/v1/areas", params={"q": "J", "limit": 1}, headers=_auth())
        assert resp.status_code == 200
        assert len(resp.json()["data"]) == 1
        assert resp.json()["meta"]["limit"] == 1

    def test_limit_hundred_is_allowed(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 100}, headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["meta"]["limit"] == 100

    def test_limit_zero_rejected(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 0}, headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_limit_over_max_rejected(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 101}, headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_limit_non_numeric_rejected(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": "abc"}, headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_limit_negative_rejected(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": -5}, headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_limit_error_uses_public_envelope(self):
        """Constraint violations must not leak FastAPI's default `detail` body."""
        resp = client.get("/v1/areas", params={"q": "a", "limit": 0}, headers=_auth())
        body = resp.json()
        assert set(body.keys()) == {"error"}
        assert set(body["error"].keys()) == {"code", "message"}


# ---------------------------------------------------------------------------
# Query parameter validation
# ---------------------------------------------------------------------------


class TestQueryValidation:
    def test_missing_q_rejected(self):
        resp = client.get("/v1/areas", headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_empty_q_rejected(self):
        resp = client.get("/v1/areas", params={"q": ""}, headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_whitespace_only_q_accepted_as_prefix(self):
        # min_length=1 is satisfied by a single space; it is a valid (if
        # useless) prefix that matches nothing. The contract sets no trimming
        # rule, so this must not be rejected as a validation error.
        resp = client.get("/v1/areas", params={"q": " "}, headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["data"] == []

    def test_error_envelope_format(self):
        resp = client.get("/v1/areas", headers=_auth())
        body = resp.json()
        assert "error" in body
        assert "code" in body["error"]
        assert "message" in body["error"]

    def test_validation_error_envelope_has_no_detail_key(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 0}, headers=_auth())
        assert "detail" not in resp.json()


# ---------------------------------------------------------------------------
# Empty result
# ---------------------------------------------------------------------------


class TestEmptyResult:
    def test_returns_200_with_empty_data(self):
        resp = client.get("/v1/areas", params={"q": "zzz_nonexistent"}, headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert body["data"] == []
        assert body["meta"]["count"] == 0


# ---------------------------------------------------------------------------
# Hierarchy
# ---------------------------------------------------------------------------


class TestHierarchy:
    """`hierarchy` is a dict keyed by level name, containing the matching area
    itself and all of its ancestors in depth order."""

    def test_village_has_full_hierarchy(self):
        resp = client.get("/v1/areas", params={"q": "Gelora", "level": "village"}, headers=_auth())
        h = resp.json()["data"][0]["hierarchy"]
        assert set(h.keys()) == {"province", "regency", "district", "village"}
        assert h["village"]["code"] == "3171011001"
        assert h["district"]["code"] == "317101"
        assert h["regency"]["code"] == "3171"
        assert h["province"]["code"] == "31"

    def test_province_has_self_hierarchy(self):
        resp = client.get(
            "/v1/areas", params={"q": "DKI Jakarta", "level": "province"}, headers=_auth()
        )
        h = resp.json()["data"][0]["hierarchy"]
        assert set(h.keys()) == {"province"}
        assert h["province"]["code"] == "31"

    def test_hierarchy_matches_get_area(self):
        # Detail endpoint must produce the same hierarchy as the search endpoint
        # for the same area — single source of geographic truth.
        search_resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
        search_item = next(
            d for d in search_resp.json()["data"] if d["code"] == "3171011001"
        )
        detail_resp = client.get("/v1/areas/3171011001", headers=_auth())
        detail_item = detail_resp.json()["data"]
        assert search_item["code"] == detail_item["code"]
        assert search_item["level"] == detail_item["level"]
        assert search_item["name"] == detail_item["name"]
        assert search_item["hierarchy"] == detail_item["hierarchy"]


# ---------------------------------------------------------------------------
# Ordering
# ---------------------------------------------------------------------------


class TestOrdering:
    def test_deterministic_order(self):
        resp1 = client.get("/v1/areas", params={"q": "Jak"}, headers=_auth())
        resp2 = client.get("/v1/areas", params={"q": "Jak"}, headers=_auth())
        codes1 = [d["code"] for d in resp1.json()["data"]]
        codes2 = [d["code"] for d in resp2.json()["data"]]
        assert codes1 == codes2

    def test_provinces_before_regencies(self):
        resp = client.get("/v1/areas", params={"q": "Jak"}, headers=_auth())
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
        resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
        assert resp.status_code == 200

    def test_missing_key(self):
        resp = client.get("/v1/areas", params={"q": "Gelora"})
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_key(self):
        resp = client.get(
            "/v1/areas", params={"q": "Gelora"},
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
            resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
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
        resp = client.get("/v1/areas", params={"q": "Jak"}, headers=_auth())
        meta = resp.json()["meta"]
        assert "limit" in meta
        assert "count" in meta
        assert meta["count"] == len(resp.json()["data"])

    def test_count_reflects_limit(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 3}, headers=_auth())
        assert resp.json()["meta"]["count"] <= 3


# ---------------------------------------------------------------------------
# Canonical codes (no "." separator)
# ---------------------------------------------------------------------------


class TestCanonicalCodes:
    """Public codes are the canonical undotted DB form. A "." separator is UI
    sugar only (`31.71.01` is the same area as `317101`) and must never reach
    a client."""

    def test_response_codes_have_no_dot(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 50}, headers=_auth())
        assert resp.status_code == 200
        for item in resp.json()["data"]:
            assert "." not in item["code"], f"unexpected dotted code: {item['code']}"

    def test_hierarchy_codes_have_no_dot(self):
        resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
        for item in resp.json()["data"]:
            for level_key, node in item["hierarchy"].items():
                assert "." not in node["code"], (
                    f"unexpected dotted hierarchy code at {level_key}: {node['code']}"
                )

    def test_codes_are_all_digits(self):
        resp = client.get("/v1/areas", params={"q": "a", "limit": 50}, headers=_auth())
        for item in resp.json()["data"]:
            assert item["code"].isdigit(), f"non-digit code: {item['code']}"

    def test_known_area_returns_canonical_code(self):
        resp = client.get("/v1/areas", params={"q": "Gelora"}, headers=_auth())
        codes = [d["code"] for d in resp.json()["data"]]
        assert codes == ["3171011001"]
        assert "31.71.01.1001" not in codes

    def test_dotted_query_does_not_match_by_code(self):
        """A dotted code is not an accepted input form; matching is by name."""
        resp = client.get("/v1/areas", params={"q": "31.71"}, headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["data"] == []


# ---------------------------------------------------------------------------
# OpenAPI contract
# ---------------------------------------------------------------------------


class TestOpenApiContract:
    """The generated OpenAPI document is the machine-readable contract. These
    assertions pin the parameter types and constraints so a regression shows
    up as a schema diff rather than as confusing client-side behaviour."""

    @staticmethod
    def _areas_params() -> dict[str, dict]:
        spec = app.openapi()
        params = spec["paths"]["/v1/areas"]["get"]["parameters"]
        return {p["name"]: p for p in params if p["in"] == "query"}

    def test_q_is_required_with_min_length_one(self):
        q = self._areas_params()["q"]
        assert q["required"] is True
        assert q["schema"]["type"] == "string"
        assert q["schema"]["minLength"] == 1

    def test_q_has_no_default(self):
        # A default would make `q` optional in the schema, breaking the contract.
        assert "default" not in self._areas_params()["q"]["schema"]

    def test_limit_is_integer_bounded_with_default_20(self):
        limit = self._areas_params()["limit"]["schema"]
        assert limit["type"] == "integer"
        assert limit["minimum"] == 1
        assert limit["maximum"] == 100
        assert limit["default"] == 20

    def test_level_is_a_closed_enum(self):
        spec = app.openapi()
        level = self._areas_params()["level"]["schema"]
        ref = level["anyOf"][0]["$ref"]
        enum_name = ref.rsplit("/", 1)[-1]
        enum = spec["components"]["schemas"][enum_name]
        assert enum["type"] == "string"
        assert enum["enum"] == ["province", "regency", "district", "village"]

    def test_parent_code_is_optional_string(self):
        parent = self._areas_params()["parent_code"]
        assert parent["required"] is False
        assert "string" in [t["type"] for t in parent["schema"]["anyOf"]]

    def test_no_pagination_parameters_are_published(self):
        names = set(self._areas_params())
        assert not names & {"page", "page_size", "offset", "cursor"}

    def test_list_response_meta_has_exactly_limit_and_count(self):
        spec = app.openapi()
        meta_ref = spec["paths"]["/v1/areas"]["get"]["responses"]["200"]["content"][
            "application/json"
        ]["schema"]["$ref"]
        response_name = meta_ref.rsplit("/", 1)[-1]
        meta_name = spec["components"]["schemas"][response_name]["properties"]["meta"][
            "$ref"
        ].rsplit("/", 1)[-1]
        meta = spec["components"]["schemas"][meta_name]
        assert set(meta["properties"]) == {"limit", "count"}
        assert set(meta["required"]) == {"limit", "count"}

    def test_area_public_level_uses_the_same_enum(self):
        spec = app.openapi()
        level = spec["components"]["schemas"]["AreaPublic"]["properties"]["level"]
        assert level["$ref"].rsplit("/", 1)[-1] == "AreaLevel"

    def test_single_response_uses_area_public(self):
        spec = app.openapi()
        data_ref = spec["paths"]["/v1/areas/{code}"]["get"]["responses"]["200"][
            "content"
        ]["application/json"]["schema"]["$ref"]
        response_name = data_ref.rsplit("/", 1)[-1]
        data = spec["components"]["schemas"][response_name]["properties"]["data"][
            "$ref"
        ].rsplit("/", 1)[-1]
        assert data == "AreaPublic"

    def test_both_endpoints_declare_the_bearer_header(self):
        spec = app.openapi()
        for path in ("/v1/areas", "/v1/areas/{code}"):
            names = {
                p["name"] for p in spec["paths"][path]["get"]["parameters"] if p["in"] == "header"
            }
            assert "authorization" in names, path


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