import { builder } from '../builder.js';

builder.queryField('health', (t) =>
  t.string({
    resolve: () => 'ok',
  })
);
