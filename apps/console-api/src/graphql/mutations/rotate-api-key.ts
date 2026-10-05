import { builder, requireWorkspace } from '../builder.js';
import { CreatedApiKeyRef } from './create-api-key.js';
import { rotateApiKey } from '../../services/api-keys.js';

/**
 * Rotate an API key.
 *
 * The tenant comes from the verified session via `requireWorkspace`, never from
 * an argument, so a client cannot rotate a row belonging to another workspace.
 * Atomicity (lock + revoke + insert) lives in `rotateApiKey` in the service.
 *
 * The return type is the existing `CreatedApiKey` rather than a separate
 * `RotatedApiKey` payload: the same fields — `id`, `name`, `keyPrefix`,
 * `environment`, `rawKey`, `createdAt` — are exactly what the console's
 * one-time reveal card already renders, so the rotate path drives the same
 * component without inventing a second "reveal after rotate" UI.
 *
 * Only the new secret is ever returned. `keyHash` is selected from the new
 * row but is not part of `CreatedApiKey`'s exposed fields, so a hash can
 * never leave through this path.
 */
builder.mutationField('rotateApiKey', (t) =>
  t.field({
    type: CreatedApiKeyRef,
    args: {
      id: t.arg.id({ required: true }),
    },
    description:
        "Rotate an API key: revoke the current key and mint a new secret for the same logical key.",
    resolve: async (_parent, { id }, context) => {
      const { tenantId } = requireWorkspace(context);
      const { row, rawKey } = await rotateApiKey(tenantId, String(id));
      return { ...row, rawKey };
    },
  })
);