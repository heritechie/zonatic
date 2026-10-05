-- Multi-tenant foundation for the public Zonatic API.
--
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
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant ON api_keys(tenant_id);

-- Development seed (DEV ONLY).
-- Insert a default development workspace with a generated UUID. Do not use
-- hardcoded numeric IDs.
WITH new_tenant AS (
    INSERT INTO tenants (name) VALUES ('Development')
    RETURNING id
)
INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash)
SELECT
    nt.id,
    'Development test key',
    'zn_test_dev',
    '1a536209b41361e2a2504e5301758a24a001d410d654db9fbb6e4a3d9fe29bfd'
FROM new_tenant nt
ON CONFLICT (key_hash) DO NOTHING;