# T-016b: Server Pipeline Foundation (handler registry + step runner)

**Status:** pending
**Phase:** Foundation
**Type:** feature (server)
**Epic:** [T-016 Ingest Strengthening](./T-016-ingest-strengthening-epic.md)
**Depends on:** [T-016a](./T-016a-schema-foundation.md)

---

## Goal

Define the **extensibility contract** every content-type pipeline will follow on the server. Once this lands, adding a new content type (YouTube, Reddit, image, voice memo, …) is a strict three-step checklist:

1. Create a folder under `handlers/<resolved-type>/`
2. Implement the `ContentTypeHandler<TMedia>` interface
3. Register it in `registry.ts`

No changes to the pipeline runner, no changes to enrichment, no per-type forks. This ticket ships the registry, the runner, the step modules, and a **no-op placeholder handler** so the scaffold compiles before any real handler lands (T-016e is the first real one).

---

## Context

`apps/server/src/modules/ai/pipelines/ingest.ts` today is a single 300-line function: extract → analyze → embed → classify → save. That shape is correct but unforkable — every new content type would have to branch inside the function.

We extract it into six pure steps and let content types plug in at the one point where branching matters (`extract`). Everything else is shared.

---

## Scope

### 1. Module layout

```
apps/server/src/modules/ingest/
  constants.ts                      # all numbers, limits, timeouts
  types.ts                          # ContentTypeHandler, step I/O types
  registry.ts                       # resolvedType → handler, plus getHandler()
  errors.ts                         # typed error classes per step
  pipeline/
    runner.ts                       # runPipeline(input): orchestrator
    steps/
      detect-resolved-type.ts       # resolvedType detection (URL parser chain)
      run-extraction.ts             # dispatches to handler.extract
      run-enrichment.ts             # shared AI analysis (generateObject)
      run-classification.ts         # space classification (existing logic reused)
      persist-entry.ts              # DB writes (entries + mediaMetadata + sourceId)
      finalize-ingest-run.ts        # closes ingestRuns with tokens/cost/duration
  handlers/
    _placeholder/                   # no-op handler — keeps registry valid until T-016e
      handler.ts
      detect.ts
      extract.ts
      constants.ts
```

### 2. Constants (no magic anywhere)

File: `apps/server/src/modules/ingest/constants.ts`.

```ts
// Pipeline-level timeouts (ms)
export const EXTRACTION_TIMEOUT_MS = 30_000;
export const ENRICHMENT_TIMEOUT_MS = 45_000;
export const CLASSIFICATION_TIMEOUT_MS = 20_000;

// Token + content limits
export const ENRICHMENT_MAX_INPUT_CHARS = 80_000;
export const KEY_POINTS_MIN = 3;
export const KEY_POINTS_MAX = 7;

// Retry policy
export const EXTRACTION_MAX_RETRIES = 2;
export const EXTRACTION_RETRY_DELAY_MS = 1_500;

// Model selection (single source of truth)
export const ENRICHMENT_MODEL = 'gpt-4o-mini' as const;
export const CLASSIFICATION_MODEL = 'gpt-4o-mini' as const;

// Acceptance scoring (consumed by T-016m gate)
export const ACCEPTANCE_SCORE_AUTO_KEEP = 0.7;
```

**Rule:** no numeric literal in `pipeline/**` or `handlers/**` unless it comes from this file or a handler-local `constants.ts`.

### 3. Core types

File: `apps/server/src/modules/ingest/types.ts`.

