-- Postal-code import staging table.
--
-- Used by the `python -m apps.api.importers.cli_postal_code` importer to stage
-- rows read from the postal-code-id Pos Indonesia CSV before they are
-- published into postal_codes / postal_code_areas.
--
-- Staging is transient: the importer deletes every staged row of a run once
-- the run has been published and marked completed. import_runs keeps the
-- durable audit record (source, data version, repo/ref, and the per-run
-- report).

SET LOCAL search_path TO public, extensions;

CREATE TABLE IF NOT EXISTS postal_codes_staging (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID NOT NULL REFERENCES import_runs(id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    postal_code VARCHAR(10),
    village_code VARCHAR(20),
    raw_feature JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'invalid')),
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS postal_codes_staging_run_status_idx
    ON postal_codes_staging (run_id, status);

COMMENT ON TABLE postal_codes_staging IS 'Area sementara; baris staging dibersihkan setelah publish sukses.';