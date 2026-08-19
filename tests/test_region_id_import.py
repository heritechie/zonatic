"""Tests for the region-id CSV importer."""

import json
import textwrap
from pathlib import Path

import pytest
from sqlalchemy import text

from app.database import SessionLocal
from app.importers.region_id import (
    RegionIdImportError,
    _level_rows,
    _validate_rows,
    import_region_id,
    read_csv_file,
)
from tests.conftest import _apply_migration, _seed_test_api_key

CSV_DIR_NAMES = ("provinces.csv", "regencies.csv", "districts.csv", "villages.csv")


def _write_csv(path: Path, content: str) -> None:
    path.write_text(textwrap.dedent(content), encoding="utf-8")


def _make_csvs(
    tmp_path: Path,
    provinces: str = "",
    regencies: str = "",
    districts: str = "",
    villages: str = "",
) -> None:
    if provinces:
        _write_csv(tmp_path / "provinces.csv", provinces)
    if regencies:
        _write_csv(tmp_path / "regencies.csv", regencies)
    if districts:
        _write_csv(tmp_path / "districts.csv", districts)
    if villages:
        _write_csv(tmp_path / "villages.csv", villages)


def _reset_area_data() -> None:
    with SessionLocal() as db:
        db.execute(text("DELETE FROM administrative_areas"))
        db.execute(text("DELETE FROM import_runs"))
        db.commit()


def _count_areas() -> int:
    with SessionLocal() as db:
        return db.execute(text("SELECT COUNT(*) FROM administrative_areas")).scalar_one()


def _get_area(code: str) -> dict | None:
    with SessionLocal() as db:
        row = db.execute(
            text("SELECT code, name, level, parent_code, metadata FROM administrative_areas WHERE code = :code"),
            {"code": code},
        ).mappings().first()
        return dict(row) if row else None


GOOD_PROVINCES = """\
code,name,capital
11,ACEH,Banda Aceh
"""
GOOD_REGENCIES = """\
code,province_code,name,capital,type,is_administrative
1101,11,KAB. ACEH SELATAN,Tapak Tuan,kabupaten,true
"""
GOOD_DISTRICTS = """\
code,regency_code,name
110101,1101,KEC. SAMADUA
"""
GOOD_VILLAGES = """\
code,district_code,name,type
1101012001,110101,GAMpong BARO,desa
"""


def _good_csvs(tmp: Path) -> None:
    _make_csvs(tmp, GOOD_PROVINCES, GOOD_REGENCIES, GOOD_DISTRICTS, GOOD_VILLAGES)


# ---------------------------------------------------------------------------
# CSV parsing
# ---------------------------------------------------------------------------