```ts
import type { ResolvedType, MediaMetadata } from '@repo/shared/types/media-metadata';

export type IngestInput =
  | { kind: 'url'; url: string; title?: string }
  | { kind: 'file'; storageKey: string; mimeType: string; originalName?: string; durationSec?: number }
  | { kind: 'text'; content: string; sourceUrl?: string };
// Note: audio is not a separate `kind`. Audio blobs arrive as `file` with
// `mimeType: 'audio/*'` — whether recorded in-app, picked from Files, or
// fetched from a URL that resolved to an audio file. `durationSec` is
// optional metadata the caller may supply when available.

export interface DetectResult {
  resolvedType: ResolvedType;
  confidence: number;    // 0..1 — runner picks highest-confidence handler
}

export interface ExtractContext {
  input: IngestInput;
  userId: string;
  runId: string;         // ingestRuns.id
  db: Database;
}

export interface ExtractResult<TMedia extends MediaMetadata> {
  readableContent: string;          // plain markdown, fed to enrichment
  title?: string;
  coverImageUrl?: string;
  mediaMetadata: TMedia;
  sourceHint?: {                    // passed to sources service (T-016f)
    name: string;
    domain?: string;
    iconUrl?: string;
  };
  wordCount?: number;
  language?: string;
}

export interface EnrichContext<TMedia extends MediaMetadata> {
  readableContent: string;
  title?: string;
  mediaMetadata: TMedia;
}

export interface ContentTypeHandler<TMedia extends MediaMetadata> {
  resolvedType: ResolvedType;
  detect(input: IngestInput): DetectResult | null;
  extract(ctx: ExtractContext): Promise<ExtractResult<TMedia>>;
  /** Optional — override the default enrichment prompt with type-specific hints. */
  buildEnrichmentPrompt?(ctx: EnrichContext<TMedia>): string;
}

// Step I/O — every step is a pure async function
export type StepFn<TIn, TOut> = (ctx: StepContext, input: TIn) => Promise<TOut>;

export interface StepContext {
  db: Database;
  userId: string;
  runId: string;          // ingestRuns.id
  entryId: string;
  logger: StepLogger;     // structured logger bound to runId
}
```

**Note:** `ContentTypeHandler` is generic over `TMedia` — a narrow slice of the `MediaMetadata` discriminated union. The YouTube handler is `ContentTypeHandler<VideoMediaMetadata>`; the image handler is `ContentTypeHandler<ImageMediaMetadata>`. The registry stores them as `ContentTypeHandler<MediaMetadata>` (upcast); consumers narrow by `resolvedType` before accessing handler-specific behaviour.

### 4. Registry

File: `apps/server/src/modules/ingest/registry.ts`.

```ts
import type { ContentTypeHandler } from './types';
import type { MediaMetadata, ResolvedType } from '@repo/shared/types/media-metadata';
import { placeholderHandler } from './handlers/_placeholder/handler';

const handlers: Record<ResolvedType, ContentTypeHandler<MediaMetadata>> = {
  article: placeholderHandler,
  video: placeholderHandler,
  social: placeholderHandler,
  product: placeholderHandler,
  image: placeholderHandler,
  audio: placeholderHandler,
  quote: placeholderHandler,
  snippet: placeholderHandler,
  note: placeholderHandler,
};

export function registerHandler(handler: ContentTypeHandler<MediaMetadata>): void {
  handlers[handler.resolvedType] = handler;
}

export function getHandler(resolvedType: ResolvedType): ContentTypeHandler<MediaMetadata> {
  return handlers[resolvedType];
}

export function listHandlers(): ContentTypeHandler<MediaMetadata>[] {
  return Object.values(handlers);
}
```

T-016e will add `registerHandler(youtubeHandler)` at module-init time in a new `handlers/video-youtube/handler.ts`.

### 5. Step modules

Each step exports a single `StepFn`. Errors are typed and bubble up; the runner catches at the top level and marks `ingestRuns.status = 'failed'`.

**`steps/detect-resolved-type.ts`**
- Iterates registered handlers, calls `handler.detect(input)`, picks highest-confidence non-null result.
- Falls back to `article` for URL inputs with no match, `note` for text inputs, throws `UnsupportedInputError` otherwise.

**`steps/run-extraction.ts`**
- Looks up handler via `getHandler(resolvedType)`.
- Calls `handler.extract(ctx)` with timeout (`EXTRACTION_TIMEOUT_MS`) and retry (`EXTRACTION_MAX_RETRIES`).
- Validates the returned `ExtractResult` against a per-type Zod schema (from `@repo/shared`).

