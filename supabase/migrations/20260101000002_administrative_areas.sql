-- Core administrative areas table.
--
-- Equivalent to db/init/001_schema.sql, adapted for Supabase where PostGIS
-- lives in the `extensions` schema. The search_path is set locally so that
-- PostGIS functions and operators (ST_IsValid, GiST opclass, etc.) resolve
-- without schema qualification.

SET LOCAL search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS administrative_areas (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
    parent_code VARCHAR(20) REFERENCES administrative_areas(code),
    geometry geometry(MULTIPOLYGON, 4326) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT administrative_areas_geometry_valid CHECK (ST_IsValid(geometry))
);

COMMENT ON TABLE administrative_areas IS 'Batas administratif Indonesia: 1=provinsi, 2=kabupaten/kota, 3=kecamatan, 4=desa/kelurahan.';
COMMENT ON COLUMN administrative_areas.code IS 'Kode wilayah stabil dari sumber data yang dipilih, direkomendasikan kode Kemendagri/BPS.';

CREATE INDEX IF NOT EXISTS administrative_areas_geometry_gix
    ON administrative_areas USING GIST (geometry);
CREATE INDEX IF NOT EXISTS administrative_areas_parent_code_idx
    ON administrative_areas (parent_code);
CREATE INDEX IF NOT EXISTS administrative_areas_level_idx
    ON administrative_areas (level);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS administrative_areas_set_updated_at ON administrative_areas;
CREATE TRIGGER administrative_areas_set_updated_at
BEFORE UPDATE ON administrative_areas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();