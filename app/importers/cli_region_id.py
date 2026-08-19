"""CLI for importing region-id CSV data.

Usage:
    python -m app.importers.cli_region_id import \\
        --dir /path/to/region-id-1.0.1 \\
        --version 1.0.1 \\
        --dry-run
"""

import argparse
import json
import sys
from pathlib import Path

from app.importers.region_id import RegionIdImportError, import_region_id


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Import data administrative wilayah dari region-id CSV."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    imp = sub.add_parser("import", help="Validasi dan import CSV region-id.")
    imp.add_argument(
        "--dir",
        type=Path,
        required=True,
        help="Direktori berisi CSV (provinces.csv, regencies.csv, districts.csv, villages.csv).",
    )
    imp.add_argument(
        "--version",
        dest="data_version",
        required=True,
        help="Versi data sumber (mis. 1.0.1).",
    )
    imp.add_argument(
        "--source",
        default="region-id",
        help="Nama sumber data (default: region-id).",
    )
    imp.add_argument(
        "--dry-run",
        action="store_true",
        help="Validasi saja tanpa menulis ke database.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.command == "import":
        try:
            report = import_region_id(
                dir_path=args.dir,
                data_version=args.data_version,
                source=args.source,
                dry_run=args.dry_run,
            )
            print(json.dumps(report, ensure_ascii=False))
            return 0 if report["rows"] > 0 else 2
        except RegionIdImportError as exc:
            print(json.dumps({"errors": exc.errors}, ensure_ascii=False))
            return 1
        except Exception as exc:
            print(f"Import gagal: {exc}", file=sys.stderr)
            return 1

    parser.print_help()
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
