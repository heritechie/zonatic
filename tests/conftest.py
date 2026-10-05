import hashlib

import pytest
from sqlalchemy import text

from apps.api.database import SessionLocal

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
                f"Example: DATABASE_URL='postgresql+psycopg://user:password@<supabase-host>:5432/zonatic_test' pytest"
            )
        
        if current_db not in ALLOWED_TEST_DATABASES:
            raise RuntimeError(
                f"SAFETY GUARD: Unknown database '{current_db}'. "
                f"Tests must use one of: {', '.join(sorted(ALLOWED_TEST_DATABASES))}. "
                f"Protected database '{PROTECTED_DATABASE}' is explicitly blocked."
            )

Migration: str = """
-- 0001: Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;
SET LOCAL search_path TO public, extensions;

-- 0002: Create administrative_areas table
CREATE TABLE IF NOT EXISTS administrative_areas (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
    parent_code VARCHAR(20) REFERENCES administrative_areas(code),
    geometry geometry(MULTIPOLYGON, 4326) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT administrative_areas_geometry_valid CHECK (ST_IsValid(geometry))
);

COMMENT ON TABLE administrative_areas IS 'Batas administratif Indonesia: 1=provinsi, 2=kabupaten/kota, 3=kecamatan, 4=desa/kelurahan.';
COMMENT ON COLUMN administrative_areas.code IS 'Kode wilayah stabil dari sumber data yang dipilih, direkomendasikan kode Kemendagri/BPS.';

CREATE INDEX IF NOT EXISTS administrative_areas_geometry_gix
    ON administrative_areas USING GIST (geometry);
CREATE INDEX IF NOT EXISTS administrative_areas_parent_code_idx
    ON administrative_areas (parent_code);
CREATE INDEX IF NOT EXISTS administrative_areas_level_idx
    ON administrative_areas (level);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS administrative_areas_set_updated_at ON administrative_areas;
CREATE TRIGGER administrative_areas_set_updated_at
BEFORE UPDATE ON administrative_areas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 0006: Multi-tenant foundation for the public Zonatic API.
-- Equivalent to db/init/005_phase1.sql. Adds:
--   * geometry becomes nullable (region-id CSV data carries no boundary);
--   * tenants and api_keys tables for Bearer-token validation;
--   * development seed tenant + API key for local smoke tests.
--
-- Production Supabase projects MUST rotate or remove the development
-- API key before going public.

SET LOCAL search_path TO public, extensions;

ALTER TABLE administrative_areas DROP CONSTRAINT IF EXISTS administrative_areas_geometry_valid;
ALTER TABLE administrative_areas ALTER COLUMN geometry DROP NOT NULL;
ALTER TABLE administrative_areas ADD CONSTRAINT administrative_areas_geometry_valid
    CHECK (geometry IS NULL OR ST_IsValid(geometry));

CREATE TABLE IF NOT EXISTS tenants (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key_prefix  VARCHAR(20) NOT NULL,
    key_hash    VARCHAR(64) NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

-- 0009: canonical administrative codes.
-- Equivalent to supabase/migrations/20260101000009_canonical_area_codes.sql.
-- The test database is built from this inline schema rather than from the
-- migration files, so the canonical-code invariant is mirrored here: codes are
-- undotted, enforced by CHECK. The data half of that migration (converting
-- pre-existing dotted rows) is exercised separately by
-- tests/test_canonical_codes.py against the real migration file.
--
-- ALTER instead of CREATE: an already-provisioned test database may still
-- carry the original constraint definition.

ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_code_canonical;
ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_code_canonical
    CHECK (code !~ '\\.');

ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_parent_code_canonical;
ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_parent_code_canonical
    CHECK (parent_code IS NULL OR parent_code !~ '\\.');
"""


@pytest.fixture(scope="session", autouse=True)
def _verify_database_safety():
    """Execute safety guard before any tests run."""
    _verify_test_database_safety()


@pytest.fixture(scope="session", autouse=True)
def _apply_migration(_verify_database_safety):
    with SessionLocal() as db:
        # Execute the entire migration as a single block to avoid splitting
        # on semicolons within function/trigger definitions.
        db.execute(text(Migration))
        db.commit()


@pytest.fixture(scope="session", autouse=True)
def _seed_test_api_key(_verify_database_safety):
    with SessionLocal() as db:
        exists = db.execute(
            text("SELECT 1 FROM api_keys WHERE key_hash = :h"), {"h": DEV_KEY_HASH}
        ).first()
        if not exists:
            db.execute(text("INSERT INTO tenants (name) VALUES ('Development') ON CONFLICT (name) DO NOTHING"))
            db.execute(
                text(
                    "INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash) "
                    "SELECT id, 'Development test key', 'zn_test_dev', :h FROM tenants WHERE name='Development' LIMIT 1"
                ),
                {"h": DEV_KEY_HASH},
            )
            db.commit()
