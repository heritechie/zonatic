# Phase 1: Administrative Directory API — Revised Implementation Plan

## 1. Repository Assessment

### Current Architecture

Zonatic is a Python/FastAPI backend (`app/`) backed by PostgreSQL 16 + PostGIS 3.4. Docker Compose orchestrates all services through a Caddy reverse proxy. The backend is a single-file application (`app/main.py`, 346 lines) with all route handlers defined inline.

### Existing Backend Patterns

| Pattern | Current Implementation |
|---------|----------------------|
| Database access | Raw SQL via `sqlalchemy.text()` with parameterized queries. `get_db()` dependency injects a `Session`. |
| Error handling | `HTTPException` with status codes and Indonesian-language `detail` strings. No structured error envelope. |
| Schemas | Pydantic `BaseModel` response models in `app/schemas.py`. |
| Models | SQLAlchemy ORM in `app/models.py`: `AdministrativeArea`, `PostalCode`, `PostalCodeArea`. |
| Config | `pydantic-settings` in `app/config.py`: `DATABASE_URL`, `APP_ENV`. |
| Tests | FastAPI `TestClient` against real DB in `tests/test_api.py` (21 tests, 257 lines). |

### Existing Dependencies

All Phase 1 needs are already in `requirements.txt`: FastAPI, uvicorn, SQLAlchemy, psycopg, pydantic-settings, geoalchemy2, scalar-fastapi. **No new packages required.**

### Existing Authentication Infrastructure

**None.** The repository has zero authentication, tenant, user, or API key code. The only trace is a `user: null` placeholder in the console-api GraphQL context (`apps/console-api/src/graphql/context.ts:5`) and an installed but unused `@pothos/plugin-scope-auth` npm dependency. All API endpoints are fully open.

---

## 2. Confirmed Existing Components

| Component | Status | Phase 1 Impact |
|-----------|--------|----------------|
| `administrative_areas` table | Exists with `geometry NOT NULL` and `ST_IsValid` CHECK | See §3a for analysis |
| `import_runs` / `administrative_areas_staging` | Exist for GeoJSON import pipeline | **Not reused.** region-id importer uses a different, simpler path. |
| GeoJSON importer (`app/importers/`) | Exists, handles Polygon/MultiPolygon GeoJSON | Not modified; region-id importer is separate |
| Existing endpoints (reverse geocode, autocomplete, postal codes) | All in `app/main.py` | **Not modified** in Phase 1 |
| Test suite (`tests/test_api.py`) | 21 tests, uses dot-separated codes | Test data updated to canonical codes; existing tests preserved |

---

## 3. Required Changes

Only changes with a concrete dependency on Phase 1 are listed. Each is justified.

### 3a. Role of `administrative_areas` — Domain Master vs Spatial Boundary Table

**Analysis of current schema design:**

The table was built as a **spatial boundary table**:

| Evidence | Location |
|----------|----------|
| Table comment: `'Batas administratif Indonesia'` ("Administrative boundaries") | `001_schema.sql:16` |
| `geometry geometry(MULTIPOLYGON, 4326) NOT NULL` | `001_schema.sql:9` |
| `CHECK (ST_IsValid(geometry))` | `001_schema.sql:13` |
| GiST spatial index on geometry | `001_schema.sql:19` |
| Sample data comment: `'Ganti dengan data batas resmi saat proses import'` | `002_sample_data.sql:2` |
| The only spatial consumer is `reverse_geocode` via `ST_Covers` | `app/main.py:94` |
| The existing GeoJSON importer always provides geometry | `app/importers/repository.py:129` |

**Analysis of documentation intent:**

The architecture documentation separates two concerns:

1. **Core reference data** (§5, §6): `AdministrativeArea` conceptual model has code, name, level, parent — no geometry. Data source is region-id. This is the domain master.

2. **Boundary data** (§12): Reverse geocoding is explicitly out of MVP scope: *"Reverse geocoding tidak termasuk dalam MVP architecture implementation. Boundary dataset belum tersedia."* Future architecture shows boundary data flowing through PostGIS to the reverse geocode API.

The MVP document (§8) also lists "Administrative boundary / polygon processing" and "PostGIS-based point-in-polygon lookup" as out of scope.

**Conclusion:**

