import { drizzle } from 'drizzle-orm/postgres-js';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

type Schema = typeof schema;
export type AppDatabase = PostgresJsDatabase<Schema>;

/** Used when `DATABASE_URL` is missing or not a valid `postgres://` URI (Metro/API bundling). */
const DEV_FALLBACK =
  'postgresql://postgres:postgres@127.0.0.1:5432/postgres';

/**
 * `postgres` parses the DSN with `new URL()`. Wrong scheme (e.g. https://…supabase.co),
 * or an unencoded `@` / `:` / `#` in the password, throws **Invalid URL**.
 */
/** Strip BOM / optional wrapping quotes from .env lines (Windows / copy-paste). */
function normalizeEnvConnectionString(value: string): string {
  let t = value.trim().replace(/^\uFEFF/, '');
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t;
}

function isValidPostgresDsn(value: string): boolean {
  const trimmed = normalizeEnvConnectionString(value);
  if (!trimmed) return false;
  if (!/^postgres(ql)?:\/\//i.test(trimmed)) {
    return false;
  }
  try {
    const forUrl = trimmed.replace(/^postgresql:/i, 'postgres:');
    new URL(forUrl);
    return true;
  } catch {
    return false;
  }
}

function resolveConnectionString(): string {
  const raw =
    process.env.DATABASE_URL ?? process.env.EXPO_PUBLIC_DATABASE_URL ?? '';
  const explicit = normalizeEnvConnectionString(raw);

  if (explicit && isValidPostgresDsn(explicit)) {
    return normalizeEnvConnectionString(explicit);
  }

  if (explicit) {
    console.warn(
      '[db] DATABASE_URL is set but is not a valid postgres:// connection string. ' +
        'Use the URI from Supabase → Database (not the https project URL). ' +
        'Encode characters in the password (e.g. ? → %3F, @ → %40). Using dev fallback.'
    );
  }

  return DEV_FALLBACK;
}

let client: ReturnType<typeof postgres> | null = null;
let dbInstance: AppDatabase | null = null;

function getDb(): AppDatabase {
  if (!dbInstance) {
    const primary = resolveConnectionString();
    try {
      client = postgres(primary, { prepare: false });
      dbInstance = drizzle(client, { schema });
    } catch (err) {
      console.warn(
        '[db] Failed to create Postgres client (often invalid DSN). Using dev fallback.',
        err
      );
      client = postgres(DEV_FALLBACK, { prepare: false });
      dbInstance = drizzle(client, { schema });
    }
  }
  return dbInstance;
}

export const db = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const real = getDb();
    const value = Reflect.get(real as object, prop, receiver);
    if (typeof value === 'function') {
      return value.bind(real);
    }
    return value;
  },
});
