import json
from pathlib import Path
from typing import Any


class DatasetError(ValueError):
    """Raised when an input dataset is not a supported GeoJSON dataset."""


def read_geojson(path: Path) -> list[dict[str, Any]]:
    try:
        document = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise DatasetError(f"File tidak ditemukan: {path}") from exc
    except json.JSONDecodeError as exc:
        raise DatasetError(f"GeoJSON tidak valid: {exc.msg} (baris {exc.lineno})") from exc

    if document.get("type") == "FeatureCollection" and isinstance(document.get("features"), list):
        return document["features"]
    if document.get("type") == "Feature":
        return [document]
    raise DatasetError("Input harus berupa GeoJSON Feature atau FeatureCollection")

