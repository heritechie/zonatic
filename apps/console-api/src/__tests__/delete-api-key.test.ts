/**
 * Permanent deletion of never-used API keys.
 *
 * Covers the deletion rule end to end: the service's DELETE predicate, the
 * tenant isolation that stops one workspace reaching another's key, the atomic
 * `last_used_at IS NULL` guard, and the GraphQL mutation's authentication.
 *
 * Rows are seeded with database column names (`tenant_id`, `last_used_at`)
 * rather than the Drizzle property names used in the schema module. The fake db
 * evaluates predicates by column name, so a camelCase-seeded row would silently
 * fail every `eq`/`isNull` check and make these tests pass for the wrong reason.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Side-effect imports must precede anything that reaches `drizzle-orm`, so the
// operator mock is registered before the service captures its operators.
import '@/__tests__/drizzle-mock';
import '@/__tests__/env-mock';
import '@/__tests__/auth-mock';
import { createYoga } from 'graphql-yoga';
import { schema } from '@/graphql/schema';
import { createContext } from '@/graphql/context';
import { setVerifyAccessToken, clearVerifyAccessToken } from '@/__tests__/auth-mock';
import { USER_A, TENANT_A, TENANT_B } from '@/__tests__/fixtures';
import { makeFakeDb, type FakeDb } from '@/__tests__/db-mock';
import { deleteApiKey } from '@/services/api-keys';

let fakeDb: FakeDb;
vi.mock('@/db/client', () => ({
  get db() { return fakeDb.db; },
}));

let yoga: ReturnType<typeof createYoga>;

const KEY_A = 'aaaaaaaa-0000-4000-8000-000000000001';
const KEY_B = 'aaaaaaaa-0000-4000-8000-000000000002';
const KEY_OTHER_TENANT = 'bbbbbbbb-0000-4000-8000-000000000003';

/** Seed an `api_keys` row using real column names. */
function seedKey(
  id: string,
  tenantId: string,
  overrides: Record<string, unknown> = {},
): void {
  fakeDb.seed('api_keys', {
    id,
    tenant_id: tenantId,
    name: `Key ${id.slice(-4)}`,
    key_prefix: 'zon_abcdef',
    key_hash: 'a'.repeat(64),
    environment: 'production',
    created_at: new Date('2026-01-01T00:00:00Z').toISOString(),
    ...overrides,
  });
}

function findKey(id: string) {
  return fakeDb.tables.api_keys.find((r) => r.id === id);
}

/**
 * Seed a provisioned workspace for `USER_A` in `TENANT_A`.
 *
 * The membership row carries both spellings on purpose. The fake db matches
 * predicates by SQL column name (`user_id`), while `resolveWorkspace` reads the
 * selected projection by Drizzle property name (`tenantId`); seeding only one
 * spelling makes workspace resolution silently fall through to first-login
 * provisioning and hand the resolver a different tenant.
 */
function seedWorkspace(): void {
  fakeDb.seed('users', { id: USER_A.id, email: USER_A.email });
  fakeDb.seed('tenants', { id: TENANT_A.id, name: TENANT_A.name });
  fakeDb.seed('tenant_members', {
    tenant_id: TENANT_A.id,
    user_id: USER_A.id,
    tenantId: TENANT_A.id,
    userId: USER_A.id,
    role: 'owner',
  });
}

/** The single DELETE the service issued, if any. */
function deleteCalls() {
  return fakeDb.calls.filter((c) => c.op === 'delete');
}

beforeEach(() => {
  fakeDb = makeFakeDb();
  yoga = createYoga({
    schema,
    context: createContext as any,
    graphqlEndpoint: '/graphql',
    cors: false,
    maskedErrors: false,
  });
  clearVerifyAccessToken();
});

