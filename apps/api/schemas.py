from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Legacy / out-of-scope shapes.
#
# The AreaSearchResult / AreaDetailData / BreadcrumbItem types previously
# exposed a flat `breadcrumb: list[BreadcrumbItem]` array. The public
# contract for `/v1/areas` and `/v1/areas/{code}` now uses a `hierarchy`
# dict keyed by level, so the public-facing search/detail responses are
# modelled with `AreaPublic` (below). The old types are preserved here
# because the postal-code and reverse-geocode endpoints (out of scope for the
# current contract) still reference them.
# ---------------------------------------------------------------------------


class Area(BaseModel):
    code: str
    name: str
    level: int = Field(ge=1, le=4)
    parent_code: str | None
    metadata: dict[str, Any]


class ReverseGeocodeResponse(BaseModel):
    latitude: float
    longitude: float
    matched: bool
    address: dict[str, Area | None]
    areas: list[Area]


class AreaAutocompleteResult(BaseModel):
    code: str
    name: str
    level: int = Field(ge=1, le=4)
    breadcrumb: str


class AreaAutocompleteResponse(BaseModel):
    results: list[AreaAutocompleteResult]


class BreadcrumbItem(BaseModel):
    code: str
    name: str
    level: str


class AreaSearchResult(BaseModel):
    code: str
    name: str
    level: str
    breadcrumb: list[BreadcrumbItem]


class AreaSearchMeta(BaseModel):
    limit: int
    count: int


class AreaSearchResponse(BaseModel):
    data: list[AreaSearchResult]
    meta: AreaSearchMeta


class AreaDetailData(BaseModel):
    code: str
    name: str
    level: str
    breadcrumb: list[BreadcrumbItem]


class AreaDetailResponse(BaseModel):
    data: AreaDetailData


# ---------------------------------------------------------------------------
# Public contract for `/v1/areas` and `/v1/areas/{code}`.
#
# `level` is the canonical level name (province / regency / district / village).
# `hierarchy` is a geographic dict keyed by level name containing the matching
# area itself and all of its ancestors, ordered by depth topmost → self.
# Codes do not contain "." separators; they are the canonical DB
# representation (e.g. "32", "3273", "327301", "3273011001").
# ---------------------------------------------------------------------------


class HierarchyNode(BaseModel):
    code: str
    name: str


class AreaLevel(str, Enum):
    """Canonical administrative level names.

    Declared as a real enum rather than a bare string so the generated OpenAPI
    schema advertises the closed value set to API clients.
    """

    province = "province"
    regency = "regency"
    district = "district"
    village = "village"


class AreaPublic(BaseModel):
    code: str
    name: str
    level: AreaLevel
    hierarchy: dict[str, HierarchyNode]


class AreasListMeta(BaseModel):
    limit: int
    count: int


class AreasListResponse(BaseModel):
    data: list[AreaPublic]
    meta: AreasListMeta


class AreaSingleResponse(BaseModel):
    data: AreaPublic


# ---------------------------------------------------------------------------
# Public contract for `/v1/postal-codes/{code}` and `/v1/postal-codes/search`.
#
# Aligned with the `/v1/areas` contract: `level` is the canonical level name,
# `hierarchy` is the geographic dict produced by the same `_build_hierarchy()`
# helper, and list endpoints wrap results in `{"data": [...], "meta": {...}}`.
#
# `areas` is always an array because `postal_code_areas` is genuinely
# many-to-many. A postal code may be associated with several administrative
# areas, and this API deliberately does not restrict that relationship to a
# single administrative level.
#
# Import/provider bookkeeping (`metadata`) and internal identifiers (`id`,
# `parent_code`) are intentionally not exposed: they are dataset provenance,
# not part of the public product contract.
# ---------------------------------------------------------------------------


class PostalCodePublic(BaseModel):
    code: str
    areas: list[AreaPublic]


class PostalCodeLookupResponse(BaseModel):
    data: PostalCodePublic


class PostalCodeSearchMeta(BaseModel):
    limit: int
    count: int


class PostalCodeSearchResponse(BaseModel):
    data: list[PostalCodePublic]
    meta: PostalCodeSearchMeta


class AreaPostalCodesResponse(BaseModel):
    """Reverse relation: the postal codes covering one administrative area."""

    code: str
    name: str
    postal_codes: list[str]