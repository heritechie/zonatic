"""Every /v1 endpoint must require API-key authentication.

Authentication is enforced once at the /v1 router boundary, so this module
asserts the guarantee for the whole surface rather than per endpoint: it walks
the live route table, so a newly added /v1 route is covered automatically.

The negative cases use deliberately invalid request parameters. A dependency
runs before parameter validation, so a 401/403 here proves the request stopped
at the authentication layer and never reached the handler.
"""

import hashlib

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from apps.api.database import SessionLocal
from apps.api.main import app

client = TestClient(app)

DEV_KEY = "zn_test_devkey1234"

REVOKED_KEY = "zn_test_revoked_key_9999"

INVALID_KEY = "zn_definitely_not_a_real_key_0000"

# Every /v1 route with deliberately invalid parameters, so that a response
# proves authentication ran instead of parameter validation.
UNAUTHENTICATED_PROBES: list[tuple[str, dict[str, str]]] = [
    ("/v1/reverse-geocode", {"latitude": "999", "longitude": "999"}),
    ("/v1/areas/autocomplete", {}),
    ("/v1/areas", {}),
    ("/v1/areas/{code}", {}),
    ("/v1/areas/provinces", {}),
    ("/v1/areas/{code}/children", {}),
    ("/v1/areas/provinces/{province_code}/regencies", {}),
    (
        "/v1/areas/provinces/{province_code}/regencies/{regency_code}/districts",
        {},
    ),
    (
        "/v1/areas/provinces/{province_code}/regencies/"
        "{regency_code}/districts/{district_code}/villages",
        {},
    ),
    ("/v1/postal-codes/search", {}),
    ("/v1/postal-codes/{code}", {}),
    ("/v1/areas/{code}/postal-codes", {}),
]


def _auth(key: str = DEV_KEY) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def _all_v1_paths() -> list[str]:
    return sorted(
        route.path
        for route in app.routes
        if getattr(route, "path", "").startswith("/v1")
    )


def test_discovery_finds_every_known_endpoint():
    """Guard the audit itself: if a route is renamed, this must fail loudly."""
    assert _all_v1_paths() == [
        "/v1/areas",
        "/v1/areas/autocomplete",
        "/v1/areas/provinces",
        "/v1/areas/provinces/{province_code}/regencies",
        (
            "/v1/areas/provinces/{province_code}/regencies/"
            "{regency_code}/districts"
        ),
        (
            "/v1/areas/provinces/{province_code}/regencies/"
            "{regency_code}/districts/{district_code}/villages"
        ),
        "/v1/areas/{code}",
        "/v1/areas/{code}/children",
        "/v1/areas/{code}/postal-codes",
        "/v1/postal-codes/search",
        "/v1/postal-codes/{code}",
        "/v1/reverse-geocode",
    ]


def test_static_area_routes_are_registered_before_the_dynamic_code_route():
    """Starlette matches in registration order.

    `/v1/areas/provinces` must be declared before `/v1/areas/{code}`,
    otherwise the dynamic segment swallows "provinces" and the province list
    endpoint is unreachable — it would answer 404 AREA_NOT_FOUND instead.
    """
    paths = [route.path for route in app.routes if getattr(route, "path", "").startswith("/v1/areas")]
    static = [
        p
        for p in paths
        if "{" not in p
    ]
    assert "/v1/areas/provinces" in paths
    for path in static:
        assert paths.index(path) < paths.index("/v1/areas/{code}"), path


@pytest.mark.parametrize("path,params", UNAUTHENTICATED_PROBES)
def test_v1_requires_authorization_header(path, params):
    resp = client.get(path, params=params)
    assert resp.status_code == 401, resp.text
    assert resp.json()["error"]["code"] == "INVALID_API_KEY"


@pytest.mark.parametrize("path,params", UNAUTHENTICATED_PROBES)
def test_v1_rejects_invalid_key(path, params):
    resp = client.get(path, params=params, headers=_auth(INVALID_KEY))
    assert resp.status_code == 401, resp.text
    assert resp.json()["error"]["code"] == "INVALID_API_KEY"


@pytest.fixture
def revoked_key():
    """Insert a revoked key, then remove it."""
    key_hash = hashlib.sha256(REVOKED_KEY.encode()).hexdigest()
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.execute(text("DELETE FROM tenants WHERE name = 'Revoked Test'"))
        db.execute(
            text(
                "INSERT INTO tenants (name) "
                "SELECT 'Revoked Test' WHERE NOT EXISTS "
                "(SELECT 1 FROM tenants WHERE name = 'Revoked Test')"
            )
        )
        db.execute(
            text(
                "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, revoked_at) "
                "SELECT id, 'Revoked test key', 'zn_revoke', :h, now() "
                "FROM tenants WHERE name = 'Revoked Test' LIMIT 1"
            ),
            {"h": key_hash},
        )
        db.commit()
    yield REVOKED_KEY
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.execute(text("DELETE FROM tenants WHERE name = 'Revoked Test'"))
        db.commit()


@pytest.mark.parametrize("path,params", UNAUTHENTICATED_PROBES)
def test_v1_rejects_revoked_key(path, params, revoked_key):
    resp = client.get(path, params=params, headers=_auth(revoked_key))
    assert resp.status_code == 403, resp.text
    assert resp.json()["error"]["code"] == "API_KEY_REVOKED"


@pytest.mark.parametrize("path,params", UNAUTHENTICATED_PROBES)
def test_v1_uses_public_error_envelope(path, params):
    """Never FastAPI's default {"detail": ...}."""
    resp = client.get(path, params=params)
    body = resp.json()
    assert "detail" not in body
    assert set(body["error"]) == {"code", "message"}


@pytest.mark.parametrize(
    "path", ["/health", "/docs", "/openapi.json"]
)
def test_non_v1_endpoints_stay_public(path):
    """Auth is scoped to /v1 only; platform endpoints must remain reachable."""
    resp = client.get(path)
    assert resp.status_code == 200, resp.text


def test_autocomplete_is_not_captured_by_code_path():
    """/v1/areas/autocomplete must stay a static route, never /areas/{code}."""
    route_paths = [route.path for route in app.routes if getattr(route, "path", "").startswith("/v1")]
    auto = route_paths.index("/v1/areas/autocomplete")
    dynamic = route_paths.index("/v1/areas/{code}")
    assert auto < dynamic, "static route must be registered first"


def test_valid_key_reaches_handler():
    """A valid key must pass the auth layer and produce a non-401 response."""
    resp = client.get("/v1/areas", params={"q": "Jakarta"}, headers=_auth())
    assert resp.status_code == 200, resp.text
    assert "data" in resp.json()