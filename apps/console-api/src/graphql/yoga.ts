import { createYoga } from 'graphql-yoga';
import { schema } from './schema.js';
import { createContext } from './context.js';
import { config } from '../config/index.js';

export const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: '/graphql',
  // The console is served from a different origin than the API, and sends an
  // Authorization header. Credentials are allowed so the browser may send the
  // session; the origin list is explicit rather than wildcard.
  cors: {
    origin: config.corsOrigins,
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'OPTIONS'],
  },
});