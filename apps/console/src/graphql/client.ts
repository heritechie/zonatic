import { createClient, cacheExchange, fetchExchange } from 'urql';
import { useAuthStore } from '../stores/auth';

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8001/graphql';

export const client = createClient({
  url: graphqlUrl,
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    // console-api authenticates with the Supabase access token issued by
    // Google sign-in. Requests are sent unauthenticated when there is no
    // session; the API rejects them rather than granting anonymous access.
    const token = useAuthStore().session?.access_token;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return { headers };
  },
});