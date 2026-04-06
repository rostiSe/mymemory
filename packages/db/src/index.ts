import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from 'drizzle-orm';
export { schema };

// This file should ONLY be imported in server environments (API Routes, Workers, etc.)
// Never import this directly into Expo components!

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing in environment variables');
}

// Disable prefetch for compatibility with Supabase connection poolers / PgBouncer
// https://orm.drizzle.team/docs/get-started-postgresql#supabase
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
