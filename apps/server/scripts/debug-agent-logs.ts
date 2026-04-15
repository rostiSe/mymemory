/**
 * Debug helper: dump agent_logs for a given runId.
 * Usage: pnpm tsx scripts/debug-agent-logs.ts <userId> [runId]
 */
import "dotenv/config";
import { db, eq, and, desc } from "@mymemory/db";
import { closeDb } from "@mymemory/db";
import { agentLogs } from "@mymemory/db/schema/agent-logs";
import { entries } from "@mymemory/db/schema/entries";

async function main() {
  const userId = process.argv[2];
  const runId = process.argv[3];

  if (!userId) {
    console.error("Usage: pnpm tsx scripts/debug-agent-logs.ts <userId> [runId]");
    process.exit(1);
  }

  // Count entries
  const entryRows = await db
    .select({ id: entries.id, title: entries.title, summary: entries.summary })
    .from(entries)
    .where(eq(entries.userId, userId));
  console.log(`=== ENTRIES (${entryRows.length} total) ===`);
  for (const e of entryRows.slice(0, 10)) {
    console.log(`  ${e.id} | ${e.title ?? "(no title)"} | ${(e.summary ?? "").slice(0, 80)}`);
  }
  if (entryRows.length > 10) console.log(`  ... and ${entryRows.length - 10} more`);

  if (!runId) {
    // Show recent runs
    const recentLogs = await db
      .select({ runId: agentLogs.runId, createdAt: agentLogs.createdAt, message: agentLogs.message })
      .from(agentLogs)
      .where(eq(agentLogs.userId, userId))
      .orderBy(desc(agentLogs.createdAt))
      .limit(20);
    console.log("\n=== RECENT RUNS ===");
    const seen = new Set<string>();
    for (const l of recentLogs) {
      if (!seen.has(l.runId)) {
        seen.add(l.runId);
        console.log(`  ${l.runId} | ${l.createdAt?.toISOString()} | ${l.message}`);
      }
    }
    await closeDb();
    return;
  }

  // Dump logs for specific run
  const logs = await db
    .select()
    .from(agentLogs)
    .where(and(eq(agentLogs.runId, runId), eq(agentLogs.userId, userId)))
    .orderBy(agentLogs.createdAt);

  console.log(`\n=== AGENT LOGS for run ${runId} (${logs.length} entries) ===`);
  for (const log of logs) {
    console.log("\n---");
    console.log(`[${log.level}] ${log.message}`);
    if (log.toolName) console.log(`  tool: ${log.toolName}`);
    if (log.toolInput) console.log(`  input: ${JSON.stringify(log.toolInput)}`);
    if (log.toolOutput) {
      const out = JSON.stringify(log.toolOutput);
      console.log(`  output: ${out.length > 500 ? out.slice(0, 500) + "..." : out}`);
    }
  }

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
