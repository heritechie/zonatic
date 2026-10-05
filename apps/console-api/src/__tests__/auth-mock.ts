/**
 * Mock for `../auth/supabase.js` so tests don't make real network calls and
 * don't require real Supabase credentials.
 *
 * Each test calls `setVerifyAccessToken(...)` to install a canned response.
 * If no response is set, the mock returns `null` (== unauthenticated).
 */
import { vi } from 'vitest';

let nextIdentity: unknown = null;

vi.mock('../auth/supabase.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../auth/supabase.js')>();
  return {
    ...actual,
    bearerToken: actual.bearerToken,
    verifyAccessToken: async (_token: string) => nextIdentity,
  };
});

export function setVerifyAccessToken(identity: unknown): void {
  nextIdentity = identity;
}

export function clearVerifyAccessToken(): void {
  nextIdentity = null;
}