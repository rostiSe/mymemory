# T-015r: Compile Observability & Cost Telemetry

**Status:** pending
**Phase:** Agent Loop (server + mobile)
**Type:** feature (server + mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** [T-015c](./T-015c-agents-orchestrator.md) (orchestrator + `agent_logs` + Trigger.dev), [T-015d](./T-015d-contract-router.md) (oRPC router), [T-015g](./T-015g-compile-lint-ui.md) (CompileStatusCard — extended here)

---

## Goal

Make every compile and lint run **quantifiable**: per-agent tokens, dollar cost, latency, tool-call counts, which spaces / pages / entries were touched, and why it ended the way it did. Without this we're tuning prompts blind and can't justify a prompt or model swap. This ticket is the foundation every downstream agent-loop ticket (T-015s cancel/stream, T-015t partial compile, T-015ab eval harness) reads from.

**Design principle:** nothing in the telemetry layer can affect compile correctness. All writes are append-only, failures are swallowed with a warning, and the compiler runs to completion even if telemetry is entirely broken.

---

## Context

### What exists today

- `agent_logs` table (tool-call level, from T-015c) — `userId`, `runId`, `level`, `message`, `toolName`, `toolInput`, `toolOutput`, `createdAt`. Good raw substrate, missing aggregate + cost dimensions.
- Trigger.dev runs per compile / lint — dashboard visible to devs, not users.
- `onStepFinish` callback in each agent captures token `usage` but currently discards the aggregate after logging.
- `spaces.compilationStatus` + `spaces.lastCompiledAt` — the only user-facing signal today ("compiling" / "idle" / "failed"). No cost, no timing, no "what changed".
- `CompileStatusCard` (T-015g) on the mobile home — currently shows status + last-compiled relative time.

### What's missing

- A **run-scoped** header record: one row per compile/lint invocation with aggregate totals, status, mode, trigger source, user id.
- A **step-scoped** record per agent execution (Curator, Writer×N, Linter) with its own tokens/cost/latency + relationship to spaces/pages written.
- A stable **cost model** — per-model input/output $/1M token rates in one place, with the model name stored on each step so old rows remain accurate when rates change.
- A **mutation ledger** — which entities each step created or updated (`space`, `wiki_page`, `wiki_page_version`, `suggestion`), so "what did this compile actually change?" is a cheap query, not a JSONB scan of `agent_logs`.
- A **user-visible summary** after a compile finishes (pages written, tokens, cost, duration, errors) and a **dev-only detail screen** to drill in.

---

## Architecture

```
Orchestrator starts
  → compileRuns.insert({ status: 'running', trigger, mode, model, startedAt })
  → for each agent invocation (Curator, Writer×N, Curator-index, Linter):
       compileRunSteps.insert({ status: 'running', agent, spaceId?, startedAt })
         → onStepFinish: append tokens + tool-call rows (agent_logs as today)
         → on write tools: append compileRunMutations({ runId, stepId, entity, entityId, op })
       compileRunSteps.update({ status, finishedAt, promptTokens, completionTokens, costUsd, toolCallCount, steps })
  → compileRuns.update({ status, finishedAt, totals…, summary })

Mobile
  CompileStatusCard → reads latest compileRuns row → pages written, cost, duration
  CompileRunDetailScreen (dev-gated) → timeline of steps, tool calls, mutations, cost breakdown
```

The telemetry writer is a thin **`RunRecorder`** service passed into the orchestrator — all DB writes go through it so the surface is testable and swappable.

---

## Scope

### 1. Schema — runs, steps, mutations

File: `packages/db/src/schema/compile-runs.ts` (new) + migration.

```ts
export const compileRunStatusEnum = pgEnum('compile_run_status', [
  'running',
  'succeeded',
  'partial',    // finished but at least one step failed
  'failed',
  'cancelled', // reserved for T-015s
]);

export const compileRunTriggerEnum = pgEnum('compile_run_trigger', [
  'manual',     // user tapped Compile
  'auto',      // T-015p threshold/cron
  'retry',
  'smoke-test',
]);

export const compileRunKindEnum = pgEnum('compile_run_kind', [
  'compile',
  'lint',
]);

export const compileRuns = pgTable('compile_runs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  kind: compileRunKindEnum('kind').notNull(),
  mode: text('mode'),                             // 'full' | 'incremental' | null for lint
  trigger: compileRunTriggerEnum('trigger').notNull(),
  triggerDevRunId: text('trigger_dev_run_id'),    // deep-link to Trigger.dev
  status: compileRunStatusEnum('status').notNull().default('running'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  toolCallCount: integer('tool_call_count').notNull().default(0),
  spacesCreated: integer('spaces_created').notNull().default(0),
  spacesUpdated: integer('spaces_updated').notNull().default(0),
  pagesCreated: integer('pages_created').notNull().default(0),
  pagesUpdated: integer('pages_updated').notNull().default(0),
  entriesAssigned: integer('entries_assigned').notNull().default(0),
  issuesFlagged: integer('issues_flagged').notNull().default(0),
  error: text('error'),
  summary: jsonb('summary').$type<CompileRunSummary>(),  // short human-friendly blob
});

export const compileRunSteps = pgTable('compile_run_steps', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => compileRuns.id, { onDelete: 'cascade' }),
  agent: text('agent', { enum: ['curator', 'writer', 'linter', 'curator-index'] }).notNull(),
  spaceId: uuid('space_id').references(() => spaces.id, { onDelete: 'set null' }),
  model: text('model').notNull(),                 // e.g. 'gpt-4o-mini'
  status: compileRunStatusEnum('status').notNull().default('running'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),
  promptTokens: integer('prompt_tokens').notNull().default(0),
  completionTokens: integer('completion_tokens').notNull().default(0),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  steps: integer('steps').notNull().default(0),   // maxSteps counter
  toolCallCount: integer('tool_call_count').notNull().default(0),
  error: text('error'),
});

export const compileRunMutations = pgTable('compile_run_mutations', {
  id: uuid('id').primaryKey().defaultRandom(),
  runId: uuid('run_id').notNull().references(() => compileRuns.id, { onDelete: 'cascade' }),
  stepId: uuid('step_id').references(() => compileRunSteps.id, { onDelete: 'cascade' }),
  entity: text('entity', { enum: ['space', 'wiki_page', 'wiki_page_version', 'suggestion', 'entry_space', 'space_wiki_page'] }).notNull(),
  entityId: uuid('entity_id').notNull(),
  op: text('op', { enum: ['create', 'update', 'delete', 'link', 'unlink'] }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

Indexes:
- `compile_runs (user_id, started_at desc)` — run history list.
- `compile_run_steps (run_id, started_at)` — timeline.
- `compile_run_mutations (run_id, entity)` — "what changed" grouped view.
- `compile_run_mutations (entity, entity_id)` — reverse lookup ("which runs touched this page").

Keep `agent_logs` as-is — it remains the raw tool-call record; new tables are aggregates + relations.

### 2. Cost model

File: `apps/server/src/modules/ai/pricing.ts` (new).

```ts
type ModelRate = { inputPer1M: number; outputPer1M: number };
export const MODEL_RATES: Record<string, ModelRate> = {
  'gpt-4o-mini':   { inputPer1M: 0.15,  outputPer1M: 0.60 },
  'gpt-4o':        { inputPer1M: 2.50,  outputPer1M: 10.00 },
  // …
};

export function computeCostUsd(model: string, promptTokens: number, completionTokens: number): number {
  const r = MODEL_RATES[model];
  if (!r) return 0;           // unknown model → 0, don't crash
  return (promptTokens / 1_000_000) * r.inputPer1M + (completionTokens / 1_000_000) * r.outputPer1M;
}
```

Model name is stored on every step row, so updating `MODEL_RATES` does **not** retroactively change historical `cost_usd` (which is persisted, not computed).

### 3. `RunRecorder` service

File: `apps/server/src/modules/ai/telemetry/run-recorder.ts` (new).

```ts
export class RunRecorder {
  constructor(private db: Database, public readonly runId: string) {}

  static async start(db: Database, args: { userId; kind; mode?; trigger; triggerDevRunId? }): Promise<RunRecorder>;
  async startStep(args: { agent; spaceId?; model }): Promise<string>;          // returns stepId
  async finishStep(stepId, args: { status; promptTokens; completionTokens; steps; toolCallCount; error? }): Promise<void>;
  async recordMutation(args: { stepId; entity; entityId; op }): Promise<void>;
  async finish(args: { status; error?; summary? }): Promise<void>;
}
```

Contract:
- Every public method is `try/catch`-wrapped; failure is logged (`console.warn`) and swallowed. The compiler never crashes because telemetry did.
- `finish` recomputes aggregates from `compile_run_steps` in a single SQL (sum tokens, sum cost, count mutations grouped by entity/op) so the header row is consistent.
- `recordMutation` is called from inside the write tools (`createOrUpdateSpace`, `createOrUpdateWikiPage`, `assignEntriesToSpace`, `assignPageToSpaces`, `flagIssue`) via a per-invocation context parameter.

### 4. Tool wiring

File: `apps/server/src/modules/ai/agents/wiki-tools.ts` (modify).

The existing `buildCuratorTools(db, userId, runId)` becomes `buildCuratorTools(db, userId, recorder, stepId)` — each write tool calls `recorder.recordMutation` on success. Same for Writer tools. Read tools are unaffected. `runId` is still available on `recorder.runId` for any callers that need it.

### 5. Orchestrator wiring

File: `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` (modify).

- `runWikiCompile` starts a `RunRecorder` before the Curator, opens/closes steps around each agent invocation, and calls `recorder.finish` in a `try/finally` so failed runs still write a terminal status.
- Parallel Writer invocations each get their own `stepId`.
- Lint flow gets the same treatment under `kind: 'lint'`.
- Trigger.dev task id is passed into `RunRecorder.start({ triggerDevRunId })` so the UI can deep-link back.

### 6. oRPC contract

File: `packages/shared/src/contracts/compile-runs.contract.ts` (new) + `apps/server/src/modules/ai/routers/compile-runs.router.ts` (new).

Endpoints:
- `compileRuns.listRecent({ limit? })` → latest N runs for the user, newest first.
- `compileRuns.get({ runId })` → run + steps + mutation counts grouped by entity/op.
- `compileRuns.listMutations({ runId, entity? })` — paginated, for the detail drill-in.
- `compileRuns.currentForUser()` → active run (status = 'running') if any; used to keep CompileStatusCard live.

### 7. Mobile — surface the signal

**Extend `CompileStatusCard`** (T-015g) — `apps/mobile/src/features/wiki-compile/components/CompileStatusCard/index.tsx`:
- After success, swap the current copy for a one-line summary derived from the latest run: "Compiled 4 spaces, 7 pages in 38s · $0.021".
- Tap → navigates to `CompileRunDetailScreen`.
- While running: poll `currentForUser` every 3s (or subscribe once T-015s streaming lands) and show a progress snippet ("Writing pages · 4/6 spaces").

**New `CompileRunDetailScreen`** — `apps/mobile/src/features/wiki-compile/screens/CompileRunDetailScreen/index.tsx`:
- Header: status badge, mode, trigger, duration, total cost, token totals.
- Steps timeline: one row per `compileRunStep` with agent icon, space name, duration bar, tokens, cost, tool-call count.
- Expandable "what changed" section per step: created/updated spaces + pages as tappable chips (→ page detail / space detail).
- Error panel if status ∈ `failed | partial` — surfaces `error` text + a "Copy run id" action for support.
- Gated behind a `useDevMode()` hook (MMKV flag toggled from Settings) so it doesn't clutter the main product UI yet. Copy at top: "Dev telemetry".

**New `CompileRunHistoryScreen`** — simple `FlatList` of `listRecent` for drilling into older runs. Same dev gate.

### 8. Dev settings toggle

Add a single switch in the existing Settings screen: **Show compile telemetry**. Writes to `useUIStore().devMode`. Default off.

### 9. Smoke-test ticket alignment

Extend [T-015e](./T-015e-smoke-test.md)'s verification script to assert `compileRuns` + `compileRunSteps` are populated with non-zero tokens + non-null `finishedAt` for each agent after a manual compile. No code change to the smoke-test ticket — just a note in this ticket's DoD.

---

## Files

| File | Action |
|------|--------|
| `packages/db/src/schema/compile-runs.ts` | **Create** |
| `packages/db/migrations/*_compile_runs.sql` | **Create** |
| `apps/server/src/modules/ai/pricing.ts` | **Create** |
| `apps/server/src/modules/ai/telemetry/run-recorder.ts` | **Create** |
| `apps/server/src/modules/ai/telemetry/run-recorder.test.ts` | **Create** — Vitest |
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | **Modify** — thread `recorder + stepId` into write tools |
| `apps/server/src/modules/ai/agents/curator-agent.ts` | **Modify** — open/close step via recorder |
| `apps/server/src/modules/ai/agents/writer-agent.ts` | **Modify** — same |
| `apps/server/src/modules/ai/agents/linter-agent.ts` | **Modify** — same |
| `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` | **Modify** — RunRecorder lifecycle |
| `packages/shared/src/contracts/compile-runs.contract.ts` | **Create** |
| `apps/server/src/modules/ai/routers/compile-runs.router.ts` | **Create** |
| `apps/mobile/src/features/wiki-compile/hooks/useCompileRuns.ts` | **Create** |
| `apps/mobile/src/features/wiki-compile/components/CompileStatusCard/index.tsx` | **Modify** — summary line + deep link |
| `apps/mobile/src/features/wiki-compile/screens/CompileRunDetailScreen/index.tsx` | **Create** |
| `apps/mobile/src/features/wiki-compile/screens/CompileRunDetailScreen/index.styles.ts` | **Create** — `tv` |
| `apps/mobile/src/features/wiki-compile/screens/CompileRunHistoryScreen/index.tsx` | **Create** |
| `apps/mobile/src/features/wiki-compile/components/RunStepRow/index.tsx` | **Create** |
| `apps/mobile/src/features/wiki-compile/components/RunStepRow/index.styles.ts` | **Create** |
| `apps/mobile/src/stores/ui.store.ts` | **Modify** — add `devMode` flag + persist |
| `apps/mobile/src/app/(tabs)/settings.tsx` | **Modify** — dev telemetry toggle |
| `apps/mobile/src/app/(tabs)/wiki/runs.tsx` | **Create** — route to history screen |

---

## Edge cases

- **Telemetry write fails mid-run** → swallow + `console.warn`; compile continues; on `finish` the recorder still writes a terminal row (best effort).
- **Process crash before `finish`** → next orchestrator invocation reconciles: any `compile_runs.status = 'running'` older than 10 minutes is marked `failed` with `error = 'abandoned'`. Implement as a lightweight guard at the top of `runWikiCompile`.
- **Unknown model name** → `computeCostUsd` returns 0; the step row still stores `model` so we can backfill later.
- **Parallel Writers recording mutations concurrently** → each has its own `stepId`; no shared state in `RunRecorder` between steps.
- **User deletes a space mid-compile** → mutation rows reference `space_id` with `onDelete: 'set null'` for safety on the step row; mutation rows keep the raw `entityId` (no FK) so history survives deletion.
- **Cost rounding** → numeric(10,6); never display more than 4 decimals in UI.
- **Dev mode off** → compile still writes telemetry, the screens are just hidden.

---

## What this does NOT include

- Cancellation / streaming progress to the client — **T-015s**.
- Partial compile (per-space) — **T-015t**; will piggyback on the same run/step shape.
- Eval harness + regression suite — **T-015ab**; reads `compile_runs` + `compile_run_mutations` as ground truth.
- Server-side cost limits / budgets / alerts.
- Multi-user / org-wide analytics.
- Exporting telemetry to external observability (Grafana, Datadog).

---

## DoD

- [ ] Migration creates `compile_runs`, `compile_run_steps`, `compile_run_mutations` with indexes; `pnpm -w db:migrate` clean.
- [ ] `RunRecorder` unit test: happy path + swallows write failures + `finish` aggregates match sum of steps.
- [ ] A real compile in dev writes exactly one `compile_runs` row, one `compile_run_steps` row per agent invocation, and one `compile_run_mutations` row per write-tool call.
- [ ] `costUsd` for a full compile matches `sum(steps.costUsd)` to 6 decimal places.
- [ ] Abandoned-run reconciliation flips a manually-inserted stuck `running` row to `failed` on the next compile start.
- [ ] oRPC endpoints paginated and type-safe; `listRecent` returns newest first.
- [ ] `CompileStatusCard` shows the new summary after a compile; tap opens detail screen.
- [ ] Detail screen renders step timeline with tokens + cost + tool-call count; mutations grouped by entity.
- [ ] Dev-mode toggle in Settings gates history + detail screens; default off.
- [ ] No write tool bypasses `recorder.recordMutation` (grep guard + review).
- [ ] Telemetry failure injected in a test does **not** fail the compile.
- [ ] `pnpm -w run typecheck` clean across server + mobile + shared + db.
- [ ] T-015e smoke test updated (or at minimum a new run of it passes with telemetry assertions added here).
- [ ] Epic `T-015-wiki-agent-epic.md` Agent Loop table links this ticket.

---

## Verification

1. Run a full compile in dev. Confirm one `compile_runs` row with `status = 'succeeded'`, populated totals, `finishedAt - startedAt ≈ durationMs`.
2. Inspect `compile_run_steps`: Curator (start) + Writer×N + Curator-index, each with tokens and cost.
3. Inspect `compile_run_mutations`: counts of `space/create` + `wiki_page/create` + `wiki_page_version/create` match what actually exists in the DB.
4. Toggle dev mode on → open `CompileStatusCard` → tap summary → CompileRunDetailScreen renders timeline and mutations correctly.
5. Force an error in the Writer (e.g. invalid JSONB) → `compile_runs.status = 'partial'`, failed step's row shows `error`, other step rows remain `succeeded`.
6. Kill the server mid-compile → start a new one → the stuck row is flipped to `failed` (`error = 'abandoned'`).
7. Change `MODEL_RATES` values → old rows' `costUsd` unchanged (persisted), new runs reflect the new rate.
8. Turn dev mode off → detail + history screens are not reachable; CompileStatusCard still shows the summary line.

---

## Ticket sequence

Follows T-015c/g; unblocks **T-015s** (streaming compile progress reuses `compile_run_steps` as the source of truth), **T-015t** (partial compile inherits the run/step shape), and **T-015ab** (eval harness compares runs).
