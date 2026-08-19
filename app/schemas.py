from typing import Any

from pydantic import BaseModel, Field


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


class PostalCodeResult(BaseModel):
    code: str
    metadata: dict[str, Any]


class PostalCodeResponse(BaseModel):
    code: str
    metadata: dict[str, Any]
    areas: list[Area]


class AreaPostalCodesResponse(BaseModel):
    code: str
    name: str
    postal_codes: list[PostalCodeResult]


class BreadcrumbItem(BaseModel):
    code: str
    name: str
    level: str


class AreaDetailData(BaseModel):
    code: str
    name: str
    level: str
    breadcrumb: list[BreadcrumbItem]


class AreaDetailResponse(BaseModel):
    data: AreaDetailData


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
