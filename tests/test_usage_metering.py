"""Usage metering for authenticated public API requests.

Covers the contract that `tenant_usage.api_requests_total` counts successfully
authenticated public API requests, and that `api_keys.last_used_at` is stamped
on the specific key that authenticated.
"""

import hashlib
import logging
import uuid
import threading
from concurrent.futures import ThreadPoolExecutor

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import event, text

from apps.api.database import SessionLocal, engine
from apps.api.main import app

DEV_KEY = "zn_test_devkey1234"
DEV_KEY_HASH = hashlib.sha256(DEV_KEY.encode()).hexdigest()


def _auth(key: str = DEV_KEY) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


def _total() -> int:
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT api_requests_total FROM tenant_usage LIMIT 1")
        ).first()
        return int(row[0]) if row else 0


def _last_used(key_hash: str):
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT last_used_at FROM api_keys WHERE key_hash = :h"),
            {"h": key_hash},
        ).first()
        return row[0] if row else None


@pytest.fixture(autouse=True)
def _reset_usage(_apply_migration, _seed_test_api_key):
    with SessionLocal() as db:
        db.execute(text("UPDATE tenant_usage SET api_requests_total = 0, updated_at = now()"))
        db.execute(text("UPDATE api_keys SET last_used_at = NULL"))
        db.commit()
    yield


@pytest.fixture
def second_key():
    """A second, unrevoked key belonging to the same tenant as DEV_KEY."""
    raw = "zn_test_secondkey1234"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    with SessionLocal() as db:
        db.execute(
            text(
                "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash) "
                "SELECT tenant_id, 'Second test key', 'zn_test_2', :h FROM api_keys "
                "WHERE key_hash = :dev LIMIT 1"
            ),
            {"h": key_hash, "dev": DEV_KEY_HASH},
        )
        db.commit()
    yield raw
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.commit()


@pytest.fixture
def revoked_key():
    raw = "zn_test_revokedkey1234"
    key_hash = hashlib.sha256(raw.encode()).hexdigest()
    with SessionLocal() as db:
        db.execute(
            text(
                "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash, revoked_at) "
                "SELECT tenant_id, 'Revoked test key', 'zn_test_r', :h, now() FROM api_keys "
                "WHERE key_hash = :dev LIMIT 1"
            ),
            {"h": key_hash, "dev": DEV_KEY_HASH},
        )
        db.commit()
    yield raw
    with SessionLocal() as db:
        db.execute(text("DELETE FROM api_keys WHERE key_hash = :h"), {"h": key_hash})
        db.commit()


# --- A: valid request increments and stamps the key -------------------------


def test_valid_request_increments_total_and_stamps_last_used():
    client = TestClient(app)
    before = _total()
    assert _last_used(DEV_KEY_HASH) is None

    resp = client.get("/v1/areas/3171", headers=_auth())

    assert resp.status_code == 200
    assert _total() == before + 1
    assert _last_used(DEV_KEY_HASH) is not None


# --- B: counter keeps accumulating ----------------------------------------


def test_second_request_increments_again():
    client = TestClient(app)
    before = _total()

    first = client.get("/v1/areas/3171", headers=_auth())
    second = client.get("/v1/areas/31", headers=_auth())

    assert first.status_code == 200
    assert second.status_code == 200
    assert _total() == before + 2


# --- C: invalid key is never counted ---------------------------------------


def test_invalid_api_key_does_not_increment():
    client = TestClient(app)
    before = _total()

    resp = client.get("/v1/areas/3171", headers={"Authorization": "Bearer nope_invalid_xyz"})

    assert resp.status_code == 401
    assert _total() == before


def test_missing_header_does_not_increment():
    client = TestClient(app)
    before = _total()

    resp = client.get("/v1/areas/3171")

    assert resp.status_code == 401
    assert _total() == before


# --- D: revoked key is never counted ---------------------------------------


def test_revoked_api_key_does_not_increment(revoked_key):
    client = TestClient(app)
    before = _total()

    resp = client.get("/v1/areas/3171", headers=_auth(revoked_key))

    assert resp.status_code == 403
    assert _total() == before


# --- non-/v1 endpoints are never counted -----------------------------------


@pytest.mark.parametrize("path", ["/health", "/docs", "/openapi.json"])
def test_public_endpoints_are_not_counted(path):
    client = TestClient(app)
    before = _total()

    resp = client.get(path)

    assert resp.status_code == 200
    assert _total() == before


def test_unmatched_route_is_not_counted():
    """A 404 never authenticates, so it must not be metered."""
    client = TestClient(app)
    before = _total()

    resp = client.get("/v1/not-a-real-endpoint", headers=_auth())

    assert resp.status_code == 404
    assert _total() == before


# --- E: concurrency, no lost increments -----------------------------------


