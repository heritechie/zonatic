"""Tests for the schema hardening migration.

`supabase/migrations/20260101000010_schema_hardening.sql` moves invariants the
region-id importer already checks in Python down into the database, and adds the
provenance columns the import audit trail lacked.

Two halves are covered, following tests/test_canonical_codes.py:

  * the schema invariant — the constraints declared by the inline schema in
    tests/conftest.py, which is what the test database is actually built from;
  * the migration file itself — executed from its real file so the shipped SQL
    is what gets tested, not a copy of it.

The migration refuses to run rather than guess. If an existing row would break a
new constraint it names the offending codes and aborts before writing anything,
which is asserted here rather than assumed.
"""

from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError

from apps.api.database import SessionLocal
from tests.conftest import (
    ADMIN_CODE_CONSTRAINTS,
    _apply_migration,
    _seed_test_api_key,
    apply_admin_code_constraints,
    drop_admin_code_constraints,
)

MIGRATION_FILE = (
    Path(__file__).resolve().parents[1]
    / "supabase"
    / "migrations"
    / "20260101000010_schema_hardening.sql"
)

# A province chain no other fixture uses, so dropping the constraints here can
# never expose rows belonging to another test module. Every row this module
# inserts carries metadata.source = 'hardening-test', which is what cleanup
# keys on rather than a code range.
PREFIX = "93"
REGENCY = "9311"
OTHER_PROVINCE = "94"


def _constraint_exists(db, name: str) -> bool:
    return (
        db.execute(
            text("SELECT 1 FROM pg_constraint WHERE conname = :n"), {"n": name}
        ).first()
        is not None
    )


def _insert_area(db, code: str, name: str, level: int, parent: str | None) -> None:
    db.execute(
        text(
            "INSERT INTO administrative_areas (code, name, level, parent_code, metadata) "
            "VALUES (:code, :name, :level, :parent, '{\"source\":\"hardening-test\"}')"
        ),
        {"code": code, "name": name, "level": level, "parent": parent},
    )


def _cleanup() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                "DELETE FROM administrative_areas "
                "WHERE metadata->>'source' = 'hardening-test'"
            )
        )
        db.execute(text("DELETE FROM import_runs WHERE source = 'hardening-test'"))
        apply_admin_code_constraints(db)
        db.commit()


def _run_migration() -> None:
    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    with SessionLocal() as db:
        db.execute(text(sql))
        db.commit()


@pytest.fixture(autouse=True)
def _reset():
    """Start and finish every test with the constraints in place."""
    _cleanup()
    yield
    _cleanup()


def _rejects(db, code: str, name: str, level: int, parent: str | None) -> str:
    """Insert a row that a hardening constraint must refuse; return the error."""
    with pytest.raises((DBAPIError, ProgrammingError)) as excinfo:
        _insert_area(db, code, name, level, parent)
    db.rollback()
    return str(excinfo.value)


# ---------------------------------------------------------------------------
# Migration file exists and is wired into the documented order
# ---------------------------------------------------------------------------


class TestMigrationArtifact:
    def test_migration_file_exists(self):
        assert MIGRATION_FILE.is_file(), f"missing migration: {MIGRATION_FILE}"

    def test_migration_is_listed_in_migrations_readme(self):
        readme = (MIGRATION_FILE.parent / "README.md").read_text(encoding="utf-8")
        assert MIGRATION_FILE.name in readme


# ---------------------------------------------------------------------------
# Schema invariant
# ---------------------------------------------------------------------------


class TestAdministrativeCodeConstraints:
    def test_code_length_must_match_level(self, _apply_migration, _seed_test_api_key):
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            db.commit()
            # Three characters is not a regency code.
            assert "administrative_areas_code_level_length" in _rejects(
                db, "931", "Short Regency", 2, PREFIX
            )

    def test_parent_is_required_below_level_one(
        self, _apply_migration, _seed_test_api_key
    ):
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            db.commit()
            assert "administrative_areas_parent_level" in _rejects(
                db, REGENCY, "Orphan Regency", 2, None
            )

    def test_parent_is_forbidden_at_level_one(
        self, _apply_migration, _seed_test_api_key
    ):
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            db.commit()
            assert "administrative_areas_parent" in _rejects(
                db, OTHER_PROVINCE, "Nested Province", 1, PREFIX
            )

    def test_child_code_must_start_with_its_parent(
        self, _apply_migration, _seed_test_api_key
    ):
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            _insert_area(db, OTHER_PROVINCE, "Other Province", 1, None)
            db.commit()
            # Correct length, real parent, wrong prefix.
            assert "administrative_areas_parent_prefix" in _rejects(
                db, "9399", "Misfiled Regency", 2, OTHER_PROVINCE
            )

    def test_valid_hierarchy_is_accepted(self, _apply_migration, _seed_test_api_key):
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            _insert_area(db, REGENCY, "Test Regency", 2, PREFIX)
            db.commit()
            rows = db.execute(
                text(
                    "SELECT code FROM administrative_areas "
                    "WHERE code IN (:a, :b) ORDER BY code"
                ),
                {"a": PREFIX, "b": REGENCY},
            ).fetchall()
        assert [r[0] for r in rows] == [PREFIX, REGENCY]

    def test_staging_table_is_not_constrained(self, _apply_migration):
        """Staging must keep rejecting nothing: invalid rows live there on
        purpose, so the hardening constraints apply to production only."""
        names = {n for n, _ in ADMIN_CODE_CONSTRAINTS}
        with SessionLocal() as db:
            constrained = db.execute(
                text(
                    "SELECT conname FROM pg_constraint "
                    "WHERE conrelid = 'administrative_areas_staging'::regclass"
                )
            ).fetchall()
        assert not {r[0] for r in constrained} & names


