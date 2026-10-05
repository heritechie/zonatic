"""Tests for GET /v1/areas/{code} and the hierarchy navigation endpoints."""

import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.dependencies import TEST_API_KEY
from apps.api.main import app
from tests.conftest import _apply_migration, _seed_test_api_key, DEV_KEY_HASH

client = TestClient(app)

REVOKED_KEY = "zn_test_areas_revoked_key_5555"

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


@pytest.fixture
def revoked_key():
    """Insert a revoked API key, then remove it."""
    key_hash = hashlib.sha256(REVOKED_KEY.encode()).hexdigest()
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.execute(text("DELETE FROM tenants WHERE name = 'Areas Revoked Test'"))
        db.execute(
            text(
                "INSERT INTO tenants (name) "
                "SELECT 'Areas Revoked Test' WHERE NOT EXISTS "
                "(SELECT 1 FROM tenants WHERE name = 'Areas Revoked Test')"
            )
        )
        db.execute(
            text(
                "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, revoked_at) "
                "SELECT id, 'Areas revoked key', 'zn_area_rev', :h, now() "
                "FROM tenants WHERE name = 'Areas Revoked Test' LIMIT 1"
            ),
            {"h": key_hash},
        )
        db.commit()
    yield REVOKED_KEY
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.execute(text("DELETE FROM tenants WHERE name = 'Areas Revoked Test'"))
        db.commit()


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


# ---------------------------------------------------------------------------
# Navigation: GET /v1/areas/{code}/children
# ---------------------------------------------------------------------------


