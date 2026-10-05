# Supabase migrations

This directory contains ordered SQL migrations that produce the Zonatic schema
inside a Supabase project (managed PostgreSQL with PostGIS).

## Conventions

- File names use the format `YYYYMMDDHHMMSS_<topic>.sql` so the Supabase
  migration toolchain orders them deterministically.
- Each migration starts with `SET LOCAL search_path TO public, extensions;`
  so PostGIS operators and functions resolve without schema qualification,
  while keeping the schema portable.
- Migrations are safe to re-run (`IF NOT EXISTS`, `DROP ... IF EXISTS`,
  `ON CONFLICT DO NOTHING` where appropriate).

## How to apply against a Supabase project

Use the Supabase CLI from the repository root once the project is linked:

```bash
supabase db push
```

Or apply each file individually via the Supabase SQL editor or `psql` against
the direct connection string.

## How to apply against a local Supabase-compatible PostgreSQL

```bash
psql "$DATABASE_URL" -f supabase/migrations/20260101000001_enable_postgis.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000002_administrative_areas.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000003_sample_data.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000004_import_pipeline.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000005_postal_codes.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000006_phase1_multi_tenant.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000007_console_auth.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000008_console_api_key_environment_rls.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000009_canonical_area_codes.sql
```

## Canonical administrative codes

`administrative_areas.code` and `administrative_areas.parent_code` are stored
without any `.` separator — `3171`, not `31.71`. This is the form the public
`/v1/areas` contract publishes and the form the region-id importer produces.

`20260101000009_canonical_area_codes.sql` enforces this. It converts any
pre-existing dotted codes in place, preserving the `parent_code` hierarchy, and
adds `CHECK` constraints so dotted codes cannot be written again.

The migration is safe to re-run and never deletes rows. It aborts with a clear
error, changing nothing, if two distinct codes would collapse to the same
canonical code (for example a dotted sample row next to a real imported row for
the same area). Resolve that duplicate manually and re-run.

Verify the result:

```sql
SELECT count(*) FROM administrative_areas WHERE code LIKE '%.%';
-- expect 0
SELECT count(*) FROM administrative_areas a
  LEFT JOIN administrative_areas p ON p.code = a.parent_code
 WHERE a.parent_code IS NOT NULL AND p.id IS NULL;
-- expect 0 (no orphaned parents after conversion)
```

`<supabase-host>` in the connection string can be a Supabase direct host
(`db.<project-ref>.supabase.co`) or a Supavisor pooler host, depending on
which connection string is provided.

## Legacy fallback

`db/init/` contains the equivalent legacy bootstrap scripts ordered for the
Docker entrypoint of a brand-new PostgreSQL volume. They remain in the
repository for historical reference and as a quick-start option for fully
local development. New schema work targets `supabase/migrations/`.

## PostGIS schema

PostGIS is installed into the `extensions` schema. If the target Supabase
project already has PostGIS installed in a different schema (commonly
`public`), do **not** re-run the `CREATE EXTENSION` statement. Adjust
downstream SQL or set the database `search_path` accordingly.

Verify first:

```sql
SELECT extname, nspname
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'postgis';
```