from contextlib import asynccontextmanager

from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Request
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
    PostalCodeNotFoundError,
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
    PostalCodeLookupResponse,
    PostalCodePublic,
    PostalCodeSearchMeta,
    PostalCodeSearchResponse,
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


def _fetch_area(db: Session, code: str) -> dict | None:
    """Load one administrative area row by canonical code, or None.

    The single point of truth for "does this area exist", shared by every
    lookup and hierarchy endpoint so the 404 rule cannot drift between them.
    """
    row = db.execute(
        text(
            """
            SELECT code, name, level, parent_code
            FROM administrative_areas
            WHERE code = :code
            """
        ),
        {"code": code},
    ).mappings().first()
    return dict(row) if row is not None else None


def _require_area(db: Session, code: str, expected_level: AreaLevel | None = None) -> dict:
    """Load one area or raise the shared 404.

    `expected_level` additionally asserts that the code addresses an area of
    that administrative level. Without it, a hierarchy URL such as
    `/areas/provinces/3274/regencies` would silently accept a regency where a
    province was required and then answer a question nobody asked.
    """
    area = _fetch_area(db, code)
    if area is None:
        raise AreaNotFoundError()
    if expected_level is not None and area["level"] != LEVEL_INTS[expected_level]:
        raise AreaNotFoundError()
    return area


def _require_child_of(
    db: Session,
    code: str,
    parent: dict,
    expected_level: AreaLevel,
) -> dict:
    """Resolve a hierarchy path segment, proving the parent-child relationship.

    A child code alone is never enough: `327401` might exist yet not belong to
    regency `3274`. Returning it anyway would hand back a plausible-looking
    subtree from the wrong parent, which is exactly the silent-wrong-answer
    failure mode a hierarchy API must not have. Any broken link in the chain
    surfaces as the same 404 `AREA_NOT_FOUND` the rest of the area API uses.
    """
    child = _require_area(db, code, expected_level)
    if child["parent_code"] != parent["code"]:
        raise AreaNotFoundError()
    return child


def _fetch_children(db: Session, parent_code: str, limit: int) -> list[dict]:
    """Direct children of an area, ordered by canonical code ascending.

    Only one level deep by design: `children` is a navigation step for building
    a selector, and recursive descent would let one request pull an entire
    province. Callers walk the tree one request per level, or use the
    convenience routes which chain the same query.

    Ordered by `code` rather than `name` so the result set is stable across
    datasets and matches the deterministic ordering already used for postal
    areas. Canonical codes are level-aligned (3273 → 327301 → 3273011001), so
    code order is also geographic grouping order.
    """
    return [
        dict(row)
        for row in db.execute(
            text(
                """
                SELECT code, name, level, parent_code
                FROM administrative_areas
                WHERE parent_code = :parent_code
                ORDER BY code ASC
                LIMIT :limit
                """
            ),
            {"parent_code": parent_code, "limit": limit},
        ).mappings()
    ]


def _areas_public(db: Session, rows: list[dict]) -> list[AreaPublic]:
    """Map area rows onto the canonical public model.

    Shared by every area list endpoint so `level` naming and `hierarchy`
    construction stay identical across search, children, and the hierarchy
    convenience routes.
    """
    return [
        AreaPublic(
            code=row["code"],
            name=row["name"],
            level=LEVEL_NAMES[row["level"]],
            hierarchy=_build_hierarchy(db, dict(row)),
        )
        for row in rows
    ]


def _children_response(db: Session, parent: dict, limit: int) -> AreasListResponse:
    """The one query path behind `/children` and every hierarchy route.

    Both API styles differ only in how they resolve `parent`; the moment a
    parent area is known they share this function, so there is exactly one
    implementation of "list the children of this area".
    """
    rows = _fetch_children(db, parent["code"], limit)
    data = _areas_public(db, rows)
    return AreasListResponse(
        data=data,
        meta=AreasListMeta(limit=limit, count=len(data)),
    )


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


