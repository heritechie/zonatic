"""Region-id CSV importer.

Reads four normalized CSV files (provinces, regencies, districts, villages)
from a release directory, validates the complete dataset, and upserts into
administrative_areas in a single transaction.

Usage:
    python -m apps.api.importers.cli_region_id import --dir /path/to/region-id-1.0.1 --version 1.0.1
"""

import csv
import json
from dataclasses import dataclass
from pathlib import Path
from uuid import uuid4

from sqlalchemy import Connection, text

from apps.api.database import engine

LEVEL_FILES = {
    1: "provinces.csv",
    2: "regencies.csv",
    3: "districts.csv",
    4: "villages.csv",
}

CODE_LENGTHS = {1: 2, 2: 4, 3: 6, 4: 10}

LEVEL_FIELDS = {
    1: ("code", "name"),
    2: ("code", "province_code", "name"),
    3: ("code", "regency_code", "name"),
    4: ("code", "district_code", "name"),
}

LEVEL_PARENT_FIELD = {2: "province_code", 3: "regency_code", 4: "district_code"}

LEVEL_NAMES = {1: "provinsi", 2: "kabupaten/kota", 3: "kecamatan", 4: "desa/kelurahan"}

EXTRA_FIELDS = {
    1: ("capital",),
    2: ("capital", "type", "is_administrative"),
    3: (),
    4: ("type",),
}


@dataclass(frozen=True)
class Row:
    level: int
    code: str
    name: str
    parent_code: str | None
    metadata: dict


def read_csv_file(path: Path, level: int) -> list[dict[str, str]]:
    """Read a CSV file and return list of row dicts. Raises on file or format errors."""
    if not path.exists():
        raise FileNotFoundError(f"File tidak ditemukan: {path}")
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        if reader.fieldnames is None:
            raise ValueError(f"File kosong: {path}")
        expected = LEVEL_FIELDS[level]
        actual = [name.strip() for name in reader.fieldnames]
        missing = [e for e in expected if e not in actual]
        if missing:
            raise ValueError(f"Kolom tidak ditemukan di {path.name}: {', '.join(missing)}")
        rows = []
        for i, row in enumerate(reader, start=2):
            cleaned = {}
            for key, value in row.items():
                cleaned[key.strip()] = value.strip() if value else ""
            cleaned["_line"] = i
            rows.append(cleaned)
        return rows


def _level_rows(
    dir_path: Path, level: int, source: str, data_version: str
) -> list[Row]:
    """Parse a single level CSV into Row objects."""
    filename = LEVEL_FILES[level]
    raw_rows = read_csv_file(dir_path / filename, level)
    parent_field = LEVEL_PARENT_FIELD.get(level)
    extra = EXTRA_FIELDS[level]
    rows: list[Row] = []
    for raw in raw_rows:
        code = raw.get("code", "")
        name = raw.get("name", "")
        parent = raw.get(parent_field, "") if parent_field else ""
        metadata: dict = {"source": source, "data_version": data_version}
        for ef in extra:
            val = raw.get(ef, "")
            if val:
                metadata[ef] = val
        rows.append(Row(
            level=level,
            code=code,
            name=name,
            parent_code=parent or None,
            metadata=metadata,
        ))
    return rows


class RegionIdImportError(Exception):
    """Raised when region-id CSV validation fails."""

    def __init__(self, errors: list[str]) -> None:
        self.errors = errors
        super().__init__(f"{len(errors)} error validasi ditemukan")


