from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query
from scalar_fastapi import get_scalar_api_reference
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    Area,
    AreaAutocompleteResponse,
    AreaAutocompleteResult,
    AreaPostalCodesResponse,
    PostalCodeResponse,
    PostalCodeResult,
    ReverseGeocodeResponse,
)

LEVEL_KEYS = {1: "province", 2: "regency_or_city", 3: "district", 4: "village_or_ward"}


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(
    title="Zonatic API",
    version="0.1.0",
    description=(
        "Indonesia-focused geographic and administrative APIs for building "
        "location-aware applications. Provides reverse geocoding, administrative "
        "area search, postal code lookup, and spatial data infrastructure."
    ),
    docs_url=None,
    redoc_url=None,
    lifespan=lifespan,
)


@app.get("/docs", include_in_schema=False)
async def scalar_docs():
    return get_scalar_api_reference(
        openapi_url=app.openapi_url,
        title="Zonatic API Reference",
    )


@app.get("/health", tags=["System"], summary="Health check")
def health(db: Session = Depends(get_db)) -> dict[str, str]:
    """Check API and database connectivity.

    Returns a simple status object confirming the service is running
    and the database connection is healthy.
    """
    db.execute(text("SELECT 1"))
    return {"status": "ok"}


@app.get(
    "/v1/reverse-geocode",
    response_model=ReverseGeocodeResponse,
    tags=["Geocoding"],
    summary="Reverse geocode a coordinate",
)
def reverse_geocode(
    latitude: float = Query(..., ge=-11.1, le=6.2, description="Latitude WGS84"),
    longitude: float = Query(..., ge=94.7, le=141.1, description="Longitude WGS84"),
    db: Session = Depends(get_db),
) -> ReverseGeocodeResponse:
    """Find all administrative boundaries that contain the given coordinate.

    Returns the full administrative hierarchy — province, regency/city,
    district, and village/ward — for any point within Indonesia's territory.
    Coordinates are validated against Indonesian bounds before processing.
    """
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


