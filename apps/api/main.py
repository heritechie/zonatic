import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from scalar_fastapi import get_scalar_api_reference
from sqlalchemy import text
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.dependencies import get_current_tenant
from apps.api.exceptions import (
    AreaNotFoundError,
    InvalidParameterError,
    PostalCodeNotFoundException,
    ZonaticException,
)
from apps.api.schemas import (
    Area,
    AreaAutocompleteResponse,
    AreaAutocompleteResult,
    AreaLevel,
    AreaPostalCodesResponse,
    AreaPublic,
    AreaSingleResponse,
    AreasListMeta,
    AreasListResponse,
    HierarchyNode,
    PostalCodeResponse,
    PostalCodeResult,
    ReverseGeocodeResponse,
)

LEVEL_KEYS = {1: "province", 2: "regency_or_city", 3: "district", 4: "village_or_ward"}

# Canonical level vocabulary for the public `/v1/areas` contract, mapped to the
# integer `administrative_areas.level` column. Both directions are derived from
# one table so they cannot drift apart.
LEVEL_NAMES: dict[int, AreaLevel] = {
    1: AreaLevel.province,
    2: AreaLevel.regency,
    3: AreaLevel.district,
    4: AreaLevel.village,
}

LEVEL_INTS: dict[AreaLevel, int] = {level: value for value, level in LEVEL_NAMES.items()}


def _build_hierarchy(db: Session, area: dict) -> dict[str, HierarchyNode]:
    """Build the public `hierarchy` payload for an area.

    Walks the `parent_code` chain upward (up to 4 ancestors) and emits a dict
    keyed by canonical level name (province / regency / district / village),
    containing the matching area itself and all of its ancestors in
    depth order: topmost ancestor → … → direct parent → self.

    Codes come straight from the database, which stores the canonical undotted
    form (see supabase/migrations/20260101000009_canonical_area_codes.sql).
    """
    ancestors: list[dict] = []
    current = area["parent_code"]
    # Bound at 4 to mirror the Indonesia admin hierarchy depth; the safety
    # bound does not affect correctness — a cycle or NULL simply terminates.
    for _ in range(4):
        if current is None:
            break
        row = db.execute(
            text(
                "SELECT code, name, level, parent_code FROM administrative_areas "
                "WHERE code = :code"
            ),
            {"code": current},
        ).mappings().first()
        if row is None:
            break
        ancestors.append(row)
        current = row["parent_code"]
    ancestors.reverse()  # topmost first

    hierarchy: dict[str, HierarchyNode] = {}
    for a in ancestors:
        key = LEVEL_NAMES.get(a["level"])
        if key:
            hierarchy[key.value] = HierarchyNode(code=a["code"], name=a["name"])
    key = LEVEL_NAMES.get(area["level"])
    if key:
        hierarchy[key.value] = HierarchyNode(code=area["code"], name=area["name"])
    return hierarchy


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


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://console.zonatic.id",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(ZonaticException)
async def zonatic_exception_handler(request: Request, exc: ZonaticException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Keep rejected parameters inside the public error envelope.

    Parameter constraints (`q` required with min length 1, `level` restricted
    to the canonical enum, `limit` an integer in 1..100) are declared on the
    endpoint signature, so FastAPI rejects bad input before the handler runs.
    Without this, those rejections would return FastAPI's default
    `{"detail": [...]}` body and leak a second, undocumented error shape into
    the public contract.
    """
    exc = InvalidParameterError()
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": exc.code, "message": exc.message}},
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
        None, description="Filter by parent area code (e.g. 3171 for Jakarta Pusat)"
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
    "/v1/areas",
    response_model=AreasListResponse,
    tags=["Areas"],
    summary="List Indonesian administrative areas",
)
def search_areas(
    q: str = Query(..., min_length=1, description="Case-insensitive prefix keyword (area name)"),
    level: AreaLevel | None = Query(
        None,
        description="Filter by administrative level",
    ),
    parent_code: str | None = Query(
        None,
        description="Restrict to areas whose direct parent has this code",
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_current_tenant),
) -> AreasListResponse:
    """Search Indonesian administrative areas.

    Returns matching areas with their full administrative hierarchy
    (province → regency → district → village). Search is a case-insensitive
    prefix match on `name`. Optional `level` and `parent_code` filters
    narrow the result set. Codes are the canonical undotted DB representation
    and never contain "." separators.

    `parent_code` is a filter, not a lookup: an unknown parent code simply
    matches nothing and returns an empty `data` list rather than a 404.

    Requires a valid API key. Administrative areas are global master data;
    the API key identifies the consumer workspace for billing/quota, not
    for filtering these results.
    """
    where_clauses = ["name ILIKE :pattern"]
    params: dict = {"pattern": f"{q}%", "limit": limit}

    if level is not None:
        where_clauses.append("level = :level")
        params["level"] = LEVEL_INTS[level]
    if parent_code:
        where_clauses.append("parent_code = :parent_code")
        params["parent_code"] = parent_code

    where_sql = " AND ".join(where_clauses)

    rows = db.execute(
        text(
            f"""
            SELECT code, name, level, parent_code
            FROM administrative_areas
            WHERE {where_sql}
            ORDER BY level ASC, name ASC
            LIMIT :limit
            """
        ),
        params,
    ).mappings().all()

    results: list[AreaPublic] = []
    for row in rows:
        hierarchy = _build_hierarchy(db, dict(row))
        results.append(
            AreaPublic(
                code=row["code"],
                name=row["name"],
                level=LEVEL_NAMES[row["level"]],
                hierarchy=hierarchy,
            )
        )

    return AreasListResponse(
        data=results,
        meta=AreasListMeta(limit=limit, count=len(results)),
    )


@app.get(
    "/v1/areas/{code}",
    response_model=AreaSingleResponse,
    tags=["Areas"],
    summary="Get an administrative area by code",
)
def get_area(
    code: str,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_current_tenant),
) -> AreaSingleResponse:
    """Retrieve a single Indonesian administrative area by canonical code.

    Returns the area with its full administrative hierarchy (province →
    regency → district → village). Codes are the canonical DB representation
    and do not contain "." separators. Returns 404 if the code does not
    exist.

    Requires a valid API key.
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
        raise AreaNotFoundError()

    hierarchy = _build_hierarchy(db, dict(row))

    return AreaSingleResponse(
        data=AreaPublic(
            code=row["code"],
            name=row["name"],
            level=LEVEL_NAMES[row["level"]],
            hierarchy=hierarchy,
        )
    )


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
    tenant_id: uuid.UUID = Depends(get_current_tenant),
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
def get_postal_code(
    code: str,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_current_tenant),
) -> PostalCodeResponse:
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
        raise PostalCodeNotFoundException()

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
def get_area_postal_codes(
    code: str,
    db: Session = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_current_tenant),
) -> AreaPostalCodesResponse:
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
        raise AreaNotFoundError()

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

