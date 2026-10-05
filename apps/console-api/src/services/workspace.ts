import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { tenantMembers, tenantUsage, tenants, users } from '../db/schema.js';
import type { GoogleIdentity } from '../auth/supabase.js';

export type Workspace = {
  tenantId: string;
  tenantName: string;
  role: string;
};

/** Name given to the workspace created on first sign-in. */
export const DEFAULT_WORKSPACE_NAME = 'Default Workspace';

/**
 * Resolve the caller's Zonatic profile and workspace, provisioning both on
 * first sign-in.
 *
 * First login:
 *   1. create the `users` profile row from the Google identity
 *   2. create a default tenant named `Default Workspace`
 *   3. add the user to that tenant as `owner`
 *
 * The workspace name is a fixed constant rather than something derived from
 * the Google profile. A person's name is profile information, not a workspace
 * name, and there is no workspace picker in V1 — so the name carries no
 * information the user did not choose themselves.
 *
 * Returning user: the existing profile and first membership are reused, so
 * the caller lands straight on the console.
 *
 * A per-user advisory lock serialises provisioning so two concurrent
 * first-time requests cannot create two default workspaces for one person.
 */
export async function resolveWorkspace(identity: GoogleIdentity): Promise<Workspace> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${identity.id}))`);

    await tx
      .insert(users)
      .values({
        id: identity.id,
        email: identity.email,
        fullName: identity.fullName,
        avatarUrl: identity.avatarUrl,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: identity.email,
          fullName: identity.fullName,
          avatarUrl: identity.avatarUrl,
          updatedAt: new Date(),
        },
      });

    const existing = await tx
      .select({
        tenantId: tenantMembers.tenantId,
        role: tenantMembers.role,
        tenantName: tenants.name,
      })
      .from(tenantMembers)
      .innerJoin(tenants, eq(tenantMembers.tenantId, tenants.id))
      .where(eq(tenantMembers.userId, identity.id))
      .limit(1);

    const membership = existing[0];
    if (membership) {
      return {
        tenantId: membership.tenantId,
        tenantName: membership.tenantName,
        role: membership.role,
      };
    }

    const created = await tx
      .insert(tenants)
      .values({ name: DEFAULT_WORKSPACE_NAME })
      .returning({ id: tenants.id, name: tenants.name });

    const tenant = created[0];
    if (!tenant) {
      throw new Error('Failed to create default workspace');
    }

    await tx.insert(tenantMembers).values({
      tenantId: tenant.id,
      userId: identity.id,
      role: 'owner',
    });

    await tx.insert(tenantUsage).values({ tenantId: tenant.id }).onConflictDoNothing();

    return { tenantId: tenant.id, tenantName: tenant.name, role: 'owner' };
  });
}

/** Look up an existing profile row without creating anything. */
export async function findUser(userId: string) {
  const rows = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return rows[0] ?? null;
}

/** Rename the caller's workspace (tenant). Scoped to the verified session. */
export async function renameWorkspace(tenantId: string, name: string): Promise<{ name: string }> {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new Error('Workspace name is required');
  }

  const updated = await db
    .update(tenants)
    .set({ name: trimmed })
    .where(eq(tenants.id, tenantId))
    .returning({ name: tenants.name });

  const tenant = updated[0];
  if (!tenant) {
    throw new Error('Workspace not found');
  }
  return { name: tenant.name };
}