@app.get(
    "/v1/areas/autocomplete",
    response_model=AreaAutocompleteResponse,
    tags=["Areas"],
    summary="Search and autocomplete administrative areas",
)
def autocomplete_areas(
    q: str = Query(..., min_length=1, description="Search keyword (area name)"),
    levels: str | None = Query(
        None,
        description="Filter by admin level, comma-separated (e.g. 3,4 for districts and villages)",
    ),
    parent_code: str | None = Query(
        None, description="Filter by parent area code (e.g. 31.71 for Jakarta Pusat)"
    ),
    limit: int = Query(10, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> AreaAutocompleteResponse:
    """Search administrative areas by name with autocomplete support.

    Returns matching provinces, regencies/cities, districts, or villages
    with their hierarchy breadcrumb (e.g. "DKI Jakarta > Jakarta Pusat > Tanah Abang").
    Supports case-insensitive matching and optional filtering by level or parent.
    """
    level_filter = None
    if levels:
        try:
            level_filter = [int(l.strip()) for l in levels.split(",")]
            for lv in level_filter:
                if lv < 1 or lv > 4:
                    raise ValueError
        except (ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="Format levels tidak valid. Gunakan angka 1-4 dipisah koma.")

    where_clauses = ["a.name ILIKE :pattern"]
    params: dict = {"pattern": f"%{q}%", "limit": limit}

    if level_filter is not None:
        where_clauses.append("a.level = ANY(CAST(:levels AS int[]))")
        params["levels"] = level_filter
    if parent_code is not None:
        where_clauses.append("a.parent_code = :parent_code")
        params["parent_code"] = parent_code

    where_sql = " AND ".join(where_clauses)

    rows = db.execute(
        text(
            f"""
            SELECT
                a.code, a.name, a.level,
                CASE
                    WHEN a.level = 1 THEN a.name
                    WHEN a.level = 2 THEN p1.name || ' > ' || a.name
                    WHEN a.level = 3 THEN p2.name || ' > ' || p1.name || ' > ' || a.name
                    WHEN a.level = 4 THEN p3.name || ' > ' || p2.name || ' > ' || p1.name || ' > ' || a.name
                END AS breadcrumb
            FROM administrative_areas a
            LEFT JOIN administrative_areas p1 ON p1.code = a.parent_code
            LEFT JOIN administrative_areas p2 ON p2.code = p1.parent_code
            LEFT JOIN administrative_areas p3 ON p3.code = p2.parent_code
            WHERE {where_sql}
            ORDER BY a.level ASC, a.name ASC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()

    results = [AreaAutocompleteResult(**row) for row in rows]
    return AreaAutocompleteResponse(results=results)


@app.get(
    "/v1/areas/{code}",
    response_model=Area,
    tags=["Areas"],
    summary="Get an administrative area by code",
)
def get_area(code: str, db: Session = Depends(get_db)) -> Area:
    """Retrieve a single administrative area by its official code.

    Area codes follow Indonesia's administrative hierarchy:
    province (e.g. 31), regency/city (e.g. 31.71),
    district (e.g. 31.71.01), village/ward (e.g. 31.71.01.1001).
    Returns 404 if the code does not exist.
    """
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


@app.get(
    "/v1/postal-codes/search",
    response_model=list[PostalCodeResult],
    tags=["Postal Codes"],
    summary="Search postal codes",
)
def search_postal_codes(
    q: str = Query(..., min_length=1, description="Search keyword (postal code or area name)"),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> list[PostalCodeResult]:
    """Search postal codes by code or associated administrative area name.

    Returns matching postal codes with their metadata. A single postal code
    may be associated with multiple administrative areas.
    """
    rows = db.execute(
        text(
            """
            SELECT DISTINCT pc.code, pc.metadata
            FROM postal_codes pc
            LEFT JOIN postal_code_areas pca ON pca.postal_code_id = pc.id
            LEFT JOIN administrative_areas a ON a.id = pca.administrative_area_id
            WHERE pc.code ILIKE :pattern OR a.name ILIKE :pattern
            ORDER BY pc.code ASC
            LIMIT :limit
            """
        ),
        {"pattern": f"%{q}%", "limit": limit},
    ).mappings().all()

    return [PostalCodeResult(code=row["code"], metadata=row["metadata"]) for row in rows]


@app.get(
    "/v1/postal-codes/{code}",
    response_model=PostalCodeResponse,
    tags=["Postal Codes"],
    summary="Get a postal code and its areas",
)
def get_postal_code(code: str, db: Session = Depends(get_db)) -> PostalCodeResponse:
    """Look up a postal code and all administrative areas it covers.

    Returns the postal code metadata and a list of associated administrative
    areas ordered by hierarchy level. Returns 404 if the postal code does not exist.
    """
    pc_row = db.execute(
        text(
            """
            SELECT code, metadata
            FROM postal_codes
            WHERE code = :code
            """
        ),
        {"code": code},
    ).mappings().first()
    if pc_row is None:
        raise HTTPException(status_code=404, detail="Kode pos tidak ditemukan")

    area_rows = db.execute(
        text(
            """
            SELECT a.code, a.name, a.level, a.parent_code, a.metadata
            FROM administrative_areas a
            JOIN postal_code_areas pca ON pca.administrative_area_id = a.id
            JOIN postal_codes pc ON pc.id = pca.postal_code_id
            WHERE pc.code = :code
            ORDER BY a.level ASC
            """
        ),
        {"code": code},
    ).mappings().all()

    areas = [Area(**row) for row in area_rows]
    return PostalCodeResponse(
        code=pc_row["code"],
        metadata=pc_row["metadata"],
        areas=areas,
    )


@app.get(
    "/v1/areas/{code}/postal-codes",
    response_model=AreaPostalCodesResponse,
    tags=["Areas"],
    summary="Get postal codes for an area",
)
def get_area_postal_codes(code: str, db: Session = Depends(get_db)) -> AreaPostalCodesResponse:
    """List all postal codes associated with an administrative area.

    Returns the area name and all postal codes that cover it.
    A single area may have multiple postal codes.
    Returns 404 if the area code does not exist.
    """
    area_row = db.execute(
        text(
            """
            SELECT code, name
            FROM administrative_areas
            WHERE code = :code
            """
        ),
        {"code": code},
    ).mappings().first()
    if area_row is None:
        raise HTTPException(status_code=404, detail="Wilayah tidak ditemukan")

    pc_rows = db.execute(
        text(
            """
            SELECT pc.code, pc.metadata
            FROM postal_codes pc
            JOIN postal_code_areas pca ON pca.postal_code_id = pc.id
            JOIN administrative_areas a ON a.id = pca.administrative_area_id
            WHERE a.code = :code
            ORDER BY pc.code ASC
            """
        ),
        {"code": code},
    ).mappings().all()

    postal_codes = [PostalCodeResult(code=row["code"], metadata=row["metadata"]) for row in pc_rows]
    return AreaPostalCodesResponse(
        code=area_row["code"],
        name=area_row["name"],
        postal_codes=postal_codes,
    )
