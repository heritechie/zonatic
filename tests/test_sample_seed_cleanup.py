"""Tests for the sample seed cleanup migration.

`supabase/migrations/20260101000012_cleanup_sample_seed.sql` sits between the
schema chain and the real imports (region-id, then postal-code-id). It must
remove exactly the placeholder rows the sample seed created:

  * the three sample postal/area relations, matched by explicit business key
    AND the `metadata->>'source' = 'sample'` marker;
  * every postal code with `source = 'sample'` (FK cascade takes any remaining
    relations);
  * every administrative area with `source = 'sample'`.

and nothing else. In particular it must never key on `level < 4` (the seed
includes a level 2 area, real data includes levels 1-3) or on
`geometry IS NOT NULL` (real region-id rows carry no geometry at all).

Every test runs inside a single transaction that is rolled back, so the
shared test database is untouched — including when this module has to delete
codes that other modules seeded, to insert its own fixture versions.
"""

import re
from pathlib import Path

import pytest
from sqlalchemy import text

from apps.api.database import SessionLocal
from tests.conftest import _apply_migration

MIGRATION_FILE = (
    Path(__file__).resolve().parents[1]
    / "supabase"
    / "migrations"
    / "20260101000012_cleanup_sample_seed.sql"
)

# Codes this module owns. Deleting them (and only them) inside the rolled-back
# transaction makes room for the fixture versions regardless of what other
# test modules committed earlier.
SAMPLE_AREA_CODES = ("31", "3171", "317101", "3171011001", "3171011002")
SAMPLE_POSTAL_CODES = ("10110", "10210", "10270")
DECOY_AREA_CODES = ("91", "9111", "911101", "9111010001")
DECOY_POSTAL_CODES = ("91880", "91999")

# The three relations the sample seed created, in canonical form (0009 runs
# before 0012 in the chain).
SAMPLE_PAIRS = (("10110", "3171"), ("10210", "317101"), ("10270", "3171011001"))


def _in_list(values: tuple[str, ...]) -> str:
    return ", ".join(f"'{v}'" for v in values)


def _clear(db) -> None:
    """Empty the fixture tables inside the transaction every test rolls back,
    so the fixture versions can be inserted regardless of what other test
    modules committed earlier.

    Children go before parents: `administrative_areas.parent_code` is a
    self-referential FK with an immediate check. The postal wipe and the area
    wipe both cascade into `postal_code_areas` (FK ON DELETE CASCADE). Nothing
    here is ever committed — each test's finally-block rolls the whole
    transaction back, restoring every row this deleted."""
    for level in (4, 3, 2, 1):
        db.execute(
            text(f"DELETE FROM administrative_areas WHERE level = {level}")
        )
    db.execute(text("DELETE FROM postal_codes"))


def _insert_area(
    db,
    code: str,
    name: str,
    level: int,
    parent: str | None,
    source: str,
    geometry: str = "NULL",
) -> None:
    parent_sql = f"'{parent}'" if parent is not None else "NULL"
    # Single-quoted literals only: every value here is a trusted constant from
    # this file, and text() treats ":word" as a bind parameter.
    db.execute(
        text(
            "INSERT INTO administrative_areas "
            "(code, name, level, parent_code, geometry, metadata) VALUES "
            f"('{code}', '{name}', {level}, {parent_sql}, {geometry}, "
            f"'{{\"source\":\"{source}\"}}')"
        )
    )


def _insert_postal(db, code: str, source: str) -> None:
    db.execute(
        text(
            "INSERT INTO postal_codes (code, metadata) VALUES "
            f"('{code}', '{{\"source\":\"{source}\"}}')"
        )
    )


def _insert_relation(db, postal_code: str, area_code: str) -> None:
    db.execute(
        text(
            "INSERT INTO postal_code_areas (postal_code_id, administrative_area_id) "
            "SELECT pc.id, aa.id FROM postal_codes pc, administrative_areas aa "
            f"WHERE pc.code = '{postal_code}' AND aa.code = '{area_code}'"
        )
    )


def _relations(db) -> list[tuple[str, str]]:
    rows = db.execute(
        text(
            "SELECT pc.code, aa.code "
            "FROM postal_code_areas pca "
            "JOIN postal_codes pc ON pc.id = pca.postal_code_id "
            "JOIN administrative_areas aa ON aa.id = pca.administrative_area_id "
            "ORDER BY pc.code, aa.code"
        )
    ).fetchall()
    return [(r[0], r[1]) for r in rows]


def _count(db, table: str) -> int:
    return db.execute(text(f"SELECT count(*) FROM {table}")).scalar()


def _codes(db, table: str, codes: tuple[str, ...]) -> set[str]:
    rows = db.execute(
        text(
            f"SELECT code FROM {table} "
            f"WHERE code IN ({_in_list(codes)}) ORDER BY code"
        )
    ).fetchall()
    return {r[0] for r in rows}


