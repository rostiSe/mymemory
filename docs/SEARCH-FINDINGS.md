# Search Quality — Findings & Future Work

## Summary

Semantic search is implemented end-to-end but has **fundamental quality issues**. The core problem: embeddings are generated from article body text only, without title/summary/tags/topics enrichment, and there is no vector index — every search does a full table scan.

---

## Critical Findings

### 1. Incomplete Embedding Input (biggest quality issue)

**Problem:** Only `readableContent` (cleaned article body) is embedded. The AI-generated title, summary, key points, tags, and topics are NOT included in the embedding input.

**Why this matters:**
- The summary is a distilled version of the article's meaning — it's often a *better* embedding input than the full noisy body
- Tags and topics provide categorical signal the body text may not contain explicitly
- The title is what users remember and search for
- A user searching "react native performance tips" may not find an article whose body discusses the topic but whose title is "Making Your App Faster"

**Where:** `ingest.ts:102` — `generateEmbedding(readableContent)` only

**Fix:** Compose a richer embedding input that includes title + summary + key points + tags + body (truncated). Something like:

```
Title: {title}
Summary: {summary}
Key Points: {keyPoints.join('. ')}
Tags: {tags.join(', ')}
Topics: {topics.join(', ')}

{readableContent (truncated)}
```

This gives the embedding model the full semantic picture. The summary alone might be a better embedding input than 50K chars of article body for many search queries.

**Trade-off:** This means embedding must happen AFTER `analyzeContent` completes (currently they run in parallel). This adds ~1-2s to pipeline latency. Worth it for quality.

### 2. No Vector Index

**Problem:** The `embeddings` table has no HNSW or IVFFlat index. Every `<=>` query is a sequential scan across all rows.

**Impact:**
- 100 entries: ~10ms (fine)
- 1,000 entries: ~100ms (noticeable)
- 10,000 entries: ~1s (slow)
- 100,000 entries: ~10s (unusable)

**Where:** `packages/db/src/schema/embeddings.ts` — no index defined

**Fix:** Add HNSW index (best for cosine similarity):

```sql
CREATE INDEX embeddings_vector_hnsw_idx
  ON embeddings
  USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

HNSW gives approximate nearest neighbors in ~1-5ms regardless of table size. The accuracy trade-off (vs exact scan) is negligible for this use case.

### 3. Low Similarity Threshold (0.3)

**Problem:** The threshold of 0.3 is very permissive. In embedding space, 0.3 cosine similarity means the texts are only vaguely related.

**Typical thresholds:**
| Threshold | Meaning |
|-----------|---------|
| 0.8 - 1.0 | Near-identical content |
| 0.6 - 0.8 | Strongly related |
| 0.4 - 0.6 | Somewhat related |
| 0.2 - 0.4 | Weakly related (mostly noise) |
| 0.0 - 0.2 | Unrelated |

**Where:** `entry.service.ts:21` — `SEMANTIC_SEARCH_MIN_SIMILARITY = 0.3`

**Fix:** Raise to 0.45-0.5. Test with real queries first — the right threshold depends on embedding quality (which will improve after fixing #1).

### 4. Parallel Embedding Prevents Enriched Input

**Problem:** Currently `analyzeContent` and `generateEmbedding` run in parallel (line 95-96 of `ingest.ts`):

```ts
const [analysis, embedding] = await Promise.all([
  analyzeContent({ markdown: readableContent, ... }),
  generateEmbedding(readableContent),
]);
```

Because they're parallel, the embedding can't include the analysis results (title, summary, tags). This was a deliberate trade-off for pipeline speed, but it hurts search quality.

**Fix:** Run `analyzeContent` first, then compose enriched text, then embed:

```ts
const analysis = await analyzeContent({ ... });
const enrichedText = composeEmbeddingInput(analysis, readableContent);
const embedding = await generateEmbedding(enrichedText);
```

**Cost:** ~1-2s extra pipeline latency (one sequential step instead of parallel). The embedding API call itself is fast (~200ms).

### 5. Silent Chunk Truncation

**Problem:** Content over ~221K chars hits the MAX_CHUNKS=40 cap. The tail is silently dropped — no warning, no log.

**Where:** `generate-embedding.ts:36` — loop stops at `chunks.length < MAX_CHUNKS`

**Impact:** Low for now (most web articles are under 50K chars). Could matter for very long PDFs when document ingestion is added.

**Fix:** Add a `console.warn` when MAX_CHUNKS is hit. Consider if this is worth a richer strategy (e.g., embed beginning + end, or use a recursive summarization approach).

---

## Medium-Priority Improvements

### 6. No Query Expansion

**Problem:** The user's query is embedded as-is. Short queries ("react") produce less specific vectors than longer, context-rich queries ("react native performance optimization techniques").

**Fix options:**
- **LLM query expansion:** Before embedding, ask GPT to expand the query: "react" → "React JavaScript library for building user interfaces, components, hooks, state management"
- **Hybrid search:** Combine embedding similarity with full-text search (`tsvector` + `ts_rank`). This catches exact keyword matches that embeddings might miss.

**When:** After content types are added and search needs to handle heterogeneous content.

### 7. No Re-embedding on Retry

**Problem:** When `retryIngest` runs, the old embedding is deleted (cascade) and a new one is created. But the new embedding still uses only `readableContent` without enrichment. Same quality issue as #1.

**Fix:** Same as #1/#4 — once the pipeline composes enriched embedding input, retries benefit automatically.

### 8. Notes vs URLs in Different Embedding Spaces

**Problem:** URLs get AI-cleaned content embedded. Notes get raw user text embedded. These are semantically different distributions — a search query might match one type better than the other.

**Impact:** Low for now. Becomes relevant when mixing many content types.

**Fix:** Consider composing a standard embedding input for all types:

```
Type: note
Title: {title or first line}
Content: {text}
Tags: {tags}
Topics: {topics}
```

---

## Low-Priority / Future Work

### 9. Full-Text Search (Hybrid)

Combine semantic search with PostgreSQL full-text search for best-of-both-worlds:
- Semantic: finds conceptually similar content (great for "how do I..." queries)
- Full-text: finds exact matches (great for "useState" or specific terms)

Requires: `tsvector` column + `GIN` index on entries, `ts_rank` scoring, result merging.

### 10. Search Analytics

Track what users search for and what they click. Low-similarity clicks suggest the results were wrong — use this to tune the threshold and embedding strategy.

### 11. Per-Type Search Ranking

When more content types exist (image, video, document), search results should be ranked/grouped by type. A video about "react native" and an article about "react native" are both relevant but should be presented differently.

### 12. Embedding Model Upgrade

`text-embedding-3-small` (1536 dims) is fast and cheap but not the best quality. `text-embedding-3-large` (3072 dims) is better for nuanced similarity. Consider upgrading when the dataset grows and quality matters more than cost.

---

## Recommended Priority Order

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| **P0** | Enrich embedding input (title + summary + tags + body) | High — fixes root cause of bad results | Medium (reorder pipeline) |
| **P0** | Add HNSW vector index | High — prevents performance cliff | Low (one migration) |
| **P1** | Raise similarity threshold to 0.45-0.5 | Medium — removes noise results | Trivial |
| **P1** | Log warning on chunk truncation | Low — observability | Trivial |
| **P2** | Query expansion via LLM | Medium — better short queries | Medium |
| **P2** | Hybrid full-text + semantic search | High — exact match + meaning | High |
| **P3** | Per-type embedding composition | Medium — when types exist | Medium |
| **P3** | Embedding model upgrade | Medium — marginal quality gain | Low (config change + re-embed) |
