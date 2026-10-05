"""Tests for the canonical administrative code representation.

The public API contract forbids "." in administrative codes. These tests cover
both halves of the guarantee:

  * the schema invariant — `administrative_areas.code` and `parent_code` reject
    dotted values at the database level;
  * the data migration — pre-existing dotted rows (such as the placeholder
    sample seed from 20260101000003_sample_data.sql) are converted in place,
    with the `parent_code` hierarchy preserved.

The migration is executed from its real file so the shipped SQL is what gets
tested, not a copy of it.
"""

from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError, ProgrammingError

from apps.api.database import SessionLocal
from apps.api.dependencies import TEST_API_KEY
from apps.api.main import app
from tests.conftest import _apply_migration, _seed_test_api_key

client = TestClient(app)

MIGRATION_FILE = (
    Path(__file__).resolve().parents[1]
    / "supabase"
    / "migrations"
    / "20260101000009_canonical_area_codes.sql"
)

# A dotted four-level chain under province codes that no other fixture uses, so
# converting them can never collide with the shared Jakarta/Bandung fixtures.
DOTTED_PROVINCE = "91"
DOTTED_PREFIX = "91.11"
CANONICAL_CHAIN = ["9111", "911101", "9111012001"]

COLLISION_PROVINCE = "92"
COLLISION_DOTTED = "92.11"
COLLISION_CANONICAL = "9211"


def _auth(key: str = TEST_API_KEY) -> dict[str, str]:
    return {"Authorization": f"Bearer {key}"}


@pytest.fixture(autouse=True)
def _clean_fixtures():
    """Reset this module's rows and re-establish the schema invariant.

    The dotted-code fixtures legitimately require the canonical-code CHECK to
    be absent, so it is restored here rather than inside the fixture helper. A
    failed test must not leave the constraint dropped for the rest of the run.
    """
    _delete_fixtures()
    _ensure_canonical_check()
    yield
    _delete_fixtures()
    _ensure_canonical_check()


def _delete_fixtures() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                "DELETE FROM administrative_areas "
                "WHERE code LIKE '91%' OR code LIKE '92%'"
            )
        )
        db.commit()


def _constraint_exists(db, name: str) -> bool:
    return (
        db.execute(text("SELECT 1 FROM pg_constraint WHERE conname = :n"), {"n": name}).first()
        is not None
    )


def _ensure_canonical_check() -> None:
    """Re-add the canonical-code CHECKs if a test left them dropped."""
    with SessionLocal() as db:
        if not _constraint_exists(db, "administrative_areas_code_canonical"):
            db.execute(
                text(
                    "ALTER TABLE administrative_areas ADD CONSTRAINT "
                    "administrative_areas_code_canonical CHECK (code !~ '\\.')"
                )
            )
            db.commit()
        if not _constraint_exists(db, "administrative_areas_parent_code_canonical"):
            db.execute(
                text(
                    "ALTER TABLE administrative_areas ADD CONSTRAINT "
                    "administrative_areas_parent_code_canonical "
                    "CHECK (parent_code IS NULL OR parent_code !~ '\\.')"
                )
            )
            db.commit()


def _drop_canonical_check(db) -> None:
    """Drop the canonical-code CHECKs so dotted fixtures can be inserted.

    A database created before this constraint existed accepted dotted codes, so
    the fixture has to reproduce that pre-migration state for the migration
    tests to mean anything. The migration is what puts the invariant back.
    """
    db.execute(
        text(
            "ALTER TABLE administrative_areas "
            "DROP CONSTRAINT IF EXISTS administrative_areas_code_canonical"
        )
    )
    db.execute(
        text(
            "ALTER TABLE administrative_areas "
            "DROP CONSTRAINT IF EXISTS administrative_areas_parent_code_canonical"
        )
    )


def _insert_row(db, code: str, name: str, level: int, parent: str | None) -> None:
    db.execute(
        text(
            "INSERT INTO administrative_areas (code, name, level, parent_code, metadata) "
            "VALUES (:code, :name, :level, :parent, '{\"source\":\"test\"}')"
        ),
        {"code": code, "name": name, "level": level, "parent": parent},
    )


def _insert_dotted_chain() -> None:
    """Insert a dotted province/regency/district/village chain.

    Rows go in shallowest-first so the `parent_code` self-reference resolves at
    every step, exactly as the sample seed does. Leaves the canonical-code
    constraint dropped, which is the state `_run_migration` expects to repair.
    """
    with SessionLocal() as db:
        _drop_canonical_check(db)
        _insert_row(db, DOTTED_PROVINCE, "Dotted Province", 1, None)
        _insert_row(db, DOTTED_PREFIX, "Dotted Mempurna", 2, DOTTED_PROVINCE)
        _insert_row(db, f"{DOTTED_PREFIX}.01", "Dotted Kecamatan", 3, DOTTED_PREFIX)
        _insert_row(
            db, f"{DOTTED_PREFIX}.01.2001", "Dotted Kelurahan", 4, f"{DOTTED_PREFIX}.01"
        )
        db.commit()