def _run_migration(db) -> None:
    sql = MIGRATION_FILE.read_text(encoding="utf-8")
    db.execute(text(sql))


# ---------------------------------------------------------------------------
# Fixture builders (all inside the test's transaction)
# ---------------------------------------------------------------------------


def _seed_sample_areas(db, include_null_geometry_sample: bool = True) -> None:
    rectangles = {
        "31": "POLYGON((106.70 -6.40, 106.98 -6.40, 106.98 -6.10, 106.70 -6.10, 106.70 -6.40))",
        "3171": "POLYGON((106.78 -6.25, 106.90 -6.25, 106.90 -6.12, 106.78 -6.12, 106.78 -6.25))",
        "317101": "POLYGON((106.79 -6.22, 106.84 -6.22, 106.84 -6.17, 106.79 -6.17, 106.79 -6.22))",
        "3171011001": "POLYGON((106.79 -6.20, 106.82 -6.20, 106.82 -6.18, 106.79 -6.18, 106.79 -6.20))",
    }

    def geom(wkt: str) -> str:
        return f"ST_Multi(ST_GeomFromText('{wkt}', 4326))"

    _insert_area(db, "31", "DKI Jakarta", 1, None, "sample", geom(rectangles["31"]))
    _insert_area(
        db, "3171", "Kota Administrasi Jakarta Pusat", 2, "31", "sample",
        geom(rectangles["3171"]),
    )
    _insert_area(
        db, "317101", "Kecamatan Tanah Abang", 3, "3171", "sample",
        geom(rectangles["317101"]),
    )
    _insert_area(
        db, "3171011001", "Kelurahan Gelora", 4, "317101", "sample",
        geom(rectangles["3171011001"]),
    )
    if include_null_geometry_sample:
        # A level 4 sample row without geometry: a `level < 4` predicate would
        # spare it, and `geometry IS NOT NULL` would spare it too. The source
        # marker alone must be enough to delete it.
        _insert_area(db, "3171011002", "Kelurahan Fixture", 4, "317101", "sample")


def _seed_decoy_chain(db, geometry_on_level_two: bool = True) -> None:
    """A production-shaped chain: region-id sources, no geometry — except the
    level 2 row optionally carries geometry, so a `geometry IS NOT NULL`
    predicate in the DELETE would be caught."""
    _insert_area(db, "91", "Kalimantan Utara", 1, None, "region-id")
    _insert_area(
        db,
        "9111",
        "Kabupaten Fixture",
        2,
        "91",
        "region-id",
        "ST_Multi(ST_GeomFromText('POLYGON((117.00 3.00, 117.50 3.00, 117.50 2.50, 117.00 2.50, 117.00 3.00))', 4326))"
        if geometry_on_level_two
        else "NULL",
    )
    _insert_area(db, "911101", "Kecamatan Fixture", 3, "9111", "region-id")
    _insert_area(db, "9111010001", "Desa Fixture", 4, "911101", "region-id")


def _seed_sample_postals(db) -> None:
    for code in SAMPLE_POSTAL_CODES:
        _insert_postal(db, code, "sample")


def _seed_decoy_postals(db) -> None:
    for code in DECOY_POSTAL_CODES:
        _insert_postal(db, code, "pos_indonesia")


# ---------------------------------------------------------------------------
# Migration artifact
# ---------------------------------------------------------------------------


class TestMigrationArtifact:
    def test_migration_file_exists(self):
        assert MIGRATION_FILE.is_file(), f"missing migration: {MIGRATION_FILE}"

    def test_migration_is_listed_in_migrations_readme(self):
        readme = (MIGRATION_FILE.parent / "README.md").read_text(encoding="utf-8")
        assert MIGRATION_FILE.name in readme

    def test_migration_does_not_use_forbidden_predicates(self):
        """Deletion must key on the sample source marker only — never on
        `level` and never on `geometry`."""
        sql = MIGRATION_FILE.read_text(encoding="utf-8")
        code = "\n".join(re.sub(r"--.*$", "", line) for line in sql.splitlines())
        assert "level" not in code.lower()
        assert "geometry" not in code.lower()

    def test_cleanup_predicates_are_source_and_business_key_only(self):
        code = "\n".join(
            re.sub(r"--.*$", "", line)
            for line in MIGRATION_FILE.read_text(encoding="utf-8").splitlines()
        )
        # The three business keys, guarded on both sides with the marker.
        for postal, area in SAMPLE_PAIRS:
            assert f"'{postal}'" in code
            assert f"'{area}'" in code
        assert code.count("metadata ->> 'source' = 'sample'") == 4


# ---------------------------------------------------------------------------
# Full cleanup scenario
# ---------------------------------------------------------------------------


