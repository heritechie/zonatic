-- Sample seed data for smoke testing the API.
--
-- These are deliberately simplified rectangles around central Jakarta — they
-- are NOT official administrative boundaries and must be replaced with a
-- proper import before any real use. Kept here so a fresh Supabase project
-- has data that responds to /v1/reverse-geocode immediately.

SET LOCAL search_path TO public, extensions;

INSERT INTO administrative_areas (code, name, level, parent_code, geometry, metadata) VALUES
(
  '31', 'DKI Jakarta', 1, NULL,
  ST_Multi(ST_GeomFromText('POLYGON((106.70 -6.40, 106.98 -6.40, 106.98 -6.10, 106.70 -6.10, 106.70 -6.40))', 4326)),
  '{"source":"sample","type":"province"}'
),
(
  '31.71', 'Kota Administrasi Jakarta Pusat', 2, '31',
  ST_Multi(ST_GeomFromText('POLYGON((106.78 -6.25, 106.90 -6.25, 106.90 -6.12, 106.78 -6.12, 106.78 -6.25))', 4326)),
  '{"source":"sample","type":"city"}'
),
(
  '31.71.01', 'Kecamatan Tanah Abang', 3, '31.71',
  ST_Multi(ST_GeomFromText('POLYGON((106.79 -6.22, 106.84 -6.22, 106.84 -6.17, 106.79 -6.17, 106.79 -6.22))', 4326)),
  '{"source":"sample","type":"district"}'
),
(
  '31.71.01.1001', 'Kelurahan Gelora', 4, '31.71.01',
  ST_Multi(ST_GeomFromText('POLYGON((106.79 -6.20, 106.82 -6.20, 106.82 -6.18, 106.79 -6.18, 106.79 -6.20))', 4326)),
  '{"source":"sample","type":"urban_village"}'
)
ON CONFLICT (code) DO NOTHING;