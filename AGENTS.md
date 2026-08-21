# Zonatic Agent Guide

## Project purpose

Zonatic is an Indonesia-focused location intelligence platform. It turns coordinates into Indonesian administrative context and provides the foundations for bulk enrichment, custom coverage, territory planning, and field-location verification.

Zonatic is infrastructure, not a domain application. Do not add collection, CRM, dispatch, debt, routing, or continuous-tracking workflows unless the user explicitly requests them.

Product direction is documented in [docs/product-concept.md](docs/product-concept.md).

## Current stack

- Python 3.12
- FastAPI
- PostgreSQL 16 with PostGIS 3.4
- SQLAlchemy + psycopg
- Docker Compose

The API is in `app/`; database bootstrap SQL is in `db/init/`; GeoJSON import examples are in `examples/`.

## Local development

```bash
cp .env.example .env
docker compose up --build
```

Services:

- API: `http://localhost:8000`
- OpenAPI: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

Run a quick API smoke test:

```bash
curl --fail 'http://localhost:8000/health'
curl --fail 'http://localhost:8000/v1/reverse-geocode?latitude=-6.19&longitude=106.81'
```

Use `docker compose down` to stop the environment. Do not run `docker compose down -v` unless the user has explicitly approved recreating the local database volume.

## Development workflow

Development is incremental and phase-based.

For each feature:

1. Read the relevant product and feature documentation.
2. Inspect the existing implementation before changing it.
3. Produce an implementation plan before coding when the feature spans multiple files or components.
4. Implement one slice at a time.
5. Run focused tests for the slice.
6. Verify real API behavior when applicable.
7. Review the database state when database changes are involved.
8. Review `git diff` and `git status`.
9. Run the relevant regression suite.
10. Verify the phase acceptance criteria before moving to the next phase.

Do not implement an entire phase as one uncontrolled change.

Do not start the next phase while the current phase has unresolved blockers.

When verification fails, stop and report the failure. Do not automatically continue to the next phase.

### Phase completion criteria

A phase is complete only when:

- implementation is complete;
- acceptance criteria are verified;
- automated tests pass;
- real-data verification passes when applicable;
- no critical regressions remain;
- database state is verified when applicable;
- git scope has been reviewed.

Manual API verification does not replace automated tests when automated tests are part of the acceptance criteria.

## Database and spatial rules

### Coordinate system

All persisted geometry uses WGS84 / EPSG:4326:

```sql
geometry(MULTIPOLYGON, 4326)
```

GPS/API coordinates must be constructed in `(longitude, latitude)` order. Do not reverse the order.

### Point-in-area queries

Use `ST_Covers(area_geometry, point)` for point-in-polygon checks. It includes points exactly on a boundary, which is preferable for reverse geocoding and coverage checks.

Keep the GiST index on spatial geometry columns. Do not replace PostGIS spatial filtering with Python loops.

### Administrative hierarchy

`administrative_areas.level` is fixed:

| Level | Area                          |
| ----- | ----------------------------- |
| 1     | Province                      |
| 2     | Regency/city                  |
| 3     | District (kecamatan)          |
| 4     | Village/ward (desa/kelurahan) |

`code` is a stable identifier. Use it for joins, imports, and hierarchy references; never use display names as identifiers.

The existing seed geometries are deliberately simplified samples, not official boundaries. Do not describe them as production-quality data.

## Importer

The GeoJSON importer lives in `app/importers/` and accepts `Feature`/`FeatureCollection` input with `Polygon` or `MultiPolygon` geometries.

It must preserve this workflow:

```text
read input → normalize → stage → validate → upsert → report
```

- Import rows are staged in `administrative_areas_staging`.
- Every import has an `import_runs` audit record.
- Invalid rows remain in staging with a reason; do not silently discard them.
- Upserts are keyed by `administrative_areas.code`.
- Metadata must retain at least source and data version whenever known.
- Geometry must be transformed to EPSG:4326, made valid, and stored as `MULTIPOLYGON`.

When adding a schema migration, add it as an ordered SQL file under `db/init/`. Docker's init scripts run only on a brand-new PostgreSQL volume. Document a safe command to apply the migration to an existing local database.

Example dry-run:

```bash
docker compose exec api python -m app.importers.cli import \
  --file /app/examples/kelurahan-contoh.geojson \
  --level 4 \
  --code-field kode \
  --name-field nama \
  --parent-code-field kode_kecamatan \
  --source contoh-internal \
  --version 2026-08 \
  --dry-run
```

## API conventions

