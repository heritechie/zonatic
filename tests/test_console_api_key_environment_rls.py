"""Tests for the console API key environment and RLS migration.

`supabase/migrations/20260101000008_console_api_key_environment_rls.sql` must
apply to a plain PostgreSQL as well as to a Supabase project:

  * the environment / last_used_at columns, the CHECK constraint and the
    supporting index are created unconditionally;
  * the five `auth.uid()` SELECT policies are created only where the `auth`
    schema exists. The creation is guarded by `to_regprocedure('auth.uid()')`
    and executed as dynamic SQL, so nothing that references `auth.uid()` is
    parsed outside the guard;
  * row-level security stays enabled either way — fail-closed for non-owner
    roles when no policies exist, full access for the owner connection both
    APIs use.

Two halves, following tests/test_schema_hardening.py:

  * a static audit of the migration file itself — the guard mechanics do not
    depend on the database, and the policy SQL must be provably identical to
    what shipped before the guard existed;
  * a live run of the real file (plus its prerequisite 0007) inside a
    transaction that is rolled back, so the shared test schema is never
    modified. The live run branches on whether the test database provides
    `auth.uid()`; no auth schema stub is ever created here.
"""

import re
from pathlib import Path

import pytest
from sqlalchemy import text

from apps.api.database import SessionLocal
from tests.conftest import _apply_migration, _seed_test_api_key

MIGRATION_DIR = Path(__file__).resolve().parents[1] / "supabase" / "migrations"
MIGRATION_FILE = MIGRATION_DIR / "20260101000008_console_api_key_environment_rls.sql"
PREREQUISITE_FILE = MIGRATION_DIR / "20260101000007_console_auth.sql"

RLS_TABLES = ("users", "tenants", "tenant_members", "tenant_usage", "api_keys")

EXPECTED_POLICIES = {
    ("users", "users_select_own"),
    ("tenant_members", "tenant_members_select_own"),
    ("tenants", "tenants_select_member"),
    ("tenant_usage", "tenant_usage_select_member"),
    ("api_keys", "api_keys_select_member"),
}

# The policy statements as normalised whitespace, exactly as they must appear
# inside the guard. Any drift from the pre-guard definitions fails here.
EXPECTED_POLICY_SQL = (
    "CREATE POLICY users_select_own ON users "
    "FOR SELECT USING (id = auth.uid())",
    "CREATE POLICY tenant_members_select_own ON tenant_members "
    "FOR SELECT USING (user_id = auth.uid())",
    "CREATE POLICY tenants_select_member ON tenants "
    "FOR SELECT USING ( EXISTS ( SELECT 1 FROM tenant_members tm "
    "WHERE tm.tenant_id = tenants.id AND tm.user_id = auth.uid() ) )",
    "CREATE POLICY tenant_usage_select_member ON tenant_usage "
    "FOR SELECT USING ( EXISTS ( SELECT 1 FROM tenant_members tm "
    "WHERE tm.tenant_id = tenant_usage.tenant_id AND tm.user_id = auth.uid() ) )",
    "CREATE POLICY api_keys_select_member ON api_keys "
    "FOR SELECT USING ( EXISTS ( SELECT 1 FROM tenant_members tm "
    "WHERE tm.tenant_id = api_keys.tenant_id AND tm.user_id = auth.uid() ) )",
)


def _code_without_comments() -> str:
    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    return "\n".join(re.sub(r"--.*$", "", line) for line in sql.splitlines())


def _guard_bounds(code: str) -> tuple[int, int]:
    """Return (start, end) of the DO block that holds the guarded policies."""
    start = code.index("DO $$")
    # "$policy$" contains no "$$", so the next "$$" after the block opener is
    # the terminator of the DO body itself.
    end = code.index("$$", start + len("DO $$"))
    return start, end


