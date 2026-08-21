import hashlib

import pytest
from sqlalchemy import text

from app.database import SessionLocal

DEV_KEY = "zn_test_devkey1234"
DEV_KEY_HASH = hashlib.sha256(DEV_KEY.encode()).hexdigest()

# Approved test database names
ALLOWED_TEST_DATABASES = {"zonatic_test", "zonatic_ci"}

# Protected production database
PROTECTED_DATABASE = "zonatic"


def _verify_test_database_safety():
    """
    HARD SAFETY GUARD: Verify that tests are NOT running against the protected production database.
    
    This guard queries the actual PostgreSQL database name and refuses to run tests
    against 'zonatic' (production). Tests must use 'zonatic_test' or 'zonatic_ci'.
    
    Raises RuntimeError if the current database is protected.
    """
    with SessionLocal() as db:
        result = db.execute(text("SELECT current_database()")).scalar()
        current_db = result
        
        if current_db == PROTECTED_DATABASE:
            raise RuntimeError(
                f"SAFETY GUARD: Refusing to run tests against protected database '{PROTECTED_DATABASE}'. "
                f"Tests contain destructive operations (DELETE, TRUNCATE) that would destroy production data. "
                f"Use one of the approved test databases: {', '.join(sorted(ALLOWED_TEST_DATABASES))}. "
                f"Example: DATABASE_URL='postgresql+psycopg://zonatic:password@localhost:5432/zonatic_test' pytest"
            )
        
        if current_db not in ALLOWED_TEST_DATABASES:
            raise RuntimeError(
                f"SAFETY GUARD: Unknown database '{current_db}'. "
                f"Tests must use one of: {', '.join(sorted(ALLOWED_TEST_DATABASES))}. "
                f"Protected database '{PROTECTED_DATABASE}' is explicitly blocked."
            )

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
def _verify_database_safety():
    """Execute safety guard before any tests run."""
    _verify_test_database_safety()


@pytest.fixture(scope="session", autouse=True)
def _apply_migration(_verify_database_safety):
    with SessionLocal() as db:
        for statement in Migration.split(";"):
            stmt = statement.strip()
            if stmt:
                db.execute(text(stmt))
        db.commit()


@pytest.fixture(scope="session", autouse=True)
def _seed_test_api_key(_verify_database_safety):
    with SessionLocal() as db:
        exists = db.execute(
            text("SELECT 1 FROM api_keys WHERE key_hash = :h"), {"h": DEV_KEY_HASH}
        ).first()
        if not exists:
            db.execute(text("INSERT INTO tenants (id, name) VALUES (1, 'Development') ON CONFLICT (id) DO NOTHING"))
            db.execute(
                text(
                    "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash) "
                    "VALUES (1, 'Development test key', 'zn_test_dev', :h)"
                ),
                {"h": DEV_KEY_HASH},
            )
            db.commit()