- Keep public endpoints under `/v1`.
- Validate Indonesian coordinate bounds at the API boundary.
- Preserve explicit `matched: false` responses for locations outside available boundaries; do not return a misleading closest area.
- One coordinate can match several administrative levels or several custom coverages. Return all valid matches unless the endpoint explicitly documents a single-result rule.
- Parameterize all SQL. Never interpolate user input into query strings.
- For high-volume batch work, prefer a job-based asynchronous API over long-lived HTTP requests.

## Future feature boundaries

Features aligned with Zonatic:

- administrative reverse geocoding and area directory;
- bulk location enrichment and data-quality checks;
- custom coverage and point-in-coverage checks;
- territory builder, conflict detection, and impact analysis;
- mobile field check-in webview that validates a user-initiated location event.

When adding customer-owned objects (coverage, territory, batch jobs, API keys), design for `tenant_id`, authorization, auditability, and versioning from the start.

For field-location features, collect location only on an explicit action with consent. Store timestamp and accuracy, avoid continuous tracking by default, and avoid domain-specific sensitive data unless strictly needed.

## Code quality

- Prefer small, typed Python functions and clear error messages in Indonesian for end-user-facing validation.
- Keep API schemas in `app/schemas.py`; avoid returning raw ORM/database rows directly.
- Use raw SQL only when PostGIS operations are clearer or more efficient than ORM expressions.
- Update `README.md` when commands, environment variables, endpoints, or data import behavior changes.
- Add focused tests for new behavior. At minimum, verify both success and no-match/invalid paths for spatial endpoints.
- Do not add heavyweight geospatial Python dependencies unless they solve a requirement that PostGIS and the standard library cannot handle.

## Development workflow

Development is incremental and phase-based.

For each feature:

1. Read relevant product/feature documentation.
2. Inspect existing implementation.
3. Plan before coding when the change spans multiple files/components.
4. Implement one slice at a time.
5. Run focused tests.
6. Verify real API behavior when applicable.
7. Verify database state when applicable.
8. Review git diff/status.
9. Run regression tests.
10. Verify acceptance criteria before moving to the next phase.

Do not start the next phase while the current phase has unresolved blockers.

Manual API verification does not replace automated tests when tests are part of the acceptance criteria.

## Test and database safety

### Protected database

Treat the `zonatic` database as protected production data.

Never run destructive tests or destructive fixtures against `zonatic`.

Destructive operations include:

- `DELETE`
- `TRUNCATE`
- `DROP`
- schema recreation
- database reset
- fixture-based data replacement

### Approved test databases

Tests must use one of these databases:

- `zonatic_test`
- `zonatic_ci`

Tests must never silently fall back to `zonatic`.

The test runtime must verify the actual PostgreSQL database identity before destructive fixtures execute.

If tests target `zonatic`, abort immediately with a clear error message.

### Test execution

To run tests:

```bash
# From host with .venv activated
source .venv/bin/activate
DATABASE_URL="postgresql+psycopg://zonatic:change-me-in-production@localhost:5432/zonatic_test" pytest tests/

# Or set environment variable
export DATABASE_URL="postgresql+psycopg://zonatic:change-me-in-production@localhost:5432/zonatic_test"
pytest tests/
```

The test suite includes a hard safety guard in `tests/conftest.py` that queries the actual PostgreSQL database name and refuses to run against `zonatic`.

## Import safety

Before real-data imports:

1. Verify target database.
2. Verify dataset source/version.
3. Run dry-run when supported.
4. Confirm validation succeeds.
5. Perform actual import only after successful validation.

Do not automatically delete existing development/production data as part of an import.

Prefer transactional/all-or-nothing imports.

After import, verify:

- Row counts by level
- Hierarchy integrity (no orphaned areas)
- Canonical identifiers (code lengths, no dotted codes)
- Source and data version metadata
- Import run status
- API behavior with real data

## Git scope

Preserve unrelated user changes.

Before making changes:

```bash
git status
git diff --stat
```

Do not revert, delete, stage, or commit unrelated work.

Before a phase commit:

- Review staged files
- Confirm all staged files belong to the phase
- Keep unrelated work unstaged
- Review final diff
- Run relevant tests
- Verify acceptance criteria

Do not commit automatically unless explicitly requested.

## Safety

- Preserve existing data and changes that do not belong to the task.
- Treat imported boundary source and license metadata as required product data, not optional documentation.
- Never claim legal authority, official accuracy, or commercial-use permission for a boundary dataset without validating its source and license.
