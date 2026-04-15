# T-015i: Enhanced Entry Metadata + Topic Normalization

**Status:** in-progress  
**Phase:** Server (ingest pipeline + curator tools)  
**Type:** enhancement  
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)  
**Depends on:** T-015g (compile/lint UI complete)

---

## Goal

The wiki agent's organization quality is bottlenecked by **weak entry metadata**. Topics fragment into near-duplicates ("ML" vs "Machine Learning"), content type is just `url | note` (useless), and the curator ignores tags, key points, and content depth. This ticket enriches the metadata foundation so that all downstream agents (curator, auto-assign, writer) make better decisions.

---

## Context

### Current ingest pipeline (`apps/server/src/modules/ai/pipelines/ingest.ts`)

```
Entry created → extract content → clean → analyzeContent() → generateEmbedding → findRelatedEntries
                                            ↓
                                  summary, keyPoints, tags, topics (1-5),
                                  language, title, heroImageUrl,
                                  authors, contentType, depth
                                            ↓
                                  Transaction: save tags, topics, embedding,
                                  space_suggestion, entry_relations
```

### What `analyzeContent` extracts today

| Field | Type | Quality | Used by curator? |
|-------|------|---------|------------------|
| `summary` | string | Good | Yes (via `listEntries`) |
| `keyPoints` | string[] | Good | **No** |
| `tags` | string[] | OK | **No** — curator ignores |
| `topics` | `{name, description}[]` | Good names but fragmented | Yes (via `listEntries`) |
| `language` | string | Good | **No** |
| `title` | string | Good | No |
| `heroImageUrl` | string \| null | Good | No |

### What's missing

| Missing signal | Impact |
|---------------|--------|
| **Topic normalization** | "ML", "Machine Learning", "machine learning" are 3 separate topics. 59 entries produce ~80 fragmented topics. Curator sees noise. |
| **Content type** | `url \| note` is useless. A recipe bookmark and a deep AI paper get identical treatment. |
| **Depth signal** | No way to distinguish a 200-word bookmark from a 5000-word analysis. |
| **Authors** | No way to know who wrote the content. The curator can't recognize "3 entries by Karpathy" or attribute insights in wiki pages. |
| **Tags in curator** | User's own mental model (tags) is invisible to the curator. |
| **contentType + depth in curator** | Curator can't decide "this space is all shallow bookmarks, write an index" vs "this space is deep articles, write a synthesis". |

### Current topic creation (ingest.ts lines 205-232)

Topics match by **exact name** only (`WHERE name = ?`). If the LLM outputs "ML" and the existing topic is "Machine Learning", a new "ML" topic is created. No fuzzy matching, no aliases, no normalization.

### Current `listEntries` tool output to curator

Returns per entry: `id, title, summary, topics[], tags[], wordCount, type, createdAt`. Tags are returned but the curator prompt doesn't mention them. No contentType, no depth.

---

## Scope

### 1. Extend `analyzeContent` schema — add `contentType`, `depth`, and `authors`

**File:** `apps/server/src/modules/ai/tools/analyze-content.ts`

Add to `analyzeContentSchema`:

```typescript
contentType: z.enum([
  'article',     // long-form written content (blog post, essay, news)
  'tutorial',    // step-by-step guide, how-to
  'reference',   // documentation, API docs, specs, wiki article
  'opinion',     // editorial, review, hot take
  'recipe',      // cooking recipe or similar procedural
  'list',        // listicle, curated list, "awesome-X"
  'note',        // personal note, braindump, idea, memo
  'bookmark',    // saved link with minimal/no readable content
]).describe(
  'What kind of content this is. "bookmark" if there is very little readable text (< 200 words). '
  + '"note" for personal unstructured writing. Pick the most specific type that fits.'
),
depth: z.enum(['shallow', 'medium', 'deep']).describe(
  'Content depth: "shallow" = surface-level, < 500 words, brief overview or bookmark. '
  + '"medium" = 500-2000 words, moderate detail. '
  + '"deep" = 2000+ words, thorough analysis, research, or detailed guide.'
),
authors: z.array(z.string()).max(5).describe(
  'Author names extracted from bylines, "written by", or metadata. '
  + 'Use full names when available (e.g. "Andrej Karpathy", not "karpathy"). '
  + 'Empty array if no author is identifiable.'
),
```

