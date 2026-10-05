-- Canonicalize administrative area codes.
--
-- The public API contract guarantees that administrative codes carry no "."
-- separator:
--
--     31.71         -> 3171
--     31.71.01      -> 317101
--     31.71.01.1001 -> 3171011001
--
-- The region-id importer already emits exactly this canonical, all-digit form
-- (see CODE_LENGTHS in apps/api/importers/region_id.py: 2/4/6/10 characters for
-- province/regency/district/village). Only the placeholder sample seed in
-- 20260101000003_sample_data.sql used dotted display codes.
--
-- This migration makes the database the single source of truth for the
-- canonical form rather than stripping dots at response time. Stripping in the
-- response layer alone would desynchronise `parent_code`, the `parent_code`
-- self-join, and every code-equality lookup, so the conversion is done once, in
-- place, with referential integrity preserved.
--
-- Note for tooling: this file must stay free of colon-prefixed words, even
-- inside SQL comments, because SQLAlchemy's `text()` parses a colon followed by
-- a word as a bind parameter and then fails for a value that is never supplied.
--
-- Properties:
--   * Safe to re-run. Already-canonical rows match no predicate and are left
--     untouched.
--   * Non-destructive. No row is deleted or recreated. `postal_code_areas`
--     references `administrative_areas(id)`, which does not change, so the
--     postal-code mapping survives untouched.
--   * Fails loudly rather than guessing. If two distinct codes would collapse
--     to the same canonical code (e.g. a dotted sample row alongside a
--     real imported row for the same area), the migration aborts without
--     modifying data. Merging those two rows is an operator decision, not
--     something to automate silently.

SET LOCAL search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- Guard: refuse to proceed if canonicalisation would collide.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    conflicts text;
BEGIN
    SELECT string_agg(DISTINCT a.code || ' -> ' || replace(a.code, '.', ''), ', ')
      INTO conflicts
      FROM administrative_areas a
     WHERE a.code LIKE '%.%'
       AND EXISTS (
             SELECT 1
               FROM administrative_areas b
              WHERE b.code = replace(a.code, '.', '')
                AND b.id <> a.id
           );

    IF conflicts IS NOT NULL THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Canonical code migration aborted: dotted codes collide with existing canonical codes: ' || conflicts,
            HINT = 'Two rows describe the same area. Merge or delete the duplicate manually, then re-run this migration. No data was modified.';
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Convert. The self-referencing FK on parent_code must be dropped for the
-- duration: repointing children at canonical parents would otherwise reference
-- codes that do not exist yet. The FK name is discovered rather than assumed.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    fk_name text;
BEGIN
    SELECT conname
      INTO fk_name
      FROM pg_constraint
     WHERE conrelid = 'administrative_areas'::regclass
       AND contype = 'f'
       AND conkey = (
             SELECT array_agg(attnum)
               FROM pg_attribute
              WHERE attrelid = 'administrative_areas'::regclass
                AND attname = 'parent_code'
           )
     ORDER BY conname
     LIMIT 1;

    IF fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE administrative_areas DROP CONSTRAINT %I', fk_name);
    END IF;

    -- Repoint children first, then rewrite the codes they will point at.
    UPDATE administrative_areas
       SET parent_code = replace(parent_code, '.', '')
     WHERE parent_code LIKE '%.%';

    UPDATE administrative_areas
       SET code = replace(code, '.', '')
     WHERE code LIKE '%.%';

    IF fk_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE administrative_areas ADD CONSTRAINT '
             || quote_ident(fk_name)
             || ' FOREIGN KEY (parent_code) REFERENCES administrative_areas(code)';
    END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Lock the invariant in at the schema level so dotted codes cannot reappear
-- through any write path (importer, manual SQL, future service).
-- ---------------------------------------------------------------------------

ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_code_canonical;

ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_code_canonical
    CHECK (code !~ '\.');

ALTER TABLE administrative_areas
    DROP CONSTRAINT IF EXISTS administrative_areas_parent_code_canonical;

ALTER TABLE administrative_areas
    ADD CONSTRAINT administrative_areas_parent_code_canonical
    CHECK (parent_code IS NULL OR parent_code !~ '\.');

COMMENT ON COLUMN administrative_areas.code IS
    'Kode wilayah stabil (Kemendagri/BPS) dalam bentuk kanonik: hanya digit, tanpa pemisah ".". Contoh: 3171, 317101, 3171011001.';