class TestChildren:
    def test_province_children_are_regencies(self):
        resp = client.get("/v1/areas/31/children", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert set(body) == {"data", "meta"}
        assert [a["code"] for a in body["data"]] == ["3171", "3172"]
        assert {a["level"] for a in body["data"]} == {"regency"}

    def test_regency_children_are_districts(self):
        resp = client.get("/v1/areas/3171/children", headers=_auth())
        assert resp.status_code == 200
        assert [a["code"] for a in resp.json()["data"]] == ["317101"]
        assert resp.json()["data"][0]["level"] == "district"

    def test_district_children_are_villages(self):
        resp = client.get("/v1/areas/317101/children", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert [a["code"] for a in body["data"]] == ["3171011001", "3171011002"]
        assert {a["level"] for a in body["data"]} == {"village"}

    def test_children_are_direct_only_not_recursive(self):
        """A district's children are villages, never the whole subtree."""
        resp = client.get("/v1/areas/31/children", headers=_auth())
        codes = {a["code"] for a in resp.json()["data"]}
        assert codes == {"3171", "3172"}
        # Deeper levels must not appear.
        assert "317101" not in codes
        assert "3273" not in codes
        # ...and every returned area really is a direct child.
        for code in codes:
            assert _get_area(code)["parent_code"] == "31"

    def test_leaf_area_returns_empty_list_not_404(self):
        resp = client.get("/v1/areas/3171011001/children", headers=_auth())
        assert resp.status_code == 200
        assert resp.json() == {"data": [], "meta": {"limit": 20, "count": 0}}

    def test_unknown_parent_returns_404(self):
        resp = client.get("/v1/areas/999999/children", headers=_auth())
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_dotted_code_returns_404(self):
        """Canonical codes only; dotted sugar was removed by migration 0009."""
        resp = client.get("/v1/areas/31.71/children", headers=_auth())
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_response_uses_area_public_shape(self):
        resp = client.get("/v1/areas/31/children", headers=_auth())
        area = resp.json()["data"][0]
        assert set(area) == {"code", "name", "level", "hierarchy"}
        assert area["level"] in {"province", "regency", "district", "village"}

    def test_level_vocabulary_is_the_canonical_enum_only(self):
        """No "city"/"kota"/"kecamatan"/"kelurahan" may leak into `level`.

        `regency` is the single level-2 term on purpose: it covers both
        kabupaten and kota, and the level model does not distinguish them.
        """
        allowed = {"province", "regency", "district", "village"}
        banned = {"city", "cities", "kabupaten", "kota", "kecamatan", "kelurahan"}
        for code in ("31", "3171", "317101", "3171011001", "32", "3273"):
            area = client.get(f"/v1/areas/{code}", headers=_auth()).json()["data"]
            assert area["level"] in allowed, area
            assert area["level"] not in banned, area

    def test_hierarchy_is_included_and_correct(self):
        resp = client.get("/v1/areas/317101/children", headers=_auth())
        village = resp.json()["data"][0]
        assert village["hierarchy"] == {
            "province": {"code": "31", "name": "DKI Jakarta"},
            "regency": {"code": "3171", "name": "Jakarta Pusat"},
            "district": {"code": "317101", "name": "Tanah Abang"},
            "village": {"code": "3171011001", "name": "Gelora"},
        }

    def test_ordering_is_code_ascending(self):
        resp = client.get("/v1/areas/317101/children", headers=_auth())
        codes = [a["code"] for a in resp.json()["data"]]
        assert codes == sorted(codes)

    def test_default_limit_is_20(self):
        resp = client.get("/v1/areas/provinces", headers=_auth())
        assert resp.json()["meta"] == {"limit": 20, "count": 2}

    def test_custom_limit(self):
        resp = client.get("/v1/areas/31/children?limit=1", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["meta"] == {"limit": 1, "count": 1}

    def test_limit_boundary_values_accepted(self):
        for limit in (1, 100):
            resp = client.get(f"/v1/areas/31/children?limit={limit}", headers=_auth())
            assert resp.status_code == 200

    @pytest.mark.parametrize("limit", [0, -1, 101, 1000])
    def test_invalid_limit_returns_422(self, limit):
        resp = client.get(f"/v1/areas/31/children?limit={limit}", headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_missing_api_key_returns_401(self):
        resp = client.get("/v1/areas/31/children")
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"

    def test_invalid_api_key_returns_401(self):
        resp = client.get(
            "/v1/areas/31/children",
            headers={"Authorization": "Bearer zn_not_a_real_key"},
        )
        assert resp.status_code == 401
        assert resp.json()["error"]["code"] == "INVALID_API_KEY"


# ---------------------------------------------------------------------------
# GET /v1/areas/provinces
# ---------------------------------------------------------------------------


class TestProvinceList:
    def test_returns_provinces_only(self):
        resp = client.get("/v1/areas/provinces", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert [a["code"] for a in body["data"]] == ["31", "32"]
        assert {a["level"] for a in body["data"]} == {"province"}

    def test_resolves_to_static_route_not_code_lookup(self):
        """"provinces" must not be captured by /v1/areas/{code}."""
        resp = client.get("/v1/areas/provinces", headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["meta"]["count"] == 2
        # A real 404 would carry the error envelope instead.
        assert "error" not in resp.json()

    def test_response_shape(self):
        resp = client.get("/v1/areas/provinces", headers=_auth())
        body = resp.json()
        assert set(body) == {"data", "meta"}
        assert set(body["data"][0]) == {"code", "name", "level", "hierarchy"}

    def test_province_hierarchy_is_just_itself(self):
        resp = client.get("/v1/areas/provinces", headers=_auth())
        assert resp.json()["data"][0]["hierarchy"] == {
            "province": {"code": "31", "name": "DKI Jakarta"}
        }

    def test_limit(self):
        resp = client.get("/v1/areas/provinces?limit=1", headers=_auth())
        body = resp.json()
        assert len(body["data"]) == 1
        assert body["meta"] == {"limit": 1, "count": 1}

    def test_invalid_limit_returns_422(self):
        resp = client.get("/v1/areas/provinces?limit=0", headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    def test_auth_required(self):
        assert client.get("/v1/areas/provinces").status_code == 401

    def test_revoked_api_key_returns_403(self, revoked_key):
        resp = client.get(
            "/v1/areas/provinces",
            headers={"Authorization": f"Bearer {revoked_key}"},
        )
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "API_KEY_REVOKED"


# ---------------------------------------------------------------------------
# Convenience hierarchy routes
# ---------------------------------------------------------------------------

VILLAGES_URL = (
    "/v1/areas/provinces/{p}/regencies/{r}/districts/{d}/villages"
)


class TestHierarchyRoutes:
    def test_province_to_regencies(self):
        resp = client.get("/v1/areas/provinces/31/regencies", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert [a["code"] for a in body["data"]] == ["3171", "3172"]
        assert {a["level"] for a in body["data"]} == {"regency"}
        assert body["meta"] == {"limit": 20, "count": 2}

    def test_province_regency_to_districts(self):
        resp = client.get(
            "/v1/areas/provinces/31/regencies/3171/districts", headers=_auth()
        )
        assert resp.status_code == 200
        body = resp.json()
        assert [a["code"] for a in body["data"]] == ["317101"]
        assert body["data"][0]["level"] == "district"

    def test_full_chain_to_villages(self):
        resp = client.get(
            VILLAGES_URL.format(p="31", r="3171", d="317101"), headers=_auth()
        )
        assert resp.status_code == 200
        body = resp.json()
        assert [a["code"] for a in body["data"]] == ["3171011001", "3171011002"]
        assert {a["level"] for a in body["data"]} == {"village"}

    def test_hierarchy_is_correct_at_every_level(self):
        resp = client.get(
            VILLAGES_URL.format(p="31", r="3171", d="317101"), headers=_auth()
        )
        village = resp.json()["data"][0]
        assert village["hierarchy"]["province"] == {"code": "31", "name": "DKI Jakarta"}
        assert village["hierarchy"]["regency"] == {"code": "3171", "name": "Jakarta Pusat"}
        assert village["hierarchy"]["district"] == {"code": "317101", "name": "Tanah Abang"}
        assert village["hierarchy"]["village"]["code"] == "3171011001"

    def test_matches_children_endpoint(self):
        """The convenience route must be the same query, not a parallel one."""
        convenience = client.get(
            "/v1/areas/provinces/31/regencies", headers=_auth()
        ).json()
        generic = client.get("/v1/areas/31/children", headers=_auth()).json()
        assert convenience == generic

    def test_deep_chain_matches_children_endpoint(self):
        convenience = client.get(
            VILLAGES_URL.format(p="31", r="3171", d="317101"), headers=_auth()
        ).json()
        generic = client.get("/v1/areas/317101/children", headers=_auth()).json()
        assert convenience == generic

    # -- hierarchy relationship validation ---------------------------------

    def test_regency_from_wrong_province_returns_404(self):
        """3273 is a real regency, but it belongs to province 32, not 31."""
        resp = client.get(
            "/v1/areas/provinces/31/regencies/3273/districts", headers=_auth()
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_district_from_wrong_regency_returns_404(self):
        """317101 is real, but its parent is 3171, not 3273."""
        resp = client.get(
            "/v1/areas/provinces/32/regencies/3273/districts/317101/villages",
            headers=_auth(),
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_wrong_parent_is_not_silently_ignored(self):
        """A valid regency under the wrong province must not be accepted."""
        resp = client.get(
            "/v1/areas/provinces/32/regencies/3171/districts", headers=_auth()
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_sibling_regency_with_no_children_returns_200_empty(self):
        """A correct relationship that simply has nothing below it is not an error."""
        resp = client.get(
            "/v1/areas/provinces/31/regencies/3172/districts", headers=_auth()
        )
        assert resp.status_code == 200
        assert resp.json() == {"data": [], "meta": {"limit": 20, "count": 0}}

    def test_regency_route_rejects_non_province_code(self):
        """A regency code in the province segment is not a province."""
        resp = client.get("/v1/areas/provinces/3171/regencies", headers=_auth())
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_district_route_rejects_non_regency_code(self):
        resp = client.get(
            "/v1/areas/provinces/31/regencies/317101/districts", headers=_auth()
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    def test_village_route_rejects_non_district_code(self):
        resp = client.get(
            VILLAGES_URL.format(p="31", r="3171", d="3171011001"),
            headers=_auth(),
        )
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    @pytest.mark.parametrize(
        "url",
        [
            "/v1/areas/provinces/999999/regencies",
            "/v1/areas/provinces/31/regencies/999999/districts",
            VILLAGES_URL.format(p="31", r="3171", d="999999"),
        ],
    )
    def test_unknown_code_returns_404(self, url):
        resp = client.get(url, headers=_auth())
        assert resp.status_code == 404
        assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"

    @pytest.mark.parametrize(
        "url",
        [
            "/v1/areas/provinces/31/regencies",
            "/v1/areas/provinces/31/regencies/3171/districts",
            VILLAGES_URL.format(p="31", r="3171", d="317101"),
        ],
    )
    def test_invalid_limit_returns_422(self, url):
        resp = client.get(f"{url}?limit=0", headers=_auth())
        assert resp.status_code == 422
        assert resp.json()["error"]["code"] == "INVALID_REQUEST"

    @pytest.mark.parametrize(
        "url",
        [
            "/v1/areas/provinces/31/regencies",
            "/v1/areas/provinces/31/regencies/3171/districts",
            VILLAGES_URL.format(p="31", r="3171", d="317101"),
        ],
    )
    def test_limit_is_applied(self, url):
        resp = client.get(f"{url}?limit=1", headers=_auth())
        assert resp.status_code == 200
        body = resp.json()
        assert len(body["data"]) <= 1
        assert body["meta"]["limit"] == 1

    @pytest.mark.parametrize(
        "url",
        [
            "/v1/areas/provinces/31/regencies",
            "/v1/areas/provinces/31/regencies/3171/districts",
            VILLAGES_URL.format(p="31", r="3171", d="317101"),
        ],
    )
    def test_auth_required(self, url):
        assert client.get(url).status_code == 401

    @pytest.mark.parametrize(
        "url",
        [
            "/v1/areas/provinces/31/regencies",
            "/v1/areas/provinces/31/regencies/3171/districts",
            VILLAGES_URL.format(p="31", r="3171", d="317101"),
        ],
    )
    def test_revoked_api_key_returns_403(self, url, revoked_key):
        resp = client.get(url, headers={"Authorization": f"Bearer {revoked_key}"})
        assert resp.status_code == 403
        assert resp.json()["error"]["code"] == "API_KEY_REVOKED"


# ---------------------------------------------------------------------------
# Route resolution
# ---------------------------------------------------------------------------


class TestRouteResolution:
    def test_provinces_resolves_to_the_static_route(self):
        route = self._match("/v1/areas/provinces")
        assert route.path == "/v1/areas/provinces"

    def test_children_resolves_to_the_children_route(self):
        route = self._match("/v1/areas/31/children")
        assert route.path == "/v1/areas/{code}/children"

    def test_single_code_still_resolves_to_area_lookup(self):
        route = self._match("/v1/areas/31")
        assert route.path == "/v1/areas/{code}"

    def test_hierarchy_route_resolves_to_convenience_route(self):
        route = self._match("/v1/areas/provinces/31/regencies")
        assert route.path == "/v1/areas/provinces/{province_code}/regencies"

    def test_literal_provinces_is_not_treated_as_an_area_code(self):
        resp = client.get("/v1/areas/provinces", headers=_auth())
        assert resp.status_code == 200
        assert "error" not in resp.json()

    def test_existing_area_lookup_still_works(self):
        resp = client.get("/v1/areas/3171", headers=_auth())
        assert resp.status_code == 200
        assert resp.json()["data"]["code"] == "3171"

    @staticmethod
    def _match(path: str):
        """Resolve a path against the router the same way Starlette does."""
        from starlette.routing import Match

        scope = {"type": "http", "method": "GET", "path": path, "headers": []}
        for route in app.routes:
            match, _ = route.matches(scope)
            if match == Match.FULL:
                return route
        raise AssertionError(f"no route matched {path}")