def _validate_rows(all_rows: dict[int, list[Row]]) -> list[str]:
    """Validate all rows across levels. Returns list of error strings."""
    errors: list[str] = []

    for level in range(1, 5):
        rows = all_rows[level]
        expected_len = CODE_LENGTHS[level]
        level_name = LEVEL_NAMES[level]
        seen_codes: set[str] = set()

        for i, row in enumerate(rows):
            line = i + 2
            loc = f"{LEVEL_FILES[level]} baris {line}"

            if not row.code:
                errors.append(f"{loc}: kode kosong")
                continue
            if not row.code.isdigit():
                errors.append(f"{loc}: kode '{row.code}' bukan angka")
            elif len(row.code) != expected_len:
                errors.append(
                    f"{loc}: kode '{row.code}' panjang {len(row.code)}, "
                    f"diharapkan {expected_len} untuk {level_name}"
                )

            if not row.name:
                errors.append(f"{loc}: nama kosong")

            if level > 1:
                if not row.parent_code:
                    errors.append(f"{loc}: parent_code kosong")
                else:
                    parent_level = level - 1
                    parent_rows = all_rows[parent_level]
                    parent_codes = {r.code for r in parent_rows}
                    if row.parent_code not in parent_codes:
                        errors.append(
                            f"{loc}: parent_code '{row.parent_code}' "
                            f"tidak ditemukan di {LEVEL_NAMES[parent_level]}"
                        )

            if row.code in seen_codes:
                errors.append(f"{loc}: kode '{row.code}' duplikat")
            seen_codes.add(row.code)

    return errors


def import_region_id(
    dir_path: Path,
    data_version: str,
    source: str = "region-id",
    dry_run: bool = False,
) -> dict:
    """Validate and import region-id CSVs.

    Returns a report dict. Raises RegionIdImportError on validation failure.
    """
    all_rows: dict[int, list[Row]] = {}
    for level in range(1, 5):
        all_rows[level] = _level_rows(dir_path, level, source, data_version)

    errors = _validate_rows(all_rows)
    if errors:
        raise RegionIdImportError(errors)

    if dry_run:
        total = sum(len(rows) for rows in all_rows.values())
        return {
            "source": source,
            "data_version": data_version,
            "dry_run": True,
            "rows": total,
            "inserted": 0,
            "updated": 0,
        }

    inserted = 0
    updated = 0
    with engine.begin() as conn:
        run_id = uuid4()
        conn.execute(
            text(
                """
                INSERT INTO import_runs (id, source, data_version, level, status)
                VALUES (:id, :source, :data_version, :level, 'running')
                """
            ),
            {
                "id": run_id,
                "source": source,
                "data_version": data_version,
                "level": 4,
            },
        )

        for level in range(1, 5):
            for row in all_rows[level]:
                result = _upsert_area(conn, row)
                if result == "inserted":
                    inserted += 1
                else:
                    updated += 1

        total = inserted + updated
        conn.execute(
            text(
                """
                UPDATE import_runs
                SET status = 'completed',
                    report = CAST(:report AS jsonb),
                    completed_at = NOW()
                WHERE id = :id
                """
            ),
            {
                "id": run_id,
                "report": json.dumps({"rows": total, "inserted": inserted, "updated": updated}),
            },
        )

    return {
        "source": source,
        "data_version": data_version,
        "dry_run": False,
        "rows": total,
        "inserted": inserted,
        "updated": updated,
    }


def _upsert_area(conn: Connection, row: Row) -> str:
    """Upsert one administrative area. Returns 'inserted' or 'updated'."""
    existing = conn.execute(
        text("SELECT 1 FROM administrative_areas WHERE code = :code"),
        {"code": row.code},
    ).first()

    conn.execute(
        text(
            """
            INSERT INTO administrative_areas (code, name, level, parent_code, metadata)
            VALUES (:code, :name, :level, :parent_code, CAST(:metadata AS jsonb))
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                level = EXCLUDED.level,
                parent_code = EXCLUDED.parent_code,
                metadata = administrative_areas.metadata || EXCLUDED.metadata
            """
        ),
        {
            "code": row.code,
            "name": row.name,
            "level": row.level,
            "parent_code": row.parent_code,
            "metadata": json.dumps(row.metadata),
        },
    )
    return "inserted" if existing is None else "updated"