`administrative_areas` currently functions as a spatial boundary table, but the documentation intends it to serve **both** purposes — a domain reference that can optionally carry spatial boundary data. The region-id import populates domain fields (code, name, level, parent). Boundary data is a separate future concern.

**Decision required:** The schema change to make geometry nullable is the minimal adaptation that accommodates both purposes. The alternative — creating a separate table for domain reference data — would split the entity that `postal_code_areas` references and complicate all queries.

**If geometry becomes nullable, impact on existing behavior:**

| Concern | Analysis |
|---------|----------|
| Reverse geocode (`ST_Covers`) | `ST_Covers(NULL, point)` returns NULL, which is falsy in WHERE. NULL-geometry rows are naturally excluded. **No change needed to the query.** |
| Existing sample data | All sample rows have geometry. **Unaffected.** |
| Existing GeoJSON importer | Always provides geometry. **Unaffected.** |
| GiST index | Indexes skip NULL values. **Unaffected.** |
| Postal code joins | Join on `id`, not geometry. **Unaffected.** |

**SQLAlchemy model change**: `app/models.py` — make `geometry` column accept `None`:

```python
geometry: Mapped[object | None] = mapped_column(Geometry("MULTIPOLYGON", srid=4326), nullable=True)
```

**SQL migration**: `db/init/005_phase1.sql`:

```sql
ALTER TABLE administrative_areas ALTER COLUMN geometry DROP NOT NULL;
ALTER TABLE administrative_areas DROP CONSTRAINT administrative_areas_geometry_valid;
ALTER TABLE administrative_areas ADD CONSTRAINT administrative_areas_geometry_valid
    CHECK (geometry IS NULL OR ST_IsValid(geometry));
```

### 3b. Add `tenants` and `api_keys` tables

**Why**: The feature spec requires API key authentication. No auth infrastructure exists. These two tables are the minimum for key validation and tenant resolution.

### 3c. Add new area endpoints

**Why**: `GET /v1/areas/{code}` and `GET /v1/areas/search` are the Phase 1 deliverables. These are new routes added to `app/main.py`.

### 3d. Add structured error response

**Why**: The feature spec defines a specific error contract (`{ "error": { "code": "...", "message": "..." } }`) with required error codes. The current codebase returns raw `HTTPException` with `detail` strings. A global exception handler is needed to map exceptions to this contract.

### 3e. Update sample data codes

**Why**: Existing `002_sample_data.sql` uses dot-separated codes (`31.71`, `31.71.01`). The canonical format is continuous numeric (`3171`, `317101`). All Phase 1 endpoints and tests must use canonical codes. The existing sample data, example GeoJSON, postal code seed data, and test fixtures all need updating.

### 3f. Add `app/dependencies.py` for API key validation

**Why**: Authentication must be a FastAPI dependency injected into the new endpoints.

### NOT changed in Phase 1

- `app/main.py` route structure (existing routes stay inline; new routes added alongside)
- Reverse geocode endpoint
- Postal code endpoints
- Existing autocomplete endpoint
- Console application
- Console API
- Caddy configuration

---

## 4. Data Model

### `tenants` table

