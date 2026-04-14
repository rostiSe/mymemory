/**
 * Runs the full wiki compile orchestrator on your machine (no Trigger.dev).
 *
 * Usage:
 *   pnpm smoke:wiki-compile <userId> [full|incremental]
 *
 * Requires DATABASE_URL, OPENAI_API_KEY (and other vars your agents need) in apps/server/.env.
 */
import "dotenv/config";

import { closeDb } from "@mymemory/db";
import { runWikiCompile } from "../src/modules/ai/agents/wiki-orchestrator.js";

function usage(): never {
  console.error(`
Usage:
  pnpm smoke:wiki-compile <userId> [full|incremental]

Example:
  pnpm smoke:wiki-compile "00000000-0000-4000-8000-000000000001" full
`);
  process.exit(1);
}

async function main(): Promise<void> {
  const userId = process.argv[2];
  if (!userId) usage();

  const modeArg = process.argv[3];
  const mode = modeArg === "incremental" ? "incremental" : "full";

  const result = await runWikiCompile(undefined, userId, mode);
  console.log(JSON.stringify(result, null, 2));
  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
