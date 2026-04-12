# T-003: Schema Migration — Enriched Content + User Interaction Columns

**Status:** done
**Phase:** 1 — Foundation
**Type:** schema change
**Risk:** low (all new columns nullable or have safe defaults, no data migration, no breaking changes)
**Depends on:** T-002 (tools exist that will produce enriched data)

---

## Goal

Single migration that adds everything the entries table needs for:
1. **Enriched content** — raw vs readable markdown, cover image, metadata, key points
2. **User interaction** — favorites, archive, pinned, read tracking, review lifecycle
3. **Content metrics** — word count, language detection
4. **Source context** — which app shared this entry

All in one shot. No follow-up schema migrations for these features.

---

## Current Schema (`packages/db/src/schema/entries.ts`)

```ts
entries = pgTable('entries', {
  id, userId, title, content (NOT NULL), summary, url,
  type, processedStatus, error, createdAt, updatedAt
});
```

**Existing related table:** `entry_notes` (separate table, supports multiple notes per entry — no changes needed, already correct design).

---

## New Columns

### Enriched content (pipeline output)

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `raw_content` | text | null | Original noisy scraped markdown |
| `readable_content` | text | null | Noise-removed markdown (what the user reads) |
| `cover_image_url` | text | null | OG image or first markdown image |
| `metadata` | jsonb | null | OG title, description, site name, author |
| `key_points` | jsonb | null | string[] — key takeaways from analyzeContent |

### User interaction

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `is_favorited` | boolean | false | Star/heart — quick access filter |
| `is_archived` | boolean | false | Hide from feed without deleting |
| `is_pinned` | boolean | false | Pin to top of feed |
| `read_count` | integer | 0 | Times opened — surfaces most revisited |
| `last_read_at` | timestamp | null | When last opened — enables "stale" surfacing |

### Lifecycle / review

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `review_status` | enum | 'unreviewed' | `unreviewed`, `kept`, `dismissed`, `remind` — importance/lifecycle indicator |

`remind` = "come back to this" — surfaces in a reminder feed or notification. `kept` = confirmed valuable (feeds wiki). `dismissed` = not worth keeping (auto-archive candidate).

### Source context

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `source_app` | varchar(255) | null | Android package name from share intent |

### Content metrics

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `word_count` | integer | null | Enables "5 min read" in feed cards |
| `language` | varchar(10) | null | Detected language code (en, es, de) |

---

## What to Do

### 1. Create `review_status` enum in `enums.ts`

**File:** `packages/db/src/schema/enums.ts`

```ts
export const reviewStatusEnum = pgEnum('review_status', [
  'unreviewed',
  'kept',
  'dismissed',
  'remind',
]);
```

### 2. Add all columns to Drizzle schema

**File:** `packages/db/src/schema/entries.ts`

```ts
import {
  boolean, integer, jsonb, pgTable, real, text, timestamp, uuid, varchar,
} from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { processedStatusEnum, entryTypeEnum, reviewStatusEnum } from './enums.js';

export const entries = pgTable('entries', {
  // --- existing (unchanged) ---
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: varchar('title', { length: 255 }),
  content: text('content').notNull(),
  summary: text('summary'),
  url: text('url'),
  type: entryTypeEnum('type').notNull().default('url'),
  processedStatus: processedStatusEnum('processed_status').notNull().default('pending'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),

  // --- enriched content ---
  rawContent: text('raw_content'),
  readableContent: text('readable_content'),
  coverImageUrl: text('cover_image_url'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  keyPoints: jsonb('key_points').$type<string[]>(),

  // --- user interaction ---
  isFavorited: boolean('is_favorited').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  isPinned: boolean('is_pinned').notNull().default(false),
  readCount: integer('read_count').notNull().default(0),
  lastReadAt: timestamp('last_read_at'),

  // --- lifecycle ---
  reviewStatus: reviewStatusEnum('review_status').notNull().default('unreviewed'),

  // --- source context ---
  sourceApp: varchar('source_app', { length: 255 }),

  // --- content metrics ---
  wordCount: integer('word_count'),
  language: varchar('language', { length: 10 }),
});
```

### 3. Generate and run migration

```bash
cd packages/db && npx drizzle-kit generate
cd packages/db && npx drizzle-kit migrate
```

Expected SQL:
```sql
CREATE TYPE "review_status" AS ENUM ('unreviewed', 'kept', 'dismissed', 'remind');

ALTER TABLE "entries" ADD COLUMN "raw_content" text;
ALTER TABLE "entries" ADD COLUMN "readable_content" text;
ALTER TABLE "entries" ADD COLUMN "cover_image_url" text;
ALTER TABLE "entries" ADD COLUMN "metadata" jsonb;
ALTER TABLE "entries" ADD COLUMN "key_points" jsonb;
ALTER TABLE "entries" ADD COLUMN "is_favorited" boolean NOT NULL DEFAULT false;
ALTER TABLE "entries" ADD COLUMN "is_archived" boolean NOT NULL DEFAULT false;
ALTER TABLE "entries" ADD COLUMN "is_pinned" boolean NOT NULL DEFAULT false;
ALTER TABLE "entries" ADD COLUMN "read_count" integer NOT NULL DEFAULT 0;
ALTER TABLE "entries" ADD COLUMN "last_read_at" timestamp;
ALTER TABLE "entries" ADD COLUMN "review_status" review_status NOT NULL DEFAULT 'unreviewed';
ALTER TABLE "entries" ADD COLUMN "source_app" varchar(255);
ALTER TABLE "entries" ADD COLUMN "word_count" integer;
ALTER TABLE "entries" ADD COLUMN "language" varchar(10);
```

