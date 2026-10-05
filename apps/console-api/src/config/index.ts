import dotenv from 'dotenv';
import { resolve } from 'node:path';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is not set. Zonatic console-api connects to the database via DATABASE_URL. ' +
      'For Supabase, use the connection string from your Supabase project (direct or pooler).'
  );
}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'SUPABASE_URL and SUPABASE_ANON_KEY are not set. The console verifies Google ' +
      'sign-in tokens through Supabase Auth, so both values are required.'
  );
}

export const config = {
  port: parseInt(process.env.PORT || '8000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl,
  supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
  supabaseAnonKey,
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173'],
};