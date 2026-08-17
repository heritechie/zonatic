CREATE TABLE IF NOT EXISTS postal_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_postal_codes_code ON postal_codes(code);

CREATE TABLE IF NOT EXISTS postal_code_areas (
    postal_code_id BIGINT NOT NULL REFERENCES postal_codes(id) ON DELETE CASCADE,
    administrative_area_id BIGINT NOT NULL REFERENCES administrative_areas(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (postal_code_id, administrative_area_id)
);

CREATE INDEX idx_postal_code_areas_admin_area ON postal_code_areas(administrative_area_id);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_postal_codes_updated_at') THEN
        CREATE TRIGGER set_postal_codes_updated_at
        BEFORE UPDATE ON postal_codes
        FOR EACH ROW
        EXECUTE FUNCTION set_updated_at();
    END IF;
END $$;

INSERT INTO postal_codes (code, metadata) VALUES
('10270', '{"source":"sample","type":"urban"}'),
('10210', '{"source":"sample","type":"urban"}'),
('10110', '{"source":"sample","type":"urban"}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
SELECT pc.id, aa.id
FROM postal_codes pc
JOIN administrative_areas aa ON aa.code = '31.71.01.1001'
WHERE pc.code = '10270'
ON CONFLICT DO NOTHING;

INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
SELECT pc.id, aa.id
FROM postal_codes pc
JOIN administrative_areas aa ON aa.code = '31.71.01'
WHERE pc.code = '10210'
ON CONFLICT DO NOTHING;

INSERT INTO postal_code_areas (postal_code_id, administrative_area_id)
SELECT pc.id, aa.id
FROM postal_codes pc
JOIN administrative_areas aa ON aa.code = '31.71'
WHERE pc.code = '10110'
ON CONFLICT DO NOTHING;