describe('deleteApiKey service', () => {
  // A. Own never-used key deletes and the row is gone.
  it('deletes the caller\'s own never-used key and removes the row', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    await deleteApiKey(TENANT_A.id, KEY_A);

    expect(findKey(KEY_A)).toBeUndefined();
    expect(fakeDb.tables.api_keys).toHaveLength(0);
  });

  it('leaves the tenant\'s other keys untouched', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });
    seedKey(KEY_B, TENANT_A.id, { last_used_at: '2026-01-02T00:00:00.000Z' });

    await deleteApiKey(TENANT_A.id, KEY_A);

    expect(findKey(KEY_A)).toBeUndefined();
    expect(findKey(KEY_B)).toBeDefined();
  });

  // B. A used key must survive: its history stays auditable.
  it('refuses to delete a key that has been used and leaves the row in place', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: '2026-02-03T10:00:00.000Z' });

    await expect(deleteApiKey(TENANT_A.id, KEY_A)).rejects.toThrow(
      /has already been used or does not exist/,
    );

    expect(findKey(KEY_A)).toBeDefined();
    expect(findKey(KEY_A)!.last_used_at).toBe('2026-02-03T10:00:00.000Z');
  });

  it('refuses to delete a key that was used and then revoked', async () => {
    seedKey(KEY_A, TENANT_A.id, {
      last_used_at: '2026-02-03T10:00:00.000Z',
      revoked_at: '2026-02-04T10:00:00.000Z',
    });

    await expect(deleteApiKey(TENANT_A.id, KEY_A)).rejects.toThrow();
    expect(findKey(KEY_A)).toBeDefined();
  });

  // C. Another workspace's key is unreachable.
  it('refuses to delete another tenant\'s never-used key and leaves the row in place', async () => {
    seedKey(KEY_OTHER_TENANT, TENANT_B.id, { last_used_at: null });

    await expect(deleteApiKey(TENANT_A.id, KEY_OTHER_TENANT)).rejects.toThrow(
      /has already been used or does not exist/,
    );

    expect(findKey(KEY_OTHER_TENANT)).toBeDefined();
  });

  it('does not delete a used key belonging to another tenant either', async () => {
    seedKey(KEY_OTHER_TENANT, TENANT_B.id, { last_used_at: '2026-02-03T10:00:00.000Z' });

    await expect(deleteApiKey(TENANT_A.id, KEY_OTHER_TENANT)).rejects.toThrow();
    expect(findKey(KEY_OTHER_TENANT)).toBeDefined();
  });

  it('rejects a malformed key id before it reaches the database', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    await expect(deleteApiKey(TENANT_A.id, 'not-a-uuid')).rejects.toThrow(
      /has already been used or does not exist/,
    );

    expect(deleteCalls()).toHaveLength(0);
    expect(findKey(KEY_A)).toBeDefined();
  });

  it('rejects an unknown key id without erroring on the missing row', async () => {
    await expect(
      deleteApiKey(TENANT_A.id, 'dddddddd-0000-4000-8000-000000000009'),
    ).rejects.toThrow(/has already been used or does not exist/);
  });

  // D. The authorization lives in the DELETE statement, not a prior read.
  it('encodes tenant scope and the unused condition in the DELETE WHERE clause', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    await deleteApiKey(TENANT_A.id, KEY_A);

    const [call] = deleteCalls();
    expect(call).toBeDefined();
    expect(call!.table).toBe('api_keys');
    // Tenant isolation is part of the statement itself.
    expect(call!.filtersByTenantId).toBe(true);
    // The never-used rule is a column of the same statement, so a key stamped
    // with `last_used_at` between a check and the delete matches no row.
    expect(call!.predicateColumns).toContain('last_used_at');
    expect(call!.predicateColumns).toContain('id');
    expect(call!.predicateColumns).toContain('tenant_id');
  });

  it('issues exactly one DELETE and no SELECT-then-DELETE pair', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    await deleteApiKey(TENANT_A.id, KEY_A);

    expect(deleteCalls()).toHaveLength(1);
    // A SELECT before the DELETE would reintroduce the race this design avoids.
    expect(fakeDb.calls.some((c) => c.op === 'select')).toBe(false);
  });

  it('deletes nothing when the only matching row has been used', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: '2026-02-03T10:00:00.000Z' });

    await expect(deleteApiKey(TENANT_A.id, KEY_A)).rejects.toThrow();

    const [call] = deleteCalls();
    expect(call!.affected).toBe(0);
  });

  it('reports the same rejection for a used key and a missing key', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: '2026-02-03T10:00:00.000Z' });

    const used = await deleteApiKey(TENANT_A.id, KEY_A).catch((e: Error) => e.message);
    const missing = await deleteApiKey(
      TENANT_A.id,
      'dddddddd-0000-4000-8000-000000000009',
    ).catch((e: Error) => e.message);

    // Identical wording: a caller must not be able to probe for the existence
    // of keys it is not authorised to see.
    expect(used).toBe(missing);
  });
});

