import { relations, sql } from 'drizzle-orm';
import { bigint, bigserial, index, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

/**
 * Zonatic console tables.
 *
 * Only the tables the console touches are mapped here. The public API's
 * `administrative_areas` / `import_runs` / `postal_codes` tables are read by
 * the Python service and are intentionally not duplicated in this schema.
 *
 * NOTE: `keyHash` holds a hex SHA-256 digest, matching the Python public API
 * (`app/dependencies.py`), so a key created in the console authenticates
 * against `/v1/*` without any format change.
 */
export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Where a key is meant to be used.
 *
 * Mirrors `api_keys_environment_check` in migration
 * `20260101000008_console_api_key_environment_rls.sql`. Stored lowercase; the
 * GraphQL layer validates the value before it reaches this schema.
 */
export const keyEnvironments = ['production', 'development'] as const;
export type KeyEnvironment = (typeof keyEnvironments)[number];

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    /** Short non-secret fragment shown in the UI, e.g. `znt_live_ab12cd`. */
    keyPrefix: varchar('key_prefix', { length: 20 }).notNull(),
    /** Hex SHA-256 of the raw key. The raw key is never stored. */
    keyHash: varchar('key_hash', { length: 64 }).notNull(),
    /** production | development. Drives the `znt_live_` / `znt_test_` prefix. */
    environment: varchar('environment', { length: 16 }).notNull().default('production'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    /**
     * Last time this key authenticated a public API request.
     *
     * Nullable and currently never written: usage tracking is not wired into
     * the public API's auth path yet. The console shows "Never" while NULL
     * rather than inventing a value.
     */
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    hashIdx: uniqueIndex('idx_api_keys_hash').on(table.keyHash),
    tenantIdx: index('idx_api_keys_tenant').on(table.tenantId),
    tenantEnvIdx: index('idx_api_keys_tenant_env').on(table.tenantId, table.environment),
  })
);

/**
 * Zonatic profile for a Google-authenticated user.
 *
 * `id` is the Supabase Auth user id — identity is owned by the OAuth
 * provider and is never created or trusted from the client.
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(),
    email: varchar('email', { length: 320 }).notNull(),
    fullName: varchar('full_name', { length: 255 }),
    avatarUrl: text('avatar_url'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailLowerIdx: uniqueIndex('idx_users_email_lower').on(sql`lower(${table.email})`),
  })
);

export const tenantMembers = pgTable(
  'tenant_members',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 32 }).notNull().default('owner'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.tenantId, table.userId] }),
    userIdx: index('idx_tenant_members_user').on(table.userId),
  })
);

export const tenantUsage = pgTable('tenant_usage', {
  tenantId: uuid('tenant_id')
    .primaryKey()
    .references(() => tenants.id, { onDelete: 'cascade' }),
  apiRequestsTotal: bigint('api_requests_total', { mode: 'number' }).notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  members: many(tenantMembers),
  apiKeys: many(apiKeys),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(tenantMembers),
}));

export const tenantMembersRelations = relations(tenantMembers, ({ one }) => ({
  tenant: one(tenants, { fields: [tenantMembers.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [tenantMembers.userId], references: [users.id] }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, { fields: [apiKeys.tenantId], references: [tenants.id] }),
}));