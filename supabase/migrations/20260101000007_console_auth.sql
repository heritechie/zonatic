-- Console authentication: Google OAuth identities and workspace membership.
--
-- Identity itself lives in Supabase Auth (`auth.users`). This migration adds
-- only the Zonatic-side profile row and the link between a user and a tenant,
-- because the public API's `tenants` / `api_keys` tables have no user column.
--
-- Adds:
--   * `users`          — Zonatic profile mirroring the Google identity
--                        (id is the Supabase Auth user id; the raw token is
--                         never stored here).
--   * `tenant_members` — which user belongs to which tenant, and their role.
--   * `tenant_usage`   — minimal per-tenant request counter surfaced on the
--                        V1 dashboard. Starts at zero; see the note below.
--
-- A single `users` row is a person; a single `tenant_members` row is that
-- person's membership in one workspace. The schema is already multi-tenant,
-- so no tenant behaviour changes here.

SET LOCAL search_path TO public, extensions;

-- Zonatic profile for a Google-authenticated user.
CREATE TABLE IF NOT EXISTS users (
    id           UUID PRIMARY KEY,               -- = auth.users.id
    email        VARCHAR(320) NOT NULL,
    full_name    VARCHAR(255),
    avatar_url   TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive uniqueness: Google treats e-mail casing as insignificant.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- Membership of a user in a tenant (workspace).
CREATE TABLE IF NOT EXISTS tenant_members (
    tenant_id   UUID        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(32) NOT NULL DEFAULT 'owner',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, user_id)
);

-- Lookup path: "which workspaces does this user belong to?"
CREATE INDEX IF NOT EXISTS idx_tenant_members_user ON tenant_members (user_id);

-- Allowed roles. Kept as a CHECK rather than an enum so adding a role later
-- is an ALTER, not a type migration.
ALTER TABLE tenant_members DROP CONSTRAINT IF EXISTS tenant_members_role_check;
ALTER TABLE tenant_members ADD CONSTRAINT tenant_members_role_check
    CHECK (role IN ('owner', 'admin', 'member'));

-- Per-tenant API usage counters for the V1 dashboard.
--
-- NOTE: this table is created with a zeroed row per tenant but is NOT yet
-- incremented. Wiring the counter into the public API's hot authentication
-- path is deliberately out of scope for the auth work, so until that is done
-- the dashboard reports a real 0 rather than a fabricated number.
CREATE TABLE IF NOT EXISTS tenant_usage (
    tenant_id          UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    api_requests_total BIGINT      NOT NULL DEFAULT 0,
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Backfill a usage row for every existing tenant (including the dev seed).
INSERT INTO tenant_usage (tenant_id)
SELECT id FROM tenants
ON CONFLICT (tenant_id) DO NOTHING;