import { defineConfig } from "@trigger.dev/sdk/v3";

/**
 * Run from this directory: `pnpm trigger:dev` (or `pnpm dlx trigger.dev@latest dev`).
 * If dashboard runs sit in "Pending version", the dev CLI is not connected — start it here first
 * and use the Dev environment when testing. For a pure local run without Trigger, use
 * `pnpm smoke:wiki-compile <userId>`.
 */
export default defineConfig({
  project: "proj_bsaxfsiwdytpcawqzlfz",
  runtime: "node",
  logLevel: "log",
  // The max compute seconds a task is allowed to run. If the task run exceeds this duration, it will be stopped.
  // You can override this on an individual task.
  // See https://trigger.dev/docs/runs/max-duration
  maxDuration: 3600,
  build: {
    autoDetectExternal: true,
    keepNames: true,
    minify: false,
    extensions: [],
  },
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./src/trigger"],
  /**
   * Global lifecycle hooks on `defineConfig` use `onStart` (first task execution per run).
   * Per-retry `onStartAttempt` is registered via `tasks.onStartAttempt` in task code, not here.
   * @see https://trigger.dev/docs/config/config-file#lifecycle-functions
   */
  onStart: async (run) => {
    void run.ctx.run.id;
    void run.payload;
    void run.task;
  },
  onSuccess: async (run) => {
    void run.ctx.run.id;
    void run.output;
  },
  onFailure: async (run) => {
    void run.ctx.run.id;
    void run.error;
  },
});
