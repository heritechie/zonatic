import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://zonatic:zonatic@localhost:5432/zonatic',
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
};
