import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { agentLogs } from './schema/agent-logs.js';
import { digests, digestEntries } from './schema/digests.js';
import { embeddings } from './schema/embeddings.js';
import { entries } from './schema/entries.js';
import * as enums from './schema/enums.js';
import { entryNotes } from './schema/entry-notes.js';
import { entryRelations } from './schema/entry-relations.js';
import { spaceSuggestions } from './schema/space-suggestions.js';
import { spaceWikiPages } from './schema/space-wiki-pages.js';
import { entrySpaces, spaceRelations, spaces } from './schema/spaces.js';
import { entryTags, tags } from './schema/tags.js';
import { entryTopics, topics } from './schema/topics.js';
import { wikiPageVersions, wikiPages } from './schema/wiki-pages.js';

/** Tables + enums for Drizzle client; import tables from `@mymemory/db/schema/<file>` in consumers. */
export const schema = {
  agentLogs,
  digests,
  digestEntries,
  embeddings,
  entries,
  entryNotes,
  entryRelations,
  spaceSuggestions,
  spaceWikiPages,
  spaces,
  entrySpaces,
  spaceRelations,
  tags,
  entryTags,
  topics,
  entryTopics,
  wikiPages,
  wikiPageVersions,
  ...enums,
};

export * from 'drizzle-orm';

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

/** Close the Postgres pool so CLI scripts (e.g. smoke tests) can exit without Ctrl+C. */
export async function closeDb(): Promise<void> {
  await client.end({ timeout: 5 });
}
