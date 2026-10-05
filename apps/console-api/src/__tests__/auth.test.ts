/**
 * Authentication tests for console-api.
 *
 * Verifies:
 *  - missing / malformed Authorization headers are rejected as Unauthorized
 *  - invalid Supabase bearer tokens are rejected as Unauthorized
 *  - valid bearer tokens produce a fully populated authenticated context
 *  - context.user / context.workspace are request-scoped (no leak between calls)
 *  - errors do not surface upstream secrets or token material
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createYoga, type YogaInitialContext } from 'graphql-yoga';
import '@/__tests__/env-mock';
import '@/__tests__/auth-mock';
import { schema } from '@/graphql/schema';
import { createContext, type Context } from '@/graphql/context';
import { bearerToken } from '@/auth/supabase';
import { setVerifyAccessToken, clearVerifyAccessToken } from '@/__tests__/auth-mock';
import { USER_A, TENANT_A } from '@/__tests__/fixtures';
import { makeFakeDb, type FakeDb } from '@/__tests__/db-mock';

// Mock the db module so createContext can use a fully-fake db.
let fakeDb: FakeDb;
vi.mock('@/db/client', () => ({
  get db() { return fakeDb.db; },
}));

let yoga: ReturnType<typeof createYoga>;

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

function makeRequest(authorization?: string | null): Request {
  const headers = new Headers();
  if (authorization !== null && authorization !== undefined) {
    headers.set('authorization', authorization);
  }
  return new Request('https://example.com/graphql', {
    method: 'POST',
    headers,
  });
}

describe('bearerToken helper', () => {
  it('returns null for missing header', () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken(undefined)).toBeNull();
    expect(bearerToken('')).toBeNull();
  });

  it('returns null for non-Bearer schemes', () => {
    expect(bearerToken('Basic abc123')).toBeNull();
    expect(bearerToken('Token xyz')).toBeNull();
    expect(bearerToken('abc123')).toBeNull();
  });

  it('extracts the token from a valid Bearer header (case-insensitive scheme)', () => {
    expect(bearerToken('Bearer eyJhbGciOiJIUzI1NiJ9.payload.sig')).toBe(
      'eyJhbGciOiJIUzI1NiJ9.payload.sig',
    );
    expect(bearerToken('bearer  t ')).toBe('t'); // trimmed
    expect(bearerToken('BEARER xyz')).toBe('xyz');
  });
});

describe('context creation', () => {
  it('produces an unauthenticated context when no Authorization header is present', async () => {
    const ctx = (await (createContext as any)({
      request: makeRequest(undefined),
    } as YogaInitialContext)) as Context;

    expect(ctx.user).toBeNull();
    expect(ctx.workspace).toBeNull();
    expect(ctx.db).toBeDefined();
  });

  it('produces an unauthenticated context when Authorization is malformed', async () => {
    const ctx = (await (createContext as any)({
      request: makeRequest('NotBearer xyz'),
    } as YogaInitialContext)) as Context;
    expect(ctx.user).toBeNull();
    expect(ctx.workspace).toBeNull();
  });

  it('produces an unauthenticated context when Supabase rejects the token', async () => {
    // No canned identity set → verifyAccessToken returns null.
    const ctx = (await (createContext as any)({
      request: makeRequest('Bearer some-bad-token'),
    } as YogaInitialContext)) as Context;
    expect(ctx.user).toBeNull();
    expect(ctx.workspace).toBeNull();
  });

  it('produces an authenticated context when verifyAccessToken returns an identity', async () => {
    setVerifyAccessToken(USER_A);
    fakeDb.seed('users', USER_A);
    fakeDb.seed('tenants', TENANT_A);
    fakeDb.seed('tenant_members', {
      tenantId: TENANT_A.id,
      userId: USER_A.id,
      role: 'owner',
    });

    const ctx = (await (createContext as any)({
      request: makeRequest('Bearer good-token'),
    } as YogaInitialContext)) as Context;

    expect(ctx.user).not.toBeNull();
    expect(ctx.user!.id).toBe(USER_A.id);
    expect(ctx.user!.email).toBe(USER_A.email);
    expect(ctx.workspace).not.toBeNull();
    expect(ctx.workspace!.tenantId).toBe(TENANT_A.id);
  });
});

describe('request isolation', () => {
  it('does not leak identity or workspace between two sequential requests', async () => {
    // First request: authenticated as USER_A.
    setVerifyAccessToken(USER_A);
    fakeDb.seed('users', USER_A);
    fakeDb.seed('tenants', TENANT_A);
    fakeDb.seed('tenant_members', { tenantId: TENANT_A.id, userId: USER_A.id, role: 'owner' });

    const ctxA = (await (createContext as any)({
      request: makeRequest('Bearer token-A'),
    } as YogaInitialContext)) as Context;

    expect(ctxA.user!.id).toBe(USER_A.id);
    expect(ctxA.workspace!.tenantId).toBe(TENANT_A.id);

    // Second request: unauthenticated. The db singleton may persist, but the
    // per-request user and workspace must be null and must not be inherited
    // from ctxA.
    clearVerifyAccessToken();
    const ctxB = (await (createContext as any)({
      request: makeRequest(undefined),
    } as YogaInitialContext)) as Context;

    expect(ctxB.user).toBeNull();
    expect(ctxB.workspace).toBeNull();
  });
});

describe('error information disclosure', () => {
  it('GraphQL error for unauthenticated `me` is "Unauthorized" without leaking internals', async () => {
    const query = JSON.stringify({ query: '{ me { id } }' });
    const response = await yoga.handle(
      new Request('https://example.com/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: query,
      }),
      {},
    );
    const body = await response.json();
    expect(body.errors).toBeDefined();
    expect(body.errors[0].message).toBe('Unauthorized');
    // Make sure no Authorization token / DATABASE_URL / Supabase URL leaked.
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('Bearer ');
    expect(serialized).not.toContain('DATABASE_URL');
    expect(serialized).not.toContain('supabase.co/auth');
    expect(serialized).not.toContain(USER_A.email);
  });
});