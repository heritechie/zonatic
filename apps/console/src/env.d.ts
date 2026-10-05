/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GRAPHQL_URL: string;
  /** Supabase project URL, used for Google sign-in via Supabase Auth. */
  readonly VITE_SUPABASE_URL: string;
  /** Supabase anon key. Safe for the browser: it cannot read the database. */
  readonly VITE_SUPABASE_ANON_KEY: string;
  /** Marketing site origin, used for the login page's legal links. */
  readonly VITE_SITE_URL: string;
  /**
   * Console application origin, used for OAuth redirects and links.
   * Defaults to the current browser origin in development.
   */
  readonly VITE_CONSOLE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
