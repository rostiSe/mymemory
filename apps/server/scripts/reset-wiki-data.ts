/**
 * Deletes all wiki-related data for a user so a fresh compile can start clean.
 *
 * Deletes: wiki_pages (cascades versions + space_wiki_pages), spaces (cascades
 * entry_spaces + space_relations), space_suggestions, agent_logs.
 *
 * Usage:
 *   pnpm reset:wiki <userId>            # dry-run — shows what would be deleted
 *   pnpm reset:wiki <userId> --confirm  # actually deletes
 *
 * Requires DATABASE_URL in apps/server/.env.
 */
import "dotenv/config";

import { db, eq, closeDb, sql } from "@mymemory/db";
import { agentLogs } from "@mymemory/db/schema/agent-logs";
import { spaceSuggestions } from "@mymemory/db/schema/space-suggestions";
import { spaces } from "@mymemory/db/schema/spaces";
import { wikiPages } from "@mymemory/db/schema/wiki-pages";

function usage(): never {
  console.error(`
Usage:
  pnpm reset:wiki <userId>            # dry-run
  pnpm reset:wiki <userId> --confirm  # destructive

Example:
  pnpm reset:wiki "00000000-0000-4000-8000-000000000001" --confirm
`);
  process.exit(1);
}

type TableRef = typeof wikiPages | typeof spaces | typeof agentLogs | typeof spaceSuggestions;

async function countForUser(table: TableRef, userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(table)
    .where(eq((table as typeof wikiPages).userId, userId));
  return Number(row?.count ?? 0);
}

async function main(): Promise<void> {
  const userId = process.argv[2];
  if (!userId) usage();

  const confirm = process.argv.includes("--confirm");

  const [wikiPageCount, spaceCount, agentLogCount, suggestionCount] =
    await Promise.all([
      countForUser(wikiPages, userId),
      countForUser(spaces, userId),
      countForUser(agentLogs, userId),
      countForUser(spaceSuggestions, userId),
    ]);

  console.log(`\nWiki data for user ${userId}:`);
  console.log(`  wiki_pages:        ${wikiPageCount} (cascades versions + space_wiki_pages)`);
  console.log(`  spaces:            ${spaceCount} (cascades entry_spaces + space_relations)`);
  console.log(`  agent_logs:        ${agentLogCount}`);
  console.log(`  space_suggestions: ${suggestionCount}`);

  const totalRows = wikiPageCount + spaceCount + agentLogCount + suggestionCount;

  if (totalRows === 0) {
    console.log("\nNothing to delete.");
    await closeDb();
    return;
  }

  if (!confirm) {
    console.log("\nDry run — no data deleted. Pass --confirm to delete.");
    await closeDb();
    return;
  }

  console.log("\nDeleting...");

  const deletedWikiPages = await db
    .delete(wikiPages)
    .where(eq(wikiPages.userId, userId))
    .returning({ id: wikiPages.id });

  const deletedSpaces = await db
    .delete(spaces)
    .where(eq(spaces.userId, userId))
    .returning({ id: spaces.id });

  const deletedLogs = await db
    .delete(agentLogs)
    .where(eq(agentLogs.userId, userId))
    .returning({ id: agentLogs.id });

  const deletedSuggestions = await db
    .delete(spaceSuggestions)
    .where(eq(spaceSuggestions.userId, userId))
    .returning({ id: spaceSuggestions.id });

  console.log(`  Deleted ${deletedWikiPages.length} wiki pages (+ cascaded versions/links)`);
  console.log(`  Deleted ${deletedSpaces.length} spaces (+ cascaded entry_spaces/relations)`);
  console.log(`  Deleted ${deletedLogs.length} agent logs`);
  console.log(`  Deleted ${deletedSuggestions.length} space suggestions`);
  console.log("\nDone. Run a fresh compile to rebuild the wiki.");

  await closeDb();
}

main().catch((err) => {
  console.error("reset-wiki-data failed:", err);
  process.exit(1);
});
