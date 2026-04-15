/**
 * Smoke test for wiki schema write paths (no LLM calls).
 *
 * Prerequisites (e.g. `apps/server/.env`):
 * - `DATABASE_URL` — Postgres with latest migrations applied
 *
 * Usage:
 *   pnpm smoke:wiki-schema <userId>
 */
import 'dotenv/config';

import { and, closeDb, db, eq, or } from '@mymemory/db';
import { spaceWikiPages } from '@mymemory/db/schema/space-wiki-pages';
import { spaces } from '@mymemory/db/schema/spaces';
import { wikiPageVersions, wikiPages } from '@mymemory/db/schema/wiki-pages';

class UsageError extends Error {
  constructor() {
    super('USAGE');
    this.name = 'UsageError';
  }
}

function usage(): never {
  console.error(`
Usage:
  pnpm smoke:wiki-schema <userId>

Example:
  pnpm smoke:wiki-schema "00000000-0000-4000-8000-000000000001"
`);
  throw new UsageError();
}

async function main(): Promise<number> {
  const userId = process.argv[2];
  if (!userId) usage();

  const [primarySpace] = await db
    .insert(spaces)
    .values({
      userId,
      name: `Smoke Wiki Primary ${Date.now()}`,
      description: 'Temp space for wiki schema smoke test',
      properties: { smoke: true },
    })
    .returning();

  const [linkedSpace] = await db
    .insert(spaces)
    .values({
      userId,
      name: `Smoke Wiki Linked ${Date.now()}`,
      description: 'Linked space for M2M smoke test',
      properties: { smoke: true },
    })
    .returning();

  if (!primarySpace || !linkedSpace) {
    console.error('Failed to create smoke test spaces');
    return 1;
  }

  let createdPageId: string | undefined;

  try {
    const slug = `smoke-wiki-${Date.now()}`;

    const [createdPage] = await db
      .insert(wikiPages)
      .values({
        userId,
        slug,
        title: 'Smoke Synthesis',
        pageType: 'synthesis',
        content: {
          sections: [{ heading: 'Summary', body: 'Initial summary' }],
          keyInsights: ['Initial insight'],
        },
        properties: {},
        sourceEntryIds: [],
      })
      .returning();

    if (!createdPage) {
      console.error('Failed to create wiki page');
      return 1;
    }

    await db.insert(spaceWikiPages).values([
      { spaceId: primarySpace.id, wikiPageId: createdPage.id },
      { spaceId: linkedSpace.id, wikiPageId: createdPage.id },
    ]);

    await db.insert(wikiPageVersions).values({
      wikiPageId: createdPage.id,
      version: 1,
      content: createdPage.content,
      properties: createdPage.properties,
      sourceEntryIds: createdPage.sourceEntryIds,
    });

    const [updatedPage] = await db
      .update(wikiPages)
      .set({
        content: {
          sections: [{ heading: 'Summary', body: 'Updated summary' }],
          keyInsights: ['Updated insight'],
        },
        updatedAt: new Date(),
      })
      .where(eq(wikiPages.id, createdPage.id))
      .returning();

    if (!updatedPage) {
      console.error('Failed to update wiki page');
      return 1;
    }

    const versions = await db
      .select()
      .from(wikiPageVersions)
      .where(eq(wikiPageVersions.wikiPageId, createdPage.id));

    const links = await db
      .select()
      .from(spaceWikiPages)
      .where(
        and(
          eq(spaceWikiPages.wikiPageId, createdPage.id),
          or(
            eq(spaceWikiPages.spaceId, primarySpace.id),
            eq(spaceWikiPages.spaceId, linkedSpace.id),
          ),
        ),
      );

    console.log(
      JSON.stringify(
        {
          ok: versions.length >= 1 && links.length === 2,
          createdPageId: createdPage.id,
          versionCount: versions.length,
          spaceLinkCount: links.length,
        },
        null,
        2,
      ),
    );

    return versions.length >= 1 && links.length === 2 ? 0 : 1;
  } finally {
    if (createdPageId) {
      await db.delete(wikiPages).where(eq(wikiPages.id, createdPageId));
    }
    await db.delete(spaces).where(or(eq(spaces.id, primarySpace.id), eq(spaces.id, linkedSpace.id)));
  }
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
