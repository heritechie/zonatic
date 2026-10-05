import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.main import LEVEL_KEYS, app

client = TestClient(app)

# Test API key from conftest.py
DEV_KEY = "zn_test_devkey1234"


def _auth_header() -> dict[str, str]:
    return {"Authorization": f"Bearer {DEV_KEY}"}


def _reset_db():
    with SessionLocal() as db:
        db.execute(text("DELETE FROM postal_code_areas"))
        db.execute(text("DELETE FROM postal_codes"))
        db.execute(text("DELETE FROM administrative_areas_staging"))
        db.execute(text("DELETE FROM import_runs"))
        db.execute(text("DELETE FROM administrative_areas"))
        db.execute(
            text(
                """
                INSERT INTO administrative_areas (code, name, level, parent_code, geometry, metadata) VALUES
                ('31', 'DKI Jakarta', 1, NULL,
                 ST_Multi(ST_GeomFromText('POLYGON((106.70 -6.40, 106.98 -6.40, 106.98 -6.10, 106.70 -6.10, 106.70 -6.40))', 4326)),
                 '{"source":"test","type":"province"}'),
                ('3171', 'Kota Administrasi Jakarta Pusat', 2, '31',
                 ST_Multi(ST_GeomFromText('POLYGON((106.78 -6.25, 106.90 -6.25, 106.90 -6.12, 106.78 -6.12, 106.78 -6.25))', 4326)),
                 '{"source":"test","type":"city"}'),
                ('317101', 'Kecamatan Tanah Abang', 3, '3171',
                 ST_Multi(ST_GeomFromText('POLYGON((106.79 -6.22, 106.84 -6.22, 106.84 -6.17, 106.79 -6.17, 106.79 -6.22))', 4326)),
                 '{"source":"test","type":"district"}'),
                ('3171011001', 'Kelurahan Gelora', 4, '317101',
                 ST_Multi(ST_GeomFromText('POLYGON((106.79 -6.20, 106.82 -6.20, 106.82 -6.18, 106.79 -6.18, 106.79 -6.20))', 4326)),
                 '{"source":"test","type":"urban_village"}')
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO postal_codes (code, metadata) VALUES
                ('10270', '{"source":"test","type":"urban"}'),
                ('10210', '{"source":"test","type":"urban"}')
                ON CONFLICT (code) DO NOTHING
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
                SELECT pc.id, aa.id FROM postal_codes pc
                JOIN administrative_areas aa ON aa.code = '3171011001'
                WHERE pc.code = '10270'
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
                SELECT pc.id, aa.id FROM postal_codes pc
                JOIN administrative_areas aa ON aa.code = '317101'
                WHERE pc.code = '10210'
                """
            )
        )
        db.commit()


def _setup_fixtures():
    _reset_db()


def test_level_keys_are_complete():
    assert LEVEL_KEYS == {
        1: "province",
        2: "regency_or_city",
        3: "district",
        4: "village_or_ward",
    }


def test_autocomplete_basic():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "tanah"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "317101"
    assert data["results"][0]["name"] == "Kecamatan Tanah Abang"
    assert data["results"][0]["level"] == 3
    assert "DKI Jakarta" in data["results"][0]["breadcrumb"]
    assert "Kota Administrasi Jakarta Pusat" in data["results"][0]["breadcrumb"]
    assert "Tanah Abang" in data["results"][0]["breadcrumb"]


def test_autocomplete_breadcrumb_hierarchy():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "Gelora"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    result = data["results"][0]
    assert result["code"] == "3171011001"
    assert result["level"] == 4
    assert result["breadcrumb"] == "DKI Jakarta > Kota Administrasi Jakarta Pusat > Kecamatan Tanah Abang > Kelurahan Gelora"


def test_autocomplete_filter_levels():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "Jakarta", "levels": "1"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["level"] == 1

    resp = client.get("/v1/areas/autocomplete", params={"q": "Jakarta", "levels": "3,4"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 0


def test_autocomplete_filter_parent_code():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "Tanah", "parent_code": "3171"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "317101"

    resp = client.get("/v1/areas/autocomplete", params={"q": "Tanah", "parent_code": "99.99"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 0


def test_autocomplete_limit():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "a", "limit": 2}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) <= 2


def test_autocomplete_no_results():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "zzzznonexistent"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data["results"] == []


def test_autocomplete_invalid_levels():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "a", "levels": "abc"}, headers=_auth_header())
    assert resp.status_code == 400


def test_autocomplete_empty_query():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": ""}, headers=_auth_header())
    assert resp.status_code == 422


def test_autocomplete_case_insensitive():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "TANAH"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "317101"


