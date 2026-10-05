-- Console API key environments and row-level security.
--
-- Follows `20260101000007_console_auth.sql`. Adds:
--   * `api_keys.environment`  — production | development, backfilled to
--                                'production' so existing keys keep working.
--   * `api_keys.last_used_at`  — nullable; NOT yet written (see note below).
--   * Row-level security on the console-owned tables, scoped to the caller's
--     own workspace via `auth.uid()`.
--
-- Nothing is renamed and no table is recreated: `users` / `tenants` /
-- `tenant_members` / `api_keys` from the earlier migrations are reused, so no
-- duplicate profile or workspace tables are introduced.
--
-- Applies after 20260101000007_console_auth.sql.

SET LOCAL search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- api_keys.environment
-- ---------------------------------------------------------------------------

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS environment VARCHAR(16);

-- Existing keys are treated as production keys so no key is invalidated and
-- no key silently changes environment. A NOT NULL column cannot be added with
-- a default in one statement on older PostgreSQL, so backfill then constrain.
UPDATE api_keys SET environment = 'production' WHERE environment IS NULL;

ALTER TABLE api_keys
    ALTER COLUMN environment SET DEFAULT 'production',
    ALTER COLUMN environment SET NOT NULL;

-- CHECK rather than an enum, matching `tenant_members_role_check` in 000007:
-- adding an environment later is an ALTER, not a type migration.
ALTER TABLE api_keys DROP CONSTRAINT IF EXISTS api_keys_environment_check;
ALTER TABLE api_keys ADD CONSTRAINT api_keys_environment_check
    CHECK (environment IN ('production', 'development'));

-- ---------------------------------------------------------------------------
-- api_keys.last_used_at
-- ---------------------------------------------------------------------------

-- Nullable on purpose. Usage tracking is not wired into the public API's
-- authentication path yet, so this stays NULL and the console renders it as
-- "Never" instead of fabricating a value. No write happens on API calls in
-- this migration.
ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

-- Listing is newest-first by created_at; add the secondary sort column so a
-- future usage table has a supporting index without another migration.
CREATE INDEX IF NOT EXISTS idx_api_keys_tenant_env
    ON api_keys (tenant_id, environment);

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
--
-- `auth.uid()` is the Supabase Auth user id, which is exactly `users.id`
-- (set in 20260101000007). Membership is therefore resolved from
-- `tenant_members`, so a user can only ever see workspaces they belong to.
--
-- These policies are defence in depth for any surface that exposes these
-- tables as a Supabase role (PostgREST / the anon key). They are NOT the
-- console's primary authorisation mechanism:
--
--   * `console-api` connects with the project's owner connection string from
--     `DATABASE_URL`, and table owners bypass RLS. Its real access control is
--     the server-side `requireWorkspace()` check in the GraphQL resolvers,
--     which derives `tenantId` from the verified Supabase access token and
--     never from client input.
--   * The public API (`app/`) looks keys up by `key_hash` to resolve a
--     tenant, and is unaffected by these policies for the same reason.
--
-- Only SELECT policies are added. The console never writes these tables
-- directly from the browser: profile and workspace rows are provisioned by
-- `console-api` using the verified Google identity, and key creation always
-- happens server-side where only the hash is stored.

ALTER TABLE users         ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_usage  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys      ENABLE ROW LEVEL SECURITY;

-- A user may read only their own profile row.
DROP POLICY IF EXISTS users_select_own ON users;
CREATE POLICY users_select_own ON users
    FOR SELECT
    USING (id = auth.uid());

-- A user may read their own memberships. `tenant_members` reads only its own
-- columns, so these policies do not reference each other recursively.
DROP POLICY IF EXISTS tenant_members_select_own ON tenant_members;
CREATE POLICY tenant_members_select_own ON tenant_members
    FOR SELECT
    USING (user_id = auth.uid());

-- The remaining policies resolve the caller's workspaces through
-- `tenant_members`, which is itself restricted to the caller's own rows.
DROP POLICY IF EXISTS tenants_select_member ON tenants;
CREATE POLICY tenants_select_member ON tenants
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM tenant_members tm
            WHERE tm.tenant_id = tenants.id
              AND tm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS tenant_usage_select_member ON tenant_usage;
CREATE POLICY tenant_usage_select_member ON tenant_usage
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM tenant_members tm
            WHERE tm.tenant_id = tenant_usage.tenant_id
              AND tm.user_id = auth.uid()
        )
    );

-- API keys are visible only for workspaces the caller belongs to. This is the
-- table that matters most: it must never expose another workspace's keys.
DROP POLICY IF EXISTS api_keys_select_member ON api_keys;
CREATE POLICY api_keys_select_member ON api_keys
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1
            FROM tenant_members tm
            WHERE tm.tenant_id = api_keys.tenant_id
              AND tm.user_id = auth.uid()
        )
    );