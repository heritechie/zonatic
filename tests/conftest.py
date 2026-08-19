import hashlib

import pytest
from sqlalchemy import text

from app.database import SessionLocal

DEV_KEY = "zn_test_devkey1234"
DEV_KEY_HASH = hashlib.sha256(DEV_KEY.encode()).hexdigest()

Migration: str = """
ALTER TABLE administrative_areas DROP CONSTRAINT IF EXISTS administrative_areas_geometry_valid;
ALTER TABLE administrative_areas ALTER COLUMN geometry DROP NOT NULL;
ALTER TABLE administrative_areas ADD CONSTRAINT administrative_areas_geometry_valid
    CHECK (geometry IS NULL OR ST_IsValid(geometry));

CREATE TABLE IF NOT EXISTS tenants (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key_prefix  VARCHAR(20) NOT NULL,
    key_hash    VARCHAR(64) NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);
"""


@pytest.fixture(scope="session", autouse=True)
def _apply_migration():
    with SessionLocal() as db:
        for statement in Migration.split(";"):
            stmt = statement.strip()
            if stmt:
                db.execute(text(stmt))
        db.commit()


@pytest.fixture(scope="session", autouse=True)
def _seed_test_api_key():
    with SessionLocal() as db:
        exists = db.execute(
            text("SELECT 1 FROM api_keys WHERE key_hash = :h"), {"h": DEV_KEY_HASH}
        ).first()
        if not exists:
            db.execute(text("INSERT INTO tenants (id, name) VALUES (1, 'Development')"))
            db.execute(
                text(
                    "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash) "
                    "VALUES (1, 'Development test key', 'zn_test_dev', :h)"
                ),
                {"h": DEV_KEY_HASH},
            )
            db.commit()
