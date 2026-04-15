import { and, asc, eq, inArray } from '@mymemory/db';
import { db as defaultDb } from '@mymemory/db';
import { agentLogs } from '@mymemory/db/schema/agent-logs';
import { entries } from '@mymemory/db/schema/entries';
import { entrySpaces, spaces } from '@mymemory/db/schema/spaces';
import { entryTopics, topics } from '@mymemory/db/schema/topics';
import type { Database } from './wiki-tools.js';
import { runCurator, type CuratorResult } from './curator-agent.js';
import {
  runWriter,
  type WriterEntrySummary,
  type WriterResult,
} from './writer-agent.js';
import { runLinter, type LinterResult } from './linter-agent.js';

type CompileMode = 'full' | 'incremental';

type WriterRunSummary = {
  spaceId: string;
  spaceName: string;
  result: WriterResult;
};

export type CompileResult = {
  runId: string;
  mode: CompileMode;
  curatorInitial: CuratorResult;
  writers: WriterRunSummary[];
  curatorFinalize: CuratorResult | null;
  totalTokens: number;
  error?: string;
};

export type LintResult = {
  runId: string;
  result: LinterResult;
};

async function ensureIndexSpace(db: Database, userId: string): Promise<{ id: string; name: string }> {
  const [existing] = await db
    .select({ id: spaces.id, name: spaces.name })
    .from(spaces)
    .where(and(eq(spaces.userId, userId), eq(spaces.isIndex, true)))
    .limit(1);

  if (existing) {
    return existing;
  }

  const [created] = await db
    .insert(spaces)
    .values({
      userId,
      name: 'Index',
      description: 'System index space managed by wiki orchestrator',
      isIndex: true,
      content: {},
      properties: {},
      sortOrder: -1,
      compilationStatus: 'idle',
    })
    .returning({ id: spaces.id, name: spaces.name });

  if (!created) {
    throw new Error('Failed to create index space');
  }

  return created;
}

async function loadEntrySummariesForSpace(
  db: Database,
  userId: string,
  spaceId: string,
): Promise<WriterEntrySummary[]> {
  const entryRows = await db
    .select({
      id: entries.id,
      title: entries.title,
      summary: entries.summary,
    })
    .from(entrySpaces)
    .innerJoin(entries, eq(entries.id, entrySpaces.entryId))
    .where(and(eq(entrySpaces.spaceId, spaceId), eq(entries.userId, userId)));

  const entryIds = entryRows.map((row) => row.id);
  if (entryIds.length === 0) {
    return [];
  }

  const topicRows = await db
    .select({ entryId: entryTopics.entryId, topicName: topics.name })
    .from(entryTopics)
    .innerJoin(topics, eq(topics.id, entryTopics.topicId))
    .where(inArray(entryTopics.entryId, entryIds));

  const topicsByEntry = new Map<string, string[]>();
  for (const row of topicRows) {
    const list = topicsByEntry.get(row.entryId) ?? [];
    list.push(row.topicName);
    topicsByEntry.set(row.entryId, list);
  }

  return entryRows.map((row) => ({
    id: row.id,
    title: row.title,
    summary: row.summary,
    topics: topicsByEntry.get(row.id) ?? [],
  }));
}

async function loadSpaceIdsWithAssignedEntries(
  db: Database,
  userId: string,
): Promise<Set<string>> {
  const rows = await db
    .select({ spaceId: entrySpaces.spaceId })
    .from(entrySpaces)
    .innerJoin(entries, eq(entries.id, entrySpaces.entryId))
    .where(eq(entries.userId, userId));
  return new Set(rows.map((row) => row.spaceId));
}

async function runWithConcurrencyLimit<T>(
  tasks: Array<() => Promise<T>>,
  concurrencyLimit: number,
): Promise<T[]> {
  const running = new Set<Promise<void>>();
  const results: T[] = [];

  for (const task of tasks) {
    const wrapped = (async () => {
      const value = await task();
      results.push(value);
    })()
      .finally(() => {
        running.delete(wrapped);
      });

    running.add(wrapped);

    if (running.size >= concurrencyLimit) {
      await Promise.race(running);
    }
  }

  await Promise.all(running);
  return results;
}

/**
 * Orchestrates curator, writers, then curator again. Overlapping compiles for the same user should be
 * prevented by the Trigger task queue (`concurrencyLimit` + `concurrencyKey` on trigger), not by
 * throwing from here. `compilationStatus` on the index space is for UI only.
 */