class TestCsvParsing:
    def test_read_provinces_csv(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", GOOD_PROVINCES)
        rows = read_csv_file(tmp_path / "provinces.csv", 1)
        assert len(rows) == 1
        assert rows[0]["code"] == "11"
        assert rows[0]["name"] == "ACEH"
        assert rows[0]["capital"] == "Banda Aceh"

    def test_read_regencies_csv(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "regencies.csv", GOOD_REGENCIES)
        rows = read_csv_file(tmp_path / "regencies.csv", 2)
        assert len(rows) == 1
        assert rows[0]["code"] == "1101"
        assert rows[0]["province_code"] == "11"
        assert rows[0]["type"] == "kabupaten"

    def test_read_villages_csv(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "villages.csv", GOOD_VILLAGES)
        rows = read_csv_file(tmp_path / "villages.csv", 4)
        assert len(rows) == 1
        assert rows[0]["code"] == "1101012001"
        assert rows[0]["type"] == "desa"

    def test_missing_file_raises(self, tmp_path: Path) -> None:
        with pytest.raises(FileNotFoundError):
            read_csv_file(tmp_path / "provinces.csv", 1)

    def test_empty_csv_raises(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", "")
        with pytest.raises(ValueError, match="kosong"):
            read_csv_file(tmp_path / "provinces.csv", 1)


# ---------------------------------------------------------------------------
# Expected columns validation
# ---------------------------------------------------------------------------


class TestColumnValidation:
    def test_missing_required_column(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", "name,capital\nACEH,Banda Aceh\n")
        with pytest.raises(ValueError, match="Kolom tidak ditemukan"):
            read_csv_file(tmp_path / "provinces.csv", 1)

    def test_extra_columns_are_ignored(self, tmp_path: Path) -> None:
        _write_csv(
            tmp_path / "provinces.csv",
            "code,name,capital,extra_col\n11,ACEH,Banda Aceh,xyz\n",
        )
        rows = read_csv_file(tmp_path / "provinces.csv", 1)
        assert len(rows) == 1

    def test_regency_missing_province_code(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "regencies.csv", "code,name\n1101,KAB. ACEH SELATAN\n")
        with pytest.raises(ValueError, match="province_code"):
            read_csv_file(tmp_path / "regencies.csv", 2)


# ---------------------------------------------------------------------------
# Code validation
# ---------------------------------------------------------------------------


class TestCodeValidation:
    def test_province_code_length(self, tmp_path: Path) -> None:
        _make_csvs(tmp_path, "code,name,capital\n111,ACEH,Banda Aceh\n")
        rows = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        errors = _validate_rows({1: rows, 2: [], 3: [], 4: []})
        assert any("panjang 3" in e and "diharapkan 2" in e for e in errors)

    def test_regency_code_length(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", GOOD_PROVINCES)
        _write_csv(tmp_path / "regencies.csv", "code,province_code,name\n110,11,KAB. TEST\n")
        rows2 = _level_rows(tmp_path, 2, "region-id", "1.0.1")
        rows1 = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        errors = _validate_rows({1: rows1, 2: rows2, 3: [], 4: []})
        assert any("panjang 3" in e and "diharapkan 4" in e for e in errors)

    def test_non_numeric_code(self, tmp_path: Path) -> None:
        _make_csvs(tmp_path, "code,name,capital\nAB,ACEH,Banda Aceh\n")
        rows = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        errors = _validate_rows({1: rows, 2: [], 3: [], 4: []})
        assert any("bukan angka" in e for e in errors)

    def test_empty_code(self, tmp_path: Path) -> None:
        _make_csvs(tmp_path, "code,name,capital\n,ACEH,Banda Aceh\n")
        rows = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        errors = _validate_rows({1: rows, 2: [], 3: [], 4: []})
        assert any("kode kosong" in e for e in errors)

    def test_empty_name(self, tmp_path: Path) -> None:
        _make_csvs(tmp_path, "code,name,capital\n11,,Banda Aceh\n")
        rows = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        errors = _validate_rows({1: rows, 2: [], 3: [], 4: []})
        assert any("nama kosong" in e for e in errors)


# ---------------------------------------------------------------------------
# Hierarchy validation
# ---------------------------------------------------------------------------


class TestHierarchyValidation:
    def test_valid_hierarchy(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        rows = {}
        for level in range(1, 5):
            rows[level] = _level_rows(tmp_path, level, "region-id", "1.0.1")
        errors = _validate_rows(rows)
        assert errors == []

    def test_missing_parent(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", GOOD_PROVINCES)
        _write_csv(
            tmp_path / "regencies.csv",
            "code,province_code,name\n9901,99,KAB. MISSING PARENT\n",
        )
        rows1 = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        rows2 = _level_rows(tmp_path, 2, "region-id", "1.0.1")
        errors = _validate_rows({1: rows1, 2: rows2, 3: [], 4: []})
        assert any("parent_code '99' tidak ditemukan" in e for e in errors)

    def test_missing_parent_at_district(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", GOOD_PROVINCES)
        _write_csv(tmp_path / "regencies.csv", GOOD_REGENCIES)
        _write_csv(
            tmp_path / "districts.csv",
            "code,regency_code,name\n110101,9901,KEC. MISSING\n",
        )
        rows = {}
        for level in range(1, 4):
            rows[level] = _level_rows(tmp_path, level, "region-id", "1.0.1")
        rows[4] = []
        errors = _validate_rows(rows)
        assert any("parent_code '9901' tidak ditemukan" in e for e in errors)

    def test_empty_parent_code(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", GOOD_PROVINCES)
        _write_csv(tmp_path / "regencies.csv", "code,province_code,name\n1101,,KAB. TEST\n")
        rows1 = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        rows2 = _level_rows(tmp_path, 2, "region-id", "1.0.1")
        errors = _validate_rows({1: rows1, 2: rows2, 3: [], 4: []})
        assert any("parent_code kosong" in e for e in errors)


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------


class TestDuplicateDetection:
    def test_duplicate_codes_in_same_file(self, tmp_path: Path) -> None:
        _make_csvs(
            tmp_path,
            "code,name,capital\n11,ACEH,Banda Aceh\n11,ACEH LAIN,Banda Aceh\n",
        )
        rows = _level_rows(tmp_path, 1, "region-id", "1.0.1")
        errors = _validate_rows({1: rows, 2: [], 3: [], 4: []})
        assert any("duplikat" in e for e in errors)

    def test_no_duplicate_across_levels(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        rows = {}
        for level in range(1, 5):
            rows[level] = _level_rows(tmp_path, level, "region-id", "1.0.1")
        errors = _validate_rows(rows)
        assert not any("duplikat" in e for e in errors)


# ---------------------------------------------------------------------------
# Integration: full import
# ---------------------------------------------------------------------------


class TestFullImport:
    @pytest.fixture(autouse=True)
    def _setup(self, _apply_migration, _seed_test_api_key):
        _reset_area_data()

    def test_import_all_levels(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        report = import_region_id(tmp_path, "1.0.1")
        assert report["rows"] == 4
        assert report["inserted"] == 4
        assert report["updated"] == 0
        assert _count_areas() == 4

    def test_canonical_codes_preserved(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        import_region_id(tmp_path, "1.0.1")
        assert _get_area("11") is not None
        assert _get_area("1101") is not None
        assert _get_area("110101") is not None
        assert _get_area("1101012001") is not None

    def test_idempotent_import(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        report1 = import_region_id(tmp_path, "1.0.1")
        assert report1["inserted"] == 4
        report2 = import_region_id(tmp_path, "1.0.1")
        assert report2["updated"] == 4
        assert report2["inserted"] == 0
        assert _count_areas() == 4

    def test_metadata_import(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        import_region_id(tmp_path, "1.0.1")
        area = _get_area("1101")
        meta = area["metadata"]
        assert meta["source"] == "region-id"
        assert meta["data_version"] == "1.0.1"
        assert meta["capital"] == "Tapak Tuan"
        assert meta["type"] == "kabupaten"
        assert meta["is_administrative"] == "true"

    def test_geometry_unchanged(self, tmp_path: Path) -> None:
        with SessionLocal() as db:
            db.execute(
                text(
                    """
                    INSERT INTO administrative_areas (code, name, level, parent_code, geometry, metadata)
                    VALUES (
                        '11', 'ACEH LAMA', 1, NULL,
                        ST_Multi(ST_GeomFromText('POLYGON((95 4, 97 4, 97 6, 95 6, 95 4))', 4326)),
                        '{"source":"old"}'
                    )
                    """
                )
            )
            db.commit()
        _write_csv(tmp_path / "provinces.csv", "code,name,capital\n11,ACEH,Banda Aceh\n")
        _write_csv(tmp_path / "regencies.csv", GOOD_REGENCIES)
        _write_csv(tmp_path / "districts.csv", GOOD_DISTRICTS)
        _write_csv(tmp_path / "villages.csv", GOOD_VILLAGES)
        import_region_id(tmp_path, "1.0.1")
        with SessionLocal() as db:
            row = db.execute(
                text("SELECT ST_IsEmpty(geometry) AS is_empty, geometry IS NOT NULL AS has_geom FROM administrative_areas WHERE code = '11'")
            ).mappings().first()
            assert row["has_geom"] is True
            assert row["is_empty"] is False

    def test_hierarchy_links_correct(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        import_region_id(tmp_path, "1.0.1")
        regency = _get_area("1101")
        assert regency["parent_code"] == "11"
        district = _get_area("110101")
        assert district["parent_code"] == "1101"
        village = _get_area("1101012001")
        assert village["parent_code"] == "110101"
        province = _get_area("11")
        assert province["parent_code"] is None


# ---------------------------------------------------------------------------
# Dry-run
# ---------------------------------------------------------------------------


class TestDryRun:
    @pytest.fixture(autouse=True)
    def _setup(self, _apply_migration, _seed_test_api_key):
        _reset_area_data()

    def test_dry_run_does_not_write(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        report = import_region_id(tmp_path, "1.0.1", dry_run=True)
        assert report["dry_run"] is True
        assert report["rows"] == 4
        assert report["inserted"] == 0
        assert _count_areas() == 0

    def test_dry_run_reports_correctly(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        report = import_region_id(tmp_path, "2.0.0", dry_run=True)
        assert report["data_version"] == "2.0.0"
        assert report["source"] == "region-id"


# ---------------------------------------------------------------------------
# Validation failure: atomic rollback
# ---------------------------------------------------------------------------


class TestAtomicRollback:
    @pytest.fixture(autouse=True)
    def _setup(self, _apply_migration, _seed_test_api_key):
        _reset_area_data()

    def test_validation_error_prevents_writes(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", "code,name,capital\n11,ACEH,Banda Aceh\n")
        _write_csv(
            tmp_path / "regencies.csv",
            "code,province_code,name\n1101,11,KAB. OK\n1102,99,KAB. BAD PARENT\n",
        )
        _write_csv(tmp_path / "districts.csv", GOOD_DISTRICTS)
        _write_csv(tmp_path / "villages.csv", GOOD_VILLAGES)
        with pytest.raises(RegionIdImportError) as exc_info:
            import_region_id(tmp_path, "1.0.1")
        assert len(exc_info.value.errors) > 0
        assert _count_areas() == 0

    def test_multiple_errors_collected(self, tmp_path: Path) -> None:
        _write_csv(
            tmp_path / "provinces.csv",
            "code,name,capital\n,ACEH,Banda Aceh\nAB,XYZ,ABC\n",
        )
        _write_csv(tmp_path / "regencies.csv", "code,province_code,name\n")
        _write_csv(tmp_path / "districts.csv", "code,regency_code,name\n")
        _write_csv(tmp_path / "villages.csv", "code,district_code,name,type\n")
        with pytest.raises(RegionIdImportError) as exc_info:
            import_region_id(tmp_path, "1.0.1")
        assert len(exc_info.value.errors) >= 2

    def test_db_clean_after_failure(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", "code,name,capital\n11,ACEH,Banda Aceh\n")
        _write_csv(
            tmp_path / "regencies.csv",
            "code,province_code,name\n1101,99,BAD\n",
        )
        _write_csv(tmp_path / "districts.csv", GOOD_DISTRICTS)
        _write_csv(tmp_path / "villages.csv", GOOD_VILLAGES)
        with pytest.raises(RegionIdImportError):
            import_region_id(tmp_path, "1.0.1")
        with SessionLocal() as db:
            run_count = db.execute(text("SELECT COUNT(*) FROM import_runs")).scalar_one()
            assert run_count == 0


# ---------------------------------------------------------------------------
# Edge cases
# ---------------------------------------------------------------------------


class TestEdgeCases:
    @pytest.fixture(autouse=True)
    def _setup(self, _apply_migration, _seed_test_api_key):
        _reset_area_data()

    def test_empty_files_valid(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", "code,name,capital\n")
        _write_csv(tmp_path / "regencies.csv", "code,province_code,name,capital,type,is_administrative\n")
        _write_csv(tmp_path / "districts.csv", "code,regency_code,name\n")
        _write_csv(tmp_path / "villages.csv", "code,district_code,name,type\n")
        report = import_region_id(tmp_path, "1.0.1")
        assert report["rows"] == 0
        assert _count_areas() == 0

    def test_village_code_wrong_length(self, tmp_path: Path) -> None:
        _write_csv(tmp_path / "provinces.csv", GOOD_PROVINCES)
        _write_csv(tmp_path / "regencies.csv", GOOD_REGENCIES)
        _write_csv(tmp_path / "districts.csv", GOOD_DISTRICTS)
        _write_csv(
            tmp_path / "villages.csv",
            "code,district_code,name,type\n11010120,110101,SHORT,desa\n",
        )
        with pytest.raises(RegionIdImportError) as exc_info:
            import_region_id(tmp_path, "1.0.1")
        assert any("panjang 8" in e for e in exc_info.value.errors)

    def test_custom_source_and_version(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        report = import_region_id(tmp_path, "2.0.0", source="custom-source")
        assert report["source"] == "custom-source"
        assert report["data_version"] == "2.0.0"
        area = _get_area("11")
        assert area["metadata"]["source"] == "custom-source"
        assert area["metadata"]["data_version"] == "2.0.0"

    def test_import_runs_audit_record(self, tmp_path: Path) -> None:
        _good_csvs(tmp_path)
        import_region_id(tmp_path, "1.0.1")
        with SessionLocal() as db:
            run = db.execute(
                text("SELECT source, data_version, status FROM import_runs")
            ).mappings().first()
            assert run["source"] == "region-id"
            assert run["data_version"] == "1.0.1"
            assert run["status"] == "completed"
