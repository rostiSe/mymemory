# T-005: Rewire Ingest Pipeline

**Status:** done
**Phase:** 2 — Strengthen URL Pipeline
**Type:** enhancement
**Risk:** medium (core pipeline rewrite — all new entry processing flows through here)
**Depends on:** T-002 (analyzeContent + cleanContent tools), T-003 (schema columns), T-004 (extraction returns metadata)

---

## Goal

Rewrite `processEntry` in `ingest.ts` to use the new tools and persist to the new columns. This is the final wiring step — after this, the full enriched URL pipeline is live.

**Before (current):** 3 LLM calls + 1 embed, noisy markdown everywhere, no metadata/cover/keyPoints.
**After:** 2 LLM calls + 1 embed, clean readable content, full metadata, cover image, structured analysis.

---

## Current Pipeline (`ingest.ts`)

```
1. Fetch entry, mark processing
2. Extract content (Jina/Firecrawl) → raw markdown (metadata ignored)
3. Parallel: summarizeText(markdown) + generateEmbedding(markdown)
4. Parallel: generateTags(markdown, summary) + extractTopics(markdown, summary)
5. assignSpace + findRelatedEntries
6. Transaction: persist content, summary, embedding, tags, topics, spaces, relations
```

**Problems:**
- Embeds noisy markdown (nav bars, ads pollute vector)
- 3 separate LLM calls for summarize/tags/topics
- No noise removal, no cover image, no metadata, no keyPoints, no wordCount/language

---

## New Pipeline

```
1. Fetch entry, mark processing
2. Extract raw content + metadata (Jina/Firecrawl) → ExtractionResult
3. Clean content (cleanContent LLM call) → readableContent
4. Parallel:
   ├─ analyzeContent(readableContent, existingTags, existingTopics) → { summary, keyPoints, tags, topics, language }
   └─ generateEmbedding(readableContent) → embedding vector
5. Compute: extractCoverImage(metadata, rawMarkdown), wordCount
6. assignSpace + findRelatedEntries (needs embedding)
7. Transaction: persist ALL fields atomically
```

**Gains:**
- Embedding uses clean content → better semantic search
- 2 LLM calls (clean + analyze) instead of 3 (summarize + tags + topics)
- All new columns populated in one pipeline run
- Tags/topics/summary are coherent (same context window)

---

## What to Do

### 1. Update imports

Remove old tool imports (`summarizeText`, `generateTags`, `extractTopics`).
Add new imports:

```ts
import { cleanContent } from "../tools/clean-content.js";
import { analyzeContent } from "../tools/analyze-content.js";
import { extractCoverImage } from "../tools/extract-cover-image.js";
import type { ExtractionMetadata } from "../tools/extract-content.types.js";
```

### 2. Rewrite `processEntry`

