# T-016a: Schema Foundation (resolvedType, sources, userNote, acceptanceScore)

**Status:** pending
**Phase:** Foundation
**Type:** schema
**Epic:** [T-016 Ingest Strengthening](./T-016-ingest-strengthening-epic.md)
**Depends on:** none (pure schema migration)

---

## Goal

Introduce the schema primitives that the rest of the T-016 epic builds on:

1. **`entryType`** — cleaned up to represent genuine capture surfaces only (`url | file | text`). Audio / image / video are all **files** with different mime types — not separate capture surfaces.
2. **`resolvedType`** — a new column on `entries` capturing *what extraction produced*, **orthogonal** to how it was captured. A URL pointing at `photo.jpg` and an upload from Files both resolve to `image` and render with the same renderer.
3. **`sources`** table + `entries.sourceId` FK — publishers as first-class entities, scoped per user.
4. **`userNote`** column on `entries` — markdown the user writes about their own entry, read by the wiki agent.
5. **`acceptanceScore`** column on `entries` — agent-computed 0–1 wiki-worthiness signal, drives the T-016m acceptance gate.
6. **`mediaMetadata`** JSONB column — type-specific extraction data (transcript for video, palette for image, waveform for audio) without forking the table.
7. **`ingestRuns`** table — per-entry ingest telemetry (mirrors T-015r's `compile_runs` shape for consistency).

This is a **pure migration** — no pipeline changes, no UI changes. Every downstream ticket (T-016b–m) will start populating these columns.

---

## Context

Current `entries` schema (see `packages/db/src/schema/entries.ts`):
- `type` enum: `'url' | 'note'` — too narrow; expands to `'url' | 'file' | 'text'` (3, not 4 — see *Capture vs resolution orthogonality* below).
- `reviewStatus` enum: `'unreviewed' | 'kept' | 'dismissed' | 'remind'` — stays; becomes the wiki-gate signal in T-016m.
- `metadata` JSONB — generic Jina/Firecrawl extraction; stays for URL-flavoured metadata.
- `sourceApp` varchar — string only, no relations, no reuse across entries. About to be superseded by `sourceId` FK to the new `sources` table.

Missing:
- No distinction between *how captured* vs *what extracted* — `resolvedType` closes this gap.
- No home for video transcript / image palette / audio waveform — `mediaMetadata` JSONB closes this.
- No structured publisher entity — `sources` table closes this.
- No user-authored annotation layer — `userNote` closes this.
- No wiki-readiness signal — `acceptanceScore` closes this.

---

## Capture vs resolution orthogonality

**Two orthogonal axes:**

- **`entryType`** — how the user *captured* it. Three primitives:
  - `url` — a URL was provided (pasted, typed, shared from another app)
  - `file` — a binary blob arrived (from camera, Files app, in-app recorder; distinguished internally by mime type)
  - `text` — raw text arrived without a URL (pasted, shared text, written in-app)

- **`resolvedType`** — what the system *extracted from the content*, regardless of capture surface.

**The axes cross freely:**

| Capture (`entryType`) | Source                                                    | Resolves to (`resolvedType`) |
|-----------------------|-----------------------------------------------------------|------------------------------|
| `url`                 | `https://blog.example.com/post`                           | `article`                    |
| `url`                 | `https://youtube.com/watch?v=...`                         | `video`                      |
| `url`                 | `https://reddit.com/r/.../comments/...`                   | `social`                     |
| `url`                 | `https://example.com/photo.jpg`                           | `image`                      |
| `url`                 | `https://example.com/podcast.mp3`                         | `audio`                      |
| `url`                 | `https://shop.example.com/product`                        | `product`                    |
| `file` (image/*)      | Camera, Files app, Photos library                         | `image`                      |
| `file` (audio/*)      | In-app voice memo recorder, Files app                     | `audio`                      |
| `file` (video/*)      | (deferred)                                                | `video`                      |
| `text`                | Pasted excerpt with a source URL                          | `quote`                      |
| `text`                | Pasted code                                               | `snippet`                    |
| `text`                | Free-form in-app writing                                  | `note`                       |

**Consequences:**

- The **renderer** dispatches on `resolvedType` only. A URL-sourced image and a file-sourced image render identically.
- The **handler** in the server registry dispatches on `resolvedType` too; file mime type + URL parsing both feed the `detect` step that produces `resolvedType`.
- An audio voice memo and an audio URL go through the **same** `audio` handler; the capture surface is irrelevant once the file is extracted.
- `mediaMetadata` may include `captureOrigin` (`'in-app-recording' | 'file-upload' | 'url'`) when the UI wants to label things differently — but that's a UI cue, not a schema fork.

---

## Scope

### 1. Expand `entryTypeEnum` (capture surface — 3 primitives)

File: `packages/db/src/schema/enums.ts` (modify).

```ts
// Before: ['url', 'note']
// After:  ['url', 'file', 'text']
export const entryTypeEnum = pgEnum('entry_type', ['url', 'file', 'text']);
```

**Migration:** existing `'note'` rows → `'text'` (semantic rename; the user captured text). Drop `'note'` from enum after backfill.

**Not here:** no `'audio'` capture-surface value. Voice memos are `entryType='file'` with audio mime type — same as any other audio blob. Keeps the capture axis honest.

### 2. New `resolvedTypeEnum` (what extraction produced — 9 types)

File: `packages/db/src/schema/enums.ts` (add).

```ts
export const resolvedTypeEnum = pgEnum('resolved_type', [
  'article',     // long-form text content (web page, blog post) — T-016g
  'video',       // video with playback + transcript (YouTube first) — T-016e
  'social',      // social media post (Reddit, LinkedIn) — T-016h
  'product',     // e-commerce / product landing page — placeholder, extraction identical to article
  'image',       // image (photo, screenshot, graphic) — from camera, file, or URL — T-016i
  'audio',       // audio clip (voice memo, podcast clip, recording) — from recorder, file, or URL — T-016j
  'quote',       // excerpt of text with source attribution — T-016k (share intent detection)
  'snippet',     // short code / data reference — T-016k
  'note',        // free-form user writing — T-016k / T-016l
]);
```

**Removed from earlier draft:** `'voice-memo'` — unified into `'audio'`. A voice memo and a podcast clip are both audio; authorship/origin lives in `mediaMetadata` (see `AudioMediaMetadata.captureOrigin`), not in the enum. Prevents combinatorial explosion when we add more audio kinds.

**`product`** is kept as a placeholder with extraction identical to `article` — allows later filtering ("show my products") without a schema change.

### 3. `sources` table

File: `packages/db/src/schema/sources.ts` (new).

```ts
import { pgTable, text, uuid, timestamp, varchar, pgEnum, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const sourceOriginEnum = pgEnum('source_origin', ['user', 'agent']);

export const sources = pgTable('sources', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),                     // per-user scope
  name: varchar('name', { length: 255 }).notNull(),      // display name: "Medium", "r/MachineLearning", "My team's wiki"
  domain: varchar('domain', { length: 255 }),            // "medium.com" — null for non-URL sources
  iconUrl: text('icon_url'),                             // favicon, auto-fetched
  origin: sourceOriginEnum('origin').notNull().default('agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userDomainIdx: uniqueIndex('sources_user_domain_idx').on(table.userId, table.domain),
  userNameIdx: index('sources_user_name_idx').on(table.userId, table.name),
}));

export type Source = typeof sources.$inferSelect;
export type NewSource = typeof sources.$inferInsert;
```

**Uniqueness:** `(userId, domain)` — one "Medium" per user. User-created sources with `domain = null` are deduped by name (enforce in service, not DB — allows `null` in unique index).

### 4. Entries table — new columns

File: `packages/db/src/schema/entries.ts` (modify).

```ts
// Add to entries table:
resolvedType: resolvedTypeEnum('resolved_type'),                        // nullable until pipeline classifies
sourceId: uuid('source_id').references(() => sources.id, { onDelete: 'set null' }),
userNote: text('user_note'),                                            // obsidian-style markdown, user-authored
acceptanceScore: numeric('acceptance_score', { precision: 3, scale: 2 }), // 0.00 – 1.00
mediaMetadata: jsonb('media_metadata').$type<MediaMetadata>(),          // type-specific blob, discriminated by resolvedType
coverImageStorageKey: text('cover_image_storage_key'),                  // optional; bucket-relative path for uploads — signed URLs minted at API read time (see epic “Storage and entry assets”)
```

**`cover_image_storage_key`:** optional; Supabase Storage object path for user-uploaded or pipeline-uploaded cover blobs. Do not store public bucket URLs here. The API contract field `coverImageUrl` remains the client-facing URL (signed when this key is set). Legacy `cover_image_url` may still hold remote `https://` URLs from scraping until ingest is migrated.

**`MediaMetadata` discriminated union** (typed in `packages/shared/src/types/media-metadata.ts`):

```ts
export type MediaMetadata =
  | VideoMediaMetadata       // { kind: 'video', videoId, transcript, chapters[], duration, thumbnailUrl, channelName, anchoredAtSec? }
  | ImageMediaMetadata       // { kind: 'image', palette[], dominantColor, objects[], ocrText, aestheticLabels[], width, height, exif?, captureOrigin }
  | AudioMediaMetadata       // { kind: 'audio', transcript, durationSec, waveformPeaks[], language, captureOrigin }
  | SocialMediaMetadata      // { kind: 'social', platform: 'reddit' | 'linkedin', author, postedAt, engagement?, permalink }
  | QuoteMediaMetadata       // { kind: 'quote', sourceUrl?, sourceAuthor?, sourceTitle? }
  | null;                    // article, product, snippet, note → no type-specific metadata
```

**Discriminant:** each variant has `kind` matching a `resolvedType` value. `resolvedType` on the row + `mediaMetadata.kind` are always consistent (validated by Zod in T-016b's persist step).

**`captureOrigin`** on image + audio metadata (`'in-app-recording' | 'file-upload' | 'url'`) lets UI show "Your voice memo" vs "Podcast clip" without schema forks. Computed by the handler from the `IngestInput.kind`.

**Deprecate `sourceApp`** — mark in a `@deprecated` JSDoc but don't drop yet. T-016f will migrate any existing values into `sources`.

### 5. `ingestRuns` table (per-entry telemetry)

File: `packages/db/src/schema/ingest-runs.ts` (new).

```ts
export const ingestRunStatusEnum = pgEnum('ingest_run_status', [
  'running', 'succeeded', 'failed',
]);

export const ingestRuns = pgTable('ingest_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  entryId: uuid('entry_id').notNull().references(() => entries.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull(),
  resolvedType: resolvedTypeEnum('resolved_type'),    // null while unclassified
  status: ingestRunStatusEnum('status').notNull().default('running'),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  finishedAt: timestamp('finished_at'),
  durationMs: integer('duration_ms'),
  promptTokens: integer('prompt_tokens').default(0).notNull(),
  completionTokens: integer('completion_tokens').default(0).notNull(),
  costUsd: numeric('cost_usd', { precision: 10, scale: 6 }).default('0').notNull(),
  model: text('model'),                               // 'gpt-4o-mini', 'whisper-1', 'gpt-4o'
  stepsExecuted: jsonb('steps_executed').$type<string[]>().default([]),  // e.g. ['detect', 'extract', 'enrich', 'classify', 'persist', 'finalize']
  triggerDevRunId: text('trigger_dev_run_id'),
  error: text('error'),
}, (table) => ({
  entryIdx: index('ingest_runs_entry_idx').on(table.entryId),
  userTimeIdx: index('ingest_runs_user_time_idx').on(table.userId, table.startedAt),
}));
```

Mirrors T-015r's `compile_runs` shape intentionally — shared mental model, shared observability tooling when it ships.

**Telemetry hygiene:** `ingestRuns` rows (and `agent_logs` tool payloads where relevant) should store **identifiers, paths, and numeric telemetry** — not durable public Supabase Storage URLs. Prefer bucket-relative paths or entry ids when referencing assets.

### 6. Update review status semantics (documentation only)

No schema change to `reviewStatusEnum`. Document in JSDoc that `'kept'` is the wiki-admission signal (consumed by T-016m + T-015c gate).

### 7. Migration strategy

File: `packages/db/migrations/XXXX_ingest_strengthening_foundation.sql` (generated via `drizzle-kit generate`).

Order:
1. Create `source_origin` + `resolved_type` + `ingest_run_status` enums.
2. Create `sources` table + indexes.
3. Create `ingest_runs` table + indexes.
4. Alter `entries`: add `resolved_type`, `source_id`, `user_note`, `acceptance_score`, `media_metadata`.
5. Rename `entry_type` enum values (Postgres rename-enum dance — build new enum, swap column, drop old):
   - New values: `'url'`, `'file'`, `'text'`.
   - Migration of existing rows: `type='note'` → `type='text'`.
6. Backfill `resolved_type`:
   - `entries.type = 'url'` → `resolved_type = 'article'` (conservative default — URL-to-image/audio existing entries are not expected in prod; manual fix possible via a follow-up script).
   - `entries.type = 'note'` (now `'text'`) → `resolved_type = 'note'`.
7. Backfill `acceptance_score`: leave null for existing rows — T-016m will compute on-demand or via a backfill script.

**Zero-downtime note:** All new columns added as nullable / default-providing. No existing query breaks.

### 8. Zod / type exports

File: `packages/db/src/schema/entries.ts` + `packages/shared/src/types/media-metadata.ts`.

- Regenerate `insertEntrySchema` / `selectEntrySchema` via `drizzle-zod`.
- Export `MediaMetadata` discriminated union + per-shape types from `@repo/shared`.
- Export per-variant Zod schemas (`videoMediaMetadataSchema`, `imageMediaMetadataSchema`, …) so handlers validate their output before persistence (T-016b uses these in `run-extraction`).
- Export `Source` / `NewSource` from `@repo/db`.

---

## Files

| File | Action |
|------|--------|
| `packages/db/src/schema/enums.ts` | **Modify** — simplify `entryTypeEnum` to 3 values; add `resolvedTypeEnum` (9), `sourceOriginEnum`, `ingestRunStatusEnum` |
| `packages/db/src/schema/sources.ts` | **Create** — `sources` table + indexes |
| `packages/db/src/schema/ingest-runs.ts` | **Create** — `ingestRuns` table |
| `packages/db/src/schema/entries.ts` | **Modify** — add `resolvedType`, `sourceId`, `userNote`, `acceptanceScore`, `mediaMetadata`; deprecate `sourceApp` |
| `packages/db/src/schema/index.ts` | **Modify** — export new tables (concrete imports, not barrel — each consumer imports from the file path) |
| `packages/db/migrations/*_ingest_strengthening_foundation.sql` | **Create** — generated migration |
| `packages/shared/src/types/media-metadata.ts` | **Create** — discriminated union types + per-variant Zod schemas |
| `packages/shared/src/contracts/entry.contract.ts` | **Modify** — expose new fields on `entrySchema` |
| `apps/server/scripts/backfill-resolved-type.ts` | **Create** — one-shot backfill for existing rows |

---

## Edge cases

- **Existing `entries.type = 'note'` rows** → renamed to `'text'`, `resolvedType` set to `'note'`. No data loss.
- **Existing `entries.sourceApp` values** → untouched by this ticket; T-016f migrates them into `sources` rows.
- **User deletes a source** → `sourceId` on entries goes to `null` (FK `onDelete: 'set null'`). Entries remain; source attribution is simply lost. Correct behaviour — we don't cascade-delete entries.
- **Duplicate source domain race** → `uniqueIndex(userId, domain)` catches it at the DB level; service layer (T-016f) handles the conflict by reading the existing row.
- **`mediaMetadata` JSONB grows unbounded** → transcripts for 2-hour videos could hit 50KB+. Acceptable; Postgres JSONB handles it. Watch index size if we ever index inside.
- **`acceptanceScore = null`** on legacy rows → T-016m treats null as `unreviewed`; no regressions in the wiki gate.
- **`mediaMetadata.kind` out of sync with row's `resolvedType`** → Zod validation in T-016b's `run-extraction` rejects before persistence; operational invariant, not a runtime concern.
- **URL pointing at a file type (`https://.../photo.jpg`)** → `entryType='url'`, handler's `detect` classifies via content-type sniff or URL extension, sets `resolvedType='image'`. No schema difference from a file upload.

---

## What this does NOT include

- Populating any of the new columns — that's per-pipeline work (T-016e, T-016g–k).
- The `IngestInput` discriminated union used by the runner — defined in T-016b (server pipeline foundation).
- Sources service logic (dedup, auto-fetch favicon) — T-016f.
- UI surfacing of any new field — per-renderer ticket.
- Composer changes — T-016d.
- Wiki compiler changes to respect `kept` — T-016m.
- Vector / embedding schema changes — untouched.

---

## DoD

- [ ] `entryTypeEnum` simplified to `['url', 'file', 'text']`; `'note'` values migrated to `'text'`.
- [ ] `resolvedTypeEnum` created with all 9 variants (`article`, `video`, `social`, `product`, `image`, `audio`, `quote`, `snippet`, `note`) — no `voice-memo`.
- [ ] `sources` table exists with `(userId, domain)` unique index; `origin` column defaults to `'agent'`.
- [ ] `entries` has `resolvedType`, `sourceId` (FK), `userNote`, `acceptanceScore` (numeric 3,2), `mediaMetadata` (jsonb).
- [ ] `ingestRuns` table exists with indexes on `entryId` and `(userId, startedAt)`.
- [ ] `MediaMetadata` discriminated union exported from `@repo/shared` with `kind` discriminant on every variant; narrowing by `resolvedType` + `kind` type-checks in a sample consumer.
- [ ] Per-variant Zod schemas exported (validated in T-016b runner).
- [ ] `insertEntrySchema` / `selectEntrySchema` regenerated; `@repo/shared` entry contract surfaces new fields.
- [ ] Backfill script: `resolved_type` populated for 100% of existing rows.
- [ ] `pnpm -w db:migrate` clean forward; rollback tested in dev.
- [ ] `pnpm -w run typecheck` clean across db + shared + server + mobile.
- [ ] No runtime regressions: existing feed loads, existing ingest still works (returns `resolvedType = 'article'` for URL entries).
- [ ] Epic `T-016` table links this ticket.

---

## Verification

1. `pnpm -w db:migrate` runs without error against a dev DB with existing data.
2. `SELECT type, resolved_type FROM entries LIMIT 20` — no nulls in `resolved_type` after backfill.
3. Insert a test row via `db.insert(sources).values({ userId, name: 'Medium', domain: 'medium.com' })` twice → second call violates unique index as expected.
4. Insert a test entry with `resolvedType: 'image'`, `mediaMetadata: { kind: 'image', palette: ['#000'], dominantColor: '#000', objects: [], ocrText: '', aestheticLabels: [], width: 100, height: 100, captureOrigin: 'file-upload' }` → round-trips through `selectEntrySchema` and the image Zod variant without type errors.
5. Insert a test entry with `resolvedType: 'image'` but `mediaMetadata: { kind: 'video', ... }` → Zod `mediaMetadataForResolvedTypeSchema` rejects. (Cross-field invariant.)
6. Create an `ingestRuns` row with `status: 'running'`, update to `succeeded`, confirm `durationMs` / `costUsd` / token totals readable.
7. Insert test entries covering capture × resolution combinations: `(url, article)`, `(url, video)`, `(url, image)`, `(url, audio)`, `(file, image)`, `(file, audio)`, `(text, quote)`, `(text, note)` — all persist and round-trip cleanly.
8. Rollback migration → schema returns to T-016 pre-state; `entries` queries still work.

---

## Ticket sequence

Foundation of the whole T-016 epic. Unblocks:
- **T-016b** (Server Pipeline Foundation) — consumes `resolvedTypeEnum`, handler interface types `MediaMetadata`.
- **T-016c** (Mobile Renderer Foundation) — dispatches on `resolvedType`, narrows by `mediaMetadata.kind`.
- **T-016d** (Capture Composer) — reads `entryTypeEnum`.
- **T-016e** (YouTube slice) — writes `VideoMediaMetadata`.
- **T-016f** (Sources Service) — reads/writes `sources` table, migrates legacy `sourceApp`.
- **T-016g–k** (type pipelines) — write `resolvedType` + `mediaMetadata` + `ingestRuns`.
- **T-016l** (User Notes) — reads/writes `userNote`.
- **T-016m** (Acceptance Gate) — reads `acceptanceScore`, gates the wiki compiler on `reviewStatus`.
