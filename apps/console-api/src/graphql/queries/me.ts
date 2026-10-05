import { eq } from 'drizzle-orm';
import { builder, requireWorkspace } from '../builder.js';
import { tenantUsage } from '../../db/schema.js';
import { countApiKeys } from '../../services/api-keys.js';

type WorkspaceShape = {
  id: string;
  name: string;
  role: string;
};

type AuthenticatedUserShape = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  workspace: WorkspaceShape | null;
  apiKeyCount: number;
  activeApiKeyCount: number;
  apiRequestsTotal: number;
};

const WorkspaceRef = builder
  .objectRef<WorkspaceShape>('Workspace')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      name: t.exposeString('name'),
      role: t.exposeString('role'),
    }),
  });

const AuthenticatedUserRef = builder
  .objectRef<AuthenticatedUserShape>('AuthenticatedUser')
  .implement({
    fields: (t) => ({
      id: t.exposeID('id'),
      email: t.exposeString('email'),
      fullName: t.exposeString('fullName', { nullable: true }),
      avatarUrl: t.exposeString('avatarUrl', { nullable: true }),
      workspace: t.field({
        type: WorkspaceRef,
        nullable: true,
        resolve: (parent) => parent.workspace,
      }),
      apiKeyCount: t.exposeInt('apiKeyCount'),
      activeApiKeyCount: t.exposeInt('activeApiKeyCount'),
      apiRequestsTotal: t.exposeInt('apiRequestsTotal'),
    }),
  });

/**
 * The signed-in user's profile and workspace.
 *
 * Also returns the two dashboard counters. `apiRequestsTotal` comes from
 * `tenant_usage`, which is currently zero for every tenant because request
 * counting is not yet wired into the public API's hot path — it reports a
 * real 0 rather than a fabricated figure.
 */
builder.queryField('me', (t) =>
  t.field({
    type: AuthenticatedUserRef,
    nullable: true,
    resolve: async (_parent, _args, context) => {
      const { tenantId } = requireWorkspace(context);

      const usageRows = await context.db
        .select({ total: tenantUsage.apiRequestsTotal })
        .from(tenantUsage)
        .where(eq(tenantUsage.tenantId, tenantId))
        .limit(1);

      return {
        id: context.user!.id,
        email: context.user!.email,
        fullName: context.user!.fullName,
        avatarUrl: context.user!.avatarUrl,
        workspace: {
          id: context.workspace!.tenantId,
          name: context.workspace!.tenantName,
          role: context.workspace!.role,
        },
        apiKeyCount: await countApiKeys(tenantId),
        activeApiKeyCount: await countApiKeys(tenantId, true),
        apiRequestsTotal: usageRows[0]?.total ?? 0,
      };
    },
  })
);