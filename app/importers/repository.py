import json
from dataclasses import asdict
from uuid import UUID

from sqlalchemy import Connection, text

from app.importers.normalize import ImportOptions, StagedFeature


def create_run(connection: Connection, run_id: UUID, options: ImportOptions) -> None:
    connection.execute(
        text(
            """
            INSERT INTO import_runs (id, source, data_version, level, status)
            VALUES (:id, :source, :data_version, :level, 'running')
            """
        ),
        {
            "id": run_id,
            "source": options.source,
            "data_version": options.data_version,
            "level": options.level,
        },
    )


def stage_features(connection: Connection, run_id: UUID, options: ImportOptions, features: list[StagedFeature]) -> None:
    statement = text(
        """
        INSERT INTO administrative_areas_staging
            (run_id, row_number, code, name, level, parent_code, geometry, metadata, raw_feature, status, error)
        VALUES
            (
                :run_id, :row_number, :code, :name, :level, :parent_code,
                CASE WHEN CAST(:geometry AS text) IS NULL THEN NULL
                    ELSE ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Transform(
                        ST_SetSRID(ST_GeomFromGeoJSON(CAST(:geometry AS text)), :source_srid), 4326
                    )), 3))
                END,
                CAST(:metadata AS jsonb), CAST(:raw_feature AS jsonb), :status, :error
            )
        """
    )
    payloads = []
    for feature in features:
        payload = asdict(feature)
        payload.update(
            {
                "run_id": run_id,
                "level": options.level,
                "source_srid": options.source_srid,
                "geometry": json.dumps(feature.geometry) if feature.geometry else None,
                "metadata": json.dumps(feature.metadata),
                "raw_feature": json.dumps(feature.raw_feature),
            }
        )
        payloads.append(payload)
    if payloads:
        connection.execute(statement, payloads)


def validate_staging(connection: Connection, run_id: UUID) -> None:
    connection.execute(
        text(
            """
            UPDATE administrative_areas_staging
            SET status = 'invalid', error = COALESCE(error || '; ', '') || 'geometri kosong atau invalid setelah normalisasi'
            WHERE run_id = :run_id
              AND status = 'ready'
              AND (geometry IS NULL OR ST_IsEmpty(geometry) OR NOT ST_IsValid(geometry))
            """
        ),
        {"run_id": run_id},
    )
    connection.execute(
        text(
            """
            UPDATE administrative_areas_staging AS stage
            SET status = 'invalid', error = COALESCE(stage.error || '; ', '') || 'parent_code tidak ditemukan'
            WHERE stage.run_id = :run_id
              AND stage.status = 'ready'
              AND stage.parent_code IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1 FROM administrative_areas AS area WHERE area.code = stage.parent_code
              )
            """
        ),
        {"run_id": run_id},
    )
    connection.execute(
        text(
            """
            WITH duplicates AS (
                SELECT code
                FROM administrative_areas_staging
                WHERE run_id = :run_id AND status = 'ready'
                GROUP BY code
                HAVING COUNT(*) > 1
            )
            UPDATE administrative_areas_staging AS stage
            SET status = 'invalid', error = COALESCE(stage.error || '; ', '') || 'kode duplikat di file import'
            FROM duplicates
            WHERE stage.run_id = :run_id AND stage.status = 'ready' AND stage.code = duplicates.code
            """
        ),
        {"run_id": run_id},
    )


def import_ready_features(connection: Connection, run_id: UUID) -> tuple[int, int]:
    existing = connection.execute(
        text(
            """
            SELECT COUNT(*)
            FROM administrative_areas AS area
            JOIN administrative_areas_staging AS stage ON stage.code = area.code
            WHERE stage.run_id = :run_id AND stage.status = 'ready'
            """
        ),
        {"run_id": run_id},
    ).scalar_one()
    ready = connection.execute(
        text("SELECT COUNT(*) FROM administrative_areas_staging WHERE run_id = :run_id AND status = 'ready'"),
        {"run_id": run_id},
    ).scalar_one()
    connection.execute(
        text(
            """
            INSERT INTO administrative_areas (code, name, level, parent_code, geometry, metadata)
            SELECT code, name, level, parent_code, geometry, metadata
            FROM administrative_areas_staging
            WHERE run_id = :run_id AND status = 'ready'
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                level = EXCLUDED.level,
                parent_code = EXCLUDED.parent_code,
                geometry = EXCLUDED.geometry,
                metadata = administrative_areas.metadata || EXCLUDED.metadata
            """
        ),
        {"run_id": run_id},
    )
    connection.execute(
        text("UPDATE administrative_areas_staging SET status = 'imported' WHERE run_id = :run_id AND status = 'ready'"),
        {"run_id": run_id},
    )
    return ready - existing, existing


def build_report(connection: Connection, run_id: UUID, inserted: int = 0, updated: int = 0) -> dict[str, int]:
    result = connection.execute(
        text(
            """
            SELECT
                COUNT(*) AS total,
                COUNT(*) FILTER (WHERE status = 'imported') AS imported,
                COUNT(*) FILTER (WHERE status = 'invalid') AS invalid
            FROM administrative_areas_staging
            WHERE run_id = :run_id
            """
        ),
        {"run_id": run_id},
    ).mappings().one()
    return {**dict(result), "inserted": inserted, "updated": updated}


def complete_run(connection: Connection, run_id: UUID, report: dict[str, int], status: str = "completed") -> None:
    connection.execute(
        text(
            """
            UPDATE import_runs
            SET status = :status, report = CAST(:report AS jsonb), completed_at = NOW()
            WHERE id = :run_id
            """
        ),
        {"run_id": run_id, "report": json.dumps(report), "status": status},
    )