def _observe() -> dict:
    """Run 0007 + 0008 (twice, for idempotence) in one transaction, record the
    resulting state, and roll everything back."""
    tables_in = ", ".join(f"'{t}'" for t in RLS_TABLES)
    prerequisite_sql = PREREQUISITE_FILE.read_text(encoding="utf-8")
    migration_sql = MIGRATION_FILE.read_text(encoding="utf-8")
    with SessionLocal() as db:
        try:
            db.execute(text(prerequisite_sql))
            db.execute(text(migration_sql))
            db.execute(text(migration_sql))

            auth_present = db.execute(
                text("SELECT to_regprocedure('auth.uid()') IS NOT NULL")
            ).scalar()

            env_col = db.execute(
                text(
                    "SELECT column_default, is_nullable "
                    "FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name = 'api_keys' "
                    "AND column_name = 'environment'"
                )
            ).first()

            check_def = db.execute(
                text(
                    "SELECT pg_get_constraintdef(oid) FROM pg_constraint "
                    "WHERE conname = 'api_keys_environment_check'"
                )
            ).scalar()

            last_used_at = db.execute(
                text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_schema = 'public' AND table_name = 'api_keys' "
                    "AND column_name = 'last_used_at'"
                )
            ).scalar()

            has_index = (
                db.execute(
                    text(
                        "SELECT 1 FROM pg_indexes "
                        "WHERE schemaname = 'public' "
                        "AND indexname = 'idx_api_keys_tenant_env'"
                    )
                ).first()
                is not None
            )

            rls = {
                r[0]: r[1]
                for r in db.execute(
                    text(
                        "SELECT c.relname, c.relrowsecurity "
                        "FROM pg_class c "
                        "JOIN pg_namespace n ON n.oid = c.relnamespace "
                        f"WHERE n.nspname = 'public' AND c.relname IN ({tables_in})"
                    )
                ).fetchall()
            }

            policies = sorted(
                (r[0], r[1])
                for r in db.execute(
                    text(
                        "SELECT tablename, policyname FROM pg_policies "
                        f"WHERE schemaname = 'public' AND tablename IN ({tables_in})"
                    )
                ).fetchall()
            )

            environments = [
                r[0]
                for r in db.execute(text("SELECT DISTINCT environment FROM api_keys"))
            ]
        finally:
            db.rollback()

        # A fresh transaction: proves the migration left nothing behind.
        env_column_after_rollback = db.execute(
            text(
                "SELECT count(*) FROM information_schema.columns "
                "WHERE table_name = 'api_keys' AND column_name = 'environment'"
            )
        ).scalar()
        rls_after_rollback = {
            r[0]: r[1]
            for r in db.execute(
                text(
                    "SELECT c.relname, c.relrowsecurity "
                    "FROM pg_class c "
                    "JOIN pg_namespace n ON n.oid = c.relnamespace "
                    f"WHERE n.nspname = 'public' AND c.relname IN ({tables_in})"
                )
            ).fetchall()
        }

    return {
        "auth_present": auth_present,
        "env_col": env_col,
        "check_def": check_def,
        "last_used_at_nullable": last_used_at,
        "has_index": has_index,
        "rls": rls,
        "policies": policies,
        "environments": environments,
        "env_column_after_rollback": env_column_after_rollback,
        "rls_after_rollback": rls_after_rollback,
    }


@pytest.fixture(scope="module")
def migration_state(_apply_migration, _seed_test_api_key) -> dict:
    return _observe()


# ---------------------------------------------------------------------------
# Migration artifact
# ---------------------------------------------------------------------------


class TestMigrationArtifact:
    def test_migration_file_exists(self):
        assert MIGRATION_FILE.is_file(), f"missing migration: {MIGRATION_FILE}"

    def test_migration_is_listed_in_migrations_readme(self):
        readme = (MIGRATION_FILE.parent / "README.md").read_text(encoding="utf-8")
        assert MIGRATION_FILE.name in readme


# ---------------------------------------------------------------------------
# Static audit of the guard
# ---------------------------------------------------------------------------