def _link_postal_code(postal_code: str, area_codes: tuple[str, ...]) -> None:
    """Associate one postal code with one or more administrative areas.

    Test-only. Production data contains exactly one area per postal code, so
    the many-to-many path is never exercised by real data. This helper builds
    those links using the existing `postal_code_areas` schema without changing
    it, which is what lets the lookup tests prove the M:N model is represented
    correctly in the public contract.

    The extra rows are removed by the next `_reset_db()` call.
    """
    with SessionLocal() as db:
        db.execute(
            text(
                """
                INSERT INTO postal_codes (code, metadata)
                VALUES (:code, '{"source":"test","type":"synthetic"}')
                ON CONFLICT (code) DO NOTHING
                """
            ),
            {"code": postal_code},
        )
        for area_code in area_codes:
            db.execute(
                text(
                    """
                    INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
                    SELECT pc.id, aa.id
                    FROM postal_codes pc
                    JOIN administrative_areas aa ON aa.code = :area_code
                    WHERE pc.code = :code
                    ON CONFLICT DO NOTHING
                    """
                ),
                {"code": postal_code, "area_code": area_code},
            )
        db.commit()


# ---------------------------------------------------------------------------
# GET /v1/postal-codes/{code}
# ---------------------------------------------------------------------------


def test_postal_code_lookup():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/10270", headers=_auth_header())
    assert resp.status_code == 200
    areas = resp.json()["data"]["areas"]
    assert isinstance(areas, list)
    assert len(areas) == 1
    assert areas[0]["code"] == "3171011001"
    assert areas[0]["name"] == "Kelurahan Gelora"


def test_postal_code_lookup_uses_data_envelope():
    _setup_fixtures()
    body = client.get("/v1/postal-codes/10270", headers=_auth_header()).json()
    assert set(body) == {"data"}
    assert body["data"]["code"] == "10270"


def test_postal_code_lookup_uses_canonical_level_names():
    """`level` is the canonical enum name, not the raw administrative integer.

    The seeded fixtures cover district and village; province and regency are
    linked through test-only rows so all four enum members are exercised.
    """
    _setup_fixtures()
    village = client.get("/v1/postal-codes/10270", headers=_auth_header()).json()
    district = client.get("/v1/postal-codes/10210", headers=_auth_header()).json()

    assert village["data"]["areas"][0]["level"] == "village"
    assert district["data"]["areas"][0]["level"] == "district"
    assert "level" not in (1, 2, 3, 4)

    _link_postal_code("10230", ("31", "3171"))
    levels = {
        area["level"]
        for area in client.get(
            "/v1/postal-codes/10230", headers=_auth_header()
        ).json()["data"]["areas"]
    }
    assert levels == {"province", "regency"}


def test_postal_code_lookup_includes_full_hierarchy():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/10270", headers=_auth_header())
    area = resp.json()["data"]["areas"][0]
    assert area["hierarchy"] == {
        "province": {"code": "31", "name": "DKI Jakarta"},
        "regency": {"code": "3171", "name": "Kota Administrasi Jakarta Pusat"},
        "district": {"code": "317101", "name": "Kecamatan Tanah Abang"},
        "village": {"code": "3171011001", "name": "Kelurahan Gelora"},
    }


def test_postal_code_lookup_does_not_leak_internal_fields():
    """No metadata, parent_code, internal id, or provider bookkeeping."""
    _setup_fixtures()
    _link_postal_code("10230", ("3171011001", "3171"))

    body = client.get("/v1/postal-codes/10230", headers=_auth_header()).json()

    assert "metadata" not in body
    assert "metadata" not in body["data"]
    assert set(body["data"]) == {"code", "areas"}
    for area in body["data"]["areas"]:
        assert set(area) == {"code", "name", "level", "hierarchy"}
        assert "parent_code" not in area
        assert "id" not in area
        for node in area["hierarchy"].values():
            assert set(node) == {"code", "name"}


def test_postal_code_lookup_returns_all_related_areas_as_array():
    """The relationship is many-to-many, so `areas` must never collapse to one."""
    _setup_fixtures()
    _link_postal_code("10230", ("3171011001", "3171"))

    resp = client.get("/v1/postal-codes/10230", headers=_auth_header())
    assert resp.status_code == 200
    areas = resp.json()["data"]["areas"]

    assert isinstance(areas, list)
    assert len(areas) == 2
    # Ordered by administrative level ascending, then code ascending.
    assert [a["code"] for a in areas] == ["3171", "3171011001"]
    assert [a["level"] for a in areas] == ["regency", "village"]
    # Every related area carries its own hierarchy.
    assert areas[0]["hierarchy"]["province"]["code"] == "31"
    assert areas[1]["hierarchy"]["district"]["code"] == "317101"


def test_postal_code_lookup_not_found():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/99999", headers=_auth_header())
    assert resp.status_code == 404
    error = resp.json()["error"]
    assert error["code"] == "POSTAL_CODE_NOT_FOUND"
    assert error["message"]


# ---------------------------------------------------------------------------
# GET /v1/postal-codes/search
# ---------------------------------------------------------------------------


def test_postal_code_search_by_code_prefix():
    _setup_fixtures()
    resp = client.get(
        "/v1/postal-codes/search", params={"q": "102"}, headers=_auth_header()
    )
    assert resp.status_code == 200
    body = resp.json()
    assert [pc["code"] for pc in body["data"]] == ["10210", "10270"]
    assert body["meta"] == {"limit": 20, "count": 2}


