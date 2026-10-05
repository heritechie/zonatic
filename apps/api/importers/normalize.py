from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class ImportOptions:
    level: int
    code_field: str
    name_field: str
    parent_code_field: str | None
    source: str
    data_version: str
    license_name: str | None
    source_srid: int


@dataclass(frozen=True)
class StagedFeature:
    row_number: int
    code: str | None
    name: str | None
    parent_code: str | None
    geometry: dict[str, Any] | None
    metadata: dict[str, Any]
    raw_feature: dict[str, Any]
    status: str
    error: str | None


def _value(properties: dict[str, Any], field: str | None) -> str | None:
    if field is None:
        return None
    value = properties.get(field)
    if value is None:
        return None
    value = str(value).strip()
    return value or None


def normalize_feature(
    feature: dict[str, Any], row_number: int, options: ImportOptions
) -> StagedFeature:
    properties = feature.get("properties")
    geometry = feature.get("geometry")
    errors: list[str] = []

    if not isinstance(properties, dict):
        properties = {}
        errors.append("properties harus berupa object")
    code = _value(properties, options.code_field)
    name = _value(properties, options.name_field)
    parent_code = _value(properties, options.parent_code_field)

    if code is None:
        errors.append(f"field kode '{options.code_field}' kosong")
    elif len(code) > 20:
        errors.append("kode lebih dari 20 karakter")
    if name is None:
        errors.append(f"field nama '{options.name_field}' kosong")
    elif len(name) > 255:
        errors.append("nama lebih dari 255 karakter")
    if options.level == 1 and parent_code is not None:
        errors.append("level provinsi tidak boleh memiliki parent_code")
    if options.level > 1 and parent_code is None:
        errors.append("parent_code wajib untuk level selain provinsi")

    if not isinstance(geometry, dict) or geometry.get("type") not in {"Polygon", "MultiPolygon"}:
        errors.append("geometry harus Polygon atau MultiPolygon")
        geometry = None

    metadata: dict[str, Any] = {
        "source": options.source,
        "data_version": options.data_version,
    }
    if options.license_name:
        metadata["license"] = options.license_name

    return StagedFeature(
        row_number=row_number,
        code=code,
        name=name,
        parent_code=parent_code,
        geometry=geometry,
        metadata=metadata,
        raw_feature=feature,
        status="invalid" if errors else "ready",
        error="; ".join(errors) or None,
    )

