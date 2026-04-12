# T-010: Semantic Search Screen

**Status:** done
**Phase:** 3 — Frontend Interactions
**Type:** feature (full stack — server endpoint + mobile screen)
**Risk:** low (embeddings + vector search already work; wiring to UI)
**Depends on:** T-005 (embeddings generated), T-009 (titles exist)

---

## Goal

Let the user search their memories by meaning. Type a query, get results ranked by semantic similarity. Pure embedding search — no full-text search for now (that comes when we add more content types).

---

## Current State

**Embeddings:** Every processed entry gets a 1536-dim vector via `text-embedding-3-small`. Stored in `embeddings` table with `entryId` FK.

**Vector search:** `findRelatedEntries()` in `tools/find-related-entries.ts` already does pgvector cosine search (`<=>` operator). Returns `{ id, title, summary, similarity }`. Currently only used internally by the ingest pipeline for `entryRelations`.

**Search screen:** Placeholder in `features/search/screens/SearchScreen/index.tsx` — just centered text.

**No search endpoint** — no contract, no service method, no router handler.

---

## What to Do

### 1. Contract — add `search` route

**File:** `packages/shared/src/contracts/entry.contract.ts`

Add a search input/output schema and route:

```ts
export const entrySearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.number().int().min(1).max(30).default(15),
});

export const entrySearchResultItemSchema = entrySchema.extend({
  similarity: z.number(),
});

export const entrySearchOutputSchema = z.object({
  items: z.array(entrySearchResultItemSchema),
});
```

Add to `entryContract`:

```ts
search: oc
  .input(entrySearchInputSchema)
  .output(entrySearchOutputSchema),
```

**Why return full `entrySchema` rows (not just id + title + similarity):** The search result card needs `type`, `summary`, `coverImageUrl`, `createdAt`, `isFavorited`, `isPinned` — enough to render a rich compact card and navigate to detail. Returning full rows avoids N+1 detail fetches. The DB join is cheap since we already join `entries` + `embeddings`.

### 2. Service — add `search` method

**File:** `apps/server/src/services/entry.service.ts`

```ts
async search(
  database: typeof db,
  userId: string,
  input: { query: string; limit: number },
  embedding: number[],
): Promise<{ items: SearchResultEntry[] }> {
```