class TestSampleSeedCleanup:
    def test_only_sample_rows_are_removed(self, _apply_migration):
        with SessionLocal() as db:
            try:
                _clear(db)
                _seed_sample_areas(db)
                _seed_sample_postals(db)
                _seed_decoy_chain(db)
                _seed_decoy_postals(db)
                for postal, area in SAMPLE_PAIRS:
                    _insert_relation(db, postal, area)
                _insert_relation(db, "91880", "9111010001")

                _run_migration(db)

                # Relations: only the decoy production-shaped pair survives.
                assert _relations(db) == [("91880", "9111010001")]
                # No sample rows anywhere.
                assert (
                    db.execute(
                        text(
                            "SELECT count(*) FROM administrative_areas "
                            "WHERE metadata->>'source' = 'sample'"
                        )
                    ).scalar()
                    == 0
                )
                assert (
                    db.execute(
                        text(
                            "SELECT count(*) FROM postal_codes "
                            "WHERE metadata->>'source' = 'sample'"
                        )
                    ).scalar()
                    == 0
                )
                # Every decoy row survived: level 1-4 chain (a `level < 4`
                # predicate would have deleted 91/9111/911101), the geometry
                # carrying level 2 row (a `geometry IS NOT NULL` predicate
                # would have deleted it), and both postal codes.
                assert _codes(db, "administrative_areas", DECOY_AREA_CODES) == set(
                    DECOY_AREA_CODES
                )
                assert _codes(db, "postal_codes", DECOY_POSTAL_CODES) == set(
                    DECOY_POSTAL_CODES
                )
            finally:
                db.rollback()

    def test_migration_is_idempotent_and_leaves_later_rows_alone(
        self, _apply_migration
    ):
        with SessionLocal() as db:
            try:
                _clear(db)
                _seed_decoy_chain(db)
                _seed_decoy_postals(db)
                _insert_relation(db, "91880", "9111010001")
                baseline = _relations(db)
                areas = _count(db, "administrative_areas")
                postals = _count(db, "postal_codes")

                _run_migration(db)
                _run_migration(db)

                assert _relations(db) == baseline
                assert _count(db, "administrative_areas") == areas
                assert _count(db, "postal_codes") == postals

                # Rows imported after the cleanup are never touched by a
                # re-run — the production shape (zero sample rows) is exactly
                # this state.
                _insert_area(db, "92", "Papua", 1, None, "region-id")
                _insert_postal(db, "92000", "pos_indonesia")
                _run_migration(db)
                assert _codes(db, "administrative_areas", ("92",)) == {"92"}
                assert _codes(db, "postal_codes", ("92000",)) == {"92000"}
            finally:
                db.rollback()


# ---------------------------------------------------------------------------
# Guard behaviour on mixed rows
# ---------------------------------------------------------------------------


class TestGuardPredicates:
    def test_relation_with_sample_area_removes_only_the_relation(
        self, _apply_migration
    ):
        """Business key (10270, 3171011001): the area side is sample, the
        postal side is a legitimate row. The relation and the sample areas go;
        the legitimate postal code stays."""
        with SessionLocal() as db:
            try:
                _clear(db)
                # The level 4 code needs its parent chain (0010 constraints).
                _seed_sample_areas(db, include_null_geometry_sample=False)
                _insert_postal(db, "10270", "pos_indonesia")
                _insert_relation(db, "10270", "3171011001")

                _run_migration(db)

                assert _relations(db) == []
                assert _codes(db, "postal_codes", ("10270",)) == {"10270"}
                assert (
                    _codes(db, "administrative_areas", SAMPLE_AREA_CODES[:4]) == set()
                )
            finally:
                db.rollback()

    def test_relation_with_sample_postal_removes_only_the_relation(
        self, _apply_migration
    ):
        """Postal side sample, area side legitimate: the postal row goes and
        the FK cascade takes the relation; the area chain survives."""
        with SessionLocal() as db:
            try:
                _clear(db)
                _seed_decoy_chain(db, geometry_on_level_two=False)
                _insert_postal(db, "10110", "sample")
                _insert_relation(db, "10110", "9111010001")

                _run_migration(db)

                assert _relations(db) == []
                assert _codes(db, "postal_codes", ("10110",)) == set()
                assert _codes(db, "administrative_areas", DECOY_AREA_CODES) == set(
                    DECOY_AREA_CODES
                )
            finally:
                db.rollback()

    def test_noop_without_sample_rows(self, _apply_migration):
        """The production analogue: a database that already ran the imports
        has zero source='sample' rows, and the migration changes nothing."""
        with SessionLocal() as db:
            try:
                _clear(db)
                _seed_decoy_chain(db)
                _seed_decoy_postals(db)
                _insert_relation(db, "91880", "9111010001")
                before_relations = _relations(db)
                before_areas = _count(db, "administrative_areas")
                before_postals = _count(db, "postal_codes")

                _run_migration(db)

                assert _relations(db) == before_relations
                assert _count(db, "administrative_areas") == before_areas
                assert _count(db, "postal_codes") == before_postals
            finally:
                db.rollback()
