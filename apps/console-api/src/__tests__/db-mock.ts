/**
 * In-memory fake of the `db` object used by services.
 *
 * Strategy:
 *  1. Shadow the four Drizzle operators services use inside WHERE clauses
 *     (`eq`, `and`, `isNull`, `desc`) with sentinel plain objects so we can
 *     introspect predicates from outside Drizzle's opaque SQL builder.
 *     Other `drizzle-orm` exports pass through untouched.
 *  2. Replace `db/client.js` with a small query-builder that holds rows in
 *     in-memory tables and records every operation (table, op, predicate, etc.)
 *     so tests can assert "the WHERE clause contained a tenant_id filter".
 *
 * This is the audit-mandated approach: a mock that only checks function
 * arguments would not protect against accidentally removing the
 * `WHERE tenant_id = $tenantId` clause from a resolver query. Inspecting the
 * captured predicate does.
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

type Predicate =
  | { __op: 'eq'; column: any; value: unknown }
  | { __op: 'isNull'; column: any }
  | { __op: 'and'; conditions: Predicate[] };

function evalPredicate(
  predicate: Predicate | undefined,
  row: Record<string, unknown>,
): boolean {
  if (!predicate) return true;
  if (predicate.__op === 'eq') return row[predicate.column.name] === predicate.value;
  if (predicate.__op === 'isNull') return row[predicate.column.name] == null;
  if (predicate.__op === 'and') {
    for (const c of predicate.conditions) {
      if (!evalPredicate(c, row)) return false;
    }
    return true;
  }
  return true;
}

/**
 * Walks a predicate and returns every `eq` column name found, including nested
 * ones inside `and()`. Used by tenant-isolation tests to assert the column
 * `tenant_id` is present in the WHERE clause.
 */
export function predicateColumns(predicate: Predicate | undefined): string[] {
  if (!predicate) return [];
  if (predicate.__op === 'eq') return [predicate.column.name];
  if (predicate.__op === 'isNull') return [predicate.column.name];
  if (predicate.__op === 'and') {
    return predicate.conditions.flatMap(predicateColumns);
  }
  return [];
}

/**
 * True if the predicate references `tenant_id` via `eq(...)` anywhere.
 */
export function predicateFiltersByTenantId(predicate: Predicate | undefined): boolean {
  return predicateColumns(predicate).includes('tenant_id');
}

export interface TablesState {
  users: Record<string, unknown>[];
  tenants: Record<string, unknown>[];
  tenant_members: Record<string, unknown>[];
  tenant_usage: Record<string, unknown>[];
  api_keys: Record<string, unknown>[];
}

interface CallRecord {
  table: string;
  op: 'select' | 'insert' | 'update' | 'execute' | 'transaction';
  predicate?: Predicate;
  /** Names of columns referenced via `eq` in the predicate. */
  predicateColumns?: string[];
  /** True if `tenant_id` appears in the WHERE clause. */
  filtersByTenantId?: boolean;
  insertData?: Record<string, unknown>;
  setData?: Record<string, unknown>;
  limit?: number;
  orderByColumn?: string;
  orderByDirection?: 'desc' | 'asc';
  joinedTables?: string[];
  /** True if this call used `for('update')`. */
  forUpdate?: boolean;
  /** True if this call used `onConflictDoUpdate`. */
  upsert?: boolean;
  /** True if this call used `onConflictDoNothing`. */
  upsertNoOp?: boolean;
  /** Number of rows affected by the resolved query. */
  affected?: number;
}

function genId(): string {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function projectRow(row: Record<string, unknown>, cols: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const alias of Object.keys(cols)) {
    const col = cols[alias] as any;
    const key = col?.name ?? alias;
    out[alias] = row[key];
  }
  return out;
}

/**
 * Extracts the Drizzle table name (e.g. `'api_keys'`) from a table reference.
 * Drizzle stores the name on a non-iterable Symbol on the table object.
 */
function tableNameFromRef(table: unknown): string {
  if (typeof table === 'string') return table;
  if (!table || typeof table !== 'object') return 'unknown';
  const symbols = Object.getOwnPropertySymbols(table);
  for (const sym of symbols) {
    if (sym.description === 'drizzle:Name') {
      const value = (table as Record<symbol, unknown>)[sym];
      if (typeof value === 'string') return value;
    }
  }
  return 'unknown';
}

export interface FakeDb {
  /** Mock `db` object. Pass to `vi.mock('../db/client.js', () => fake.db)`. */
  db: Record<string, any>;
  /** State of every table after the latest operation. Mutate freely between tests. */
  tables: TablesState;
  /** Append-only log of every call made on the fake db. */
  calls: CallRecord[];
  /** Reset all state and call history. Call from `beforeEach`. */
  reset(): void;
  /** Helper: append a row directly to a table (e.g. to seed state for a test). */
  seed(table: keyof TablesState, row: Record<string, unknown>): void;
}

