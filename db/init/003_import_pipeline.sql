CREATE TABLE import_runs (
    id UUID PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    data_version VARCHAR(100) NOT NULL,
    level SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 4),
    status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
    report JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE administrative_areas_staging (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    code VARCHAR(20),
    name VARCHAR(255),
    level SMALLINT,
    parent_code VARCHAR(20),
    geometry geometry(MULTIPOLYGON, 4326),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    raw_feature JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'invalid', 'imported')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX administrative_areas_staging_run_status_idx
    ON administrative_areas_staging (run_id, status);

COMMENT ON TABLE import_runs IS 'Audit trail setiap proses import batas administratif.';
COMMENT ON TABLE administrative_areas_staging IS 'Area sementara; hanya baris status ready yang dapat di-upsert ke tabel produksi.';