def _insert_colliding_pair() -> None:
    """A dotted regency sitting beside its own already-canonical twin."""
    with SessionLocal() as db:
        _drop_canonical_check(db)
        _insert_row(db, COLLISION_PROVINCE, "Collision Province", 1, None)
        _insert_row(db, COLLISION_DOTTED, "Dotted Mempurna", 2, COLLISION_PROVINCE)
        db.commit()
    with SessionLocal() as db:
        _insert_row(db, COLLISION_CANONICAL, "Canonical Twin", 2, COLLISION_PROVINCE)
        db.commit()


def _run_migration() -> None:
    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    with SessionLocal() as db:
        db.execute(text(sql))
        db.commit()


def _fetch(code: str) -> dict | None:
    with SessionLocal() as db:
        row = db.execute(
            text(
                "SELECT code, name, level, parent_code FROM administrative_areas "
                "WHERE code = :code"
            ),
            {"code": code},
        ).mappings().first()
        return dict(row) if row else None


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


class TestSchemaInvariant:
    def test_dotted_code_is_rejected_by_the_database(self, _apply_migration, _seed_test_api_key):
        with SessionLocal() as db:
            with pytest.raises((DBAPIError, ProgrammingError)):
                _insert_row(db, "91.99", "Dotted Province", 1, None)
            db.rollback()

    def test_dotted_parent_code_is_rejected_by_the_database(
        self, _apply_migration, _seed_test_api_key
    ):
        with SessionLocal() as db:
            with pytest.raises((DBAPIError, ProgrammingError)):
                _insert_row(db, "9199", "Undotted", 2, "91.99")
            db.rollback()

    def test_undotted_code_is_accepted(self, _apply_migration, _seed_test_api_key):
        with SessionLocal() as db:
            _insert_row(db, "91", "Undotted Province", 1, None)
            db.commit()
        assert _fetch("91") is not None


# ---------------------------------------------------------------------------
# Data migration
# ---------------------------------------------------------------------------


class TestDataMigration:
    def test_dotted_rows_are_converted(self, _apply_migration, _seed_test_api_key):
        _insert_dotted_chain()
        assert _fetch("91.11.01.2001") is not None

        _run_migration()

        assert _fetch("91.11") is None
        assert _fetch("91.11.01") is None
        assert _fetch("91.11.01.2001") is None
        for code in CANONICAL_CHAIN:
            assert _fetch(code) is not None, f"missing canonical code {code}"

    def test_parent_chain_is_preserved(self, _apply_migration, _seed_test_api_key):
        _insert_dotted_chain()
        _run_migration()

        assert _fetch("9111012001")["parent_code"] == "911101"
        assert _fetch("911101")["parent_code"] == "9111"
        assert _fetch("9111")["parent_code"] == "91"
        assert _fetch("91")["parent_code"] is None

    def test_no_orphaned_parents_after_conversion(self, _apply_migration, _seed_test_api_key):
        _insert_dotted_chain()
        _run_migration()
        with SessionLocal() as db:
            orphans = db.execute(
                text(
                    "SELECT count(*) FROM administrative_areas a "
                    "LEFT JOIN administrative_areas p ON p.code = a.parent_code "
                    "WHERE a.parent_code IS NOT NULL AND p.id IS NULL"
                )
            ).scalar_one()
        assert orphans == 0

    def test_migration_is_idempotent(self, _apply_migration, _seed_test_api_key):
        _insert_dotted_chain()
        _run_migration()
        first = _fetch("9111012001")
        _run_migration()
        assert _fetch("9111012001") == first

    def test_hierarchy_is_canonical_after_migration(self, _apply_migration, _seed_test_api_key):
        """The converted chain must resolve through the public hierarchy."""
        _insert_dotted_chain()
        _run_migration()

        resp = client.get("/v1/areas/9111012001", headers=_auth())
        assert resp.status_code == 200
        data = resp.json()["data"]
        assert data["code"] == "9111012001"
        assert data["level"] == "village"
        h = data["hierarchy"]
        assert h["province"]["code"] == "91"
        assert h["regency"]["code"] == "9111"
        assert h["district"]["code"] == "911101"
        assert h["village"]["code"] == "9111012001"
        for node in h.values():
            assert "." not in node["code"]

    def test_converted_areas_are_searchable(self, _apply_migration, _seed_test_api_key):
        _insert_dotted_chain()
        _run_migration()

        resp = client.get("/v1/areas", params={"q": "Dotted Kelurahan"}, headers=_auth())
        assert resp.status_code == 200
        codes = [d["code"] for d in resp.json()["data"]]
        assert codes == ["9111012001"]

    def test_migration_aborts_on_collision_without_modifying_data(
        self, _apply_migration, _seed_test_api_key
    ):
        """A dotted row sitting next to its own canonical twin cannot be
        resolved automatically; the migration must refuse rather than guess."""
        _insert_colliding_pair()
        assert _fetch(COLLISION_DOTTED) is not None
        assert _fetch(COLLISION_CANONICAL) is not None

        with pytest.raises((DBAPIError, ProgrammingError)) as excinfo:
            _run_migration()
        assert "collide" in str(excinfo.value)

        # Nothing was rewritten: both spellings survive untouched.
        assert _fetch(COLLISION_DOTTED) is not None
        assert _fetch(COLLISION_CANONICAL) is not None