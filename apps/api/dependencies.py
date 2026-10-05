import uuid
import hashlib

from fastapi import Depends, Header
from sqlalchemy import text
from sqlalchemy.orm import Session

from apps.api.database import get_db
from apps.api.exceptions import ApiKeyRevokedException, InvalidApiKeyException

TEST_API_KEY = "zn_test_devkey1234"
TEST_API_KEY_HASH = hashlib.sha256(TEST_API_KEY.encode()).hexdigest()


def _hash_key(key: str) -> str:
    return hashlib.sha256(key.encode()).hexdigest()


async def get_current_tenant(
    authorization: str | None = Header(None),
    db: Session = Depends(get_db),
) -> uuid.UUID:
    if not authorization or not authorization.startswith("Bearer "):
        raise InvalidApiKeyException()

    raw_key = authorization[7:]
    key_hash = _hash_key(raw_key)

    row = db.execute(
        text(
            """
            SELECT ak.tenant_id, ak.revoked_at
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

    import uuid
    return row["tenant_id"] if isinstance(row["tenant_id"], uuid.UUID) else uuid.UUID(str(row["tenant_id"]))