```ts
export async function processEntry(entryId: string, userId: string) {
  try {
    if (!entryId) {
      throw new Error(`processEntry called with undefined entryId! userId: ${userId}`);
    }

    // 1. Fetch Entry & Mark Processing
    const [entry] = await db
      .update(entries)
      .set({ processedStatus: "processing", error: null })
      .where(eq(entries.id, entryId))
      .returning();

    if (!entry) throw new Error("Entry not found");

    let rawMarkdown = entry.content;
    let extractionMetadata: ExtractionMetadata | null = null;

    // 2. Extract raw content + metadata for URLs
    if (
      entry.type === "url" &&
      entry.url &&
      (!rawMarkdown || rawMarkdown.trim() === "")
    ) {
      if (isMediumArticleUrl(entry.url)) {
        if (process.env.FIRECRAWL_API_KEY?.trim()) {
          const result = await extractMediumArticleWithFirecrawl(entry.url);
          rawMarkdown = result.markdown;
          extractionMetadata = result.metadata;
        } else {
          console.warn("[ingest] Medium URL but FIRECRAWL_API_KEY unset; using Jina");
          const result = await extractContentFromUrl(entry.url);
          rawMarkdown = result.markdown;
          extractionMetadata = result.metadata;
        }
      } else {
        const result = await extractContentFromUrl(entry.url);
        rawMarkdown = result.markdown;
        extractionMetadata = result.metadata;
      }
    }

    if (!rawMarkdown) throw new Error("No content to process");

    // 3. Clean content (noise removal) — LLM call #1
    const readableContent = await cleanContent(rawMarkdown);

    // 4. Parallel: Analyze + Embed (using readable content for better signal)
    // Fetch existing tags/topics for reuse hints
    const [existingTagRows, existingTopicRows] = await Promise.all([
      db.select({ name: tags.name }).from(tags).where(eq(tags.userId, userId)),
      db.select({ name: topics.name }).from(topics).where(eq(topics.userId, userId)),
    ]);
    const existingTags = existingTagRows.map((t) => t.name);
    const existingTopics = existingTopicRows.map((t) => t.name);

    const [analysis, embedding] = await Promise.all([
      analyzeContent({ markdown: readableContent, existingTags, existingTopics }),
      generateEmbedding(readableContent),
    ]);

    const { summary, keyPoints, tags: generatedTags, topics: extractedTopics, language } = analysis;

    // 5. Compute: cover image + word count (no AI, instant)
    const coverImageUrl = extractCoverImage(extractionMetadata, rawMarkdown);
    const wordCount = readableContent.split(/\s+/).filter(Boolean).length;

    // 6. Semantic operations (need embedding)
    const { assignSpace } = await import("../tools/assign-space.js");
    const { findRelatedEntries } = await import("../tools/find-related-entries.js");

    const [spaceId, relatedEntries] = await Promise.all([
      assignSpace(userId, embedding),
      findRelatedEntries(userId, embedding, 5, entryId),
    ]);

    // 7. Transaction: Persist ALL results atomically
    await db.transaction(async (tx) => {
      // Update entry with all enriched fields
      await tx
        .update(entries)
        .set({
          // Backward compat: mobile reads `content`
          content: readableContent,
          // New enriched fields
          rawContent: rawMarkdown,
          readableContent,
          coverImageUrl,
          metadata: extractionMetadata,
          keyPoints,
          summary,
          wordCount,
          language: language ?? null,
          // Status
          processedStatus: "done",
        })
        .where(eq(entries.id, entryId));

      // Insert embedding
      await tx.insert(embeddings).values({ entryId, vector: embedding });

      // Tags
      if (generatedTags.length > 0) {
        for (const tagName of generatedTags) {
          let [tag] = await tx
            .select().from(tags).where(eq(tags.name, tagName)).limit(1);
          if (!tag) {
            [tag] = await tx.insert(tags).values({ userId, name: tagName }).returning();
          }
          await tx.insert(entryTags).values({ entryId, tagId: tag.id }).onConflictDoNothing();
        }
      }

      // Topics
      if (extractedTopics.length > 0) {
        for (const topicInfo of extractedTopics) {
          let [topic] = await tx
            .select().from(topics).where(eq(topics.name, topicInfo.name)).limit(1);
          if (!topic) {
            [topic] = await tx
              .insert(topics)
              .values({ userId, name: topicInfo.name, description: topicInfo.description })
              .returning();
          }
          await tx.insert(entryTopics).values({ entryId, topicId: topic.id }).onConflictDoNothing();
        }
      }

      // Spaces
      if (spaceId) {
        await tx.insert(entrySpaces).values({ entryId, spaceId }).onConflictDoNothing();
      } else {
        await tx.insert(spaceSuggestions).values({
          userId,
          entryId,
          suggestedName: extractedTopics[0]?.name || "New Space",
          reason: "No existing spaces matched semantically.",
        });
      }

      // Relations
      for (const rel of relatedEntries) {
        if (rel.similarity > 0.5) {
          await tx
            .insert(entryRelations)
            .values({ sourceEntryId: entryId, targetEntryId: rel.id, similarityScore: rel.similarity })
            .onConflictDoNothing();
        }
      }
    });
  } catch (error: unknown) {
    console.error(`Pipeline failed for entry ${entryId}:`, error);
    await db
      .update(entries)
      .set({
        processedStatus: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(entries.id, entryId));
  }
}
```

### 3. Update `analyzeContentSchema` to include `language`

In `tools/analyze-content.ts`, add to the schema:

```ts
language: z.string().describe('ISO 639-1 language code of the content, e.g. "en", "es", "de", "fr"'),
```

And update `analyzeContentSystemPrompt` in `prompts.ts` to mention language detection.

### 4. Handle `note` type entries

For entries where `type === 'note'`, there's no URL extraction or noise removal needed. The content IS the readable content. Add a branch:

