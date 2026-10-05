/**
 * Mock for `../config/index.js` so tests don't require real env vars
 * (DATABASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, CORS_ORIGINS).
 *
 * The config is replaced with deterministic test values.
 */
import { vi } from 'vitest';

vi.mock('../config/index.js', () => ({
  config: {
    port: 8000,
    nodeEnv: 'test',
    databaseUrl: 'postgres://test:test@localhost:5432/test',
    supabaseUrl: 'https://test.supabase.co',
    supabaseAnonKey: 'test-anon-key-not-a-real-secret',
    corsOrigins: ['http://localhost:5173'],
  },
}));