The method receives an **already-generated embedding** (the router generates it — separation of concerns: service doesn't call AI tools).

Query pattern (similar to `findRelatedEntries` but returns full entry rows):

```ts
const rows = await database
  .select({
    ...getTableColumns(entries),
    similarity: sql<number>`1 - (${embeddings.vector} <=> ${JSON.stringify(embedding)}::vector)`.as('similarity'),
  })
  .from(entries)
  .innerJoin(embeddings, eq(entries.id, embeddings.entryId))
  .where(
    and(
      eq(entries.userId, userId),
      eq(entries.isArchived, false),
    ),
  )
  .orderBy(sql`${embeddings.vector} <=> ${JSON.stringify(embedding)}::vector`)
  .limit(input.limit);
```

Map rows through `toEntry()` and append `similarity`. Filter out very low similarity results (< 0.3) on the server to avoid returning noise.

**Import needed:** `getTableColumns` from `drizzle-orm` to select all entry columns without listing them.

### 3. Router — wire search handler

**File:** `apps/server/src/router/entry.router.ts`

```ts
search: authed
  .input(entrySearchInputSchema)
  .handler(async ({ input, context }) => {
    const embedding = await generateEmbedding(input.query);
    return entryService.search(context.db, context.user!.id, input, embedding);
  }),
```

The router calls `generateEmbedding` on the query string, then passes the vector to the service. This keeps the embedding concern at the edge — the service is pure DB logic.

**Import:** `generateEmbedding` from `modules/ai/tools/generate-embedding.js`

### 4. Mobile — search hook

**File:** `apps/mobile/src/features/search/hooks/useSemanticSearch.ts` (new)

```ts
import { orpc } from "@/lib/orpc";
import { useQuery } from "@tanstack/react-query";

export function useSemanticSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    ...orpc.entries.search.queryOptions({
      input: { query: trimmed },
    }),
    enabled: trimmed.length >= 2,
    staleTime: 60_000,
  });
}
```

- **`enabled: trimmed.length >= 2`** — don't fire on empty or single-char input
- **`staleTime: 60_000`** — cache results for 1 minute (embeddings don't change often)
- No debounce in the hook — debounce in the UI component (keeps the hook simple)

### 5. Mobile — compact search result card

**File:** `apps/mobile/src/features/search/components/SearchResultCard/index.tsx` (new)

A compact card for scanning, **not** the full feed `EntryCard`. HeroUI `Card` + `PressableFeedback`:

```ts
type SearchResultCardProps = {
  title: string;
  summary?: string;
  type: "url" | "note";
  similarity: number;
  date: string;
  coverImageUrl?: string | null;
  isFavorited?: boolean;
  isPinned?: boolean;
  onPress: () => void;
};
```

Layout:

```
┌─────────────────────────────────────────────┐
│ [type icon] [pin?] [fav?] Title...   92%    │
│ Summary snippet, plain text, 2 lines max... │
│ 12. April                                   │
└─────────────────────────────────────────────┘
```

Key differences from feed `EntryCard`:
- **No cover image** — keeps results compact for scanning (cover can be added later as a small thumbnail)
- **No collapsible markdown** — plain `<Text numberOfLines={2}>` for summary snippet
- **No shimmer/processing states** — search only returns processed entries (they have embeddings)
- **Similarity badge** — small percentage in accent color, top-right corner
- **Smaller overall** — less padding, tighter spacing

Uses HeroUI `Card`, `PressableFeedback`, `useThemeColor`. `MaterialIcons` for type/pin/fav icons (same pattern as `EntryCard`).

### 6. Mobile — build the SearchScreen

**File:** `apps/mobile/src/features/search/screens/SearchScreen/index.tsx` (rewrite)

Structure:

```tsx
export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 400);
  const { data, isPending, isError } = useSemanticSearch(debouncedQuery);
  // ...

  return (
    <ScreenInset edges={["top"]} className="flex-1 bg-background">
      {/* Search input */}
      <View className="px-screen pt-md pb-sm">
        <Input
          placeholder="Search your memories..."
          value={query}
          onChangeText={setQuery}
          startContent={<MaterialIcons name="search" ... />}
          endContent={query ? <Pressable onPress={clearQuery}>
            <MaterialIcons name="close" ... />
          </Pressable> : null}
          autoFocus={false}
        />
      </View>

      {/* Results */}
      <FlatList
        data={data?.items ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SearchResultCard
            title={item.title ?? "Untitled"}
            summary={item.summary}
            type={item.type}
            similarity={item.similarity}
            date={formatDate(item.createdAt)}
            coverImageUrl={item.coverImageUrl}
            isFavorited={item.isFavorited}
            isPinned={item.isPinned}
            onPress={() => router.push({ pathname: "/entry/[id]", params: { id: item.id } })}
          />
        )}
        ListEmptyComponent={emptyState}
        contentContainerStyle={{ paddingBottom: bottomPad }}
      />
    </ScreenInset>
  );
}
```

**Empty states:**
- Query empty → "Search by meaning — describe what you're looking for"
- Query entered, loading → activity indicator
- Query entered, no results → "No matches found"
- Error → error message with retry

**Debounce:** Use a simple `useDebouncedValue` hook (new small hook or inline `useEffect` + `setTimeout`). 400ms delay — fast enough to feel responsive, slow enough to avoid hammering the embedding API.

**HeroUI `Input`** for the search field — check if heroui-native exports `Input`. If not, use a styled `TextInput` with the same token-based styling as other inputs in the app.

### 7. Mobile — `useDebouncedValue` hook

**File:** `apps/mobile/src/hooks/useDebouncedValue.ts` (new, if not already in the codebase)

Small utility hook:

```ts
export function useDebouncedValue<T>(value: T, delayMs: number): [T] {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return [debounced];
}
```

This is a shared hook (useful beyond search) so it lives in `src/hooks/`.

---

## Suggestions & Improvements

- **Compact card vs. feed card** — search is for scanning, not browsing. The feed `EntryCard` has cover images, collapsible markdown summaries, shimmer states, and processing chips — too heavy for search results. A compact card with title + plain text snippet + similarity score is faster to scan. Type-specific variations (video thumbnails, image previews) can be added later when those content types exist.
- **Server-side similarity cutoff** (0.3 threshold) prevents returning garbage results. Below 0.3 cosine similarity, results are essentially random.
- **Embedding the query** happens in the router, not the service. This keeps the service as pure DB logic and makes it testable without mocking AI tools.
- **No pagination for V1** — return up to 15 results. Semantic search with a fixed limit is fine; users rarely scroll past 10 results. Add cursor pagination later if needed.
- **No full-text search** — pure embedding similarity. Full-text search (`tsvector` / `ts_rank`) is a separate concern and becomes useful when we add more content types with structured metadata. For now, semantic search covers the "describe what you're looking for" use case well.
- **`staleTime: 60_000`** — embedding results don't change unless new entries are ingested. 1-minute cache avoids re-embedding the same query on tab switches.
- **HeroUI `Input`** — use it for the search field if available. It respects the design system tokens and provides consistent focus/blur styling. Fall back to styled `TextInput` if not exported.

---

## Files

| File | Action |
|------|--------|
| `packages/shared/src/contracts/entry.contract.ts` | **Modify** — add search schemas + route |
| `apps/server/src/services/entry.service.ts` | **Modify** — add `search` method |
| `apps/server/src/router/entry.router.ts` | **Modify** — add `search` handler with embedding |
| `apps/mobile/src/features/search/hooks/useSemanticSearch.ts` | **Create** — query hook with enabled guard |
| `apps/mobile/src/features/search/components/SearchResultCard/index.tsx` | **Create** — compact result card |
| `apps/mobile/src/features/search/screens/SearchScreen/index.tsx` | **Rewrite** — search input + results list |
| `apps/mobile/src/hooks/useDebouncedValue.ts` | **Create** — shared debounce hook (if not existing) |

---

## Definition of Done

- [ ] `entrySearchInputSchema` defined with `query` (string, 1-500) and `limit` (int, 1-30, default 15)
- [ ] `entrySearchResultItemSchema` extends `entrySchema` with `similarity: number`
- [ ] `entryContract` has `search` route
- [ ] `entryService.search` queries entries + embeddings with cosine similarity, returns full rows + score
- [ ] Server filters out `isArchived = true` and similarity < 0.3
- [ ] Router embeds query via `generateEmbedding` before calling service
- [ ] `useSemanticSearch(query)` hook fires when query >= 2 chars, caches 60s
- [ ] `SearchResultCard` renders: type icon, pin/fav indicators, title (2 lines), summary snippet (plain text, 2 lines), similarity percentage, date
- [ ] `SearchResultCard` uses HeroUI `Card` + `PressableFeedback`
- [ ] `SearchScreen` has search input with clear button, debounced at 400ms
- [ ] Empty states: no query hint, loading indicator, no results message, error with retry
- [ ] Tapping a result navigates to `/entry/[id]` detail screen
- [ ] `useDebouncedValue` hook created in `src/hooks/` (if not existing)
- [ ] `pnpm typecheck` passes across all workspaces
- [ ] Manual test: type a query → results appear ranked by relevance
- [ ] Manual test: query with no matches → "No matches found" shown
- [ ] Manual test: tap result → navigates to entry detail
- [ ] Manual test: archived entries do NOT appear in search results

---

## Commit

```
feat(search): add semantic search endpoint and search screen with compact result cards
```
