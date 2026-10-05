import type { YogaInitialContext } from 'graphql-yoga';
import { db } from '../db/client.js';
import { bearerToken, verifyAccessToken, type GoogleIdentity } from '../auth/supabase.js';
import { resolveWorkspace, type Workspace } from '../services/workspace.js';

export type Context = {
  db: typeof db;
  /**
   * Authenticated caller, or null when the request carries no valid token.
   * Provisioning happens here, so `user`/`workspace` are present as soon as
   * a request carries a valid Google token — first login included.
   */
  user: GoogleIdentity | null;
  workspace: Workspace | null;
};

export async function createContext(
  initialContext: YogaInitialContext
): Promise<Context> {
  const token = bearerToken(initialContext.request.headers.get('authorization'));

  if (!token) {
    return { db, user: null, workspace: null };
  }

  const identity = await verifyAccessToken(token);
  if (!identity) {
    return { db, user: null, workspace: null };
  }

  const workspace = await resolveWorkspace(identity);
  return { db, user: identity, workspace };
}