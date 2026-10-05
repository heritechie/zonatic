import { builder, requireWorkspace } from '../builder.js';
import { listApiKeys, revokeApiKey } from '../../services/api-keys.js';
import type { ApiKeyRow } from '../../services/api-keys.js';

/**
 * A key row as shown in the console.
 *
 * `keyPrefix` is the only part of the key stored in readable form; the secret
 * itself exists only in the create-key response.
 *
 * Exported so the key mutations can return the same type without re-declaring
 * it. There is no field here that could expose key material, so returning it
 * from a mutation is safe.
 */
export const ApiKeyRef = builder
  .objectRef<ApiKeyRow>('ApiKey')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      name: t.exposeString('name'),
      keyPrefix: t.exposeString('keyPrefix'),
      environment: t.exposeString('environment'),
      createdAt: t.field({
        type: 'String',
        nullable: true,
        resolve: (row) => (row.createdAt ? row.createdAt.toISOString() : null),
      }),
      lastUsedAt: t.field({
        type: 'String',
        nullable: true,
        resolve: (row) => (row.lastUsedAt ? row.lastUsedAt.toISOString() : null),
      }),
      revokedAt: t.field({
        type: 'String',
        nullable: true,
        resolve: (row) => (row.revokedAt ? row.revokedAt.toISOString() : null),
      }),
    }),
  });

builder.queryField('apiKeys', (t) =>
  t.field({
    type: [ApiKeyRef],
    description: "API keys belonging to the signed-in user's workspace.",
    resolve: async (_parent, _args, context) => {
      const { tenantId } = requireWorkspace(context);
      return listApiKeys(tenantId);
    },
  })
);

builder.mutationField('revokeApiKey', (t) =>
  t.boolean({
    args: { keyId: t.arg.id({ required: true }) },
    description: "Revoke a key. Scoped to the caller's own workspace.",
    resolve: async (_parent, { keyId }, context) => {
      const { tenantId } = requireWorkspace(context);
      return revokeApiKey(tenantId, keyId as string);
    },
  })
);