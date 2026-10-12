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
psql "$DATABASE_URL" -f supabase/migrations/20260101000010_schema_hardening.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000011_postal_codes_staging.sql
psql "$DATABASE_URL" -f supabase/migrations/20260101000012_cleanup_sample_seed.sql
```

## Console RLS policies (vanilla PostgreSQL compatible)

`20260101000008_console_api_key_environment_rls.sql` creates its five
`auth.uid()` SELECT policies only when the Supabase `auth` schema is present.
The policy creation runs inside a `DO` block guarded by
`to_regprocedure('auth.uid()')` and executed as dynamic SQL, so the statement
is never parsed against a missing function. On a plain PostgreSQL the guard
skips the policies (with a NOTICE) while row-level security stays enabled —
fail-closed for non-owner roles, full access for the owner connection both
APIs use. The columns, CHECK constraint and index from that migration are
created unconditionally.

## Sample seed cleanup

`20260101000012_cleanup_sample_seed.sql` runs after
`20260101000011_postal_codes_staging.sql` and **before** the region-id and
postal-code-id imports. It deletes exactly the placeholder rows the sample
seed created:

- the three sample postal/area relations, by explicit business key
  (`10110`/`3171`, `10210`/`317101`, `10270`/`3171011001`), additionally
  guarded with `metadata->>'source' = 'sample'`;
- every `postal_codes` row with `metadata->>'source' = 'sample'`
  (FK cascade removes any remaining relations);
- every `administrative_areas` row with `metadata->>'source' = 'sample'`.

It never keys on `level` or `geometry`. A database where the imports have
already run has zero `source = 'sample'` rows, so the migration is a no-op
there and is safe to re-run. Verify after a fresh rebuild:

```sql
SELECT count(*) FROM administrative_areas WHERE metadata->>'source' = 'sample';
-- expect 0
SELECT count(*) FROM postal_codes WHERE metadata->>'source' = 'sample';
-- expect 0
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

## Schema hardening

`20260101000010_schema_hardening.sql` moves invariants the importers already
check in Python into the database, and adds the provenance columns the import
audit trail lacked.

- `administrative_areas.code` length follows `level` — 2/4/6/10 characters for
  province/regency/district/village — and every child code starts with its own
  parent code.
- `administrative_areas.parent_code` presence follows `level` — a level 1 row is
  a root, anything deeper must name its parent.
- `import_runs.level` becomes nullable (a single run publishes all four levels)
  and gains `source_repo` / `source_ref` so a row in production can be traced
  back to a repository and a commit.
- The redundant `idx_postal_codes_code` index is dropped; `postal_codes.code` is
  already `UNIQUE`.
- A `pg_trgm` GIN index on `administrative_areas.name` supports the `ILIKE`
  lookups. A plain btree cannot serve `ILIKE` under any collation.

The migration refuses to run rather than guess. If an existing row breaks one of
the new constraints it names the offending codes and aborts before writing
anything. Resolve those rows, then re-run.

The constraints are safe to re-run and are mirrored into the inline schema in
`tests/conftest.py`, which the test database is built from.

Verify the result:

```sql
SELECT count(*) FROM administrative_areas
 WHERE NOT ((level = 1 AND length(code) = 2) OR (level = 2 AND length(code) = 4)
         OR (level = 3 AND length(code) = 6) OR (level = 4 AND length(code) = 10));
-- expect 0
SELECT count(*) FROM administrative_areas a
  WHERE a.parent_code IS NOT NULL AND NOT starts_with(a.code, a.parent_code);
-- expect 0
```

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
