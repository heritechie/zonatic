-- Schema hardening for the administrative and postal import phase.
--
-- This migration changes no API contract and renames nothing. It moves
-- invariants that the importers already validate in Python down into the
-- database, so a future write path cannot quietly bypass them, and it adds the
-- provenance columns the import audit trail still lacks.
--
-- Evidence for each invariant comes from the upstream release the importer
-- consumes, not from a hard-coded national total. Against lokabisa-oss/region-id
-- v1.0.1 (f20ebb8) every code is all-digit, unique, 2/4/6/10 characters for
-- province/regency/district/village, and every child code starts with its own
-- parent code (38/514/7285/83762 rows, zero exceptions).
--
-- Note for tooling. This file must stay free of a colon immediately followed by
-- a word, even inside SQL comments, because SQLAlchemy's text() reads a colon
-- and a word as a bind parameter and then fails for a value that is never
-- supplied.
--
-- Properties:
--   * Safe to re-run. Every constraint is dropped with IF EXISTS and then
--     re-added, so a re-run is a no-op on an up-to-date database.
--   * Fails loudly rather than guessing. If an existing row violates one of the
--     new constraints the guard above it names the offending codes and aborts
--     before anything is written. Fix or remove those rows, then re-run.
--   * Non-destructive. No row is deleted, no column is dropped, no name changes.

SET LOCAL search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- Guard. Name the rows that would violate a new constraint before declaring it,
-- so an operator sees which codes to fix instead of a bare "violated by some
-- row" message.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    offending text;
BEGIN
    SELECT string_agg(format('%s (level %s, length %s)', code, level, length(code)), ', ')
      INTO offending
      FROM administrative_areas
     WHERE NOT (
           (level = 1 AND length(code) = 2)
        OR (level = 2 AND length(code) = 4)
        OR (level = 3 AND length(code) = 6)
        OR (level = 4 AND length(code) = 10)
       );

    IF offending IS NOT NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Schema hardening aborted, code length does not match level for ' || offending,
            HINT = 'Expected 2/4/6/10 characters for level 1/2/3/4. Correct the rows or remove them, then re-run. No data was modified.';
    END IF;

    SELECT string_agg(format('%s (level %s)', code, level), ', ')
      INTO offending
      FROM administrative_areas
     WHERE NOT (
           (level = 1 AND parent_code IS NULL)
        OR (level > 1 AND parent_code IS NOT NULL)
       );

    IF offending IS NOT NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Schema hardening aborted, parent presence does not match level for ' || offending,
            HINT = 'Level 1 rows must be roots and every deeper level must carry a parent_code. Fix the hierarchy, then re-run. No data was modified.';
    END IF;

    SELECT string_agg(format('%s (parent %s)', code, parent_code), ', ')
      INTO offending
      FROM administrative_areas
     WHERE parent_code IS NOT NULL
       AND NOT starts_with(code, parent_code);

    IF offending IS NOT NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Schema hardening aborted, child codes do not start with their parent for ' || offending,
            HINT = 'A child code must be its parent code plus a suffix. Fix the hierarchy, then re-run. No data was modified.';
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 1. import_runs provenance.
--
-- `level` becomes nullable because a single region-id run publishes all four
-- levels in one transaction. It was NOT NULL with a hard-coded 4, which was
-- simply false for every multi-level run. NULL now means the run is not scoped
-- to one level. The existing CHECK already accepts NULL.
--
-- source_repo / source_ref answer one question that source + data_version
-- cannot: which repository and which commit produced the rows now in
-- production. Both stay nullable so a hand-run import does not have to invent
-- them.
-- ---------------------------------------------------------------------------

ALTER TABLE import_runs ALTER COLUMN level DROP NOT NULL;

ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS source_repo VARCHAR(255);
ALTER TABLE import_runs ADD COLUMN IF NOT EXISTS source_ref VARCHAR(100);

COMMENT ON COLUMN import_runs.level IS
    'Level yang dicakup run. NULL untuk run multi-level yang menerbitkan sekaligus provinsi sampai desa.';
COMMENT ON COLUMN import_runs.source_repo IS
    'URL repositori dataset sumber, misalnya https://github.com/lokabisa-oss/region-id.';
COMMENT ON COLUMN import_runs.source_ref IS
    'Referensi immutable di repositori sumber. Utamakan commit SHA, bukan hanya tag.';

-- ---------------------------------------------------------------------------
-- 2. Administrative code shape.
--
-- Code length is a function of level, and a child code is its parent code plus
-- a suffix. Both hold for 100 percent of the upstream release, so they move
-- from importer-only checks into constraints every write path obeys.
--
-- parent_code is deliberately constrained together with level. A level 1 row is
-- a root, and any deeper row must name its parent, which is what makes
-- `parent_code` a real hierarchy rather than an optional annotation.
-- ---------------------------------------------------------------------------

ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_code_level_length;

ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_code_level_length
    CHECK (
        (level = 1 AND length(code) = 2)
     OR (level = 2 AND length(code) = 4)
     OR (level = 3 AND length(code) = 6)
     OR (level = 4 AND length(code) = 10)
    );

ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_parent_level;

ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_parent_level
    CHECK (
        (level = 1 AND parent_code IS NULL)
     OR (level > 1 AND parent_code IS NOT NULL)
    );

-- starts_with rather than LIKE so that a "%" or "_" inside a code cannot turn
-- the check into a wildcard match.
ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_parent_prefix;

ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_parent_prefix
    CHECK (parent_code IS NULL OR starts_with(code, parent_code));

COMMENT ON CONSTRAINT administrative_areas_code_level_length ON administrative_areas IS
    'Panjang kode mengikuti level, yaitu 2/4/6/10 karakter untuk level 1/2/3/4.';
COMMENT ON CONSTRAINT administrative_areas_parent_prefix ON administrative_areas IS
    'Kode anak selalu diawali kode induknya, memakai starts_with supaya tidak ada wildcard.';

-- ---------------------------------------------------------------------------
-- 3. Drop the redundant postal code index.
--
-- `postal_codes.code` is already UNIQUE, so PostgreSQL maintains
-- postal_codes_code_key over the same column. idx_postal_codes_code only ever
-- duplicated it, doubling write cost on every insert and update.
-- ---------------------------------------------------------------------------

DROP INDEX IF EXISTS idx_postal_codes_code;

-- ---------------------------------------------------------------------------
-- 4. Name search index.
--
-- A plain btree would be dead weight here. Every name lookup in the API is an
-- ILIKE, a prefix match for /v1/areas and autocomplete and an infix match for
-- /v1/areas, and a btree cannot serve ILIKE under any collation. The trigram
-- index serves both shapes. pg_trgm ships with PostgreSQL and installs into the
-- extensions schema alongside PostGIS.
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS administrative_areas_name_trgm_idx
    ON administrative_areas USING GIN (name gin_trgm_ops);
