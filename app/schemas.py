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