```sql
CREATE TABLE tenants (
    id         BIGSERIAL PRIMARY KEY,
    name       VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Minimal. No `updated_at` — tenant metadata changes are not expected in Phase 1.

### `api_keys` table

```sql
CREATE TABLE api_keys (
    id          BIGSERIAL PRIMARY KEY,
    tenant_id   BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    key_prefix  VARCHAR(20) NOT NULL,
    key_hash    VARCHAR(64) NOT NULL,
    revoked_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_api_keys_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
```

| Column | Purpose |
|--------|---------|
| `key_prefix` | First portion of the key for identification (e.g. `zn_test_a1b2`). Displayed in console; never the full secret. |
| `key_hash` | SHA-256 hex digest of the full key. Used for lookup. |
| `revoked_at` | NULL = active. Timestamp = revoked. Replaces boolean `is_revoked`. |
| `created_at` | Key creation timestamp. |

**No `users` table in Phase 1.** Users are only needed for Console login, which is a separate feature. The `user: null` placeholder in console-api is not a dependency.

**No `env_prefix` column.** The environment is derivable from `key_prefix` (`zn_test_` = test, `zn_live_` = live). No duplication.

### Level vocabulary

API-level string vocabulary (matching the feature spec):

| Integer | String |
|---------|--------|
| 1 | `province` |
| 2 | `regency` |
| 3 | `district` |
| 4 | `village` |

Stored as integers in the database. Mapped to strings at the API boundary.

---

## 5. region-id Import Strategy

### Verified Source

**Repository**: `https://github.com/lokabisa-oss/region-id`  
**Latest release**: v1.0.1 (12 Jan 2026)

### Verified Release Assets

| File | Columns |
|------|---------|
| `provinces.csv` | `code,name,capital` |
| `regencies.csv` | `code,province_code,name,capital,type,is_administrative` |
| `districts.csv` | `code,regency_code,name` |
| `villages.csv` | `code,district_code,name,type` |
| `regions_id.csv` | Denormalized: 12 columns, one row per village |

### Verified Code Format

Continuous numeric strings, no separators:

| Level | Length | Example |
|-------|--------|---------|
| Province | 2 digits | `11` |
| Regency | 4 digits | `1101` |
| District | 6 digits | `110101` |
| Village | 10 digits | `1101012001` |

### Import Approach: Normalized Files (Not Denormalized)

Use the 4 normalized CSV files rather than the denormalized `regions_id.csv`. Rationale:

1. **Explicit hierarchy** — each file has an explicit parent FK column (`province_code`, `regency_code`, `district_code`), making parent validation straightforward.
2. **No deduplication needed** — the denormalized file repeats province/regency/district data across every village row, requiring dedup logic.
3. **Proven order** — import provinces first, then regencies, districts, villages. Each level's parent is guaranteed to exist.

### Import Pipeline: Validation-First and Transactional

The import validates the complete source before applying any writes. Failed imports leave no partial data.

```text
Phase 1 — Read and Validate (no database writes)
───────────────────────────────────────────────

Read 4 CSVs from --dir path (stdlib csv module)
        ↓
Level inference from code length:
  2 digits → level 1 (province), parent = NULL
  4 digits → level 2 (regency), parent = province_code
  6 digits → level 3 (district), parent = regency_code
  10 digits → level 4 (village), parent = district_code
        ↓
Validate every row:
  ✓ code length matches expected length for level
  ✓ name is non-empty
  ✓ parent_code exists in previously validated level
  ✓ no duplicate codes within the import
  ✓ code contains only digits
        ↓
Collect errors per row. If ANY errors exist:
  → Report all errors. Abort. Zero database writes.
        ↓
All rows valid → proceed to Phase 2.

Phase 2 — Atomic Write (single transaction)
────────────────────────────────────────────

BEGIN TRANSACTION
        ↓
Create import_runs audit record (status = 'running')
        ↓
Upsert all rows into administrative_areas:
  ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    level = EXCLUDED.level,
    parent_code = EXCLUDED.parent_code,
    metadata = administrative_areas.metadata || EXCLUDED.metadata
  (geometry left untouched — existing boundary data is preserved)
        ↓
Update import_runs (status = 'completed', report = {...})
        ↓
COMMIT
        ↓
Report: total processed, inserted, updated
```

**Key properties:**

- **No staging table.** The region-id import is simple enough to validate in-memory. The existing `administrative_areas_staging` table remains available for the GeoJSON importer.
- **Atomic.** Either all rows are written or none are. A transaction failure rolls back everything.
- **Non-destructive to geometry.** The upsert updates name, level, parent_code, and metadata. It does NOT overwrite geometry, so existing boundary data is preserved when re-importing region-id data.
- **No hardcoded row counts.** Validation is based on source records processed, unique codes, and valid parent references.
- **Dry run mode.** `--dry-run` runs Phase 1 only (validation) and reports without writing.

### CLI Interface

```bash
python -m app.importers.cli_region_id import \
  --dir /path/to/region-id-1.0.1 \
  --version 1.0.1 \
  --dry-run
```

### What NOT to Do

- Do not reuse the existing GeoJSON staging pipeline (`import_runs`, `administrative_areas_staging`). The region-id import has a different input format and does not need geometry staging.
- Do not use `pandas`. The stdlib `csv` module is sufficient.
- Do not hardcode expected row counts.

---

## 6. API Key Authentication

### Validation Only (Not Management)

Phase 1 implements **validation only**: verify an incoming API key, resolve its tenant, reject invalid/revoked keys. No create/revoke/list endpoints. No Console UI.

### Dependency

`app/dependencies.py` — `get_current_tenant`:

```python
async def get_current_tenant(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> int:  # returns tenant_id
```

**Logic**:

1. Extract `Authorization` header.
2. If missing or not `Bearer ...` → `401` with `INVALID_API_KEY`.
3. Extract key string after `Bearer `.
4. Compute SHA-256 hex digest.
5. Query `api_keys` by `key_hash`.
6. If not found → `401` with `INVALID_API_KEY`.
7. If `revoked_at IS NOT NULL` → `403` with `API_KEY_REVOKED`.
8. Return `tenant_id`.

**No development bypass.** Development uses a seeded `zn_test_...` key, same contract as production.

### Seed Data

A development/test API key must be seeded in the database for local development and tests:

```sql
-- In db/init/005_phase1.sql:
INSERT INTO tenants (id, name) VALUES (1, 'Development');
INSERT INTO api_keys (tenant_id, name, key_prefix, key_hash)
VALUES (1, 'Development test key', 'zn_test_dev1234',
        encode(sha256('zn_test_dev1234_secret_value_here'::bytea), 'hex'));
```

The actual secret is documented in `.env.example` or README for developers to use locally.

### Hashing

SHA-256 via PostgreSQL's `sha256()` function for seed data, and Python's `hashlib.sha256` for runtime hashing. No external dependencies needed.

---

## 7. Area Lookup Implementation

### `GET /v1/areas/{code}`

**Added to `app/main.py`** (alongside existing routes, not replacing them).

**Behavior**:

1. `code` is a path parameter (string).
2. Query `administrative_areas` by exact `code` match.
3. If not found → `404` with `AREA_NOT_FOUND`.
4. Build breadcrumb by walking `parent_code` chain upward to province (max 4 iterations).
5. Return `200` with `data` object.

**Breadcrumb resolution**: Iterative lookup. Maximum depth is 4, so at most 3 additional queries. For a village, the chain is: village → district → regency → province. Could be optimized with a single recursive CTE, but iterative is simpler and sufficient for Phase 1.

**Response schema**:

```json
{
  "data": {
    "code": "3273011001",
    "name": "Kelurahan Example",
    "level": "village",
    "breadcrumb": [
      {"code": "32", "name": "Jawa Barat", "level": "province"},
      {"code": "3273", "name": "Kota Bandung", "level": "regency"},
      {"code": "327301", "name": "Kec. Bandung Wetan", "level": "district"},
      {"code": "3273011001", "name": "Kelurahan Example", "level": "village"}
    ]
  }
}
```

---

## 8. Area Search Implementation

### `GET /v1/areas/search`

**Added to `app/main.py`** (alongside existing routes).

**Query parameters**:

| Parameter | Required | Default | Validation |
|-----------|----------|---------|------------|
| `q` | yes | — | Non-empty string. Missing or empty → `400 INVALID_REQUEST`. |
| `level` | no | — | Must be one of `province`, `regency`, `district`, `village`. Invalid → `400 INVALID_LEVEL`. |
| `parent_code` | no | — | Must exist in `administrative_areas`. Unknown → `404 AREA_NOT_FOUND`. |
| `limit` | no | 20 | Integer 1–100. Out of range → `400 INVALID_LIMIT`. |

**Search query**:

```sql
SELECT code, name, level, parent_code, metadata
FROM administrative_areas
WHERE name ILIKE :q || '%'
  AND (:level::text IS NULL OR level = :level_int)
  AND (:parent_code::text IS NULL OR parent_code = :parent_code)
ORDER BY level ASC, name ASC
LIMIT :limit
```

Key points:
- **Prefix matching**: `ILIKE :q || '%'` — not contains (`%:q%`).
- **Case-insensitive**: `ILIKE` handles this.
- For each result, build breadcrumb (same as get area).
- Empty results return `200` with `data: []` and `meta.count: 0`. Never `404`.

**Response schema**:

```json
{
  "data": [
    {
      "code": "317101",
      "name": "Tanah Abang",
      "level": "district",
      "breadcrumb": [
        {"code": "31", "name": "DKI Jakarta", "level": "province"},
        {"code": "3171", "name": "Jakarta Pusat", "level": "regency"},
        {"code": "317101", "name": "Tanah Abang", "level": "district"}
      ]
    }
  ],
  "meta": {
    "limit": 10,
    "count": 1
  }
}
```

---

## 9. Testing Strategy

### Test Data

Expanded Jakarta + Bandung hierarchy with canonical codes:

```text
31        DKI Jakarta                          (province)
3171      Kota Administrasi Jakarta Pusat      (regency)
317101    Kecamatan Tanah Abang                (district)
3171011001  Kelurahan Gelora                   (village)
3171011002  Kelurahan Karet                    (village)
3172      Kota Administrasi Jakarta Selatan     (regency)
317201    Kecamatan Kebayoran Baru             (district)
3172011001  Kelurahan Selatan                  (village)
32        Jawa Barat                           (province)
3273      Kota Bandung                         (regency)
327301    Kecamatan Bandung Wetan              (district)
3273011001  Kelurahan Bandung                  (village)
```

Plus one seeded test API key (`zn_test_...`) for auth tests.

### Area Lookup Tests

| # | Test | Verification |
|---|------|-------------|
| 1 | `test_get_area_province` | 200, correct code/name/level, breadcrumb length 1 |
| 2 | `test_get_area_regency` | 200, breadcrumb length 2, starts with province |
| 3 | `test_get_area_district` | 200, breadcrumb length 3 |
| 4 | `test_get_area_village` | 200, breadcrumb length 4, province → regency → district → village |
| 5 | `test_get_area_breadcrumb_hierarchy` | Each breadcrumb item's parent matches the next |
| 6 | `test_get_area_not_found` | 404 with `AREA_NOT_FOUND` |
| 7 | `test_get_area_canonical_code` | Response code matches request code exactly |

### Search Tests

| # | Test | Verification |
|---|------|-------------|
| 8 | `test_search_basic` | `q=tanah` finds Tanah Abang |
| 9 | `test_search_case_insensitive` | `q=TANAH` returns same results as `q=tanah` |
| 10 | `test_search_prefix` | `q=tan` matches "Tanah Abang" |
| 11 | `test_search_all_levels` | No `level` param returns results across levels |
| 12 | `test_search_level_filter` | `level=regency` returns only regencies |
| 13 | `test_search_parent_filter` | `parent_code=3171` returns only children of 3171 |
| 14 | `test_search_limit_default` | Default limit is 20 |
| 15 | `test_search_limit_custom` | `limit=5` caps results |
| 16 | `test_search_empty_result` | `q=zzz` returns 200 with `data: []` |
| 17 | `test_search_missing_q` | Missing `q` returns 400 |
| 18 | `test_search_empty_q` | `q=` returns 400 |
| 19 | `test_search_invalid_level` | `level=invalid` returns 400 |
| 20 | `test_search_invalid_limit` | `limit=0` or `limit=101` returns 400 |
| 21 | `test_search_unknown_parent_code` | `parent_code=999999` returns 404 |
| 22 | `test_search_breadcrumb` | Each result has breadcrumb array |
| 23 | `test_search_meta` | Response has `meta.limit` and `meta.count` |

### Authentication Tests

| # | Test | Verification |
|---|------|-------------|
| 24 | `test_valid_api_key` | Request with valid `zn_test_...` key returns 200 |
| 25 | `test_invalid_api_key` | Random string returns 401 `INVALID_API_KEY` |
| 26 | `test_revoked_api_key` | Revoked key returns 403 `API_KEY_REVOKED` |
| 27 | `test_missing_api_key` | No Authorization header returns 401 `INVALID_API_KEY` |

### Import Tests

| # | Test | Verification |
|---|------|-------------|
| 28 | `test_import_parse_csv` | Parse each CSV file, verify column names |
| 29 | `test_import_hierarchy` | All parent references resolve correctly |
| 30 | `test_import_canonical_codes` | Codes stored exactly as in source |
| 31 | `test_import_idempotent` | Running import twice does not duplicate rows |
| 32 | `test_import_invalid_code_length` | Code length mismatch raises error |
| 33 | `test_import_missing_parent` | Parent code not found raises error |
| 34 | `test_import_metadata` | type/capital stored in metadata JSONB |

### Existing Tests

`tests/test_api.py` — all 21 existing tests must continue to pass after:
- Updating test data to canonical codes (dot-separated → continuous numeric)
- Updating test assertions for any error format changes

---

## 10. OpenAPI

FastAPI auto-generates OpenAPI from route decorators and Pydantic models. The Scalar UI at `/docs` renders this.

**New schemas to expose**:

| Schema | Endpoint |
|--------|----------|
| `AreaDetailResponse` | `GET /v1/areas/{code}` |
| `BreadcrumbItem` | Nested in area responses |
| `AreaSearchResponse` | `GET /v1/areas/search` |
| `AreaSearchMeta` | Nested in search response |
| `ErrorResponse` | All error responses |

**Error handler**: Register a global `HTTPException` handler in `app/main.py` that maps exceptions to the structured `{ "error": { "code": "...", "message": "..." } }` format. Custom exception classes in `app/exceptions.py` carry both error code and HTTP status.

---

## 11. Risks / Remaining Ambiguities

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Existing autocomplete endpoint** uses different search behavior (contains vs prefix) and different response format (string breadcrumb vs array). It will coexist with the new search endpoint. | Document as deprecated. The new `/v1/areas/search` is the canonical endpoint. |
| 2 | **Breadcrumb performance** — iterative parent lookup means up to 3 extra queries per area. For search results with `limit=100`, this could be slow. | For Phase 1, acceptable. Can optimize with a single recursive CTE in a future iteration if profiling shows a problem. |
| 3 | **`parent_code` validation in search** — returning `404` for an unknown `parent_code` means the search endpoint has two different 404 semantics (unknown parent vs area not found). The feature spec specifies this behavior. | Follow the spec. Both cases return the same `AREA_NOT_FOUND` error code. |
| 4 | **Test suite migration** — existing tests use dot-separated codes and Indonesian error messages. Updating them is mechanical but touches many assertions. | Do it carefully. Run tests after each change. |
| 5 | **region-id release format may change** — future versions could alter CSV columns. | Import validates expected columns and fails explicitly on unexpected format. |

---

## 12. Implementation Order

```
1. Verify existing schema and region-id source format
   → Confirm geometry NOT NULL is the blocker
   → Confirm CSV columns match expectations
   → (Both done during planning)

2. Database changes
   → Make geometry nullable (005_phase1.sql)
   → Add tenants + api_keys tables (005_phase1.sql)
   → Update sample data to canonical codes (002_sample_data.sql)
   → Update postal code seed data references (004_postal_codes.sql)
   → Update SQLAlchemy models (app/models.py)

3. Structured error handling
   → app/exceptions.py — exception classes with code + status
   → Global exception handler in app/main.py

4. API key validation
   → app/dependencies.py — get_current_tenant dependency
   → Seed test API key in 005_phase1.sql

5. region-id importer
   → app/importers/region_id.py — CSV reader, validation, upsert
   → app/importers/cli_region_id.py — CLI entry point

6. GET /v1/areas/{code}
   → Pydantic schemas in app/schemas.py
   → Route handler in app/main.py
   → Breadcrumb builder

7. GET /v1/areas/search
   → Route handler in app/main.py
   → Parameter validation
   → Search query builder

8. Tests
   → Update tests/test_api.py (canonical codes, auth headers)
   → Add tests/test_areas.py (lookup + search)
   → Add tests/test_auth.py (key validation)
   → Add tests/test_region_id_import.py (import pipeline)

9. Verify OpenAPI
   → Check Scalar docs render correctly
   → Verify all schemas and error codes appear

10. Full regression
    → Run all tests
    → Verify acceptance criteria from docs/features/administrative-directory.md
    → Manual smoke test
```

---

## 13. Explicit Out-of-Scope Changes

The following are **NOT** part of this plan:

| Item | Reason |
|------|--------|
| Moving existing routes to `app/routers/` | No dependency from Phase 1. Existing routes stay in `main.py`. |
| Reverse geocode changes | Not part of Phase 1. |
| Postal code changes | Not part of Phase 1. |
| Console application changes | Phase 1 is backend API only. |
| Console API changes | Phase 1 is backend API only. |
| `users` table | Not needed for API key validation. Console auth is a separate feature. |
| API key management endpoints (create/revoke/list) | Console feature, separate from validation. |
| Rate limiting | Error code defined in spec but no infrastructure needed yet. |
| User authentication (login/logout) | Separate feature. |
| `alembic` or migration tooling | Docker init scripts are sufficient for Phase 1. |
| New Python dependencies | All needed packages already installed. |
| Caddy configuration changes | New endpoints are under `/v1/` which is already proxied. |