export function makeFakeDb(): FakeDb {
  const tables: TablesState = {
    users: [],
    tenants: [],
    tenant_members: [],
    tenant_usage: [],
    api_keys: [],
  };
  const calls: CallRecord[] = [];

  function snapshot(): TablesState {
    return {
      users: tables.users.map((r) => deepClone(r)),
      tenants: tables.tenants.map((r) => deepClone(r)),
      tenant_members: tables.tenant_members.map((r) => deepClone(r)),
      tenant_usage: tables.tenant_usage.map((r) => deepClone(r)),
      api_keys: tables.api_keys.map((r) => deepClone(r)),
    };
  }

  function restore(snap: TablesState): void {
    tables.users = snap.users;
    tables.tenants = snap.tenants;
    tables.tenant_members = snap.tenant_members;
    tables.tenant_usage = snap.tenant_usage;
    tables.api_keys = snap.api_keys;
  }

  /** Find an existing row matching a key (for upsert / onConflictDoUpdate). */
  function findExisting(
    tableName: keyof TablesState,
    key: string,
    value: unknown,
  ): Record<string, unknown> | undefined {
    return tables[tableName].find((r) => r[key] === value);
  }

  function makeQuery(
    tableName: keyof TablesState,
    op: 'select' | 'insert' | 'update',
  ): any {
    let predicate: Predicate | undefined;
    let limit: number | undefined;
    let orderByColumn: string | undefined;
    let orderByDirection: 'desc' | 'asc' | undefined;
    let joinedTables: string[] | undefined;
    let forUpdate = false;
    let upsert = false;
    let upsertNoOp = false;
    let insertData: Record<string, unknown> | undefined;
    let setData: Record<string, unknown> | undefined;
    let returningCols: Record<string, unknown> | true | undefined;
    let onConflictTarget: any;

    const record: CallRecord = { table: tableName, op };

    const builder: any = {
      from(t: unknown) {
        tableName = tableNameFromRef(t) as keyof TablesState;
        record.table = tableName;
        return builder;
      },
      innerJoin(t: unknown, _jc: unknown) {
        const tn = tableNameFromRef(t);
        joinedTables = joinedTables ?? [tableName];
        joinedTables.push(tn);
        record.joinedTables = joinedTables;
        return builder;
      },
      where(p: Predicate) {
        predicate = p;
        record.predicate = p;
        record.predicateColumns = predicateColumns(p);
        record.filtersByTenantId = predicateFiltersByTenantId(p);
        return builder;
      },
      limit(n: number) {
        limit = n;
        record.limit = n;
        return builder;
      },
      orderBy(c: any) {
        orderByColumn = c.column?.name;
        orderByDirection = c.__op === 'desc' ? 'desc' : 'asc';
        record.orderByColumn = orderByColumn;
        record.orderByDirection = orderByDirection;
        return builder;
      },
      for(mode: string) {
        if (mode === 'update') {
          forUpdate = true;
          record.forUpdate = true;
        }
        return builder;
      },
      returning(cols?: any) {
        returningCols = cols === undefined ? true : cols;
        return resolve();
      },
      onConflictDoUpdate(spec: { target: any; set: any }) {
        upsert = true;
        record.upsert = true;
        onConflictTarget = spec.target;
        return builder;
      },
      onConflictDoNothing() {
        upsertNoOp = true;
        record.upsertNoOp = true;
        return builder;
      },
      values(data: any) {
        insertData = Array.isArray(data) ? data[0] : data;
        record.insertData = deepClone(insertData);
        return builder;
      },
      set(data: any) {
        setData = data;
        record.setData = deepClone(data);
        return builder;
      },
    };

    function resolve(): Promise<unknown[]> {
      calls.push(record);

      // INSERT path.
      if (op === 'insert') {
        if (!insertData) throw new Error('insert without values');

        // Determine conflict target: `onConflictTarget` is a Drizzle column ref
        // whose `.name` is the actual column name.
        const conflictKey = onConflictTarget?.name;

        if (conflictKey && (upsert || upsertNoOp)) {
          const existing = findExisting(tableName, conflictKey, insertData[conflictKey]);
          if (existing) {
            if (upsert && record.insertData) {
              Object.assign(existing, record.insertData);
            }
            // upsertNoOp: do nothing.
            record.affected = 1;
            return returningCols === true || returningCols === undefined
              ? [{ ...existing }]
              : [projectRow(existing, returningCols as Record<string, unknown>)];
          }
        }

        const newRow: Record<string, unknown> = { ...insertData };
        if (!('id' in newRow)) newRow.id = genId();
        // Apply schema-ish defaults.
        if (tableName === 'api_keys') {
          newRow.revokedAt ??= null;
          newRow.lastUsedAt ??= null;
          newRow.environment ??= 'production';
          newRow.createdAt ??= new Date().toISOString();
        }
        if (tableName === 'tenant_members') {
          newRow.role ??= 'owner';
          newRow.createdAt ??= new Date().toISOString();
        }
        if (tableName === 'tenant_usage') {
          newRow.apiRequestsTotal ??= 0;
          newRow.updatedAt ??= new Date().toISOString();
        }
        if (tableName === 'tenants') {
          newRow.createdAt ??= new Date().toISOString();
        }
        if (tableName === 'users') {
          newRow.createdAt ??= new Date().toISOString();
          newRow.updatedAt ??= new Date().toISOString();
        }
        tables[tableName].push(newRow);
        record.affected = 1;
        return returningCols === true || returningCols === undefined
          ? [{ ...newRow }]
          : [projectRow(newRow, returningCols as Record<string, unknown>)];
      }

      // UPDATE path.
      if (op === 'update') {
        if (!setData) throw new Error('update without set');
        const matched = tables[tableName].filter((r) => evalPredicate(predicate, r));
        for (const row of matched) {
          Object.assign(row, setData);
        }
        record.affected = matched.length;
        return returningCols === true || returningCols === undefined
          ? matched.map((r) => ({ ...r }))
          : matched.map((r) => projectRow(r, returningCols as Record<string, unknown>));
      }

      // SELECT path.
      let rows: Record<string, unknown>[];
      if (joinedTables && joinedTables.length > 1) {
        let joined: Record<string, unknown>[] = [{}];
        for (const tn of joinedTables) {
          const next: Record<string, unknown>[] = [];
          for (const j of joined) {
            for (const r of tables[tn as keyof TablesState]) {
              next.push({ ...j, ...r });
            }
          }
          joined = next;
        }
        rows = joined.filter((r) => evalPredicate(predicate, r));
      } else {
        rows = tables[tableName].filter((r) => evalPredicate(predicate, r));
      }

      if (orderByColumn) {
        rows = [...rows].sort((a, b) => {
          const av = a[orderByColumn!];
          const bv = b[orderByColumn!];
          if (av instanceof Date && bv instanceof Date) {
            return orderByDirection === 'desc'
              ? bv.getTime() - av.getTime()
              : av.getTime() - bv.getTime();
          }
          if (av == null) return 1;
          if (bv == null) return -1;
          return orderByDirection === 'desc'
            ? (bv > av ? 1 : bv < av ? -1 : 0)
            : (av > bv ? 1 : av < bv ? -1 : 0);
        });
      }

      if (limit !== undefined) rows = rows.slice(0, limit);

      record.affected = rows.length;

      if (returningCols && typeof returningCols === 'object') {
        return rows.map((r) => projectRow(r, returningCols as Record<string, unknown>));
      }
      return rows;
    }

    return builder;
  }

  const db: Record<string, any> = {
    transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
      calls.push({ table: '__transaction__', op: 'transaction' });
      const snap = snapshot();
      try {
        return await fn(db);
      } catch (err) {
        restore(snap);
        throw err;
      }
    },
    execute: async () => {
      calls.push({ table: '__execute__', op: 'execute' });
      return [];
    },
    select: (...cols: unknown[]) => {
      const q = makeQuery('users' as keyof TablesState, 'select');
      if (cols.length === 1 && typeof cols[0] === 'object' && cols[0] !== null) {
        q.returning = (projection?: unknown) => {
          q._returning = projection === undefined ? true : projection;
          return q._resolve();
        };
      } else if (cols.length > 1) {
        q.returning = (projection?: unknown) => {
          q._returning = projection === undefined ? true : projection;
          return q._resolve();
        };
      }
      return q;
    },
    insert: (table: unknown) => makeQuery(tableNameFromRef(table) as keyof TablesState, 'insert'),
    update: (table: unknown) => makeQuery(tableNameFromRef(table) as keyof TablesState, 'update'),
  };

  // Patch select() so that returning() actually triggers resolution. The naive
  // select() above returns a builder whose returning() is a placeholder; the
  // real resolve lives in makeQuery. We wire it back in here.
  const realSelect = (...cols: unknown[]) => {
    return makeQuery('users' as keyof TablesState, 'select');
  };
  db.select = realSelect;

  return {
    db,
    tables,
    calls,
    reset() {
      tables.users = [];
      tables.tenants = [];
      tables.tenant_members = [];
      tables.tenant_usage = [];
      tables.api_keys = [];
      calls.length = 0;
    },
    seed(table, row) {
      const next = { id: genId(), ...row };
      tables[table].push(next);
    },
  };
}