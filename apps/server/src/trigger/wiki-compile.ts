import { queue, task } from "@trigger.dev/sdk/v3";
import {
  runWikiCompile,
  runWikiLint,
} from "../modules/ai/agents/wiki-orchestrator.js";

const wikiCompileQueue = queue({
  name: "wiki-compile",
  concurrencyLimit: 1,
});

/**
 * One concurrent compile per `concurrencyKey`. Trigger with
 * `{ concurrencyKey: payload.userId }` so tenants do not block each other.
 * @see https://trigger.dev/docs/queue-concurrency
 */
export const wikiCompileTask = task({
  id: "wiki-compile",
  queue: wikiCompileQueue,
  run: async (payload: { userId: string; mode: "full" | "incremental" }) => {
    const result = await runWikiCompile(
      undefined,
      payload.userId,
      payload.mode,
    );
    return result;
  },
});

export const wikiLintTask = task({
  id: "wiki-lint",
  run: async (payload: { userId: string }) => {
    const result = await runWikiLint(undefined, payload.userId);
    return result;
  },
});
