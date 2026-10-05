import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { apiKeys, keyEnvironments, type KeyEnvironment } from '../db/schema.js';

/**
 * Key prefix per environment.
 *
 * Keys use the `zon_` prefix. Environment is a user label only. The prefix is a
 * The prefix is a user-facing marker only; the public API hashes the whole
 * key and never parses the prefix.
 */
const KEY_PREFIX = 'zon';

/** Number of random bytes behind each key. */
const KEY_ENTROPY_BYTES = 32;

/** Characters of the random secret kept for the non-secret list fragment. */
const KEY_PREFIX_SAMPLE_LENGTH = 6;

/**
 * Canonical UUID text form, as produced by Postgres for `api_keys.id`.
 *
 * Used to reject a malformed id before it reaches the driver. Deliberately
 * strict — no braces, no urn prefix — because that is the only shape the
 * database can hand back.
 */
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ApiKeyRow = typeof apiKeys.$inferSelect;

/** Narrow an untrusted string to a known environment, or reject it. */
export function isKeyEnvironment(value: unknown): value is KeyEnvironment {
  return (
    typeof value === 'string' &&
    (keyEnvironments as readonly string[]).includes(value)
  );
}

/**
 * Hash a raw API key.
 *
 * Plain SHA-256 hex, which is exactly what the Python public API computes in
 * `app/dependencies.py::_hash_key`. A key created here therefore authenticates
 * against `/v1/*` unchanged. This is safe because generated keys carry 256 bits
 * of entropy, so there is no dictionary to attack — the salt that
 * password hashing needs is unnecessary here.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}

/**
 * Generate a new raw API key plus the values derived from it.
 *
 * The secret comes from `node:crypto`'s CSPRNG. `Math.random()` is never used
 * for key material — it is not cryptographically secure.
 */
export function generateApiKey(environment: KeyEnvironment): {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
} {
  const secret = randomBytes(KEY_ENTROPY_BYTES).toString('hex');
  const rawKey = `${KEY_PREFIX}_${secret}`;
  return {
    rawKey,
    // e.g. `zon_1f4c9a` — enough to recognise a key, useless as a secret.
    keyPrefix: rawKey.slice(0, KEY_PREFIX.length + 1 + KEY_PREFIX_SAMPLE_LENGTH),
    keyHash: hashApiKey(rawKey),
  };
}

/**
 * Create a key for a tenant.
 *
 * Returns the full row together with `rawKey`. The caller must show
 * `rawKey` exactly once — only `keyHash` is persisted, so it cannot be
 * retrieved again.
 */
export async function createApiKey(
  tenantId: string,
  name: string,
  environment: KeyEnvironment = 'production'
): Promise<{ row: ApiKeyRow; rawKey: string }> {
  const { rawKey, keyPrefix, keyHash } = generateApiKey(environment);

  const inserted = await db
    .insert(apiKeys)
    .values({ tenantId, name, keyPrefix, keyHash, environment })
    .returning();

  const row = inserted[0];
  if (!row) {
    throw new Error('Failed to create API key');
  }

  return { row, rawKey };
}

/** List a tenant's keys, newest first, scoped by the verified session. */
export async function listApiKeys(tenantId: string): Promise<ApiKeyRow[]> {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.tenantId, tenantId))
    .orderBy(desc(apiKeys.createdAt));
}

/** Count a tenant's keys, optionally counting only active ones. */
export async function countApiKeys(tenantId: string, activeOnly = false): Promise<number> {
  const rows = await db
    .select({ id: apiKeys.id })
    .from(apiKeys)
    .where(
      activeOnly
        ? and(eq(apiKeys.tenantId, tenantId), isNull(apiKeys.revokedAt))
        : eq(apiKeys.tenantId, tenantId)
    );

  return rows.length;
}

/**
 * Rename a key. Scoped by tenant so one workspace cannot rename another's.
 *
 * Only `name` is written. The row is addressed by its existing `id`, so the
 * key's secret, `keyPrefix`, `keyHash`, `environment`, `createdAt`,
 * `lastUsedAt`, and `revokedAt` are all left exactly as they were — a rename
 * never mints a new key and never re-enables a revoked one.
 *
 * Returning the full row lets the caller patch its local list in place
 * instead of refetching. `keyHash` is selected but never exposed to GraphQL,
 * so no secret can leave through this path.
 */
