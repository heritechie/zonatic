import { createServer } from 'node:http';
import { config } from './config/index.js';
import { yoga } from './graphql/yoga.js';

const server = createServer(yoga);

server.listen(config.port, () => {
  console.log(`Console API running at http://localhost:${config.port}/graphql`);
});
