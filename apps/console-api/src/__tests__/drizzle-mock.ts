/**
 * Registers the `drizzle-orm` operator mock used by `db-mock.ts`.
 *
 * This lives in its own side-effect-only module because of import order.
 * `vi.mock` inside `db-mock.ts` only takes effect once `db-mock.ts` has been
 * evaluated, and `db-mock.ts` is imported *after* the modules under test in the
 * existing test files. Services imported first therefore captured the real
 * Drizzle operators, whose predicate objects the fake cannot evaluate, so every
 * `eq` / `and` / `isNull` guard silently matched nothing.
 *
 * Importing this module before anything that touches `drizzle-orm` registers
 * the mock early enough for services to pick it up.
 */
import { vi } from 'vitest';

vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: (column: unknown, value: unknown) => ({ __op: 'eq', column, value }),
    and: (...conditions: unknown[]) => ({ __op: 'and', conditions }),
    isNull: (column: unknown) => ({ __op: 'isNull', column }),
    desc: (column: unknown) => ({ __op: 'desc', column }),
  };
});