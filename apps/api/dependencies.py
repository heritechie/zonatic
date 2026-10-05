import uuid
import hashlib
import logging
from dataclasses import dataclass

from fastapi import Depends, Header
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.exceptions import ApiKeyRevokedException, InvalidApiKeyException

logger = logging.getLogger(__name__)

TEST_API_KEY = "zn_test_devkey1234"
TEST_API_KEY_HASH = hashlib.sha256(TEST_API_KEY.encode()).hexdigest()


@dataclass(frozen=True)
class AuthContext:
    """Identity of the caller behind an authenticated request.

    Carries the API key id so per-key bookkeeping (such as ``last_used_at``)
    can target the key that actually authenticated, rather than every key the
    tenant owns. The raw key and its hash are deliberately absent: they must
    never propagate past the authentication step.
    """

    tenant_id: uuid.UUID
    api_key_id: uuid.UUID


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


def _record_api_usage(
    db: Session, *, tenant_id: uuid.UUID, api_key_id: uuid.UUID
) -> bool:
    """Meter one successfully authenticated public API request.

    Counts the request at the tenant level and stamps the authenticating key.
    Both writes are atomic and database-backed, so counters stay correct across
    concurrent requests, Uvicorn workers and Fly machines.

    Returns ``True`` when the request was recorded, ``False`` when metering was
    skipped after a database failure.
    """
    try:
        db.execute(
            text("UPDATE api_keys SET last_used_at = now() WHERE id = :api_key_id"),
            {"api_key_id": api_key_id},
        )
        db.execute(
            text(
                """
                INSERT INTO tenant_usage (tenant_id, api_requests_total, updated_at)
                VALUES (:tenant_id, 1, now())
                ON CONFLICT (tenant_id) DO UPDATE
                    SET api_requests_total = tenant_usage.api_requests_total + 1,
                        updated_at = now()
                """
            ),
            {"tenant_id": tenant_id},
        )
        db.commit()
        return True
    except SQLAlchemyError:
        # Usage metering is observability, not a reason to deny service. The
        # caller is already authenticated, so a metering fault must never turn
        # a valid request into a 500. The rollback keeps the session usable for
        # the endpoint handler, and the error is logged so a broken counter is
        # still diagnosable instead of silently reading zero forever.
        db.rollback()
        logger.exception(
            "Failed to record API usage for tenant=%s api_key=%s",
            tenant_id,
            api_key_id,
        )
        return False


async def get_current_tenant(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> AuthContext:
    if not authorization or not authorization.startswith("Bearer "):
        raise InvalidApiKeyException()

    raw_key = authorization[7:]
    key_hash = _hash_key(raw_key)

    row = db.execute(
        text(
            """
            SELECT ak.id AS api_key_id, ak.tenant_id, ak.revoked_at
            FROM api_keys ak
            WHERE ak.key_hash = :key_hash
            """
        ),
        {"key_hash": key_hash},
    ).mappings().first()

    if row is None:
        raise InvalidApiKeyException()

    if row["revoked_at"] is not None:
        raise ApiKeyRevokedException()

    tenant_id = row["tenant_id"]
    if not isinstance(tenant_id, uuid.UUID):
        tenant_id = uuid.UUID(str(tenant_id))
    api_key_id = row["api_key_id"]
    if not isinstance(api_key_id, uuid.UUID):
        api_key_id = uuid.UUID(str(api_key_id))

    # Metered only after the key is proven valid and unrevoked, so unauthenticated
    # and revoked requests are never counted.
    _record_api_usage(db, tenant_id=tenant_id, api_key_id=api_key_id)

    return AuthContext(tenant_id=tenant_id, api_key_id=api_key_id)