**`steps/run-enrichment.ts`**
- Shared across all types. Uses `generateObject` (Vercel AI SDK) with the existing analysis schema.
- Handler may override prompt via `buildEnrichmentPrompt(ctx)`; default prompt is in `prompts/default-enrichment.ts` (new).
- Produces `{ summary, keyPoints, topics, tags, language, contentType, depth, authors, acceptanceScore }`.
- **New field:** `acceptanceScore` added to the enrichment schema here — populated by the prompt, consumed by T-016m.

**`steps/run-classification.ts`**
- Wraps existing `classifyEntryToSpaces` — no change except it's now a step, not a branch.

**`steps/persist-entry.ts`**
- Writes `entries` row (or updates for re-ingest), upserts `sources` row via service (T-016f; stub for now that just writes `name` + `domain`), writes junction tables (tags, topics, relations).
- Returns `{ entryId, sourceId }`.

**`steps/finalize-ingest-run.ts`**
- Sums tokens + cost (via T-015r's `pricing.ts` — extracted to `apps/server/src/modules/ai/pricing.ts` now; shared by compile + ingest).
- Updates `ingestRuns` row with `status`, `finishedAt`, `durationMs`, `promptTokens`, `completionTokens`, `costUsd`, `stepsExecuted`.
- Always runs in `finally` — telemetry never blocks ingest and ingest never skips telemetry.

### 6. Runner

File: `apps/server/src/modules/ingest/pipeline/runner.ts`.

```ts
export async function runIngestPipeline(args: {
  db: Database;
  userId: string;
  input: IngestInput;
  entryId: string;   // pre-created by caller; runner updates it
}): Promise<RunIngestResult>
```

Flow:
```
1. Insert ingestRuns row → runId, status='running'
2. detect-resolved-type           → resolvedType
3. Update ingestRuns.resolvedType
4. run-extraction                 → ExtractResult<TMedia>
5. run-enrichment (in parallel with classification if possible)
6. run-classification             → space assignments
7. persist-entry                  → entryId, sourceId
8. finalize-ingest-run (finally)  → closes the run row
```

Errors from any step:
- Caught at top level.
- `entries.error` set to message; `entries.processedStatus = 'failed'`.
- `ingestRuns.status = 'failed'`, `ingestRuns.error` set.
- Handler-level timeout errors get a distinct error class (`ExtractionTimeoutError`) so the UI can show "This is taking longer than expected" vs "Failed to extract".

### 7. Placeholder handler

File: `apps/server/src/modules/ingest/handlers/_placeholder/handler.ts`.

Returns `null` from `detect` (never matches). `extract` throws `NotImplementedError`. Exists only so the registry has a valid entry for every `resolvedType` before real handlers ship. Deleted in T-016e.

### 8. Wiring into existing ingest

- `apps/server/src/modules/ai/ingest.router.ts` (existing oRPC route) calls `runIngestPipeline` instead of the old pipeline function.
- Old `apps/server/src/modules/ai/pipelines/ingest.ts` is **kept intact** but unused; T-016g refactors its URL-article logic into `handlers/article-web/` and deletes the old file.
- Feature flag: `INGEST_V2_ENABLED` env var gates the new runner. Default off in this ticket; flipped on in T-016e once YouTube handler exists. Old code path remains the fallback.

### 9. Pricing extraction

Move `apps/server/src/modules/ai/pricing.ts` (planned in T-015r) out of the wiki module if it landed there, or create fresh: `apps/server/src/modules/ai/pricing.ts`. Shared by compile + ingest telemetry. Export `MODEL_RATES` + `computeCostUsd(model, promptTokens, completionTokens)`.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ingest/constants.ts` | **Create** |
| `apps/server/src/modules/ingest/types.ts` | **Create** |
| `apps/server/src/modules/ingest/errors.ts` | **Create** |
| `apps/server/src/modules/ingest/registry.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/runner.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/steps/detect-resolved-type.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/steps/run-extraction.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/steps/run-enrichment.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/steps/run-classification.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/steps/persist-entry.ts` | **Create** |
| `apps/server/src/modules/ingest/pipeline/steps/finalize-ingest-run.ts` | **Create** |
| `apps/server/src/modules/ingest/prompts/default-enrichment.ts` | **Create** |
| `apps/server/src/modules/ingest/handlers/_placeholder/handler.ts` | **Create** |
| `apps/server/src/modules/ingest/handlers/_placeholder/detect.ts` | **Create** |
| `apps/server/src/modules/ingest/handlers/_placeholder/extract.ts` | **Create** |
| `apps/server/src/modules/ingest/handlers/_placeholder/constants.ts` | **Create** |
| `apps/server/src/modules/ai/pricing.ts` | **Create** — shared cost model |
| `apps/server/src/modules/ai/ingest.router.ts` | **Modify** — dispatch via `INGEST_V2_ENABLED` |
| Tests: `pipeline/steps/*.test.ts` | **Create** — one per step |
| Tests: `pipeline/runner.test.ts` | **Create** — happy path + per-step failure cases |

---

## Edge cases

- **Handler returns a `mediaMetadata` that doesn't match the declared `resolvedType`** → Zod validation in `run-extraction` rejects with `ExtractionSchemaError`; run marked failed.
- **Handler timeout with partial output** → discarded; retry up to `EXTRACTION_MAX_RETRIES`; final failure marks `entries.processedStatus = 'failed'`.
- **Enrichment succeeds but classification fails** → entry still persisted, no space assignments, classification step logs warning, run status = `'succeeded'` with a `warnings` array.
- **`ingestRuns` row insert fails** (DB down pre-pipeline) → caller gets a 503; no half-written entry.
- **Two handlers both claim to detect an input** → highest confidence wins; ties broken by registration order (document explicitly).
- **Re-ingest of an existing entry** (future feature) → runner accepts existing `entryId`, updates in place, writes new `ingestRuns` row with reference to previous.

---

## Definition of done

- [ ] Module layout matches spec exactly; no barrel files.
- [ ] All numeric/string constants in `constants.ts` (grep for inline literals as review gate).
- [ ] `ContentTypeHandler<TMedia>` typed with generic; no `any` anywhere in the module.
- [ ] Registry compiles with placeholder handler for every `ResolvedType`.
- [ ] Runner orchestrates all six steps in order; `finalize-ingest-run` always runs (try/finally).
- [ ] Each step module is a pure `StepFn<TIn, TOut>` with its own unit test.
- [ ] Runner test covers: happy path, extraction timeout, enrichment failure, classification warning (non-fatal).
- [ ] Pricing module exports `MODEL_RATES` + `computeCostUsd`; `finalize-ingest-run` uses it.
- [ ] `INGEST_V2_ENABLED=false` preserves existing behaviour (legacy pipeline still runs).
- [ ] `INGEST_V2_ENABLED=true` + placeholder handlers → every ingest fails with `NotImplementedError` (expected; T-016e lands the first real handler).
- [ ] `pnpm -w run typecheck` clean.
- [ ] `pnpm -w run test --filter server` green.
- [ ] Epic `T-016` links this ticket.

---

## Verification

1. With `INGEST_V2_ENABLED=false`: save a URL in the app → existing pipeline runs, entry appears enriched. Baseline unchanged.
2. With `INGEST_V2_ENABLED=true`: save a URL → new runner fires, `ingestRuns` row written with `status='failed'`, `error='not implemented'`. Expected until T-016e.
3. Unit test: mock handler that returns a malformed `ExtractResult` → runner marks run failed with `ExtractionSchemaError`.
4. Unit test: handler that hangs past `EXTRACTION_TIMEOUT_MS` → runner retries and eventually fails with `ExtractionTimeoutError`.
5. Grep: `rg '\b[0-9]{2,}\b' apps/server/src/modules/ingest/pipeline apps/server/src/modules/ingest/handlers/_placeholder --glob '!*.test.ts'` returns no hits (every large number comes from a `constants.ts` import).

---

## Ticket sequence

Unblocks T-016c (mobile mirrors this pattern), T-016d (composer knows the handler registry for type detection), T-016e (first real handler), and every subsequent type ticket.
