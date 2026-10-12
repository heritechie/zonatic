-- Remove the placeholder sample seed so a fresh chain matches production.
--
-- Follows 20260101000011_postal_codes_staging.sql and runs BEFORE the real imports (region-id, then
-- postal-code-id). It deletes only rows the sample seed created, identified
-- either by an explicit sample business key (section 1) or by the
-- `metadata->>'source' = 'sample'` marker that 20260101000003 and
-- 20260101000005 wrote on every row they inserted (sections 2 and 3).
--
-- Why these rows and not others:
--
--   * 20260101000003 seeded four Jakarta placeholder areas (source=sample)
--     and 20260101000005 seeded three postal codes (source=sample) with three
--     postal/area relations. Together they are the only sample rows the chain
--     creates, and the relations are the only rows in a fresh database that
--     production does not have.
--   * One of the three relations (10270 -> 3171011001) does not exist in
--     production or in the Pos Indonesia dataset at all (the dataset maps
--     10270 to 3171071001), which is what makes the seed rows obsolete rather
--     than merely duplicated.
--   * Production has zero rows with metadata->>'source' = 'sample' and zero
--     of the three relations, so every statement below is a no-op there. This
--     migration must still not be applied to production as part of this
--     change; it is for fresh rebuilds and test databases.
--
-- The predicates are deliberately narrow. They do NOT use `level < 4`
-- (the sample seed includes a level 2 area) and they do NOT use
-- `geometry IS NOT NULL` (neither column nor value is part of the marker —
-- source is). Rows carrying any other source (region-id, pos_indonesia,
-- test, ...) are untouched.
--
-- Safe to re-run: after the first run no sample rows remain, so subsequent
-- runs delete nothing.
--
-- Applies after 20260101000011_postal_codes_staging.sql and before the
-- region-id / postal-code-id imports.

SET LOCAL search_path TO public, extensions;

-- ---------------------------------------------------------------------------
-- 1. The three sample postal/area relations, by explicit business key
-- ---------------------------------------------------------------------------
--
-- Keyed on the canonical codes (20260101000009 converts the dotted sample
-- codes in place before this file runs) and double-guarded with the sample
-- source marker so a legitimate row that happens to share a code can never be
-- deleted.

DELETE FROM postal_code_areas pca
USING postal_codes pc,
       administrative_areas aa
WHERE pca.postal_code_id = pc.id
  AND pca.administrative_area_id = aa.id
  AND (
      (pc.code = '10110'  AND aa.code = '3171')
   OR (pc.code = '10210'  AND aa.code = '317101')
   OR (pc.code = '10270'  AND aa.code = '3171011001')
  )
  AND (
      pc.metadata ->> 'source' = 'sample'
   OR aa.metadata ->> 'source' = 'sample'
  );

-- ---------------------------------------------------------------------------
-- 2. The three sample postal codes
-- ---------------------------------------------------------------------------
--
-- FK on postal_code_areas.postal_code_id is ON DELETE CASCADE, so any
-- remaining relation attached to a sample postal code goes with it.

DELETE FROM postal_codes
WHERE metadata ->> 'source' = 'sample';

-- ---------------------------------------------------------------------------
-- 3. The four sample administrative areas
-- ---------------------------------------------------------------------------
--
-- FK on postal_code_areas.administrative_area_id is ON DELETE CASCADE as
-- well; after sections 1 and 2 no sample relation is left to cascade.

DELETE FROM administrative_areas
WHERE metadata ->> 'source' = 'sample';