export async function renameApiKey(
  tenantId: string,
  keyId: string,
  name: string
): Promise<ApiKeyRow> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Name is required');
  }

  // A malformed id would otherwise surface as a raw Postgres cast error, so
  // it is rejected here and reported as the same "not found" as a real miss.
  if (!UUID_PATTERN.test(keyId)) {
    throw new Error('API key not found');
  }

  const updated = await db
    .update(apiKeys)
    .set({ name: trimmed })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
    .returning();

  const row = updated[0];
  if (!row) {
    throw new Error('API key not found');
  }
  return row;
}

/**
 * Rotate a key: mint a fresh secret for the same logical key, revoke the old
 * one, and leave no half-state behind.
 *
 * Atomicity:
 *   1. Open a transaction and `SELECT ... FOR UPDATE` the row addressed by
 *      `(id, tenant_id)`. The row lock serialises concurrent rotations of the
 *      same key — the second caller waits, then sees `revokedAt IS NOT NULL`
 *      on its own active-check and is rejected.
 *   2. Confirm the row is still active. A non-null `revokedAt` is the only
 *      acceptable way out: a previously rotated, revoked, or never-active key
 *      all collapse to the same "not active" error.
 *   3. Mark the row revoked with a conditional UPDATE whose WHERE clause still
 *      includes `revoked_at IS NULL`. If zero rows match, a concurrent
 *      rotation beat us between the SELECT FOR UPDATE and the UPDATE — abort.
 *   4. Insert a new id with the same `(tenant_id, name, environment)`, fresh
 *      `key_prefix` / `key_hash` from the existing CSPRNG, `revoked_at` NULL,
 *      `last_used_at` NULL, and `created_at` = now().
 *
 * The raw secret is returned **once** to the caller. The only column that
 * could be confused for a secret — `key_hash` — is selected by the new row's
 * `returning()` and is never exposed to GraphQL by `RotateApiKey`'s payload
 * shape.
 */
export async function rotateApiKey(
  tenantId: string,
  keyId: string
): Promise<{ row: ApiKeyRow; rawKey: string }> {
  if (!UUID_PATTERN.test(keyId)) {
    throw new Error('API key not found');
  }

  return db.transaction(async (tx) => {
    const lockedRows = await tx
      .select()
      .from(apiKeys)
      .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
      .for('update')
      .limit(1);

    const existing = lockedRows[0];
    if (!existing) {
      throw new Error('API key not found');
    }
    if (existing.revokedAt !== null) {
      throw new Error('API key is not active');
    }

    const environment = isKeyEnvironment(existing.environment)
      ? existing.environment
      : 'production';
    const { rawKey, keyPrefix, keyHash } = generateApiKey(environment);

    const revokedRows = await tx
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiKeys.id, existing.id),
          eq(apiKeys.tenantId, tenantId),
          isNull(apiKeys.revokedAt)
        )
      )
      .returning({ id: apiKeys.id });

    if (revokedRows.length === 0) {
      // The row lock should have made this impossible, but a concurrent
      // transaction that slipped past it (e.g. different isolation level)
      // would land here. Aborting the transaction leaves the old key active
      // and inserts no replacement.
      throw new Error('API key is not active');
    }

    const inserted = await tx
      .insert(apiKeys)
      .values({
        tenantId,
        name: existing.name,
        keyPrefix,
        keyHash,
        environment,
      })
      .returning();

    const row = inserted[0];
    if (!row) {
      throw new Error('Failed to rotate API key');
    }

    return { row, rawKey };
  });
}

/** Revoke a key. Scoped by tenant so one workspace cannot revoke another's. */
export async function revokeApiKey(tenantId: string, keyId: string): Promise<boolean> {
  const updated = await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.tenantId, tenantId)))
    .returning({ id: apiKeys.id });

  return updated.length > 0;
}