# ---------------------------------------------------------------------------
# Provenance columns
# ---------------------------------------------------------------------------


class TestImportRunProvenance:
    def test_level_is_nullable(self, _apply_migration):
        with SessionLocal() as db:
            nullable = db.execute(
                text(
                    "SELECT is_nullable FROM information_schema.columns "
                    "WHERE table_name = 'import_runs' AND column_name = 'level'"
                )
            ).scalar_one()
        assert nullable == "YES"

    def test_repository_and_commit_columns_exist(self, _apply_migration):
        with SessionLocal() as db:
            cols = db.execute(
                text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'import_runs' "
                    "AND column_name IN ('source_repo', 'source_ref')"
                )
            ).fetchall()
        assert {r[0] for r in cols} == {"source_repo", "source_ref"}

    def test_multi_level_run_can_omit_level(self, _apply_migration):
        """A region-id run publishes all four levels in one transaction, so it
        has no single level to record."""
        with SessionLocal() as db:
            db.execute(
                text(
                    "INSERT INTO import_runs "
                    "(id, source, data_version, level, status, source_repo, source_ref) "
                    "VALUES (gen_random_uuid(), 'hardening-test', '1.0.1', NULL, "
                    "'completed', 'https://github.com/lokabisa-oss/region-id', "
                    "'f20ebb8')"
                )
            )
            row = db.execute(
                text(
                    "SELECT level, source_repo, source_ref FROM import_runs "
                    "WHERE source = 'hardening-test'"
                )
            ).fetchone()
            db.rollback()
        assert row[0] is None
        assert row[1].endswith("/region-id")
        assert row[2] == "f20ebb8"


# ---------------------------------------------------------------------------
# Indexes
# ---------------------------------------------------------------------------


class TestIndexes:
    def test_redundant_postal_index_is_dropped(self, _apply_migration):
        with SessionLocal() as db:
            found = db.execute(
                text(
                    "SELECT 1 FROM pg_indexes "
                    "WHERE tablename = 'postal_codes' AND indexname = 'idx_postal_codes_code'"
                )
            ).first()
        assert found is None

    def test_unique_constraint_still_indexes_postal_code(self, _apply_migration):
        with SessionLocal() as db:
            found = db.execute(
                text(
                    "SELECT 1 FROM pg_indexes "
                    "WHERE tablename = 'postal_codes' AND indexname = 'postal_codes_code_key'"
                )
            ).first()
        assert found is not None

    def test_name_search_uses_a_trigram_index(self, _apply_migration):
        """Every name lookup is an ILIKE, which a btree cannot serve."""
        with SessionLocal() as db:
            indexdef = db.execute(
                text(
                    "SELECT indexdef FROM pg_indexes "
                    "WHERE indexname = 'administrative_areas_name_trgm_idx'"
                )
            ).scalar_one_or_none()
        assert indexdef is not None
        assert "gin" in indexdef
        assert "gin_trgm_ops" in indexdef


# ---------------------------------------------------------------------------
# Migration file behaviour
# ---------------------------------------------------------------------------


class TestMigrationBehaviour:
    def test_migration_is_idempotent(self, _apply_migration, _seed_test_api_key):
        _run_migration()
        with SessionLocal() as db:
            first = sorted(
                r[0] for r in db.execute(
                    text(
                        "SELECT conname FROM pg_constraint "
                        "WHERE conrelid = 'administrative_areas'::regclass"
                    )
                ).fetchall()
            )
        _run_migration()
        with SessionLocal() as db:
            second = sorted(
                r[0] for r in db.execute(
                    text(
                        "SELECT conname FROM pg_constraint "
                        "WHERE conrelid = 'administrative_areas'::regclass"
                    )
                ).fetchall()
            )
        assert first == second

    def test_migration_aborts_on_violation_without_modifying_data(
        self, _apply_migration, _seed_test_api_key
    ):
        """The guard must name the offending code and change nothing, so an
        operator is told which rows to fix instead of a bare failure."""
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            db.commit()
            drop_admin_code_constraints(db)
            # Three characters at level 2 breaks the length invariant.
            _insert_area(db, "931", "Short Regency", 2, PREFIX)
            db.commit()

        with pytest.raises((DBAPIError, ProgrammingError)) as excinfo:
            _run_migration()
        assert "931" in str(excinfo.value)

        with SessionLocal() as db:
            db.rollback()
            # Nothing was dropped, so the offending row survives untouched.
            survivor = db.execute(
                text(
                    "SELECT code FROM administrative_areas WHERE code = '931'"
                )
            ).fetchone()
            # And the constraints were never declared: the guard ran first.
            still_missing = not _constraint_exists(
                db, "administrative_areas_code_level_length"
            )
        assert survivor is not None
        assert still_missing

    def test_accepted_rows_survive_a_successful_run(
        self, _apply_migration, _seed_test_api_key
    ):
        with SessionLocal() as db:
            _insert_area(db, PREFIX, "Test Province", 1, None)
            _insert_area(db, REGENCY, "Test Regency", 2, PREFIX)
            db.commit()

        _run_migration()

        with SessionLocal() as db:
            rows = db.execute(
                text(
                    "SELECT code, name FROM administrative_areas "
                    "WHERE code IN (:a, :b) ORDER BY code"
                ),
                {"a": PREFIX, "b": REGENCY},
            ).fetchall()
        assert rows == [(PREFIX, "Test Province"), (REGENCY, "Test Regency")]
