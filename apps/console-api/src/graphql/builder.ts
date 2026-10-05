import SchemaBuilder from '@pothos/core';
import type { Context } from './context.js';

export const builder = new SchemaBuilder<{
  Context: Context;
}>({});

builder.queryType({});
builder.mutationType({});

/**
 * Require an authenticated caller with a provisioned workspace.
 *
 * Every tenant-scoped resolver calls this first. Authorisation is done with
 * an explicit check rather than a schema plugin so that each query's access
 * rule is visible in the resolver itself, and so that `tenantId` can only ever
 * come from the verified session — never from client input.
 */
export function requireWorkspace(context: Context): {
  userId: string;
  tenantId: string;
} {
  if (!context.user || !context.workspace) {
    throw new Error('Unauthorized');
  }
  return { userId: context.user.id, tenantId: context.workspace.tenantId };
}