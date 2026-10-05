import { builder, requireWorkspace } from '../builder.js';
import { renameWorkspace } from '../../services/workspace.js';

const RenameWorkspaceRef = builder
  .objectRef<{ name: string }>('RenameWorkspacePayload')
  .implement({
    fields: (t) => ({
      name: t.exposeString('name'),
    }),
  });

builder.mutationField('renameWorkspace', (t) =>
  t.field({
    type: RenameWorkspaceRef,
    args: {
      name: t.arg.string({ required: true }),
    },
    description: "Rename the current workspace (tenant).",
    resolve: async (_parent, { name }, context) => {
      const { tenantId } = requireWorkspace(context);
      return renameWorkspace(tenantId, String(name));
    },
  })
);