def test_postal_code_search_response_shape():
    _setup_fixtures()
    body = client.get(
        "/v1/postal-codes/search", params={"q": "10270"}, headers=_auth_header()
    ).json()

    assert set(body) == {"data", "meta"}
    assert set(body["data"][0]) == {"code", "areas"}
    assert body["data"][0]["areas"][0]["level"] == "village"
    assert "hierarchy" in body["data"][0]["areas"][0]
    assert body["meta"]["count"] == 1


def test_postal_code_search_is_case_insensitive():
    """`ILIKE` is case-insensitive.

    Production codes are numeric, so case can only be observed against a
    synthetic test-only code.
    """
    _setup_fixtures()
    _link_postal_code("tEsT9999", ("3171011001",))

    lower = client.get(
        "/v1/postal-codes/search", params={"q": "test"}, headers=_auth_header()
    ).json()
    upper = client.get(
        "/v1/postal-codes/search", params={"q": "TEST"}, headers=_auth_header()
    ).json()

    assert [pc["code"] for pc in lower["data"]] == ["tEsT9999"]
    assert [pc["code"] for pc in upper["data"]] == ["tEsT9999"]


def test_postal_code_search_does_not_match_substrings():
    """Prefix matching only: an infix fragment must not match."""
    _setup_fixtures()
    for q in ("027", "270", "70"):
        body = client.get(
            "/v1/postal-codes/search", params={"q": q}, headers=_auth_header()
        ).json()
        assert body["data"] == [], q
        assert body["meta"]["count"] == 0


def test_postal_code_search_ignores_area_names():
    """`/v1/areas` is the primitive for area-name lookup."""
    _setup_fixtures()
    body = client.get(
        "/v1/postal-codes/search", params={"q": "Gelora"}, headers=_auth_header()
    ).json()
    assert body["data"] == []
    assert body["meta"] == {"limit": 20, "count": 0}


def test_postal_code_search_no_results():
    _setup_fixtures()
    resp = client.get(
        "/v1/postal-codes/search", params={"q": "zzz"}, headers=_auth_header()
    )
    assert resp.status_code == 200
    assert resp.json()["data"] == []


def test_postal_code_search_default_limit():
    _setup_fixtures()
    body = client.get(
        "/v1/postal-codes/search", params={"q": "102"}, headers=_auth_header()
    ).json()
    assert body["meta"]["limit"] == 20


def test_postal_code_search_custom_limit():
    _setup_fixtures()
    body = client.get(
        "/v1/postal-codes/search",
        params={"q": "102", "limit": 1},
        headers=_auth_header(),
    ).json()
    assert len(body["data"]) == 1
    assert body["meta"] == {"limit": 1, "count": 1}


@pytest.mark.parametrize("limit", [0, -1, 101, 1000])
def test_postal_code_search_rejects_out_of_range_limit(limit):
    _setup_fixtures()
    resp = client.get(
        "/v1/postal-codes/search",
        params={"q": "102", "limit": limit},
        headers=_auth_header(),
    )
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_REQUEST"


@pytest.mark.parametrize("params", [{}, {"q": ""}])
def test_postal_code_search_requires_query(params):
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/search", params=params, headers=_auth_header())
    assert resp.status_code == 422
    assert resp.json()["error"]["code"] == "INVALID_REQUEST"


def test_postal_code_search_supports_multiple_areas_per_code():
    _setup_fixtures()
    _link_postal_code("10230", ("3171011001", "3171"))

    body = client.get(
        "/v1/postal-codes/search", params={"q": "1023"}, headers=_auth_header()
    ).json()

    assert [pc["code"] for pc in body["data"]] == ["10230"]
    assert [a["code"] for a in body["data"][0]["areas"]] == ["3171", "3171011001"]
    assert body["meta"]["count"] == 1


# ---------------------------------------------------------------------------
# GET /v1/areas/{code}/postal-codes (reverse relation of the area resource)
# ---------------------------------------------------------------------------


def test_area_postal_codes():
    _setup_fixtures()
    resp = client.get(
        "/v1/areas/3171011001/postal-codes", headers=_auth_header()
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "3171011001"
    assert data["name"] == "Kelurahan Gelora"
    assert data["postal_codes"] == ["10270"]


def test_area_postal_codes_parent():
    _setup_fixtures()
    resp = client.get("/v1/areas/317101/postal-codes", headers=_auth_header())
    assert resp.status_code == 200
    assert resp.json()["postal_codes"] == ["10210"]


def test_area_postal_codes_multiple():
    _setup_fixtures()
    _link_postal_code("10230", ("3171011001",))

    resp = client.get("/v1/areas/3171011001/postal-codes", headers=_auth_header())
    assert resp.json()["postal_codes"] == ["10230", "10270"]


def test_area_postal_codes_not_found():
    _setup_fixtures()
    resp = client.get("/v1/areas/999999/postal-codes", headers=_auth_header())
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "AREA_NOT_FOUND"


def test_area_postal_codes_empty():
    _setup_fixtures()
    resp = client.get("/v1/areas/31/postal-codes", headers=_auth_header())
    assert resp.status_code == 200
    assert resp.json()["postal_codes"] == []
