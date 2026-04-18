# T-015p: Auto-Compile Infrastructure (dark ship)

**Status:** pending
**Phase:** Quality
**Type:** feature (server + mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** [T-015c](./T-015c-agents-orchestrator.md) (orchestrator), [T-015g](./T-015g-compile-lint-ui.md) (manual compile UI), [T-015d](./T-015d-contract-router.md) (wiki contract)

---

## Goal

Stand up the full auto-compile machinery — user settings table, threshold trigger on ingest, nightly cron per user, per-user Trigger.dev concurrency — but ship it **disabled by default**. The intent is to have every moving part in place and individually testable so the team can iterate on compiler quality (prompts, retry, budget, error handling) before flipping auto-compile on for users.

A manual "Run via Trigger.dev" control is added so the existing inline compile path stays authoritative while the queued path can be exercised in dev at any time.

---

## Context

### Why dark-ship

The compiler itself still needs strengthening (prompt quality, token budgets, error recovery). Turning auto-compile on before that work is done would burn tokens and produce weaker wikis than manual compile does today. Building the infra now lets us:

- Test the Trigger.dev queue + worker path isolated from HTTP.
- Fix the known per-user concurrency bug.
- Have a settings row ready when we want to flip the switch.
- Keep the ingest hook in place so when we do flip it on, there's no new code path to review.

### Current state (audited)

- `apps/server/trigger.config.ts` — Trigger.dev project configured, runtime node, retries on.
- `apps/server/src/trigger/wiki-compile.ts` — defines `wikiCompileTask` (id `wiki-compile`) and `wikiLintTask`. Calls `runWikiCompile()` / `runWikiLint()`. Has `wikiCompileQueue` with **global** `concurrencyLimit: 1` — a known issue flagged in the file itself. Tasks are defined but **nobody calls `.trigger()` on them**; the HTTP path runs the orchestrator inline.
- `apps/server/src/router/wiki.router.ts` — `wiki.compile` handler calls `wikiService.compile(...)` synchronously.
- `apps/server/src/modules/wiki/services/wiki.service.ts` — `compile()` calls `runWikiCompile` inline.
- `apps/server/src/services/entry.service.ts` — entries insert with `processedStatus: "pending"`; no post-ingest hook.
- No `wiki_settings` or `user_settings` table. No `schedules.task()` calls anywhere in the repo.
- `apps/mobile/src/features/settings/screens/SettingsScreen/index.tsx` — the Settings surface where a toggle would live.

### Design principles for this ticket

1. **Default state is off.** Every new code path no-ops when `autoCompileEnabled = false`. Users see no behavior change.
2. **The inline HTTP compile path remains authoritative.** We add a parallel enqueue path, not a replacement.
3. **Per-user queueing from day one.** Fix the global-concurrency bug by moving to `concurrencyKey: userId`.
4. **Everything individually testable.** Settings can be flipped via a debug endpoint; the queue can be exercised from mobile; the cron can be invoked on demand in dev.

---

## File structure

```
packages/db/src/schema/
  wiki-settings.ts                                   (NEW)
  enums.ts                                           (MOD — no change expected; document if not)
packages/db/src/migrations/                          (NEW — 0008_wiki_settings.sql)
packages/shared/src/contracts/
  wiki.contract.ts                                   (MOD — settings get/update + compileViaTrigger)
apps/server/src/
  modules/wiki/services/wiki.service.ts              (MOD — getSettings, updateSettings, maybeAutoCompile, compileViaTrigger)
  modules/wiki/services/wiki-settings.service.ts     (NEW — settings CRUD, lazy-create on read)
  router/wiki.router.ts                              (MOD — wire new endpoints)
  trigger/wiki-compile.ts                            (MOD — concurrencyKey fix)
  trigger/wiki-auto-compile-cron.ts                  (NEW — nightly schedules.task)
  services/entry.service.ts                          (MOD — call maybeAutoCompile after successful ingest finalize)
apps/mobile/src/features/
  settings/screens/SettingsScreen/index.tsx          (MOD — add Auto-compile section)
  wiki/hooks/useWikiSettings.ts                      (NEW)
  wiki/hooks/useWikiMutations.ts                     (MOD — add useCompileViaTrigger)
```

---

## Scope

### 1. `wiki_settings` schema

**File:** `packages/db/src/schema/wiki-settings.ts`

```ts
export const wikiSettings = pgTable("wiki_settings", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  autoCompileEnabled: boolean("auto_compile_enabled").notNull().default(false),
  autoCompileThreshold: integer("auto_compile_threshold").notNull().default(10),
  lastAutoCompileAt: timestamp("last_auto_compile_at"),
  entriesSinceLastCompile: integer("entries_since_last_compile").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
```

Migration `0008_wiki_settings.sql` creates the table. **No backfill** — rows are lazy-created on first read (see §3).

### 2. Contract additions

**File:** `packages/shared/src/contracts/wiki.contract.ts`

```ts
export const wikiSettingsSchema = z.object({
  autoCompileEnabled: z.boolean(),
  autoCompileThreshold: z.number().int().min(1).max(500),
  lastAutoCompileAt: z.date().nullable(),
  entriesSinceLastCompile: z.number().int().min(0),
});

export const updateWikiSettingsInputSchema = z.object({
  autoCompileEnabled: z.boolean().optional(),
  autoCompileThreshold: z.number().int().min(1).max(500).optional(),
});

// endpoints
getSettings: authed.output(wikiSettingsSchema),
updateSettings: authed.input(updateWikiSettingsInputSchema).output(wikiSettingsSchema),
compileViaTrigger: authed
  .input(wikiCompileInputSchema)   // reuses { mode } from T-015d
  .output(z.object({ runId: z.string(), queuedAt: z.string() })),
```

### 3. `wikiSettingsService`

**File:** `apps/server/src/modules/wiki/services/wiki-settings.service.ts`

```ts
export const wikiSettingsService = {
  async get(db: Db, userId: string): Promise<WikiSettings> {
    // SELECT; if absent, INSERT with defaults, return row.
  },
  async update(db: Db, userId: string, patch: UpdateWikiSettingsInput): Promise<WikiSettings> {
    // UPSERT patch fields; set updatedAt = now.
  },
  async bumpEntryCounter(db: Db, userId: string): Promise<WikiSettings> {
    // UPDATE SET entries_since_last_compile = entries_since_last_compile + 1, updatedAt = now. Lazy-create if row missing.
  },
  async resetEntryCounter(db: Db, userId: string): Promise<void> {
    // UPDATE SET entries_since_last_compile = 0, last_auto_compile_at = now.
  },
};
```

Lazy-create keeps the migration simple and the table sparse (free-tier users without wiki activity never get a row).

### 4. `wikiService.maybeAutoCompile`

**File:** `apps/server/src/modules/wiki/services/wiki.service.ts`

```ts
async maybeAutoCompile(db: Db, userId: string, reason: "ingest-threshold" | "cron") {
  const settings = await wikiSettingsService.get(db, userId);
  if (!settings.autoCompileEnabled) return { skipped: true, reason: "disabled" };

  if (reason === "ingest-threshold" && settings.entriesSinceLastCompile < settings.autoCompileThreshold) {
    return { skipped: true, reason: "below-threshold" };
  }

  // Enqueue — do NOT run inline.
  const handle = await wikiCompileTask.trigger(
    { userId, mode: "incremental" },
    { concurrencyKey: userId },
  );
  await wikiSettingsService.resetEntryCounter(db, userId);
  return { skipped: false, runId: handle.id };
}
```

Key properties:

- **Early-return when disabled** — this is the dark-ship guard. `autoCompileEnabled: false` (the default) short-circuits before any Trigger.dev call.
- `concurrencyKey: userId` enforces per-user serialization.
- Always enqueues `incremental` mode for auto paths; `full` stays a user-initiated decision.

### 5. `wikiService.compileViaTrigger`

**File:** `apps/server/src/modules/wiki/services/wiki.service.ts`

```ts
async compileViaTrigger(db: Db, userId: string, mode: "full" | "incremental") {
  const handle = await wikiCompileTask.trigger(
    { userId, mode },
    { concurrencyKey: userId },
  );
  return { runId: handle.id, queuedAt: new Date().toISOString() };
}
```

Purpose: let devs and the mobile app exercise the queued path explicitly, bypassing the inline HTTP compile. This is the manual escape hatch the user asked for ("add a manual compile so we always can test it").

### 6. Concurrency fix in existing Trigger.dev task

**File:** `apps/server/src/trigger/wiki-compile.ts`

- Keep `wikiCompileQueue` but accept that `concurrencyLimit` is now a **per-key** limit. The concrete fix: every `wikiCompileTask.trigger(payload, options)` call site passes `{ concurrencyKey: payload.userId }`. The queue's `concurrencyLimit: 1` becomes "one concurrent run **per user**," which is what the existing file comment says it wanted.
- Add an inline comment that describes this contract.

### 7. Nightly cron per user

**File:** `apps/server/src/trigger/wiki-auto-compile-cron.ts`

```ts
import { schedules } from "@trigger.dev/sdk/v3";

export const wikiAutoCompileCron = schedules.task({
  id: "wiki-auto-compile-cron",
  cron: "0 3 * * *",   // 03:00 UTC daily
  run: async () => {
    // Fan out:
    // 1. SELECT userId FROM wiki_settings WHERE auto_compile_enabled = true;
    // 2. For each: wikiService.maybeAutoCompile(db, userId, "cron")
    //    (Ignore threshold for cron; maybeAutoCompile gates only on enabled flag when reason = "cron".)
  },
});
```

While `autoCompileEnabled` defaults to `false`, the SELECT returns zero rows and the cron is a no-op. Exactly the dark-ship property we want. When a user flips the toggle on, the cron starts firing for them the next morning.

Adjust `maybeAutoCompile` to skip the threshold check when `reason === "cron"` — the cron is a floor, not a ceiling.

### 8. Ingest hook — threshold trigger

**File:** `apps/server/src/services/entry.service.ts`

Find the point where an entry transitions to `processedStatus: "done"` (end of the ingest pipeline; the same place `analyzeContent` results are persisted). **After** that transaction commits:

```ts
await wikiSettingsService.bumpEntryCounter(db, userId);
await wikiService.maybeAutoCompile(db, userId, "ingest-threshold");
```

Wrap both calls in `try/catch` and log-and-swallow errors — ingest must never fail because of auto-compile bookkeeping. Short-circuit early when `autoCompileEnabled = false`: `bumpEntryCounter` still runs (cheap, single UPDATE), so counter accuracy is preserved if the user flips auto-compile on later. `maybeAutoCompile` returns `{ skipped: true, reason: "disabled" }`.

### 9. Mobile: settings UI

**File:** `apps/mobile/src/features/settings/screens/SettingsScreen/index.tsx`

Add a new section under the existing Wiki section:

- Section header: `Auto-compile`.
- Toggle row: "Enabled" — HeroUI `Switch` bound to `autoCompileEnabled`. Below it, muted caption: `When on, your wiki recompiles automatically after ${threshold} new entries or nightly, whichever comes first.`
- Threshold row (revealed only when enabled): `TextField` numeric input, clamped 1..500. Label: `Compile after N new entries`. Save button with pending state.
- Debug row (dev only, gated by `__DEV__`): `Button` labeled `Run compile via Trigger.dev` — fires `useCompileViaTrigger()`. Below it, muted line showing the returned `runId` + `queuedAt` so the user can cross-check the Trigger.dev dashboard.

Uses `useWikiSettings()` (new hook) + `useUpdateWikiSettings()` (new hook) + `useCompileViaTrigger()` (new hook in `useWikiMutations.ts`). Invalidate the settings query on each mutation.

All surfaces use `rounded-card` per T-015l.

### 10. Telemetry / observability

- `maybeAutoCompile` and the cron task log a structured line per invocation: `{ reason, userId, skipped, skipReason?, runId? }`. Reuses existing logger.
- No metrics dashboards in this ticket — defer.

---

## File changes summary

| Action | File | Purpose |
|--------|------|---------|
| NEW | `packages/db/src/schema/wiki-settings.ts` | `wiki_settings` table |
| NEW | `packages/db/src/migrations/0008_wiki_settings.sql` | Migration |
| MOD | `packages/shared/src/contracts/wiki.contract.ts` | `getSettings` / `updateSettings` / `compileViaTrigger` schemas + endpoints |
| NEW | `apps/server/src/modules/wiki/services/wiki-settings.service.ts` | Settings CRUD + counter helpers |
| MOD | `apps/server/src/modules/wiki/services/wiki.service.ts` | `maybeAutoCompile`, `compileViaTrigger` |
| MOD | `apps/server/src/router/wiki.router.ts` | Wire 3 new endpoints |
| MOD | `apps/server/src/trigger/wiki-compile.ts` | Add `concurrencyKey: userId` contract + comment |
| NEW | `apps/server/src/trigger/wiki-auto-compile-cron.ts` | Nightly `schedules.task()` |
| MOD | `apps/server/src/services/entry.service.ts` | Post-ingest `bumpEntryCounter` + `maybeAutoCompile` hook |
| NEW | `apps/mobile/src/features/wiki/hooks/useWikiSettings.ts` | Settings query + update hook |
| MOD | `apps/mobile/src/features/wiki/hooks/useWikiMutations.ts` | Add `useCompileViaTrigger` |
| MOD | `apps/mobile/src/features/settings/screens/SettingsScreen/index.tsx` | Auto-compile section + dev debug row |
| MOD | `docs/tickets/wiki-agent/T-015-wiki-agent-epic.md` | Add T-015p to Quality table; update "Manual trigger only" note to reflect infra present |

---

## Edge cases

- **Settings row missing**: `get` lazy-creates with defaults; concurrent first-read is idempotent (use `ON CONFLICT DO NOTHING ... RETURNING`).
- **Disabled user with a cron row already persisted**: cron SELECT excludes them via `WHERE auto_compile_enabled = true`.
- **Ingest spike (100 entries in 10 seconds)**: every ingest bumps the counter and calls `maybeAutoCompile`; per-user `concurrencyKey` means only one run actually queues; subsequent `.trigger()` calls from the same user while one is running wait in queue (at most 1 pending), and `resetEntryCounter` runs on each enqueue so the counter won't pile up.
- **Threshold crossed during an in-flight compile**: `maybeAutoCompile` enqueues a second run; Trigger.dev queues it behind the first per `concurrencyKey`.
- **Cron runs while a user's HTTP inline compile is running**: two independent paths, no shared lock. Acceptable for dark-ship; when auto-compile goes live for real users, we revisit routing all compiles through Trigger.dev.
- **User toggles off while cron is scheduled**: the next cron tick sees `auto_compile_enabled = false` and skips. No cancellation needed for enqueued runs (rare, bounded).
- **Migrations on a fresh dev DB vs. production**: lazy-create pattern means no backfill step is required and the migration is idempotent.
- **User deleted**: `onDelete: cascade` on the FK removes the settings row.
- **Entries that fail ingest (`processedStatus = "failed"`)**: do **not** bump the counter — hook only fires on the success path.

---

## What this does NOT include

- Enabling auto-compile by default.
- UI or API to cancel a queued run.
- Moving the authoritative HTTP compile to the Trigger.dev path (still inline).
- A Wiki admin dashboard or run history beyond existing `agent_logs`.
- Per-space auto-compile (only user-level).
- Compile strengthening — prompt quality, retry/backoff, token budgeting. Those are their own tickets.
- Event debouncing on ingest (every successful entry bumps; no trailing-30s debounce).
- Exposing `runId` from `compileViaTrigger` in any user-facing way beyond the dev debug row.
- Notifications on compile completion.

---

## DoD

- [ ] `wiki_settings` table created via migration 0008; defaults are `auto_compile_enabled = false`, `auto_compile_threshold = 10`.
- [ ] `wikiSettingsService.get` lazy-creates a row on first read with an idempotent UPSERT.
- [ ] `wiki.getSettings` and `wiki.updateSettings` endpoints work and enforce auth.
- [ ] `wiki.compileViaTrigger` enqueues `wikiCompileTask` with `concurrencyKey: userId` and returns `{ runId, queuedAt }`.
- [ ] Every `wikiCompileTask.trigger()` call site passes `concurrencyKey: payload.userId`.
- [ ] `wikiAutoCompileCron` defined with `cron: "0 3 * * *"`; selects only users with `auto_compile_enabled = true`; fans out through `maybeAutoCompile(reason: "cron")`.
- [ ] `entry.service.ts` calls `bumpEntryCounter` + `maybeAutoCompile(reason: "ingest-threshold")` after a successful ingest; errors are caught and logged, never propagated.
- [ ] With `auto_compile_enabled = false` (default), ingest produces **zero** Trigger.dev runs — verified in the Trigger.dev dashboard after a batch of 20 ingests.
- [ ] With `auto_compile_enabled = true` and `threshold = 3`, ingesting 3 entries produces **exactly one** Trigger.dev run; counter resets to 0.
- [ ] With `auto_compile_enabled = true`, ingesting 3 entries rapidly during an in-flight run queues at most one additional run (per-user concurrency).
- [ ] Cron invocation in the Trigger.dev dashboard with no enabled users is a no-op (zero child runs).
- [ ] Cron invocation with one enabled user queues exactly one child run for them.
- [ ] Settings screen shows toggle + threshold; threshold input is clamped 1..500; invalidates query on save.
- [ ] Dev-only "Run compile via Trigger.dev" button in Settings produces a visible `runId` in the Trigger.dev dashboard.
- [ ] `pnpm -w run typecheck` clean; `pnpm -w run db:push` or equivalent applies migration cleanly on a fresh DB.
- [ ] Epic Quality table links T-015p and the epic "Manual trigger only" note is updated to reflect the dark-shipped infra.

---

## Verification

**Part A — Dark-ship guarantee (no user-facing behavior change):**

1. Fresh dev DB, default settings everywhere.
2. Ingest 25 entries via the normal flow.
3. Confirm `wiki_settings` row exists with `auto_compile_enabled = false`, `entries_since_last_compile = 25`.
4. Confirm the Trigger.dev dashboard shows **zero** `wiki-compile` runs since the test started.
5. Open the mobile Settings screen — auto-compile is visible but off; threshold field is revealed disabled.

**Part B — Enabling threshold trigger:**

1. Flip `auto_compile_enabled = true` via the Settings UI; set threshold to 3.
2. Ingest entry #1, #2, #3.
3. Dashboard shows exactly **one** `wiki-compile` run queued after entry #3.
4. Wait for it to finish; index space `compilationStatus` returns to `idle`.
5. `wiki_settings.entries_since_last_compile` = 0; `last_auto_compile_at` updated.

**Part C — Per-user concurrency:**

1. With threshold 1, ingest 3 entries in rapid succession.
2. Dashboard shows up to 2 runs for that user (one running, one queued), never 3 concurrent.
3. Ingest the same burst under a second test user — their runs queue independently of the first user's.

**Part D — Cron:**

1. With at least one enabled user, invoke the cron run on-demand from the Trigger.dev dashboard.
2. Cron fans out; one child compile run per enabled user.
3. Disable the user; re-invoke cron; zero child runs.

**Part E — Manual Trigger.dev path:**

1. Dev debug button in Settings fires `wiki.compileViaTrigger({ mode: "incremental" })`.
2. Response contains `runId`; that run appears in the Trigger.dev dashboard, reads `userId` from payload, and produces the same orchestrator output as the inline path.
3. Compare wiki pages after inline vs queued compile on the same data: identical in structure (same page titles, similar section set).

---

## Ticket sequence (context)

```
T-015c (orchestrator) + T-015g (manual compile UI)
  └→ T-015p (this ticket — dark-ship auto-compile infra)
       └→ (future) flip-on ticket once compiler strengthening lands
```

---

## Follow-up ideas (out of scope)

- **Compiler strengthening** (prompt quality, retry/backoff, token budgets, partial-failure recovery) — the actual blocker for flipping auto-compile on.
- Replace the inline HTTP compile with an enqueue-and-poll pattern so the queued path is authoritative.
- Ingest-trailing-debounce to avoid N enqueues during a large sync.
- Per-space auto-compile settings.
- Notifications / push on compile completion.
- Admin dashboard aggregating `agent_logs` + `wiki_settings` + run history.
- Budget caps per user per day.
