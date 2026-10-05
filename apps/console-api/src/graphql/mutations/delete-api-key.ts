import { builder, requireWorkspace } from '../builder.js';
import { deleteApiKey } from '../../services/api-keys.js';

/**
 * Permanently delete an API key that has never been used.
 *
 * The tenant comes from the verified session via `requireWorkspace`, never from
 * an argument, so a client cannot name another workspace's row. The
 * `last_used_at IS NULL` rule is enforced inside the DELETE statement itself in
 * `deleteApiKey`, which is what keeps a key from being deleted after the public
 * API's metering path stamps it between a check and the delete.
 *
 * Returns a boolean rather than the deleted row: the row is gone, so there is
 * nothing meaningful to return, and no field here can carry key material.
 * A rejected delete raises a GraphQL error carrying the service's message
 * rather than returning `false`, so the console can surface the reason
 * verbatim instead of inventing its own wording.
 */
builder.mutationField('deleteApiKey', (t) =>
  t.boolean({
    args: { keyId: t.arg.id({ required: true }) },
    description:
      "Permanently delete an API key that has never been used. Scoped to the caller's own workspace.",
    resolve: async (_parent, { keyId }, context) => {
      const { tenantId } = requireWorkspace(context);
      await deleteApiKey(tenantId, keyId as string);
      return true;
    },
  })
);