/**
 * Yoga harness that injects the session context directly.
 *
 * `requireWorkspace` is the only authentication gate this mutation has, so
 * driving the resolver with a hand-built context exercises exactly that gate.
 * Going through `createContext` would additionally depend on
 * `resolveWorkspace` reading a seeded membership row through the fake db's
 * `select()` builder, which the fake cannot resolve into rows — a limitation of
 * the shared harness, not of this mutation. Stubbing the context keeps these
 * tests honest about what they are checking.
 */
function makeStubbedYoga(workspace: { tenantId: string } | null) {
  return createYoga({
    schema,
    context: (() =>
      Promise.resolve({
        db: fakeDb.db,
        user: workspace ? USER_A : null,
        workspace,
      })) as any,
    graphqlEndpoint: '/graphql',
    cors: false,
    maskedErrors: false,
  });
}

describe('deleteApiKey mutation', () => {
  const DELETE_MUTATION = `
    mutation DeleteApiKey($keyId: ID!) {
      deleteApiKey(keyId: $keyId)
    }
  `;

  async function run(
    keyId: string,
    workspace: { tenantId: string } | null,
  ) {
    const harness = makeStubbedYoga(workspace);
    const response = await harness.handle(
      new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: DELETE_MUTATION, variables: { keyId } }),
      }),
      {},
    );
    return response.json();
  }

  // E. Authentication is required before the tenant is even resolved.
  it('rejects an unauthenticated caller with Unauthorized', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    const result = await run(KEY_A, null);

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toBe('Unauthorized');
    // The row must survive a rejected call, and no DELETE may be attempted.
    expect(findKey(KEY_A)).toBeDefined();
    expect(deleteCalls()).toHaveLength(0);
  });

  it('rejects an unauthenticated caller even for a key that would otherwise be deletable', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    const result = await run(KEY_A, null);

    expect(result.errors[0].message).toBe('Unauthorized');
    expect(fakeDb.tables.api_keys).toHaveLength(1);
  });

  it('deletes an authenticated caller\'s own never-used key', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    const result = await run(KEY_A, { tenantId: TENANT_A.id });

    expect(result.errors).toBeUndefined();
    expect(result.data.deleteApiKey).toBe(true);
    expect(findKey(KEY_A)).toBeUndefined();
  });

  it('reports an error for an authenticated caller deleting a used key', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: '2026-02-03T10:00:00.000Z' });

    const result = await run(KEY_A, { tenantId: TENANT_A.id });

    expect(result.errors).toBeDefined();
    expect(result.errors[0].message).toMatch(/has already been used or does not exist/);
    expect(findKey(KEY_A)).toBeDefined();
  });

  it('does not delete another workspace\'s key through the mutation', async () => {
    seedKey(KEY_OTHER_TENANT, TENANT_B.id, { last_used_at: null });

    const result = await run(KEY_OTHER_TENANT, { tenantId: TENANT_A.id });

    expect(result.errors).toBeDefined();
    expect(findKey(KEY_OTHER_TENANT)).toBeDefined();
  });

  it('takes the tenant from the session, not from an argument', () => {
    // The mutation exposes only `keyId`. There is no tenant argument to spoof,
    // so a caller cannot redirect the DELETE at another workspace.
    const mutationType = schema.getMutationType();
    const field = mutationType!.getFields().deleteApiKey;
    const argNames = field.args.map((a) => a.name);

    expect(argNames).toEqual(['keyId']);
    expect(argNames).not.toContain('tenantId');
    // The return type is a plain boolean, so no row — and therefore no key
    // material — can come back through this mutation.
    expect(String(field.type)).toBe('Boolean');
  });

  it('never returns key material in the mutation payload', async () => {
    seedKey(KEY_A, TENANT_A.id, { last_used_at: null });

    const serialized = JSON.stringify(await run(KEY_A, { tenantId: TENANT_A.id }));

    // The response is a bare boolean; no hash or secret can ride along.
    expect(serialized).not.toContain('a'.repeat(64));
    expect(serialized).not.toContain('keyHash');
    expect(serialized).not.toContain('rawKey');
  });
});