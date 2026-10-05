import { builder, requireWorkspace } from '../builder.js';
import { ApiKeyRef } from '../queries/api-keys.js';
import { renameApiKey } from '../../services/api-keys.js';

/**
 * Rename one of the caller's API keys.
 *
 * Mirrors `renameWorkspace`: the tenant comes from the verified session via
 * `requireWorkspace`, never from an argument, so a client cannot name a
 * `tenantId` it does not own. The row is then matched on both `id` and
 * `tenantId`, which means a key belonging to another workspace simply does not
 * match and is reported as not found.
 *
 * `id` is declared `ID!` to match the sibling `revokeApiKey`; Pothos only
 * offers `UUID!` through `@pothos/plugin-scalars`, which this project does not
 * depend on. UUID-ness is not left unchecked because of that — the service
 * rejects anything that is not canonical UUID text before it reaches Postgres,
 * so a malformed id can never surface as a driver-level cast error.
 *
 * Only the display name changes — see `renameApiKey` in the service.
 */
builder.mutationField('renameApiKey', (t) =>
  t.field({
    type: ApiKeyRef,
    args: {
      id: t.arg.id({ required: true }),
      name: t.arg.string({ required: true }),
    },
    description: "Rename one of the caller's API keys.",
    resolve: async (_parent, { id, name }, context) => {
      const { tenantId } = requireWorkspace(context);
      return renameApiKey(tenantId, String(id), String(name));
    },
  })
);