import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Google sign-in session state.
 *
 * Supabase Auth owns the session; this store only mirrors it so the router
 * guard and the views can react to it. There is no email/password path —
 * Google is the only authentication method in V1.
 */
export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null);
  const user = ref<User | null>(null);
  /** True until the initial session lookup finishes, to avoid a flash of the login page. */
  const initialising = ref(true);

  const isAuthenticated = computed(() => session.value !== null);

  /** Best-effort display name from the Google profile. */
  const displayName = computed(() => {
    const meta = user.value?.user_metadata as
      | { full_name?: string; name?: string }
      | undefined;
    return meta?.full_name || meta?.name || user.value?.email || 'Zonatic user';
  });

  const email = computed(() => user.value?.email ?? '');

  const avatarUrl = computed(() => {
    const meta = user.value?.user_metadata as { avatar_url?: string; picture?: string } | undefined;
    return meta?.avatar_url || meta?.picture || null;
  });

  function applySession(next: Session | null) {
    session.value = next;
    user.value = next?.user ?? null;
  }

  /**
   * True when `window.location.hash` looks like a Supabase OAuth / magic-link
   * callback (carries `access_token=…` etc.). Used to recognise the OAuth
   * return URL so we can clean the fragment once the session is established.
   *
   * Pure shape check — we never read the values, so tokens never reach logs.
   */
  function isOAuthCallbackHash(hash: string): boolean {
    if (!hash) return false;
    // Supabase PKCE / implicit flow parameters. `error_description=` covers
    // the failure-path branch where Supabase redirects with `?error=…`.
    return /(?:^|[?&#])(?:access_token|refresh_token|provider_token|error_description)=/.test(
      hash,
    );
  }

  /**
   * Strip the OAuth-callback fragment from the address bar without a reload.
   *
   * `supabase-js` with `detectSessionInUrl: true` extracts tokens from the
   * fragment and persists them to storage, but in some versions / races the
   * fragment is left in `window.location`. Once the session has been
   * applied, that leftover fragment is just visual cruft that could leak
   * through copy-paste, screenshots, or the referrer header.
   *
   * Guarded by both `isOAuthCallbackHash` and `session.value` so we never
   * strip the fragment before Supabase has had a chance to read the tokens,
   * and we never strip an unrelated hash like `#section`.
   */
  function cleanupOAuthCallbackUrl(): void {
    if (typeof window === 'undefined') return;
    if (!session.value) return;
    if (!isOAuthCallbackHash(window.location.hash)) return;
    const cleaned = window.location.pathname + window.location.search;
    window.history.replaceState(window.history.state, document.title, cleaned);
  }

  /** Read the persisted session. Call once during app start-up. */
  async function initialise() {
    const { data } = await supabase.auth.getSession();
    applySession(data.session);
    // After `getSession()` resolves, supabase-js has either already
    // recovered the session from the URL fragment or storage; any leftover
    // OAuth-shaped fragment is safe to strip now.
    cleanupOAuthCallbackUrl();
    initialising.value = false;

    supabase.auth.onAuthStateChange((_event, next) => {
      applySession(next);
      // A SIGNED_IN event for an OAuth return delivers the session parsed
      // from the URL fragment. Clean the fragment now that we have a
      // session, so the user lands on a clean `/` URL.
      cleanupOAuthCallbackUrl();
    });
  }

  /**
   * Redirect to Google's consent screen.
   *
   * Supabase returns the browser to `/dashboard`, which is where the session
   * is picked up and the workspace is provisioned on the first API call.
   * `skipBrowserRedirect` stays false so the browser performs the navigation.
   */
  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${import.meta.env.VITE_CONSOLE_URL || window.location.origin}/`,
      },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    applySession(null);
  }

  /** Current access token, sent to console-api as a bearer token. */
  async function accessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  return {
    session,
    user,
    initialising,
    isAuthenticated,
    displayName,
    email,
    avatarUrl,
    initialise,
    signInWithGoogle,
    signOut,
    accessToken,
  };
});