def _postal_code_public(db: Session, postal_code: dict) -> PostalCodePublic:
    """Build the public representation of one postal code.

    Loads every administrative area related to the postal code and maps each
    through `AreaPublic` with the canonical level name and the same
    `hierarchy` payload `/v1/areas` returns, so the two primitives stay
    consistent and there is only one hierarchy implementation.

    Ordering is level ASC then code ASC: the geographic reading order a
    consumer expects, with a deterministic tie-break.
    """
    area_rows = db.execute(
        text(
            """
            SELECT a.code, a.name, a.level, a.parent_code
            FROM administrative_areas a
            JOIN postal_code_areas pca ON pca.administrative_area_id = a.id
            WHERE pca.postal_code_id = :postal_code_id
            ORDER BY a.level ASC, a.code ASC
            """
        ),
        {"postal_code_id": postal_code["id"]},
    ).mappings().all()

    return PostalCodePublic(
        code=postal_code["code"],
        areas=_areas_public(db, [dict(row) for row in area_rows]),
    )


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

# Every /v1 endpoint is an authenticated API. Authentication is enforced once at
# the router boundary instead of per endpoint, so a newly added route cannot
# accidentally ship without it. `/health`, `/docs` and `/openapi.json` stay on the
# app itself and remain public.
#
# This is a gate, not a filter: administrative areas and postal codes are global
# master data shared by every tenant, so no endpoint scopes its queries by tenant.
v1_router = APIRouter(prefix="/v1", dependencies=[Depends(get_current_tenant)])


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


