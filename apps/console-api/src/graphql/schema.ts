import './queries/health.js';
import './queries/me.js';
import './queries/api-keys.js';
import './mutations/create-api-key.js';
import './mutations/rename-api-key.js';
import './mutations/rotate-api-key.js';
import './mutations/rename-workspace.js';
import { builder } from './builder.js';

export const schema = builder.toSchema();