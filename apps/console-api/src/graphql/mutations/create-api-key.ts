import { builder, requireWorkspace } from '../builder.js';
import { createApiKey, isKeyEnvironment } from '../../services/api-keys.js';
import type { ApiKeyRow } from '../../services/api-keys.js';

type CreatedApiKeyShape = ApiKeyRow & {
  /** Shown once, immediately after creation. Never persisted. */
  rawKey: string;
};

/**
 * The one-time reveal returned when a key is created or rotated.
 *
 * `rawKey` exists only in this response. Only the SHA-256 hash is stored, so
 * the secret cannot be retrieved again after the user dismisses this screen.
 *
 * Exported so the rotation mutation can return the same type. The shape is
 * deliberately identical: the console already knows how to render the
 * one-time card, and a rotate result that hands it the same fields flows
 * straight into the existing component without a parallel "rotate reveal"
 * variant.
 */
export const CreatedApiKeyRef = builder
  .objectRef<CreatedApiKeyShape>('CreatedApiKey')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      name: t.exposeString('name'),
      keyPrefix: t.exposeString('keyPrefix'),
      environment: t.exposeString('environment'),
      rawKey: t.exposeString('rawKey'),
      createdAt: t.field({
        type: 'String',
        resolve: (row) => row.createdAt.toISOString(),
      }),
    }),
  });

builder.mutationField('createApiKey', (t) =>
  t.field({
    type: CreatedApiKeyRef,
    args: {
      name: t.arg.string({ required: true }),
      environment: t.arg.string({ required: false }),
    },
    description: "Create an API key for the caller's workspace and return it once.",
    resolve: async (_parent, { name, environment }, context) => {
      const { tenantId } = requireWorkspace(context);

      const trimmed = name.trim();
      if (trimmed.length === 0) {
        throw new Error('Name is required');
      }

      // Validated here as well as by the database CHECK, so an unknown
      // environment is a clear error instead of a constraint violation.
      const env = isKeyEnvironment(environment) ? environment : 'production';
      const { row, rawKey } = await createApiKey(tenantId, trimmed, env);
      return { ...row, rawKey };
    },
  })
);