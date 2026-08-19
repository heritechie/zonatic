-- Phase 1: Administrative Directory API foundation
--
-- For a fresh database (docker compose up --build with new volume):
--   These statements run automatically via docker-entrypoint-initdb.d.
--
-- For an existing local database, apply manually:
--   docker compose exec db psql -U zonatic -d zonatic -f /dev/stdin < 005_phase1.sql
--   Or apply each statement individually via psql.

-- 1. Make geometry nullable (region-id data has no boundary geometry)
ALTER TABLE administrative_areas DROP CONSTRAINT IF EXISTS administrative_areas_geometry_valid;
ALTER TABLE administrative_areas ALTER COLUMN geometry DROP NOT NULL;
ALTER TABLE administrative_areas ADD CONSTRAINT administrative_areas_geometry_valid
    CHECK (geometry IS NULL OR ST_IsValid(geometry));

-- 2. Tenants
CREATE TABLE tenants (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. API keys
CREATE TABLE api_keys (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key_prefix  VARCHAR(20) NOT NULL,
    key_hash    VARCHAR(64) NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);

-- 4. Seed development tenant and test API key
-- Key: zn_test_devkey1234 (DEV ONLY — documented in README)
-- Hash: sha256('zn_test_devkey1234')
INSERT INTO tenants (id, name) VALUES (1, 'Development');
INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash)
VALUES (
    1,
    'Development test key',
    'zn_test_dev',
    '1a536209b41361e2a2504e5301758a24a001d410d654db9fbb6e4a3d9fe29bfd'
);
