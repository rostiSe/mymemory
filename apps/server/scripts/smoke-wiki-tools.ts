/**
 * Smoke test for T-015b wiki agent tools.
 *
 * Usage:
 *   pnpm smoke:wiki-tools <userId>
 */
import 'dotenv/config';

import { closeDb, db, eq } from '@mymemory/db';
import { entries } from '@mymemory/db/schema/entries';
import { spaces } from '@mymemory/db/schema/spaces';
import { wikiPages } from '@mymemory/db/schema/wiki-pages';
import {
  buildCuratorTools,
  buildLinterTools,
  buildWriterTools,
} from '../src/modules/ai/agents/wiki-tools.js';

class UsageError extends Error {
  constructor() {
    super('USAGE');
    this.name = 'UsageError';
  }
}

type CreateOrUpdateSpaceResult = { id: string; name: string; isNew: boolean };
type CreateOrUpdateWikiPageResult = {
  id: string;
  title: string;
  slug: string;
  isNew: boolean;
  versionCreated: boolean;
};

function usage(): never {
  console.error(`
Usage:
  pnpm smoke:wiki-tools <userId>

Example:
  pnpm smoke:wiki-tools "00000000-0000-4000-8000-000000000001"
`);
  throw new UsageError();
}

async function main(): Promise<number> {
  const userId = process.argv[2];
  if (!userId) usage();

  const runId = crypto.randomUUID();
  const curator = buildCuratorTools(db, userId, runId);
  const writer = buildWriterTools(db, userId, runId);
  const linter = buildLinterTools(db, userId, runId);

  const tempEntryTitle = `Smoke wiki tools entry ${Date.now()}`;
  const [tempEntry] = await db
    .insert(entries)
    .values({
      userId,
      title: tempEntryTitle,
      content: 'Smoke content',
      summary: 'Smoke summary',
      readableContent: 'Smoke readable content',
      keyPoints: ['point-1'],
      processedStatus: 'done',
      type: 'note',
    })
    .returning({ id: entries.id });

  if (!tempEntry) {
    console.error('Failed to create temp entry');
    return 1;
  }

  const spaceName = `Smoke Wiki Tools Space ${Date.now()}`;
  const pageSlug = `smoke-wiki-tools-${Date.now()}`;
  let createdSpaceId: string | undefined;
  let createdPageId: string | undefined;

  try {
    await writer.getPageTypeTemplate.execute({ pageType: 'synthesis' });
    await writer.getPageTypeTemplate.execute({ pageType: 'timeline' });
    await writer.getPageTypeTemplate.execute({ pageType: 'comparison' });
    await writer.getPageTypeTemplate.execute({ pageType: 'glossary' });
    await writer.getPageTypeTemplate.execute({ pageType: 'index' });

    const createdSpace = (await curator.createOrUpdateSpace.execute({
      name: spaceName,
      description: 'Smoke tool space',
      content: { summary: 'Smoke' },
      properties: { smoke: true },
      sortOrder: 1,
    })) as CreateOrUpdateSpaceResult;
    createdSpaceId = createdSpace.id;

    await curator.createOrUpdateSpace.execute({
      name: spaceName,
      description: 'Smoke tool space updated',
      content: { summary: 'Smoke updated' },
      properties: { smoke: true, updated: true },
      sortOrder: 2,
    });

    await curator.assignEntriesToSpace.execute({
      spaceId: createdSpace.id,
      entryIds: [tempEntry.id],
    });

    await curator.listEntries.execute({ limit: 25, offset: 0, unassignedOnly: false });
    await writer.readEntryContent.execute({ entryId: tempEntry.id });
    await curator.listSpaces.execute({});

    const createdPage = (await writer.createOrUpdateWikiPage.execute({
      title: 'Smoke Synthesis Page',
      slug: pageSlug,
      pageType: 'synthesis',
      content: { sections: [], insights: [], contradictions: [], openQuestions: [] },
      sourceEntryIds: [tempEntry.id],
    })) as CreateOrUpdateWikiPageResult;
    createdPageId = createdPage.id;

    await writer.createOrUpdateWikiPage.execute({
      title: 'Smoke Synthesis Page Updated',
      slug: pageSlug,
      pageType: 'synthesis',
      content: { sections: [], insights: ['updated'], contradictions: [], openQuestions: [] },
      sourceEntryIds: [tempEntry.id],
      properties: { revised: true },
    });

    await curator.assignPageToSpaces.execute({
      wikiPageId: createdPage.id,
      spaceIds: [createdSpace.id],
    });

    await curator.listWikiPages.execute({});
    await curator.listWikiPages.execute({ spaceId: createdSpace.id });
    await linter.listEntries.execute({ limit: 10, offset: 0 });
    await linter.listSpaces.execute({});
    await linter.listWikiPages.execute({});
    await linter.flagIssue.execute({
      severity: 'warn',
      category: 'thin_page',
      message: 'Smoke test warning',
      targetId: createdPage.id,
      autoFixable: false,
    });

    console.log(
      JSON.stringify(
        {
          ok: true,
          runId,
          createdSpaceId,
          createdPageId,
          tempEntryId: tempEntry.id,
        },
        null,
        2,
      ),
    );
    return 0;
  } finally {
    if (createdPageId) {
      await db.delete(wikiPages).where(eq(wikiPages.id, createdPageId));
    }
    if (createdSpaceId) {
      await db.delete(spaces).where(eq(spaces.id, createdSpaceId));
    }
    await db.delete(entries).where(eq(entries.id, tempEntry.id));
  }
}

let exitCode = 0;
try {
  exitCode = await main();
} catch (error) {
  if (error instanceof UsageError) {
    exitCode = 1;
  } else {
    console.error(error);
    exitCode = 1;
  }
} finally {
  await closeDb();
}

process.exit(exitCode);
