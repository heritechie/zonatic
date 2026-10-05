/**
 * Common setup helpers and shared types for the console-api test suite.
 *
 * Imports the env + auth mocks by side effect, then exports fixtures used by
 * every test file.
 */
import './env-mock.js';
import './auth-mock.js';

export const USER_A = {
  id: '11111111-1111-1111-1111-111111111111',
  email: 'alice@example.com',
  fullName: 'Alice Tester',
  avatarUrl: 'https://example.com/alice.png',
};

export const USER_B = {
  id: '22222222-2222-2222-2222-222222222222',
  email: 'bob@example.com',
  fullName: 'Bob Tester',
  avatarUrl: null,
};

export const USER_C = {
  id: '33333333-3333-3333-3333-333333333333',
  email: 'carol@example.com',
  fullName: 'Carol Tester',
  avatarUrl: null,
};

export const TENANT_A = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  name: 'Default Workspace',
};

export const TENANT_B = {
  id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  name: 'Bob Workspace',
};

export const TENANT_C = {
  id: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  name: 'Carol Workspace',
};

/** A raw API key in the canonical `zon_<hex>` form. */
export const RAW_KEY_A = 'zon_' + 'a'.repeat(64);
export const RAW_KEY_B = 'zon_' + 'b'.repeat(64);
export const RAW_KEY_C = 'zon_' + 'c'.repeat(64);