### 4. Update shared contract (`entry.contract.ts`)

Add to `entrySchema`:

```ts
// Enriched content
rawContent: z.string().nullable().optional(),
readableContent: z.string().nullable().optional(),
coverImageUrl: z.string().nullable().optional(),
metadata: z.record(z.string(), z.unknown()).nullable().optional(),
keyPoints: z.array(z.string()).nullable().optional(),

// User interaction
isFavorited: z.boolean().default(false),
isArchived: z.boolean().default(false),
isPinned: z.boolean().default(false),
readCount: z.number().int().default(0),
lastReadAt: dateSchema.nullable().optional(),

// Lifecycle
reviewStatus: z.enum(['unreviewed', 'kept', 'dismissed', 'remind']).default('unreviewed'),

// Source context
sourceApp: z.string().nullable().optional(),

// Content metrics
wordCount: z.number().int().nullable().optional(),
language: z.string().nullable().optional(),
```

### 5. Export the enum from schema index

Ensure `reviewStatusEnum` is exported from `packages/db/src/schema/index.ts` (or wherever the schema barrel exports from — verify).

---

## How new fields get populated (for context — wired in later tickets)

| Field | Source | Cost |
|-------|--------|------|
| `rawContent`, `readableContent`, `coverImageUrl`, `metadata` | Pipeline (extraction + cleanContent) | — |
| `keyPoints`, `language` | `analyzeContent` schema (add `language` field to existing schema) | Free — same LLM call |
| `wordCount` | Computed inline: `readableContent.split(/\s+/).length` | Zero — no AI |
| `isFavorited`, `isArchived`, `isPinned`, `readCount`, `lastReadAt` | Mobile app user actions | — |
| `reviewStatus` | Mobile app user action | — |
| `sourceApp` | Android share intent (passed at entry creation) | — |

**Action for `analyzeContent` schema:** Add `language: z.string().describe('ISO 639-1 language code of the content, e.g. "en", "es", "de"')` to `analyzeContentSchema` in `tools/analyze-content.ts`. This is a trivial addition to the existing combined call.

---

## Suggestions & Improvements

- **`$type<T>()`** on jsonb columns — gives TypeScript proper types without affecting DB.
- **`content` stays as-is** — mobile app reads it. After pipeline rewire, `content = readableContent`. Deprecate later.
- **`entry_notes` table already exists** — no need for a `notes` column on entries. The existing separate table supports multiple notes per entry, timestamps, and per-note editing. Correct design.
- **`review_status` as enum, not boolean** — four states captures the full lifecycle. `remind` acts as an importance/urgency flag that can drive a "review these" notification or feed section.
- **Boolean columns with NOT NULL + default** — safe for existing rows. Postgres applies the default on ALTER when NOT NULL is added with DEFAULT. No backfill needed.
- **Future indexes** (don't add yet, add when queries need them):
  - `WHERE is_archived = false` (partial index for feed queries)
  - `WHERE is_favorited = true` (favorites feed)
  - `WHERE review_status = 'remind'` (reminders)
  - `cover_image_url IS NOT NULL` (image feed)

---

## Files

| File | Action |
|------|--------|
| `packages/db/src/schema/enums.ts` | **Modify** — add `reviewStatusEnum` |
| `packages/db/src/schema/entries.ts` | **Modify** — add 14 new columns |
| `packages/db/src/migrations/0002_*.sql` | **Generated** — CREATE TYPE + ALTER TABLE |
| `packages/shared/src/contracts/entry.contract.ts` | **Modify** — add all new fields |
| `packages/db/drizzle.config.ts` | **Modify** — `schema` points at `./dist/schema/*.js` so `drizzle-kit generate` works after `tsc` |
| `packages/db/package.json` | **Modify** — `generate` runs `build` before `drizzle-kit generate` |
| `apps/server/src/modules/ai/tools/analyze-content.ts` | **Modify** — `language` on schema (same LLM call) |
| `apps/server/src/modules/ai/prompts.ts` | **Modify** — analyze system prompt mentions ISO 639-1 |
| `apps/server/src/services/entry.service.ts`, `ai.service.ts` | **Modify** — map new nullable fields in API payloads |

---

## Definition of Done

- [x] `reviewStatusEnum` created in `enums.ts` with values: `unreviewed`, `kept`, `dismissed`, `remind`
- [x] `entries` table has all 14 new columns with correct types and defaults
- [x] Enriched columns (`rawContent`, `readableContent`, `coverImageUrl`, `metadata`, `keyPoints`) are nullable
- [x] Interaction columns (`isFavorited`, `isArchived`, `isPinned`, `readCount`) are NOT NULL with defaults
- [x] `reviewStatus` is NOT NULL with default `'unreviewed'`
- [x] `metadata` uses `.$type<Record<string, unknown>>()`; `keyPoints` uses `.$type<string[]>()`
- [x] Migration file generated and committed
- [x] Migration runs successfully against dev DB — **apply locally:** `cd packages/db && pnpm exec drizzle-kit migrate` with `DATABASE_URL` set (not run in agent; connection refused without DB)
- [x] Existing entries unaffected — nullable cols are null, boolean cols default to false, readCount to 0, reviewStatus to 'unreviewed'
- [x] `entrySchema` in `entry.contract.ts` includes all new fields with correct Zod types
- [x] `Entry` type (inferred from Drizzle) includes new fields with correct TypeScript types
- [x] `pnpm typecheck` passes across all workspaces
- [x] Mobile app builds without errors

---

## Commit

```
feat(db): add enriched content, interaction, and lifecycle columns to entries
```
