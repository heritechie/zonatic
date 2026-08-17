import argparse
import json
import sys
from pathlib import Path
from uuid import uuid4

from app.database import engine
from app.importers.normalize import ImportOptions, normalize_feature
from app.importers.readers import DatasetError, read_geojson
from app.importers.repository import (
    build_report,
    complete_run,
    create_run,
    import_ready_features,
    stage_features,
    validate_staging,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Import batas administratif GeoJSON ke Zonatic.")
    subparsers = parser.add_subparsers(dest="command", required=True)
    import_parser = subparsers.add_parser("import", help="Validasi dan import GeoJSON.")
    import_parser.add_argument("--file", type=Path, required=True, help="Path ke GeoJSON FeatureCollection.")
    import_parser.add_argument("--level", type=int, choices=range(1, 5), required=True)
    import_parser.add_argument("--code-field", required=True, help="Nama properti berisi kode wilayah.")
    import_parser.add_argument("--name-field", required=True, help="Nama properti berisi nama wilayah.")
    import_parser.add_argument("--parent-code-field", help="Nama properti berisi kode parent.")
    import_parser.add_argument("--source", required=True, help="Nama sumber data.")
    import_parser.add_argument("--version", dest="data_version", required=True, help="Versi/tanggal data sumber.")
    import_parser.add_argument("--license", dest="license_name", help="Lisensi sumber data.")
    import_parser.add_argument("--source-srid", type=int, default=4326, help="SRID koordinat input (default: 4326).")
    import_parser.add_argument("--dry-run", action="store_true", help="Validasi dan buat report tanpa upsert data produksi.")
    return parser


def run_import(args: argparse.Namespace) -> int:
    if args.level > 1 and not args.parent_code_field:
        raise DatasetError("--parent-code-field wajib untuk level 2 sampai 4")
    options = ImportOptions(
        level=args.level,
        code_field=args.code_field,
        name_field=args.name_field,
        parent_code_field=args.parent_code_field,
        source=args.source,
        data_version=args.data_version,
        license_name=args.license_name,
        source_srid=args.source_srid,
    )
    raw_features = read_geojson(args.file)
    staged_features = [
        normalize_feature(feature, row_number, options)
        for row_number, feature in enumerate(raw_features, start=1)
    ]
    run_id = uuid4()

    with engine.begin() as connection:
        create_run(connection, run_id, options)
        stage_features(connection, run_id, options, staged_features)
        validate_staging(connection, run_id)
        if args.dry_run:
            report = build_report(connection, run_id)
            complete_run(connection, run_id, report)
        else:
            inserted, updated = import_ready_features(connection, run_id)
            report = build_report(connection, run_id, inserted=inserted, updated=updated)
            complete_run(connection, run_id, report)

    print(json.dumps({"run_id": str(run_id), "dry_run": args.dry_run, "report": report}, ensure_ascii=False))
    return 0 if report["invalid"] == 0 else 2


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return run_import(args)
    except DatasetError as exc:
        parser.error(str(exc))
    except Exception as exc:
        print(f"Import gagal: {exc}", file=sys.stderr)
        return 1
    return 1


if __name__ == "__main__":
    raise SystemExit(main())

