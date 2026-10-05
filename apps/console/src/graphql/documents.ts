/**
 * GraphQL documents used by the console.
 *
 * They are plain strings rather than generated artifacts because the console
 * has no codegen setup; keeping them in one file makes the shape of every
 * request reviewable in one place.
 */

/** Current user, workspace, and dashboard counters. */
export const ME_QUERY = `
  query Me {
    me {
      id
      email
      fullName
      avatarUrl
      apiKeyCount
      activeApiKeyCount
      apiRequestsTotal
      workspace {
        id
        name
        role
      }
    }
  }
`;

/** Keys for the caller's workspace. `rawKey` is never part of this query. */
export const API_KEYS_QUERY = `
  query ApiKeys {
    apiKeys {
      id
      name
      keyPrefix
      environment
      createdAt
      lastUsedAt
      revokedAt
    }
  }
`;

/** Create a key. The response is the only time the raw key is returned. */
export const CREATE_API_KEY_MUTATION = `
  mutation CreateApiKey($name: String!) {
    createApiKey(name: $name) {
      id
      name
      keyPrefix
      environment
      rawKey
      createdAt
    }
  }
`;

export const REVOKE_API_KEY_MUTATION = `
  mutation RevokeApiKey($keyId: ID!) {
    revokeApiKey(keyId: $keyId)
  }
`;

/**
 * Permanently delete a key. Only offered for a key the public API has never
 * seen (`lastUsedAt === null`); used keys keep the `revokeApiKey` mutation so
 * their usage history survives.
 */
export const RENAME_API_KEY_MUTATION = `
  mutation RenameApiKey($id: ID!, $name: String!) {
    renameApiKey(id: $id, name: $name) {
      id
      name
      keyPrefix
      environment
      createdAt
      lastUsedAt
      revokedAt
    }
  }
`;

/**
 * Rotate a key. Only the row id is sent; the backend resolves tenant from the
 * session. The response is the same one-time reveal shape used for `createApiKey`
 * (id, name, keyPrefix, environment, rawKey, createdAt) so the existing
 * one-time secret card on this page renders it without a separate variant.
 */
export const ROTATE_API_KEY_MUTATION = `
  mutation RotateApiKey($id: ID!) {
    rotateApiKey(id: $id) {
      id
      name
      keyPrefix
      environment
      rawKey
      createdAt
    }
  }
`;

export type Me = {
  me: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
    apiKeyCount: number;
    activeApiKeyCount: number;
    apiRequestsTotal: number;
    workspace: { id: string; name: string; role: string } | null;
  } | null;
};

export type ApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

export type ApiKeysResult = { apiKeys: ApiKey[] };

export type CreatedApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  environment: string;
  rawKey: string;
  createdAt: string;
};

export type CreateApiKeyResult = { createApiKey: CreatedApiKey };
export type RevokeApiKeyResult = { revokeApiKey: boolean };
export type RenameApiKeyResult = { renameApiKey: ApiKey };
export type RotateApiKeyResult = { rotateApiKey: CreatedApiKey };
export const RENAME_WORKSPACE_MUTATION = `
  mutation RenameWorkspace($name: String!) {
    renameWorkspace(name: $name) {
      name
    }
  }
`;