```ts
if (entry.type === 'note') {
  // Notes: content is already the readable content, no extraction/cleaning needed
  rawMarkdown = entry.content;
  readableContent = entry.content;
  // Skip to analysis directly (no cleanContent needed for user-written text)
}
```

Or more cleanly: skip `cleanContent` for notes since user-written text has no web noise.

---

## Suggestions & Improvements

- **Fetch existing tags/topics for reuse hints** — the current pipeline has a TODO comment about this (line 72). Now we actually do it. This dramatically improves tag consistency across entries.
- **`content = readableContent`** for backward compat — the mobile app's `EntryMarkdownBody` reads `entry.content`. After this change it gets clean markdown instead of noisy scraped HTML. This is a UX improvement with zero mobile code changes.
- **Title from metadata** — if `entry.title` is null/empty and `extractionMetadata.title` exists, set it:
  ```ts
  title: entry.title || (extractionMetadata?.title as string) || null,
  ```
  This auto-populates titles for URL entries that were created with just a URL.
- **Error granularity** — if `cleanContent` fails but extraction succeeded, consider still saving `rawContent` and marking a partial failure. Currently any error in the pipeline marks the whole entry as failed. For v1 this is fine; revisit if you see frequent cleanContent failures.
- **Dynamic imports for `assignSpace`/`findRelatedEntries`** — currently using dynamic `await import(...)`. Consider switching to static imports for consistency (they're already in the module, no bundle concern on server).

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/pipelines/ingest.ts` | **Rewrite** — full pipeline replacement |
| `apps/server/src/modules/ai/tools/analyze-content.ts` | **Modify** — `language` describe examples include `fr` (field already present from T-003) |
| `apps/server/src/modules/ai/prompts.ts` | **Modify** — analyze system prompt examples include `fr` |

---

## Definition of Done

- [x] `ingest.ts` uses `cleanContent` for noise removal (LLM call #1)
- [x] `ingest.ts` uses `analyzeContent` instead of separate `summarizeText` + `generateTags` + `extractTopics` (LLM call #2)
- [x] `ingest.ts` uses `generateEmbedding(readableContent)` — not raw markdown
- [x] `ingest.ts` uses `extractCoverImage(metadata, rawMarkdown)` — pure function
- [x] `ingest.ts` computes `wordCount` from `readableContent`
- [x] Extraction step captures `metadata` from Jina/Firecrawl result
- [x] Transaction persists ALL new fields: `rawContent`, `readableContent`, `coverImageUrl`, `metadata`, `keyPoints`, `summary`, `wordCount`, `language`
- [x] `content` field set to `readableContent` (backward compat)
- [x] Existing tags/topics fetched and passed to `analyzeContent` for reuse hints
- [x] `analyzeContentSchema` includes `language` field (ISO 639-1)
- [x] `note` type entries skip extraction and cleaning (content is already user-written)
- [x] Auto-populate `title` from metadata when entry title is empty
- [x] Old imports removed (`summarizeText`, `generateTags`, `extractTopics` no longer called in pipeline)
- [x] TypeScript compiles (`pnpm typecheck`)
- [x] Tag/topic lookups scoped by `userId` + `name` (fixes cross-user collision risk)
- [x] End-to-end test: ingest a URL entry, verify in DB that ALL new columns are populated correctly (run locally against dev DB + API)

---

## Verification (end-to-end)

After implementation, ingest a URL (e.g. a blog post) and verify:

| Column | Expected |
|--------|----------|
| `raw_content` | Full noisy scraped markdown (with images, nav, etc.) |
| `readable_content` | Clean article text (no nav/footer/ads) |
| `content` | Same as `readable_content` |
| `cover_image_url` | OG image URL or first article image |
| `metadata` | `{ title, description, ogImage, siteName, ... }` |
| `key_points` | Array of 3-7 specific takeaways |
| `summary` | 2-4 sentence summary |
| `word_count` | Reasonable integer (e.g. 500-5000 for an article) |
| `language` | "en" (or appropriate ISO code) |
| `title` | Populated from metadata if was empty |
| Embedding | Present in `embeddings` table |
| Tags | Present in `entry_tags` / `tags` |
| Topics | Present in `entry_topics` / `topics` |
| Space | Assigned or suggestion created |
| Relations | Linked if similar entries exist |

---

## Commit

```
feat(ai): rewire ingest pipeline with enriched extraction flow
```
