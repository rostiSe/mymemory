/**
 * Runs the wiki linter on your machine (read-only on wiki data; still logs to agent_logs).
 *
 * Usage:
 *   pnpm smoke:wiki-lint <userId>
 *
 * Requires DATABASE_URL, OPENAI_API_KEY in apps/server/.env.
 */
import "dotenv/config";

import { closeDb } from "@mymemory/db";
import { runWikiLint } from "../src/modules/ai/agents/wiki-orchestrator.js";

function usage(): never {
  console.error(`
Usage:
  pnpm smoke:wiki-lint <userId>

Example:
  pnpm smoke:wiki-lint "00000000-0000-4000-8000-000000000001"
`);
  process.exit(1);
}

async function main(): Promise<void> {
  const userId = process.argv[2];
  if (!userId) usage();

  const { runId, result } = await runWikiLint(undefined, userId);
  console.log(
    JSON.stringify(
      {
        runId,
        issues: result.issues,
        steps: result.steps,
        tokens: result.tokens,
      },
      null,
      2,
    ),
  );
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