@v1_router.get(
    "/reverse-geocode",
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


@v1_router.get(
    "/areas/autocomplete",
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


@v1_router.get(
    "/areas",
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

    results = _areas_public(db, [dict(row) for row in rows])

    return AreasListResponse(
        data=results,
        meta=AreasListMeta(limit=limit, count=len(results)),
    )


# The hierarchy routes below MUST stay registered above `/areas/{code}`.
# Starlette matches routes in registration order, so `/areas/provinces`
# declared after `/areas/{code}` would never be reached: the dynamic segment
# would capture "provinces" as a code and return 404 AREA_NOT_FOUND.
# `tests/test_areas.py::TestRouteResolution` pins this ordering so a future
# refactor that reorders these blocks fails loudly instead of in production.


@v1_router.get(
    "/areas/provinces",
    response_model=AreasListResponse,
    tags=["Areas"],
    summary="List provinces",
)
def list_provinces(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> AreasListResponse:
    """List every province-level administrative area.

    The root of the hierarchy and the fastest way to populate a province
    selector. Each province carries the same canonical `level` and `hierarchy`
    as every other area endpoint; there is no province-specific schema.

    Results are ordered by canonical code ascending. Requires a valid API key.
    """
    rows = [
        dict(row)
        for row in db.execute(
            text(
                """
                SELECT code, name, level, parent_code
                FROM administrative_areas
                WHERE level = :level
                ORDER BY code ASC
                LIMIT :limit
                """
            ),
            {"level": LEVEL_INTS[AreaLevel.province], "limit": limit},
        ).mappings()
    ]
    data = _areas_public(db, rows)
    return AreasListResponse(
        data=data,
        meta=AreasListMeta(limit=limit, count=len(data)),
    )


@v1_router.get(
    "/areas/{code}/children",
    response_model=AreasListResponse,
    tags=["Areas"],
    summary="List the direct children of an administrative area",
)
def get_area_children(
    code: str,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> AreasListResponse:
    """List the direct children of one administrative area.

    The generic navigation primitive for building a province/regency/district/
    village selector: fetch the parent, then fetch its children, then repeat
    for the next level. Only direct children are returned, never the whole
    subtree, so the size of a response stays predictable regardless of how
    deep the data goes.

    - `/v1/areas/32/children`      -> regencies in province 32
    - `/v1/areas/3274/children`    -> districts in regency 3274
    - `/v1/areas/327401/children`  -> villages in district 327401

    A village has no children, so `/v1/areas/3274011001/children` returns 200
    with an empty `data` list rather than a 404: "no children" is a valid
    answer, only an unknown area code is an error.

    Ordering is canonical code ascending. Requires a valid API key.
    """
    parent = _require_area(db, code)
    return _children_response(db, parent, limit)


@v1_router.get(
    "/areas/provinces/{province_code}/regencies",
    response_model=AreasListResponse,
    tags=["Areas"],
    summary="List regencies in a province",
)
def list_regencies(
    province_code: str,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> AreasListResponse:
    """List the regencies of one province.

    `regency` is the level-2 administrative unit and deliberately covers both
    Indonesian kabupaten and kota: at this abstraction they share a level, and
    exposing them as separate resources would fork the hierarchy for a
    distinction the level model does not make.

    404 `AREA_NOT_FOUND` when the province code is unknown or is not a
    province. Requires a valid API key.
    """
    province = _require_area(db, province_code, AreaLevel.province)
    return _children_response(db, province, limit)


@v1_router.get(
    "/areas/provinces/{province_code}/regencies/{regency_code}/districts",
    response_model=AreasListResponse,
    tags=["Areas"],
    summary="List districts in a province's regency",
)
def list_districts(
    province_code: str,
    regency_code: str,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> AreasListResponse:
    """List the districts of one regency, within its province.

    The whole path is validated, not just the last segment: `327301` must
    actually be a direct child of `3273` inside province `32`. A regency that
    exists under a different province returns 404 `AREA_NOT_FOUND` rather than
    a district list from the wrong branch of the tree.

    Requires a valid API key.
    """
    province = _require_area(db, province_code, AreaLevel.province)
    regency = _require_child_of(db, regency_code, province, AreaLevel.regency)
    return _children_response(db, regency, limit)


@v1_router.get(
    "/areas/provinces/{province_code}/regencies/{regency_code}/districts/{district_code}/villages",
    response_model=AreasListResponse,
    tags=["Areas"],
    summary="List villages in a province's regency district",
)
def list_villages(
    province_code: str,
    regency_code: str,
    district_code: str,
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> AreasListResponse:
    """List the villages of one district, within its regency and province.

    Every link in the chain is verified: province -> regency -> district. A
    district that exists but sits under a different regency, or a regency
    under a different province, returns 404 `AREA_NOT_FOUND` instead of a
    plausible-looking list from the wrong subtree.

    Requires a valid API key.
    """
    province = _require_area(db, province_code, AreaLevel.province)
    regency = _require_child_of(db, regency_code, province, AreaLevel.regency)
    district = _require_child_of(db, district_code, regency, AreaLevel.district)
    return _children_response(db, district, limit)


@v1_router.get(
    "/areas/{code}",
    response_model=AreaSingleResponse,
    tags=["Areas"],
    summary="Get an administrative area by code",
)
def get_area(
    code: str,
    db: Session = Depends(get_db),
) -> AreaSingleResponse:
    """Retrieve a single Indonesian administrative area by canonical code.

    Returns the area with its full administrative hierarchy (province →
    regency → district → village). Codes are the canonical DB representation
    and do not contain "." separators. Returns 404 if the code does not
    exist.

    Requires a valid API key.
    """
    area = _require_area(db, code)

    return AreaSingleResponse(data=_areas_public(db, [area])[0])


@v1_router.get(
    "/postal-codes/search",
    response_model=PostalCodeSearchResponse,
    tags=["Postal Codes"],
    summary="Search postal codes by code",
)
def search_postal_codes(
    q: str = Query(
        ...,
        min_length=1,
        description="Case-insensitive prefix keyword (postal code)",
    ),
    limit: int = Query(20, ge=1, le=100, description="Maximum number of results"),
    db: Session = Depends(get_db),
) -> PostalCodeSearchResponse:
    """Search Indonesian postal codes.

    Returns postal codes whose `code` starts with `q`, case-insensitively, each
    with its related administrative areas and their full hierarchy
    (province → regency → district → village).

    Matching is a prefix match, consistent with `/v1/areas`. This endpoint is
    scoped to postal codes only: looking up an area by name belongs to
    `/v1/areas`, so administrative-area names are not searched here.

    Codes are the canonical undotted representation and never contain "."
    separators. Import/source metadata is not exposed.

    Requires a valid API key.
    """
    rows = db.execute(
        text(
            """
            SELECT id, code
            FROM postal_codes
            WHERE code ILIKE :pattern
            ORDER BY code ASC
            LIMIT :limit
            """
        ),
        {"pattern": f"{q}%", "limit": limit},
    ).mappings().all()

    data = [_postal_code_public(db, row) for row in rows]

    return PostalCodeSearchResponse(
        data=data,
        meta=PostalCodeSearchMeta(limit=limit, count=len(data)),
    )


@v1_router.get(
    "/postal-codes/{code}",
    response_model=PostalCodeLookupResponse,
    tags=["Postal Codes"],
    summary="Get a postal code and its administrative areas",
)
def get_postal_code(
    code: str,
    db: Session = Depends(get_db),
) -> PostalCodeLookupResponse:
    """Look up an Indonesian postal code.

    Returns the postal code together with every administrative area it is
    associated with, each carrying its full hierarchy (province → regency →
    district → village).

    `areas` is an array because `postal_code_areas` is many-to-many: a postal
    code may relate to several administrative areas, and this API does not
    restrict the relationship to one administrative level. The array is
    ordered by administrative level, then by area code.

    Areas are ordered topmost-first within `hierarchy` and use the canonical
    level names. Import/source metadata, internal identifiers, and
    `parent_code` are not exposed.

    Returns 404 `POSTAL_CODE_NOT_FOUND` if the postal code does not exist.

    Requires a valid API key.
    """
    row = db.execute(
        text(
            """
            SELECT id, code
            FROM postal_codes
            WHERE code = :code
            """
        ),
        {"code": code},
    ).mappings().first()
    if row is None:
        raise PostalCodeNotFoundError()

    return PostalCodeLookupResponse(data=_postal_code_public(db, row))


@v1_router.get(
    "/areas/{code}/postal-codes",
    response_model=AreaPostalCodesResponse,
    tags=["Areas"],
    summary="Get postal codes for an area",
)
def get_area_postal_codes(
    code: str,
    db: Session = Depends(get_db),
) -> AreaPostalCodesResponse:
    """List all postal codes associated with an administrative area.

    This is the reverse relation of the postal-code resource: it answers
    "which postal codes cover this area", while `/v1/postal-codes/{code}`
    answers "which areas cover this postal code". It is not a separate
    primitive.

    Returns the area code, name, and the postal codes that cover it, ordered
    by code ascending. A single area may have multiple postal codes.
    Returns 404 `AREA_NOT_FOUND` if the area does not exist.

    Requires a valid API key.
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
            SELECT pc.code
            FROM postal_codes pc
            JOIN postal_code_areas pca ON pca.postal_code_id = pc.id
            JOIN administrative_areas a ON a.id = pca.administrative_area_id
            WHERE a.code = :code
            ORDER BY pc.code ASC
            """
        ),
        {"code": code},
    ).mappings().all()

    return AreaPostalCodesResponse(
        code=area_row["code"],
        name=area_row["name"],
        postal_codes=[row["code"] for row in pc_rows],
    )


# Registered after every /v1 route is defined so the original ordering — and the
# static-before-dynamic precedence of /areas/autocomplete over /areas/{code} — is
# preserved exactly.
app.include_router(v1_router)
