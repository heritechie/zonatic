-- Enable PostGIS in the extensions schema (Supabase convention).
--
-- On a fresh Supabase project the postgis extension is typically already
-- installed, so this migration is idempotent and safe to re-run.
--
-- If you are applying this to an existing Supabase project that has PostGIS
-- already enabled in a different schema (commonly `public`), inspect the
-- project first with:
--   SELECT extname, nspname FROM pg_extension e JOIN pg_namespace n ON e.extnamespace = n.oid WHERE extname = 'postgis';
-- Do not blindly run the CREATE EXTENSION below against production if the
-- extension already exists in another schema. Adjust downstream SQL to use
-- the schema you find.

CREATE SCHEMA IF NOT EXISTS extensions;

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Make PostGIS operators and functions discoverable for the rest of this
-- migration session without requiring schema-qualification everywhere.
SET LOCAL search_path TO public, extensions;