class TestGuardStaticAudit:
    def test_guard_checks_for_auth_uid(self):
        code = _code_without_comments()
        assert "to_regprocedure('auth.uid()')" in code
        # The guard must bail out before creating anything.
        assert "RAISE NOTICE" in code
        start, end = _guard_bounds(code)
        body = code[start:end]
        assert "RETURN;" in body
        assert body.index("to_regprocedure") < body.index("RETURN;")
        assert body.index("RETURN;") < body.index("CREATE POLICY")

    def test_no_auth_references_outside_the_guard(self):
        code = _code_without_comments()
        start, end = _guard_bounds(code)
        outside = code[:start] + code[end:]
        assert "auth.uid()" not in outside

    def test_no_create_policy_outside_the_guard(self):
        """A top-level CREATE POLICY would be parsed (and fail) before the
        guard could ever run, which is exactly the vanilla-PostgreSQL bug this
        design exists to prevent."""
        code = _code_without_comments()
        start, end = _guard_bounds(code)
        outside = code[:start] + code[end:]
        assert "CREATE POLICY" not in outside
        assert code.count("CREATE POLICY") == 5

    def test_all_five_policies_are_defined(self):
        code = _code_without_comments()
        for _, policy in EXPECTED_POLICIES:
            assert policy in code

    def test_using_expressions_are_preserved(self):
        normalised = re.sub(r"\s+", " ", _code_without_comments())
        for expected in EXPECTED_POLICY_SQL:
            assert expected in normalised, f"policy drifted: {expected}"

    def test_no_auth_schema_stub(self):
        """The migration must not define a stand-in for Supabase's auth
        schema; it adapts to its absence instead."""
        code = _code_without_comments()
        assert re.search(r"CREATE\s+SCHEMA\s+(IF\s+NOT\s+EXISTS\s+)?auth\b", code) is None
        assert (
            re.search(
                r"CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+auth\s*\.", code, re.IGNORECASE
            )
            is None
        )

    def test_row_level_security_is_unconditional(self):
        # Whitespace-normalised: the migration aligns the ENABLE statements.
        code = re.sub(r"\s+", " ", _code_without_comments())
        start, end = _guard_bounds(code)
        before_guard = code[:start]
        for table in RLS_TABLES:
            assert f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY" in before_guard
        assert end > start


# ---------------------------------------------------------------------------
# Live migration behaviour
# ---------------------------------------------------------------------------


class TestLiveMigrationBehaviour:
    def test_columns_check_and_index_are_created(self, migration_state):
        obs = migration_state
        assert obs["env_col"] is not None, "api_keys.environment missing"
        column_default, is_nullable = obs["env_col"]
        assert column_default is not None and "production" in column_default
        assert is_nullable == "NO"
        assert obs["check_def"] is not None
        assert "'production'" in obs["check_def"]
        assert "'development'" in obs["check_def"]
        assert obs["last_used_at_nullable"] == "YES"
        assert obs["has_index"], "idx_api_keys_tenant_env missing"
        # Backfill: every pre-existing key becomes a production key.
        assert obs["environments"] == ["production"]

    def test_row_level_security_enabled_on_all_five_tables(self, migration_state):
        obs = migration_state
        assert set(obs["rls"]) == set(RLS_TABLES)
        assert all(obs["rls"].values()), f"RLS not enabled: {obs['rls']}"

    def test_policies_follow_auth_availability(self, migration_state):
        """On this database's actual environment: policies exist iff
        `auth.uid()` does. No auth schema stub is ever created to make one
        branch or the other pass."""
        obs = migration_state
        if obs["auth_present"]:
            assert obs["policies"] == sorted(EXPECTED_POLICIES)
        else:
            # Vanilla PostgreSQL: RLS enabled, zero auth-dependent policies.
            assert obs["policies"] == []

    def test_migration_leaves_no_persistent_changes(self, migration_state):
        """Everything runs in one transaction that is rolled back, so the
        shared test schema is exactly as it was — this also proves the file
        needs no committed preamble (such as an auth schema stub)."""
        obs = migration_state
        assert obs["env_column_after_rollback"] == 0
        assert not any(obs["rls_after_rollback"].values())
