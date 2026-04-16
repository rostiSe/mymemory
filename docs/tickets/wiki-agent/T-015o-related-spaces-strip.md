# T-015o: Related Spaces Strip (shared wiki pages)

**Status:** pending
**Phase:** Quality
**Type:** feature (server + mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** [T-015a](./T-015a-schema-migration.md) (`space_wiki_pages` M2M), [T-015f](./T-015f-wiki-page-rendering.md) (wiki pages exist), [T-015l](./T-015l-spaces-screen-redesign.md) (visual language)

---

## Goal

Surface the "computed strength between spaces" design decision from the epic. Two spaces are **related** when they share wiki pages via `space_wiki_pages`. Render the top related spaces on `SpaceDetailScreen` as a horizontal card strip so the user can move laterally through the wiki along agent-discovered topical overlap.

---

## Context

### Where the signal comes from

`space_wiki_pages` (from T-015a) is a pure M2M: `(spaceId, wikiPageId)` primary key, indexed on both columns, cascade on delete. Curator + Writer agents already populate it via the `assignPageToSpaces` tool whenever a page is linked to more than one space. That means the data needed to compute relatedness is already accurate and cheap to query:

```sql
SELECT other.id,
       other.name,
       other.compilation_status,
       other.last_compiled_at,
       COUNT(DISTINCT b.wiki_page_id) AS shared_count
FROM space_wiki_pages a
JOIN space_wiki_pages b
  ON a.wiki_page_id = b.wiki_page_id
 AND a.space_id <> b.space_id
JOIN spaces other ON other.id = b.space_id
WHERE a.space_id = $spaceId
  AND other.user_id = $userId
GROUP BY other.id
ORDER BY shared_count DESC, other.name ASC
LIMIT $limit;
```

No new schema. No vectors. No embeddings work.

### Baseline surfaces

- [apps/mobile/src/features/space/screens/SpaceDetailScreen/index.tsx](../../../apps/mobile/src/features/space/screens/SpaceDetailScreen/index.tsx) — renders title, description, compilation badge, wiki pages list. No sideways navigation today.
- [packages/shared/src/contracts/space.contract.ts](../../../packages/shared/src/contracts/space.contract.ts) — exposes `list`, `getById`, `create`, suggestion endpoints, entry assignment endpoints, `delete`. No `relatedSpaces` endpoint.
- [apps/server/src/modules/spaces/services/space.service.ts](../../../apps/server/src/modules/spaces/services/space.service.ts) — has `list`, `getById`, `create`, entries methods, delete. No relatedness query.
- [apps/mobile/src/features/entry/components/FeedFilterBar/index.tsx](../../../apps/mobile/src/features/entry/components/FeedFilterBar/index.tsx) — canonical horizontal-scroll pattern: `ScrollView horizontal showsHorizontalScrollIndicator={false}` with `contentContainerClassName="flex-row items-center gap-2 px-screen"`.

---

## File structure

```
packages/shared/src/contracts/
  space.contract.ts                         (MOD — add relatedSpaces endpoint + schemas)
apps/server/src/
  modules/spaces/services/space.service.ts  (MOD — add getRelatedSpaces)
  router/space.router.ts                    (MOD — wire relatedSpaces handler)
apps/mobile/src/features/space/
  hooks/useRelatedSpaces.ts                 (NEW)
  components/RelatedSpacesStrip/
    index.tsx                               (NEW)
    index.styles.ts                         (NEW)
  components/RelatedSpaceCard/
    index.tsx                               (NEW)
    index.styles.ts                         (NEW)
  screens/SpaceDetailScreen/
    index.tsx                               (MOD — render strip under wiki pages)
```

---

## Scope

### 1. Contract — `spaces.relatedSpaces`

**File:** `packages/shared/src/contracts/space.contract.ts`

Add input + output schemas and the endpoint. Place the endpoint immediately after `getById`.

```ts
export const relatedSpaceSchema = z.object({
  space: spaceSchema,          // reuses existing schema (includes compilationStatus, lastCompiledAt, origin)
  sharedPageCount: z.number().int().positive(),
});
export type RelatedSpace = z.infer<typeof relatedSpaceSchema>;

export const relatedSpacesInputSchema = z.object({
  spaceId: z.string().uuid(),
  limit: z.number().int().min(1).max(20).default(5).optional(),
});

// in contract definition
relatedSpaces: authed
  .input(relatedSpacesInputSchema)
  .output(z.array(relatedSpaceSchema)),
```

### 2. Service — `spaceService.getRelatedSpaces`

**File:** `apps/server/src/modules/spaces/services/space.service.ts`

```ts
async getRelatedSpaces(
  db: Db,
  userId: string,
  spaceId: string,
  limit = 5,
): Promise<RelatedSpace[]> {
  // Self-join on space_wiki_pages; filter to same user; exclude self; order by shared_count desc.
}
```

Implementation notes:

- Use Drizzle's `sql` for the self-join; the existing pattern in `wiki-tools.ts:181` (`count(distinct ...)`) is the reference.
- Always enforce `other.user_id = userId` (multi-tenant safety; no cross-user leakage).
- Exclude the queried space itself (`a.space_id <> b.space_id`).
- `ORDER BY shared_count DESC, other.name ASC` for deterministic ties.
- `LIMIT limit`.
- Shape rows into `{ space: { ...allSpaceColumns }, sharedPageCount }` — map to `relatedSpaceSchema`.

### 3. Router wiring

**File:** `apps/server/src/router/space.router.ts`

Add one handler block next to `getById`:

```ts
relatedSpaces: authed
  .input(relatedSpacesInputSchema)
  .output(z.array(relatedSpaceSchema))
  .handler(async ({ input, context }) =>
    spaceService.getRelatedSpaces(
      context.db,
      context.user!.id,
      input.spaceId,
      input.limit,
    ),
  ),
```

### 4. Mobile hook — `useRelatedSpaces`

**File:** `apps/mobile/src/features/space/hooks/useRelatedSpaces.ts`

```ts
export function useRelatedSpaces(spaceId: string | undefined) {
  return useQuery({
    ...orpc.spaces.relatedSpaces.queryOptions({ input: { spaceId: spaceId ?? "" } }),
    enabled: typeof spaceId === "string" && spaceId.length > 0,
    staleTime: 30_000,
  });
}
```

Co-locate with the other space hooks so it follows the same pattern as `useSpaces` / `useSpace`.

### 5. `RelatedSpaceCard`

**Files:**
- `apps/mobile/src/features/space/components/RelatedSpaceCard/index.tsx`
- `apps/mobile/src/features/space/components/RelatedSpaceCard/index.styles.ts`

Props:

```ts
type RelatedSpaceCardProps = {
  item: RelatedSpace;
  onPress: (spaceId: string) => void;
};
```

Visual:

- Outer `Pressable` → `tv` card with `rounded-card bg-surface border border-border px-3 py-3 min-w-[200px] max-w-[260px]`.
- Top line: 6x6 `rounded-card bg-accent` square + name (`text-foreground text-sm font-semibold`, `numberOfLines={1}`).
- Signal row: `Chip size="sm" variant="soft" color="accent" className="rounded-card"` with label `${sharedPageCount} shared` + compile dot (reuse the same color logic from `SpaceListRow`).
- `accessibilityRole="button"`, `accessibilityLabel="Open related space ${name}, ${sharedPageCount} shared pages"`.

### 6. `RelatedSpacesStrip`

**Files:**
- `apps/mobile/src/features/space/components/RelatedSpacesStrip/index.tsx`
- `apps/mobile/src/features/space/components/RelatedSpacesStrip/index.styles.ts`

Props:

```ts
type RelatedSpacesStripProps = { spaceId: string };
```

Behavior:

- Consumes `useRelatedSpaces(spaceId)`.
- Renders nothing when `isPending`, when `data` is empty, or on error (silent — this is decorative, not load-bearing).
- Header: `text-xs uppercase tracking-wide text-muted mb-2 px-1` reading `Related spaces`.
- Horizontal `ScrollView` with the FeedFilterBar pattern: `horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="flex-row items-center gap-2 px-screen"`.
- Maps to `RelatedSpaceCard`, `onPress` calls `router.push({ pathname: "/space/[id]", params: { id } })`.
- Wrapped in a `View className="pt-4 pb-2"` for spacing under the Wiki pages list.

### 7. SpaceDetailScreen integration

**File:** `apps/mobile/src/features/space/screens/SpaceDetailScreen/index.tsx`

- Import and render `<RelatedSpacesStrip spaceId={spaceId} />` as the last section, after the "Wiki pages" list.
- No other layout changes.

---

## File changes summary

| Action | File | Purpose |
|--------|------|---------|
| MOD | `packages/shared/src/contracts/space.contract.ts` | Add `relatedSpaceSchema`, input schema, endpoint |
| MOD | `apps/server/src/modules/spaces/services/space.service.ts` | Add `getRelatedSpaces` |
| MOD | `apps/server/src/router/space.router.ts` | Wire `relatedSpaces` handler |
| NEW | `apps/mobile/src/features/space/hooks/useRelatedSpaces.ts` | TanStack Query hook |
| NEW | `apps/mobile/src/features/space/components/RelatedSpaceCard/{index.tsx,index.styles.ts}` | Single card |
| NEW | `apps/mobile/src/features/space/components/RelatedSpacesStrip/{index.tsx,index.styles.ts}` | Horizontal strip |
| MOD | `apps/mobile/src/features/space/screens/SpaceDetailScreen/index.tsx` | Render strip |
| MOD | `docs/tickets/wiki-agent/T-015-wiki-agent-epic.md` | Add T-015o to Quality table |

---

## Edge cases

- **Freshly compiled user with no cross-linked pages**: query returns empty; strip renders nothing. No "No related spaces" copy — decorative.
- **Space with only one wiki page, shared with 10 others**: 10 results exist, limit caps at 5. Deterministic tie-break (alphabetical) ensures stable ordering across refetches.
- **Deleted space (race)**: query filters `user_id = current user`; cascade on `space_wiki_pages` means a deleted space drops out naturally.
- **User currently has zero wiki pages**: strip silent.
- **Compilation mid-run for this space**: related spaces still render; the signal is about the saved join table, not in-flight compile state.
- **Index space (`isIndex = true`)**: not special-cased. Likely shares pages with many spaces and will have high counts. Acceptable.

---

## What this does NOT include

- `SpacesScreen` row-level "N linked" chips.
- "Also in" row on wiki page detail (that's the raw M2M, not an aggregate — different feature).
- Cosine / centroid-based similarity (`spaces.centroidVector` is not populated today; defer).
- Caching / precomputation beyond TanStack Query `staleTime`.
- Shared-entries signal (`entry_spaces`) — the synthesized signal we care about is pages.
- Ability to pin or hide individual related spaces.

---

## DoD

- [ ] `relatedSpaceSchema` + `relatedSpacesInputSchema` exported from `space.contract.ts`.
- [ ] `spaces.relatedSpaces` endpoint present in contract and router; `authed` middleware applied.
- [ ] `spaceService.getRelatedSpaces` enforces `user_id` equality on the joined space; excludes self; ordered by `sharedPageCount DESC, name ASC`; respects `limit` (default 5, max 20).
- [ ] `useRelatedSpaces(spaceId)` disabled when `spaceId` is falsy; `staleTime` set.
- [ ] `RelatedSpaceCard` uses `rounded-card`, reuses the `SpaceListRow` compile-dot color logic, shows `${sharedPageCount} shared` chip, accessible.
- [ ] `RelatedSpacesStrip` silently renders nothing when the result array is empty.
- [ ] `SpaceDetailScreen` renders the strip after the Wiki pages list.
- [ ] Tapping a related card navigates to that space's detail.
- [ ] No cross-user leakage — manual verification with two users sharing a common entry title but no linked pages.
- [ ] `pnpm -w run typecheck` clean.
- [ ] Epic Quality table links T-015o to this file.

---

## Verification

1. Compile a fresh wiki that yields at least two spaces linked to the same page (e.g., "React Hooks" linked to both "Frontend" and "Machine Learning UX").
2. Open "Frontend" → the strip at the bottom shows "Machine Learning UX" with `1 shared` chip.
3. Navigate to the related card → loads that space's detail; its strip now shows "Frontend" with `1 shared`.
4. Compile again after adding a second cross-linked page → `sharedPageCount` increments.
5. Delete one of the spaces via T-015m flow → the strip updates on return via TanStack invalidation.
6. Create a new user in dev, seed them with zero pages → the strip renders nothing; no stray cards.

---

## Ticket sequence (context)

```
T-015a (space_wiki_pages schema)
  └→ T-015b (assignPageToSpaces tool populates it)
       └→ T-015c (Writer/Curator actually links pages across spaces)
            └→ T-015o (this ticket — aggregate + surface)
                 └→ T-015p (auto-compile: keeps the join table populated without manual compile)
```

---

## Follow-up ideas (out of scope)

- Promote the strip to a reusable "Sideways nav" primitive if other screens want the same lateral jump.
- Second-order relatedness: "spaces that share pages with spaces that share pages with this space" (graph walk, 2 hops).
- Weight by Writer confidence or page maturity.
- Show a short list of the actually-shared pages on long-press preview.
- When `spaces.centroidVector` is populated in a future ticket, blend cosine similarity as a tie-breaker below `sharedPageCount`.
