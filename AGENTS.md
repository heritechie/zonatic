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

| Level | Area |
| --- | --- |
| 1 | Province |
| 2 | Regency/city |
| 3 | District (kecamatan) |
| 4 | Village/ward (desa/kelurahan) |

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

## Safety

- Preserve existing data and changes that do not belong to the task.
- Treat imported boundary source and license metadata as required product data, not optional documentation.
- Never claim legal authority, official accuracy, or commercial-use permission for a boundary dataset without validating its source and license.