**Zero extra cost** — same LLM call, more structured output fields.

**File:** `apps/server/src/modules/ai/prompts.ts`

Update `analyzeContentSystemPrompt()` to mention the new fields:

```
... and classify the content type (article, tutorial, reference, opinion, recipe, list, note, bookmark)
and depth (shallow/medium/deep based on word count and detail level).
Extract author names from bylines or metadata when available.
```

### 2. Add `contentType`, `depth`, and `authors` columns to entries table

**File:** `packages/db/src/schema/entries.ts`

```typescript
// New columns
contentType: varchar('content_type', { length: 20 }),  // nullable — old entries won't have it
depth: varchar('depth', { length: 10 }),                // nullable — old entries won't have it
authors: jsonb('authors').$type<string[]>(),            // nullable — old entries won't have it
```

**File:** `packages/db/src/schema/enums.ts`

Add enums (or use varchar — varchar is simpler since these are analysis output, not hard lifecycle states):

Decision: Use **varchar** (not pgEnum) because these are AI-extracted classifications that may evolve. Enums require migrations to add values; varchar is flexible. Zod validates at the application layer.

**Migration:** `drizzle-kit generate` → new migration adding three nullable columns.

### 3. Save contentType, depth, and authors in ingest pipeline

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

In the transaction where the entry is updated (line ~162-178), add:

```typescript
contentType: analysis.contentType,
depth: analysis.depth,
authors: analysis.authors,
```

### 4. Topic normalization via LLM (in analyzeContent prompt)

**Approach:** Instead of a separate normalization step, pass existing topics **with descriptions** to the `analyzeContent` prompt and instruct the LLM to reuse existing topic names when meanings overlap.

**File:** `apps/server/src/modules/ai/prompts.ts`

Change how existing topics are passed in `analyzeContentUserPrompt()`:

**Current** (line 89-92):
```typescript
if (existingTopics.length > 0) {
  sections.push(
    `Existing topics in the system (prefer reusing names if relevant): ${existingTopics.join(", ")}`,
  );
}
```

**New:**
```typescript
if (existingTopicsWithDescriptions.length > 0) {
  const topicList = existingTopicsWithDescriptions
    .map(t => `- "${t.name}": ${t.description ?? 'no description'}`)
    .join('\n');
  sections.push(
    `Existing topics in the system. You MUST reuse an existing topic name when the meaning matches, `
    + `even if the wording differs (e.g. use "Machine Learning" instead of creating "ML"):\n${topicList}`,
  );
}
```

**File:** `apps/server/src/modules/ai/tools/analyze-content.ts`

Update the function signature to accept topics with descriptions:

```typescript
export async function analyzeContent(opts: {
  markdown: string;
  existingTags?: string[];
  existingTopics?: Array<{ name: string; description: string | null }>;  // changed from string[]
  imageUrls?: string[];
}): Promise<AnalyzeContentResult>
```

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

Update the topic query (line 103-107) to also select description:

```typescript
const existingTopicRows = await db
  .select({ name: topics.name, description: topics.description })
  .from(topics)
  .where(eq(topics.userId, userId));
```

Pass `existingTopicRows` directly instead of mapping to just names.

**Also update the `analyzeContentSystemPrompt()`** to reinforce:

```
When existing topics are listed, you MUST reuse an existing topic name when it covers the same
concept — even if you'd phrase it differently. "ML" and "Machine Learning" are the same topic;
use whichever already exists. Only create a new topic when no existing one covers the concept.
```

### 5. Feed tags + contentType + depth + authors to curator's `listEntries` tool

**File:** `apps/server/src/modules/ai/agents/wiki-tools.ts`

