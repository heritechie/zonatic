import { config } from '../config/index.js';

/**
 * Identity verified from a Google OAuth sign-in.
 *
 * Every field comes from Supabase Auth (which validated the Google token),
 * never from the request body, so the console can trust it.
 */
export type GoogleIdentity = {
  /** Supabase Auth user id (UUID). */
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
};

type SupabaseUserResponse = {
  id?: unknown;
  email?: unknown;
  user_metadata?: {
    full_name?: unknown;
    name?: unknown;
    avatar_url?: unknown;
    picture?: unknown;
  };
};

/**
 * Verify a Supabase access token and return the Google identity behind it.
 *
 * The token is validated by Supabase itself (`GET /auth/v1/user`), so this
 * service never handles the Google id_token and never needs a client
 * secret. Returns null for any missing, malformed, expired, or rejected
 * token — callers treat that as "not signed in".
 */
export async function verifyAccessToken(token: string): Promise<GoogleIdentity | null> {
  if (!token) return null;

  const response = await fetch(`${config.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: config.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) return null;

  const user = (await response.json()) as SupabaseUserResponse;
  if (typeof user.id !== 'string' || typeof user.email !== 'string') return null;

  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email,
    fullName:
      typeof meta.full_name === 'string'
        ? meta.full_name
        : typeof meta.name === 'string'
          ? meta.name
          : null,
    avatarUrl:
      typeof meta.avatar_url === 'string'
        ? meta.avatar_url
        : typeof meta.picture === 'string'
          ? meta.picture
          : null,
  };
}

/** Extract a bearer token from an Authorization header. */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : null;
}