export async function runWikiCompile(
  db: Database = defaultDb,
  userId: string,
  mode: CompileMode,
): Promise<CompileResult> {
  const runId = crypto.randomUUID();

  const indexSpace = await ensureIndexSpace(db, userId);
  await db
    .update(spaces)
    .set({ compilationStatus: 'compiling', updatedAt: new Date() })
    .where(eq(spaces.id, indexSpace.id));

  let curatorFinalize: CuratorResult | null = null;
  const writerRuns: WriterRunSummary[] = [];
  let initialCuratorResult: CuratorResult = {
    spacesCreated: [],
    spacesUpdated: [],
    entriesAssigned: 0,
    steps: 0,
    tokens: 0,
  };

  try {
    initialCuratorResult = await runCurator(db, userId, runId, mode);

    const impactedNames = [
      ...new Set([
        ...initialCuratorResult.spacesCreated,
        ...initialCuratorResult.spacesUpdated,
      ]),
    ];

    const spaceIdsWithEntries = await loadSpaceIdsWithAssignedEntries(db, userId);

    const impactedSpaces = impactedNames.length > 0
      ? await db
        .select({ id: spaces.id, name: spaces.name })
        .from(spaces)
        .where(
          and(
            eq(spaces.userId, userId),
            eq(spaces.isIndex, false),
            inArray(spaces.name, impactedNames),
          ),
        )
      : [];

    const candidateSpaces = impactedNames.length > 0
      ? impactedSpaces
      : await db
        .select({ id: spaces.id, name: spaces.name })
        .from(spaces)
        .where(and(eq(spaces.userId, userId), eq(spaces.isIndex, false)))
        .orderBy(asc(spaces.sortOrder), asc(spaces.name));

    const skippedWriterCount = candidateSpaces.filter((s) => !spaceIdsWithEntries.has(s.id)).length;
    if (skippedWriterCount > 0) {
      await db.insert(agentLogs).values({
        userId,
        runId,
        level: 'info',
        message: `Wiki compile: skipped writer for ${skippedWriterCount} space(s) with no assigned entries.`,
        toolName: 'runWikiCompile',
        toolOutput: { skippedWriterCount },
      });
    }

    const spacesToWrite = candidateSpaces.filter((s) => spaceIdsWithEntries.has(s.id));

    const writerTasks = spacesToWrite.map((spaceRow) => async () => {
      const entrySummaries = await loadEntrySummariesForSpace(db, userId, spaceRow.id);
      if (entrySummaries.length === 0) {
        const empty: WriterResult = {
          pagesCreated: [],
          pagesUpdated: [],
          versionsCreated: 0,
          steps: 0,
          tokens: 0,
        };
        return { spaceId: spaceRow.id, spaceName: spaceRow.name, result: empty };
      }

      const result = await runWriter(db, userId, runId, spaceRow.id, entrySummaries);
      return {
        spaceId: spaceRow.id,
        spaceName: spaceRow.name,
        result,
      };
    });

    const parallelWriters = await runWithConcurrencyLimit(writerTasks, 3);
    writerRuns.push(...parallelWriters);

    curatorFinalize = spacesToWrite.length === 0
      ? null
      : await runCurator(db, userId, runId, 'incremental');

    await db
      .update(spaces)
      .set({
        compilationStatus: 'idle',
        lastCompiledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(spaces.id, indexSpace.id));

    const totalTokens = initialCuratorResult.tokens
      + (curatorFinalize?.tokens ?? 0)
      + writerRuns.reduce((acc, run) => acc + run.result.tokens, 0);

    return {
      runId,
      mode,
      curatorInitial: initialCuratorResult,
      writers: writerRuns,
      curatorFinalize,
      totalTokens,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown compile failure';

    await db
      .update(spaces)
      .set({
        compilationStatus: 'failed',
        updatedAt: new Date(),
      })
      .where(eq(spaces.id, indexSpace.id));

    await db.insert(agentLogs).values({
      userId,
      runId,
      level: 'error',
      message: `Wiki compile failed: ${message}`,
      toolName: 'runWikiCompile',
      toolOutput: {
        mode,
        writersCompleted: writerRuns.length,
      },
    });

    const totalTokens = initialCuratorResult.tokens
      + (curatorFinalize?.tokens ?? 0)
      + writerRuns.reduce((acc, run) => acc + run.result.tokens, 0);

    return {
      runId,
      mode,
      curatorInitial: initialCuratorResult,
      writers: writerRuns,
      curatorFinalize,
      totalTokens,
      error: message,
    };
  }
}

export async function runWikiLint(
  db: Database = defaultDb,
  userId: string,
): Promise<LintResult> {
  const runId = crypto.randomUUID();
  const result = await runLinter(db, userId, runId);
  return { runId, result };
}