In the `listEntries` tool, the SELECT already fetches `type`. Add `contentType`, `depth`, and `authors`:

```typescript
// In the select (line ~284-291):
contentType: entries.contentType,
depth: entries.depth,
authors: entries.authors,

// In the return mapping (line ~336-348):
contentType: row.contentType,
depth: row.depth,
authors: row.authors,
```

Tags are already fetched and returned. No change needed there.

### 6. Update curator prompt to use new metadata

**File:** `apps/server/src/modules/ai/agents/wiki-prompts.ts`

Add to curator system prompt:

```
## Entry metadata you'll see

Each entry in listEntries has:
- **topics**: AI-extracted primary topics (normalized — "Machine Learning" not "ML")
- **tags**: User-created categorization tags — these reflect the user's own mental model. Weight them heavily.
- **contentType**: article | tutorial | reference | opinion | recipe | list | note | bookmark
- **depth**: shallow | medium | deep — based on word count and detail level
- **authors**: Extracted author names (may be empty for bookmarks/notes)

Use these signals when deciding spaces:
- Group by theme (topics + tags), not by content type
- A recipe bookmark and a detailed cooking article belong in the same food-related space
- Use depth to decide page types: spaces full of deep articles → synthesis pages. Spaces of shallow bookmarks → index or glossary pages.

## Multi-space assignment

- If an entry substantively covers 2-3 themes, assign it to ALL relevant spaces.
  Example: "Building AI Coding Assistants" belongs in BOTH "AI" and "Developer Tools".
- Do NOT assign to more than 3 spaces — if it seems to fit everywhere, pick the most specific.
- Cross-cutting entries are valuable signals: spaces that share many entries may be candidates
  for merging or creating a parent space (future capability).
```

### 7. Wiki data reset script

**File:** `apps/server/scripts/reset-wiki-data.ts` (new)

```typescript
// Usage: pnpm reset:wiki <userId>
// Deletes: wiki_pages, wiki_page_versions, space_wiki_pages, agent_logs
// Deletes: agent-created spaces (preserves user-created ones? — see below)
// Resets: compilationStatus → 'idle', lastCompiledAt → null on all spaces
```

**What to delete:**
- All `wiki_pages` for the user (cascades `wiki_page_versions`, `space_wiki_pages`)
- All `agent_logs` for the user
- All `spaces` for the user (since all current spaces were agent-created)
- All `entry_spaces` assignments (will be re-created on next compile)
- All `space_suggestions` for the user

**Script in `apps/server/package.json`:**
```json
"reset:wiki": "tsx scripts/reset-wiki-data.ts"
```

**Safety:** Requires explicit `--confirm` flag. Without it, just logs what would be deleted (dry run).

---

## File changes summary

### Server — new files

| File | What |
|------|------|
| `apps/server/scripts/reset-wiki-data.ts` | Wiki data reset script |

### Server — modified files

| File | Change |
|------|--------|
| `apps/server/src/modules/ai/tools/analyze-content.ts` | Add `contentType`, `depth`, `authors` to schema; change `existingTopics` type to include descriptions |
| `apps/server/src/modules/ai/prompts.ts` | Update `analyzeContentSystemPrompt` and `analyzeContentUserPrompt` for new fields + topic normalization instructions |
| `apps/server/src/modules/ai/pipelines/ingest.ts` | Save `contentType`, `depth`, `authors`; pass topic descriptions to `analyzeContent` |
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | Add `contentType`, `depth`, `authors` to `listEntries` tool output |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | Document new metadata fields + multi-assignment guidance in curator prompt |

### Schema — modified files

| File | Change |
|------|--------|
| `packages/db/src/schema/entries.ts` | Add `contentType` (varchar 20), `depth` (varchar 10), and `authors` (jsonb) columns, all nullable |

### Migration

| File | What |
|------|------|
| New drizzle migration | Add `content_type`, `depth`, and `authors` columns to `entries` table |

---

## What this does NOT include

