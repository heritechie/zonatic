import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set. ' +
      'The console signs users in with Google through Supabase Auth, so both values are required.'
  );
}

/**
 * Browser Supabase client used only for authentication.
 *
 * It talks to Supabase Auth with the anon key, which is safe to ship: it can
 * start a Google sign-in and read the resulting session, but it cannot read
 * the database. All tenant data is fetched through console-api, which
 * verifies the access token this client obtains.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    // Google returns to the app with the session in the URL fragment, which
    // the client parses on load.
    detectSessionInUrl: true,
  },
});