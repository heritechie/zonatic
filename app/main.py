from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import Area, ReverseGeocodeResponse

LEVEL_KEYS = {1: "province", 2: "regency_or_city", 3: "district", 4: "village_or_ward"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Zonatic API",
    version="0.1.0",
    description="Reverse geocoding wilayah administratif Indonesia berbasis PostGIS.",
    lifespan=lifespan,
)


@app.get("/health")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get("/v1/reverse-geocode", response_model=ReverseGeocodeResponse)
def reverse_geocode(
    latitude: float = Query(..., ge=-11.1, le=6.2, description="Latitude WGS84"),
    longitude: float = Query(..., ge=94.7, le=141.1, description="Longitude WGS84"),
    db: Session = Depends(get_db),
) -> ReverseGeocodeResponse:
    """Temukan semua batas administrasi yang mencakup koordinat, dari provinsi hingga desa."""
    rows = db.execute(
        text(
            """
            SELECT code, name, level, parent_code, metadata
            FROM administrative_areas
            WHERE ST_Covers(
                geometry,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)
            )
            ORDER BY level ASC
            """
        ),
        {"latitude": latitude, "longitude": longitude},
    ).mappings().all()

    areas = [Area(**row) for row in rows]
    address: dict[str, Area | None] = {key: None for key in LEVEL_KEYS.values()}
    for area in areas:
        address[LEVEL_KEYS[area.level]] = area

    return ReverseGeocodeResponse(
        latitude=latitude,
        longitude=longitude,
        matched=bool(areas),
        address=address,
        areas=areas,
    )


@app.get("/v1/areas/{code}", response_model=Area)
def get_area(code: str, db: Session = Depends(get_db)) -> Area:
    row = db.execute(
        text(
            """
            SELECT code, name, level, parent_code, metadata
            FROM administrative_areas
            WHERE code = :code
            """
        ),
        {"code": code},
    ).mappings().first()
    if row is None:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")
    return Area(**row)