def test_concurrent_requests_do_not_lose_increments():
    """Each concurrent request increments independently; the total must equal
    the request count.

    A read-then-write implementation (``SELECT n`` then ``SET n = old + 1``)
    loses updates under contention and lands below the expected total. Clients
    are built up front and released together through a barrier so the requests
    genuinely overlap instead of being staggered by per-client startup.
    """
    before = _total()
    attempts = 24

    clients = [TestClient(app) for _ in range(attempts)]
    barrier = threading.Barrier(attempts)

    def one_request(_i: int) -> int:
        # A distinct client per thread stands in for a separate Uvicorn worker.
        barrier.wait(timeout=30)
        return clients[_i].get("/v1/areas/3171", headers=_auth()).status_code

    with ThreadPoolExecutor(max_workers=attempts) as pool:
        statuses = list(pool.map(one_request, range(attempts)))

    assert statuses == [200] * attempts
    assert _total() == before + attempts


def test_counter_uses_atomic_increment_not_read_modify_write():
    """Guard the exact anti-pattern the contract forbids.

    Timing-based concurrency alone is not a reliable regression guard: the
    read-then-write window is only microseconds wide, so a broken
    implementation can pass a threaded test by luck. This inspects the SQL the
    driver actually receives for a real request, which is deterministic.
    """
    statements: list[str] = []

    def capture(_conn, _cursor, statement, _params, _context, _executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", capture)
    try:
        resp = TestClient(app).get("/v1/areas/3171", headers=_auth())
    finally:
        event.remove(engine, "before_cursor_execute", capture)

    assert resp.status_code == 200
    usage = [" ".join(s.split()) for s in statements if "tenant_usage" in s]
    assert usage, "expected a write against tenant_usage"

    # Reading the counter before writing it is the lost-update pattern.
    assert not any("SELECT api_requests_total" in s for s in usage), usage
    # The counter must be bumped in place by the database.
    assert any("api_requests_total + 1" in s for s in usage), usage


def test_last_used_update_targets_only_one_key():
    """The stamp must be keyed on the API key, never the whole tenant."""
    statements: list[str] = []

    def capture(_conn, _cursor, statement, _params, _context, _executemany):
        statements.append(statement)

    event.listen(engine, "before_cursor_execute", capture)
    try:
        TestClient(app).get("/v1/areas/3171", headers=_auth())
    finally:
        event.remove(engine, "before_cursor_execute", capture)

    stamps = [" ".join(s.split()) for s in statements if "last_used_at" in s]
    assert stamps, "expected last_used_at to be written"
    assert any("WHERE id = " in s for s in stamps), stamps
    assert not any("WHERE tenant_id = " in s for s in stamps), stamps


# --- F: per-tenant counter, per-key stamp ---------------------------------


def test_second_key_same_tenant_increments_tenant_once_and_stamps_only_that_key(second_key):
    second_hash = hashlib.sha256(second_key.encode()).hexdigest()
    client = TestClient(app)
    before = _total()
    assert _last_used(DEV_KEY_HASH) is None
    assert _last_used(second_hash) is None

    resp = client.get("/v1/areas/3171", headers=_auth(second_key))

    assert resp.status_code == 200
    # Counter is tenant-level: it moves once regardless of which key was used.
    assert _total() == before + 1
    # last_used_at is key-level: only the key that authenticated is stamped.
    assert _last_used(second_hash) is not None
    assert _last_used(DEV_KEY_HASH) is None


def test_each_key_stamps_independently(second_key):
    second_hash = hashlib.sha256(second_key.encode()).hexdigest()
    client = TestClient(app)

    client.get("/v1/areas/3171", headers=_auth(DEV_KEY))
    client.get("/v1/areas/3171", headers=_auth(second_key))

    assert _last_used(DEV_KEY_HASH) is not None
    assert _last_used(second_hash) is not None
    assert _total() == 2


# --- metering must never fail a valid request -----------------------------


def test_metering_failure_does_not_break_the_request(caplog):
    """If the counter cannot be written, the request still succeeds."""
    client = TestClient(app)
    with SessionLocal() as db:
        db.execute(text("ALTER TABLE tenant_usage RENAME TO tenant_usage_broken"))
        db.commit()
    try:
        with caplog.at_level(logging.ERROR, logger="apps.api.dependencies"):
            resp = client.get("/v1/areas/3171", headers=_auth())
    finally:
        with SessionLocal() as db:
            db.execute(text("ALTER TABLE tenant_usage_broken RENAME TO tenant_usage"))
            db.commit()

    assert resp.status_code == 200
    assert resp.json()["data"]["code"] == "3171"
    # The failure must be diagnosable rather than silently swallowed.
    assert any(r.levelno >= logging.ERROR for r in caplog.records)


def test_usage_row_is_created_for_a_tenant_without_one():
    """The upsert path must work when tenant_usage has no row yet."""
    client = TestClient(app)
    with SessionLocal() as db:
        db.execute(text("DELETE FROM tenant_usage"))
        db.commit()

    resp = client.get("/v1/areas/3171", headers=_auth())

    assert resp.status_code == 200
    assert _total() == 1


def test_auth_context_exposes_ids_without_the_raw_key():
    """AuthContext carries ids only; the raw key never leaks out of hashing."""
    from apps.api.dependencies import AuthContext

    fields = set(AuthContext.__dataclass_fields__)
    assert fields == {"tenant_id", "api_key_id"}
    assert isinstance(AuthContext(tenant_id=uuid.uuid4(), api_key_id=uuid.uuid4()).api_key_id, uuid.UUID)