# T-016a: Schema Foundation (resolvedType, sources, userNote, acceptanceScore)

**Status:** pending
**Phase:** Foundation
**Type:** schema
**Epic:** [T-016 Ingest Strengthening](./T-016-ingest-strengthening-epic.md)
**Depends on:** none (pure schema migration)

---

## Goal

Introduce the schema primitives that the rest of the T-016 epic builds on:

1. **`resolvedType`** — a new column on `entries` capturing what the system extracted, independent of how the user captured it.
2. **`sources`** table + `entries.sourceId` FK — publishers as first-class entities, scoped per user.
3. **`userNote`** column on `entries` — markdown the user writes about their own entry, read by the wiki agent.
4. **`acceptanceScore`** column on `entries` — agent-computed 0–1 wiki-worthiness signal, drives the T-016j acceptance gate.
5. **`mediaMetadata`** JSONB column — type-specific extraction data (transcript for video, palette for image, waveform for audio) without forking the table.
6. **`ingestRuns`** table — per-entry ingest telemetry (mirrors T-015r's `compile_runs` shape for consistency).

This is a **pure migration** — no pipeline changes, no UI changes. Every downstream ticket (T-016b–j) will start populating these columns.

---

## Context

Current `entries` schema (see `packages/db/src/schema/entries.ts`):
- `type` enum: `'url' | 'note'` — too narrow; about to become `'url' | 'file' | 'text' | 'audio'` (the **capture** surface).
- `reviewStatus` enum: `'unreviewed' | 'kept' | 'dismissed' | 'remind'` — stays; becomes the wiki-gate signal in T-016j.
- `metadata` JSONB — generic Jina/Firecrawl extraction; stays for URL-flavoured metadata.
- `sourceApp` varchar — string only, no relations, no reuse across entries. About to be superseded by `sourceId` FK to the new `sources` table.

Missing:
- No distinction between *how captured* vs *what extracted* — `resolvedType` closes this gap.
- No home for video transcript / image palette / audio waveform — `mediaMetadata` JSONB closes this.
- No structured publisher entity — `sources` table closes this.
- No user-authored annotation layer — `userNote` closes this.
- No wiki-readiness signal — `acceptanceScore` closes this.

---

## Scope

### 1. Expand `entryTypeEnum` (capture surface)

File: `packages/db/src/schema/enums.ts` (modify).

```ts
// Before: ['url', 'note']
export const entryTypeEnum = pgEnum('entry_type', ['url', 'file', 'text', 'audio']);
```

**Migration:** existing `'note'` rows → `'text'` (semantic rename; the user captured text). Drop `'note'` from enum after backfill.

### 2. New `resolvedTypeEnum` (what extraction produced)

File: `packages/db/src/schema/enums.ts` (add).

```ts
export const resolvedTypeEnum = pgEnum('resolved_type', [
  'article',     // URL → text content
  'video',       // URL → YouTube (T-016d)
  'social',      // URL → Reddit / LinkedIn (T-016e)
  'product',     // URL → commerce / landing page (no special handling, just extraction)
  'image',       // File → photo / screenshot / graphic (T-016f)
  'voice-memo',  // Audio → voice recording (T-016g)
  'quote',       // Text → excerpt, has a source attribution
  'snippet',     // Text → code / data / short reference
  'note',        // Text → free-form user writing
]);
```

### 3. `sources` table

File: `packages/db/src/schema/sources.ts` (new).

```ts
import { pgTable, text, uuid, timestamp, varchar, pgEnum } from 'drizzle-orm/pg-core';

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
mediaMetadata: jsonb('media_metadata').$type<MediaMetadata>(),          // type-specific blob
```

**`MediaMetadata` discriminated union** (typed in `packages/shared/src/types/media-metadata.ts`):

```ts
export type MediaMetadata =
  | VideoMediaMetadata       // { transcript, timestamps[], chapters[], duration, thumbnailUrl, anchoredAtSec? }
  | ImageMediaMetadata       // { palette[], dominantColor, objects[], ocrText, aestheticLabels[], width, height, exif? }
  | AudioMediaMetadata       // { transcript, durationSec, waveformPeaks[], language }
  | SocialMediaMetadata      // { platform: 'reddit' | 'linkedin', author, postedAt, engagement?, permalink }
  | QuoteMediaMetadata       // { sourceUrl?, sourceAuthor?, sourceTitle? }
  | null;
```

The discriminant is `resolvedType` — consumers narrow by the entry's `resolvedType` before accessing `mediaMetadata`.

**Deprecate `sourceApp`** — mark in a `@deprecated` JSDoc but don't drop yet. T-016b will migrate any existing values into `sources`.

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
  stepsExecuted: jsonb('steps_executed').$type<string[]>().default([]),  // e.g. ['extract', 'analyze', 'embed', 'classify']
  triggerDevRunId: text('trigger_dev_run_id'),
  error: text('error'),
}, (table) => ({
  entryIdx: index('ingest_runs_entry_idx').on(table.entryId),
  userTimeIdx: index('ingest_runs_user_time_idx').on(table.userId, table.startedAt),
}));
```

Mirrors T-015r's `compile_runs` shape intentionally — shared mental model, shared observability tooling when it ships.

### 6. Update review status semantics (documentation only)

No schema change to `reviewStatusEnum`. Document in JSDoc that `'kept'` is the wiki-admission signal (consumed by T-016j + T-015c gate).

### 7. Migration strategy

File: `packages/db/migrations/XXXX_ingest_strengthening_foundation.sql` (generated via `drizzle-kit generate`).

Order:
1. Create `source_origin` + `resolved_type` + `ingest_run_status` enums.
2. Create `sources` table + indexes.
3. Create `ingest_runs` table + indexes.
4. Alter `entries`: add `resolved_type`, `source_id`, `user_note`, `acceptance_score`, `media_metadata`.
5. Alter `entry_type` enum: add `'file'`, `'text'`, `'audio'`. Then update rows (`'note' → 'text'`). Then drop `'note'` (Postgres requires the rename-enum dance: `ALTER TYPE ... RENAME TO ...`, create new type, update column, drop old).
6. Backfill `resolved_type`:
   - `entries.type = 'url'` → `resolved_type = 'article'` (conservative default)
   - `entries.type = 'note'` (now `'text'`) → `resolved_type = 'note'`
7. Backfill `acceptance_score`: leave null for existing rows — T-016j will compute on-demand or via a backfill script.

**Zero-downtime note:** All columns added as nullable / default-providing. No existing query breaks.

### 8. Zod / type exports

File: `packages/db/src/schema/entries.ts` + `packages/shared/src/types/media-metadata.ts`.

- Regenerate `insertEntrySchema` / `selectEntrySchema` via `drizzle-zod`.
- Export `MediaMetadata` discriminated union + per-shape types from `@repo/shared`.
- Export `Source` / `NewSource` from `@repo/db`.

---

## Files

| File | Action |
|------|--------|
| `packages/db/src/schema/enums.ts` | **Modify** — expand `entryTypeEnum`; add `resolvedTypeEnum`, `sourceOriginEnum`, `ingestRunStatusEnum` |
| `packages/db/src/schema/sources.ts` | **Create** — `sources` table + indexes |
| `packages/db/src/schema/ingest-runs.ts` | **Create** — `ingestRuns` table |
| `packages/db/src/schema/entries.ts` | **Modify** — add `resolvedType`, `sourceId`, `userNote`, `acceptanceScore`, `mediaMetadata`; deprecate `sourceApp` |
| `packages/db/src/schema/index.ts` | **Modify** — export new tables (concrete imports, not barrel — each consumer imports from the file path) |
| `packages/db/migrations/*_ingest_strengthening_foundation.sql` | **Create** — generated migration |
| `packages/shared/src/types/media-metadata.ts` | **Create** — discriminated union types |
| `packages/shared/src/contracts/entry.contract.ts` | **Modify** — expose new fields on `entrySchema` |
| `apps/server/scripts/backfill-resolved-type.ts` | **Create** — one-shot backfill for existing rows |

---

## Edge cases

- **Existing `entries.type = 'note'` rows** → renamed to `'text'`, `resolvedType` set to `'note'`. No data loss.
- **Existing `entries.sourceApp` values** → untouched by this ticket; T-016b migrates them into `sources` rows.
- **User deletes a source** → `sourceId` on entries goes to `null` (FK `onDelete: 'set null'`). Entries remain; source attribution is simply lost. Correct behaviour — we don't cascade-delete entries.
- **Duplicate source domain race** → `uniqueIndex(userId, domain)` catches it at the DB level; service layer (T-016b) handles the conflict by reading the existing row.
- **`mediaMetadata` JSONB grows unbounded** → transcripts for 2-hour videos could hit 50KB+. Acceptable; Postgres JSONB handles it. Watch index size if we ever index inside.
- **`acceptanceScore = null`** on legacy rows → T-016j treats null as `unreviewed`; no regressions in the wiki gate.

---

## What this does NOT include

- Populating any of the new columns — that's per-pipeline work (T-016d–h).
- Sources service logic (dedup, auto-fetch favicon) — T-016b.
- UI surfacing of any new field — per-ticket.
- Composer changes — T-016c.
- Wiki compiler changes to respect `kept` — T-016j.
- Vector / embedding schema changes — untouched.

---

## DoD

- [ ] `entryTypeEnum` expanded to `['url', 'file', 'text', 'audio']`; `'note'` values migrated to `'text'`.
- [ ] `resolvedTypeEnum` created with all 9 variants.
- [ ] `sources` table exists with `(userId, domain)` unique index; `origin` column defaults to `'agent'`.
- [ ] `entries` has `resolvedType`, `sourceId` (FK), `userNote`, `acceptanceScore` (numeric 3,2), `mediaMetadata` (jsonb).
- [ ] `ingestRuns` table exists with indexes on `entryId` and `(userId, startedAt)`.
- [ ] `MediaMetadata` discriminated union exported from `@repo/shared`; narrowing by `resolvedType` type-checks in a sample consumer.
- [ ] `insertEntrySchema` / `selectEntrySchema` regenerated; `@repo/shared` entry contract surfaces new fields.
- [ ] Backfill script: `resolved_type` populated for 100% of existing rows.
- [ ] `pnpm -w db:migrate` clean forward; `db:migrate:down` rollback tested in dev.
- [ ] `pnpm -w run typecheck` clean across db + shared + server + mobile.
- [ ] No runtime regressions: existing feed loads, existing ingest still works (returns `resolvedType = 'article'` for URLs).
- [ ] Epic `T-016` table links this ticket.

---

## Verification

1. `pnpm -w db:migrate` runs without error against a dev DB with existing data.
2. `SELECT type, resolved_type FROM entries LIMIT 20` — no nulls in `resolved_type` after backfill.
3. Insert a test row via `db.insert(sources).values({ userId, name: 'Medium', domain: 'medium.com' })` twice → second call violates unique index as expected.
4. Insert a test entry with `mediaMetadata: { palette: ['#000'], dominantColor: '#000', objects: [], ocrText: '', aestheticLabels: [], width: 100, height: 100 }` → round-trips through `selectEntrySchema` without type errors.
5. Create an `ingestRuns` row with `status: 'running'`, update to `succeeded`, confirm durationMs / costUsd / tokens readable.
6. Rollback migration → schema returns to T-016 pre-state; `entries` queries still work.

---

## Ticket sequence

Foundation of the whole T-016 epic. Unblocks:
- **T-016b** (Sources Service) — reads `sources` table.
- **T-016c** (Capture Composer) — reads `entryTypeEnum`.
- **T-016d–h** (pipelines) — write `resolvedType` + `mediaMetadata` + `ingestRuns`.
- **T-016i** (User Notes) — reads/writes `userNote`.
- **T-016j** (Acceptance Gate) — reads `acceptanceScore`, gates the wiki compiler on `reviewStatus`.
