import { createYoga } from 'graphql-yoga';
import { schema } from './schema.js';
import { createContext } from './context.js';

export const yoga = createYoga({
  schema,
  context: createContext,
  graphqlEndpoint: '/graphql',
});
