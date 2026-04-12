/**
 * Run the full ingest pipeline locally (no HTTP / auth).
 *
 * Prerequisites (e.g. `apps/server/.env`):
 * - `DATABASE_URL` — Postgres with migrations applied (T-003+)
 * - `OPENAI_API_KEY` — cleanContent, analyzeContent, embeddings
 * - `JINA_API_KEY` — URL extraction (non-Medium URLs)
 * - `FIRECRAWL_API_KEY` — optional; Medium URLs use Firecrawl when set
 *
 * Usage:
 *   pnpm smoke:ingest <entryId> <userId>
 *   pnpm smoke:ingest --create <userId> <https://example.com/article>
 */
import 'dotenv/config';

import { closeDb, db, eq } from '@mymemory/db';
import { entries } from '@mymemory/db/schema';
import { processEntry } from '../src/modules/ai/pipelines/ingest.js';

class UsageError extends Error {
  constructor() {
    super('USAGE');
    this.name = 'UsageError';
  }
}

function usage(): never {
  console.error(`
Usage:
  pnpm smoke:ingest <entryId> <userId>
  pnpm smoke:ingest --create <userId> <url>

Examples:
  pnpm smoke:ingest --create "00000000-0000-4000-8000-000000000001" "https://example.com"
`);
  throw new UsageError();
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  if (args.length < 2) usage();

  let entryId: string;
  let userId: string;

  if (args[0] === '--create') {
    if (args.length < 3) usage();
    userId = args[1];
    const url = args[2];
    try {
      new URL(url);
    } catch {
      console.error('Invalid URL:', url);
      return 1;
    }

    const [row] = await db
      .insert(entries)
      .values({
        userId,
        url,
        type: 'url',
        content: '',
        processedStatus: 'pending',
      })
      .returning();

    if (!row) {
      console.error('Failed to create entry');
      return 1;
    }
    entryId = row.id;
    console.log('Created entry:', entryId);
  } else {
    entryId = args[0];
    userId = args[1];
  }

  await processEntry(entryId, userId);

  const [row] = await db
    .select()
    .from(entries)
    .where(eq(entries.id, entryId))
    .limit(1);
  if (!row) {
    console.error('Entry not found after pipeline');
    return 1;
  }

  const preview = {
    id: row.id,
    processedStatus: row.processedStatus,
    error: row.error,
    title: row.title,
    summary: row.summary?.slice(0, 200),
    wordCount: row.wordCount,
    language: row.language,
    coverImageUrl: row.coverImageUrl,
    keyPointsCount: Array.isArray(row.keyPoints) ? row.keyPoints.length : 0,
    rawContentLength: row.rawContent?.length ?? 0,
    readableContentLength: row.readableContent?.length ?? 0,
    contentLength: row.content?.length ?? 0,
    hasMetadata: row.metadata != null,
  };

  console.log(JSON.stringify(preview, null, 2));

  return row.processedStatus === 'done' ? 0 : 1;
}

let exitCode = 0;
try {
  exitCode = await main();
} catch (e) {
  if (e instanceof UsageError) {
    exitCode = 1;
  } else {
    console.error(e);
    exitCode = 1;
  }
} finally {
  await closeDb();
}

process.exit(exitCode);
