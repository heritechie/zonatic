from fastapi.testclient import TestClient
from sqlalchemy import text

from app.database import SessionLocal
from app.main import LEVEL_KEYS, app

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
                ('31.71', 'Kota Administrasi Jakarta Pusat', 2, '31',
                 ST_Multi(ST_GeomFromText('POLYGON((106.78 -6.25, 106.90 -6.25, 106.90 -6.12, 106.78 -6.12, 106.78 -6.25))', 4326)),
                 '{"source":"test","type":"city"}'),
                ('31.71.01', 'Kecamatan Tanah Abang', 3, '31.71',
                 ST_Multi(ST_GeomFromText('POLYGON((106.79 -6.22, 106.84 -6.22, 106.84 -6.17, 106.79 -6.17, 106.79 -6.22))', 4326)),
                 '{"source":"test","type":"district"}'),
                ('31.71.01.1001', 'Kelurahan Gelora', 4, '31.71.01',
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
                JOIN administrative_areas aa ON aa.code = '31.71.01.1001'
                WHERE pc.code = '10270'
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
                SELECT pc.id, aa.id FROM postal_codes pc
                JOIN administrative_areas aa ON aa.code = '31.71.01'
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
    resp = client.get("/v1/areas/autocomplete", params={"q": "tanah"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "31.71.01"
    assert data["results"][0]["name"] == "Kecamatan Tanah Abang"
    assert data["results"][0]["level"] == 3
    assert "DKI Jakarta" in data["results"][0]["breadcrumb"]
    assert "Kota Administrasi Jakarta Pusat" in data["results"][0]["breadcrumb"]
    assert "Tanah Abang" in data["results"][0]["breadcrumb"]


def test_autocomplete_breadcrumb_hierarchy():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "Gelora"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    result = data["results"][0]
    assert result["code"] == "31.71.01.1001"
    assert result["level"] == 4
    assert result["breadcrumb"] == "DKI Jakarta > Kota Administrasi Jakarta Pusat > Kecamatan Tanah Abang > Kelurahan Gelora"


def test_autocomplete_filter_levels():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "Jakarta", "levels": "1"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["level"] == 1

    resp = client.get("/v1/areas/autocomplete", params={"q": "Jakarta", "levels": "3,4"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 0


def test_autocomplete_filter_parent_code():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "Tanah", "parent_code": "31.71"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "31.71.01"

    resp = client.get("/v1/areas/autocomplete", params={"q": "Tanah", "parent_code": "99.99"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 0


def test_autocomplete_limit():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "a", "limit": 2})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) <= 2


def test_autocomplete_no_results():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "zzzznonexistent"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["results"] == []


def test_autocomplete_invalid_levels():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "a", "levels": "abc"})
    assert resp.status_code == 400


def test_autocomplete_empty_query():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": ""})
    assert resp.status_code == 422


def test_autocomplete_case_insensitive():
    _setup_fixtures()
    resp = client.get("/v1/areas/autocomplete", params={"q": "TANAH"})
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == 1
    assert data["results"][0]["code"] == "31.71.01"


def test_postal_code_lookup():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/10270", headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "10270"
    assert len(data["areas"]) == 1
    assert data["areas"][0]["code"] == "31.71.01.1001"
    assert data["areas"][0]["name"] == "Kelurahan Gelora"


def test_postal_code_lookup_not_found():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/99999", headers=_auth_header())
    assert resp.status_code == 404


def test_postal_code_search_by_code():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/search", params={"q": "102"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    codes = [pc["code"] for pc in data]
    assert "10270" in codes
    assert "10210" in codes


def test_postal_code_search_by_area_name():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/search", params={"q": "Gelora"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    codes = [pc["code"] for pc in data]
    assert "10270" in codes


def test_postal_code_search_no_results():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/search", params={"q": "zzz"}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data == []


def test_postal_code_search_limit():
    _setup_fixtures()
    resp = client.get("/v1/postal-codes/search", params={"q": "10", "limit": 1}, headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) <= 1


def test_area_postal_codes():
    _setup_fixtures()
    resp = client.get("/v1/areas/31.71.01.1001/postal-codes", headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "31.71.01.1001"
    assert data["name"] == "Kelurahan Gelora"
    assert len(data["postal_codes"]) == 1
    assert data["postal_codes"][0]["code"] == "10270"


def test_area_postal_codes_parent():
    _setup_fixtures()
    resp = client.get("/v1/areas/31.71.01/postal-codes", headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data["code"] == "31.71.01"
    assert len(data["postal_codes"]) == 1
    assert data["postal_codes"][0]["code"] == "10210"


def test_area_postal_codes_not_found():
    _setup_fixtures()
    resp = client.get("/v1/areas/99.99.99/postal-codes", headers=_auth_header())
    assert resp.status_code == 404


def test_area_postal_codes_empty():
    _setup_fixtures()
    resp = client.get("/v1/areas/31/postal-codes", headers=_auth_header())
    assert resp.status_code == 200
    data = resp.json()
    assert data["postal_codes"] == []
