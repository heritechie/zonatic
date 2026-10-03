import { createClient, cacheExchange, fetchExchange } from 'urql';

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8001/graphql';

export const client = createClient({
  url: graphqlUrl,
  exchanges: [cacheExchange, fetchExchange],
});