- **Auto-assign after ingest** — that's T-015j
- **Curator prompt overhaul** (merge rules, naming, stability) — that's T-015k  
- **Recompile + benchmark** — that's T-015k
- **Topic hierarchy** (parentTopicId) — deferred, not enough value for complexity
- **Topic embedding column** — not needed since we're using LLM-based normalization
- **Re-processing existing entries** — new entries only. Old entries keep their metadata. The wiki reset + fresh compile will use whatever metadata exists.
- **Mobile UI changes** — none in this ticket

---

## Edge cases

1. **analyzeContent returns a new contentType value not in the enum**: Won't happen — Zod validates structured output. If the LLM hallucinates, `generateText` with `Output.object` will error. The existing `NoObjectGeneratedError` catch handles this.

2. **Existing entries without contentType/depth**: Columns are nullable. `listEntries` returns `null` for these fields. Curator handles this gracefully — it's just missing info, not an error.

3. **Topic normalization not perfect**: The LLM may still create near-duplicates occasionally. This is acceptable — we're reducing fragmentation from ~80 topics to ~20-30, not eliminating it entirely. A future ticket can add embedding-based dedup as a safety net.

4. **Large topic list in prompt**: If a user has 100+ existing topics, the list in the analyzeContent prompt grows large (~2K tokens). Acceptable for gpt-4o-mini's 128K context. If it becomes a problem, truncate to the 50 most-used topics.

5. **reset-wiki-data deletes all spaces**: This is intentional for the current state (all spaces are agent-created). Future tickets will need to distinguish user-created vs agent-created spaces if we add user-created space support.

---

## DoD

- [ ] `analyzeContent` schema includes `contentType` (8 values), `depth` (3 values), and `authors` (string[], max 5)
- [ ] `analyzeContentSystemPrompt` mentions content classification, depth, and author extraction
- [ ] `analyzeContentUserPrompt` passes existing topics with descriptions (not just names)
- [ ] Prompt instructs LLM to reuse existing topic names when meanings match
- [ ] `entries` table has nullable `content_type`, `depth`, and `authors` columns
- [ ] Migration generated and runs cleanly
- [ ] `ingest.ts` saves `contentType`, `depth`, and `authors` to entry record
- [ ] `ingest.ts` queries topic descriptions and passes them to `analyzeContent`
- [ ] `listEntries` wiki tool returns `contentType`, `depth`, and `authors` per entry
- [ ] Curator prompt documents the new metadata fields and how to use them
- [ ] Curator prompt includes multi-space assignment guidance (2-3 spaces max for cross-cutting entries)
- [ ] `reset-wiki-data.ts` script exists with `--confirm` safety flag
- [ ] No `any` types introduced
- [ ] `pnpm typecheck` passes (server + shared)

---

## Verification

Verification is minimal for this ticket (infrastructure only). Full validation happens in T-015k (curator overhaul + recompile + benchmark).

1. **Ingest a new test entry** → verify `contentType`, `depth`, and `authors` are saved on the entry record
2. **Check topic creation** → if an entry's topics match existing ones, verify the LLM reuses existing names (check `topics` table for new duplicates)
3. **Run `listEntries` via wiki tools** → verify `contentType`, `depth`, and `authors` appear in output
4. **Run `reset-wiki-data --confirm`** → verify all wiki data is deleted for the user
5. **Typecheck**: `pnpm typecheck` passes

---

## Ticket sequence (context)

```
T-015i  Metadata Foundation (this ticket)
  → Topic normalization, contentType, depth, authors, curator data enrichment, multi-assignment guidance, reset script

T-015j  Auto-Assign + Review Queue
  → LLM auto-assign after ingest, confidence scoring, review queue UI

T-015k  Space Hierarchy + Curator Overhaul
  → setSpaceParent tool, space_relations population, merge rules, naming stability, recompile + benchmark

T-015l  SpacesScreen Redesign
  → Grouped by parent spaces, pinned spaces, sorted list, All Wiki Pages card, quality signals

T-015m  Delete Operations (current T-015h content)
  → Delete space/page/section, danger confirmation sheets
```
