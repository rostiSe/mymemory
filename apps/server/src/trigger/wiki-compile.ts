import { queue, task } from "@trigger.dev/sdk/v3";
import {
  runWikiCompile,
  runWikiLint,
} from "../modules/ai/agents/wiki-orchestrator.js";

const wikiCompileQueue = queue({
  name: "wiki-compile",
  concurrencyLimit: 1,
});

/** Matches `retries.default` in `trigger.config.ts` (explicit per-task policy). */
const WIKI_TASK_RETRY = {
  maxAttempts: 3,
  minTimeoutInMs: 1000,
  maxTimeoutInMs: 10_000,
  factor: 2,
  randomize: true,
} as const;

/**
 * One concurrent compile per `concurrencyKey`. Trigger with
 * `{ concurrencyKey: payload.userId }` so tenants do not block each other.
 * @see https://trigger.dev/docs/queue-concurrency
 */
export const wikiCompileTask = task({
  id: "wiki-compile",
  queue: wikiCompileQueue,
  retry: WIKI_TASK_RETRY,
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
  retry: WIKI_TASK_RETRY,
  run: async (payload: { userId: string }) => {
    const result = await runWikiLint(undefined, payload.userId);
    return result;
  },
});
