# T-008: Feed Improvements — Cover Images, Indicators, Filters, Archive

**Status:** done
**Phase:** 3 — Frontend Interactions
**Type:** feature (full stack — server filter param + mobile UI)
**Risk:** low-medium (touches FlatList rendering, filter state, and list query)
**Depends on:** T-006 (mutation hooks), T-007 (detail interactions wired)

---

## Goal

Make the feed more useful and visually rich:
1. **Cover image thumbnails** on feed cards
2. **Favorite/pin indicators** on cards (small icons)
3. **Filter bar** — All / Favorites / Pinned / To Review
4. **Pinned entries stick to top** of the feed
5. **Archived entries hidden** from the default feed
6. **Swipe-to-archive** on feed list items

---

## Current State

**FeedScreen (`FeedScreen/index.tsx`):**
- FlatList with `optimisticRows` from infinite query
- No filters — shows all entries ordered by `createdAt desc`
- Pull-to-refresh, infinite scroll, optimistic creates

**EntryCard (`EntryCard/index.tsx`):**
- Shows: type icon, title, date, metaHint (word count + language), summary (collapsible)
- No cover image, no favorite/pin indicators
- Props: `{ title, summary, summaryLoading, type, date, metaHint, onPress }`

**FeedListItem (`FeedListItem/index.tsx`):**
- Thin memo'd wrapper — formats date, passes props to EntryCard
- No swipe gestures

**List query (`entryListInputSchema`):**
- Current: `{ limit, cursor }` — no filter param
- Server returns all entries for the user, ordered by `createdAt desc`

---

## What to Do

### 1. Server — add filter param to list endpoint

**File:** `packages/shared/src/contracts/entry.contract.ts`

Extend `entryListInputSchema`:

```ts
export const entryListInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().nullish(),
  filter: z.enum(['all', 'favorites', 'pinned', 'to-review']).default('all'),
});
```

**File:** `apps/server/src/services/entry.service.ts`

In `listPaginated`, build the WHERE clause based on filter:

```ts
// Base: always filter by userId + never show archived (unless we add an 'archived' filter later)
let filterClause = and(
  eq(entries.userId, userId),
  eq(entries.isArchived, false),
);

switch (input.filter) {
  case 'favorites':
    filterClause = and(filterClause, eq(entries.isFavorited, true));
    break;
  case 'pinned':
    filterClause = and(filterClause, eq(entries.isPinned, true));
    break;
  case 'to-review':
    filterClause = and(filterClause, eq(entries.reviewStatus, 'unreviewed'));
    break;
  // 'all': no additional filter
}
```

Also: for the `'all'` filter, order pinned entries first:

```ts
.orderBy(
  desc(entries.isPinned),      // pinned first
  desc(entries.createdAt),
  desc(entries.id),
)
```

**Note:** Cursor pagination must account for the new ordering. Since `isPinned` is a boolean, the cursor still works on `(createdAt, id)` within each group (pinned, then unpinned). This is fine as long as we don't mix pin states across page boundaries — which is unlikely with a small number of pinned entries.

### 2. Mobile — add filter bar component

**File:** `apps/mobile/src/features/entry/components/FeedFilterBar/index.tsx`

A horizontal row of filter chips below the FeedHeader:

```tsx
type FeedFilter = 'all' | 'favorites' | 'pinned' | 'to-review';

type FeedFilterBarProps = {
  active: FeedFilter;
  onChange: (filter: FeedFilter) => void;
};
```

Render as a `ScrollView horizontal` with `Chip` components (from heroui-native). Active chip gets filled style, others outlined.

Filter labels:
- All
- Favorites (heart icon)
- Pinned (pin icon)
- To Review

### 3. Mobile — wire filter to feed query

**File:** `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx`

Add filter state:

```ts
const [feedFilter, setFeedFilter] = useState<FeedFilter>('all');
```

Pass filter to the query. Currently `useFeedEntries()` takes no args — add the filter param:

**File:** `apps/mobile/src/features/entry/hooks/useEntries.ts`

```ts
export function useFeedEntries(filter: FeedFilter = 'all') {
  return useInfiniteQuery({
    ...orpc.entries.list.infiniteOptions({
      input: { limit: FEED_PAGE_SIZE, filter },
      // ...
    }),
  });
}
```

When filter changes, TanStack Query auto-refetches (different query key).

### 4. Mobile — add cover image to EntryCard

**File:** `apps/mobile/src/features/entry/screens/FeedScreen/components/EntryCard/index.tsx`

Add `coverImageUrl` prop:

```ts
interface EntryCardProps {
  // ... existing props
  coverImageUrl?: string | null;
}
```

Render a small thumbnail at the top of the card (above the title row) when present:

```tsx
{coverImageUrl ? (
  <Image
    source={{ uri: coverImageUrl }}
    className="h-32 w-full rounded-t-md"
    resizeMode="cover"
  />
) : null}
```

The card goes from text-only to image+text when a cover image exists. Cards without images look the same as before.

### 5. Mobile — add favorite/pin indicators to EntryCard

**File:** `apps/mobile/src/features/entry/screens/FeedScreen/components/EntryCard/index.tsx`

Add props:

```ts
interface EntryCardProps {
  // ... existing
  isFavorited?: boolean;
  isPinned?: boolean;
}
```

Show small icons in the header row (next to the type icon):

```tsx
{isPinned && (
  <MaterialIcons name="push-pin" size={14} color={accentColor} />
)}
{isFavorited && (
  <MaterialIcons name="favorite" size={14} color={dangerColor} />
)}
```

Subtle — 14px icons, colored, between the type icon and title.

### 6. Mobile — pass new props through FeedListItem

**File:** `apps/mobile/src/features/entry/screens/FeedScreen/components/FeedListItem/index.tsx`

Add to `FeedListItemProps`:

```ts
coverImageUrl?: string | null;
isFavorited?: boolean;
isPinned?: boolean;
```

Pass through to `EntryCard`.

**File:** `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx`

In `renderItem`, pass the new fields from the entry row:

```ts
<FeedListItem
  // ... existing
  coverImageUrl={item.coverImageUrl}
  isFavorited={item.isFavorited}
  isPinned={item.isPinned}
/>
```

### 7. Mobile — swipe-to-archive on FeedListItem

**File:** `apps/mobile/src/features/entry/screens/FeedScreen/components/FeedListItem/index.tsx`

Wrap the card in a swipeable component. Check if `react-native-gesture-handler` `Swipeable` is available (likely already installed via Expo).

Right swipe reveals an "Archive" action:

```tsx
import { Swipeable } from 'react-native-gesture-handler';

function renderRightActions() {
  return (
    <View className="justify-center bg-warning px-6">
      <MaterialIcons name="archive" size={24} color="white" />
    </View>
  );
}

<Swipeable
  renderRightActions={renderRightActions}
  onSwipeableOpen={() => {
    toggleField.mutate({ id: entryId, field: 'isArchived', value: true });
  }}
>
  <EntryCard ... />
</Swipeable>
```

When swiped, the entry gets archived and disappears from the feed (server filter excludes `isArchived = true`). The next pull-to-refresh or query refetch removes it from the list.

For optimistic removal: after the toggle mutation fires, manually remove the entry from the infinite list cache via `removeEntryRowFromCaches`.

---

## Suggestions & Improvements

- **Server-side filtering** is better than client-side for large datasets. The query key changes with filter → TanStack Query caches each filter view separately.
- **Pinned-first ordering** only applies to the `'all'` filter. In `'pinned'` filter, all results are pinned so no special ordering needed.
- **Cover image height** — use a fixed height (`h-32` = 128px) with `resizeMode="cover"` for consistent card sizing. Broken images can fall back to no image (the card still looks fine without it).
- **Don't add archive to detail screen** — archive is a "I'm done with this for now" action, naturally a feed gesture. The detail screen has "Dismiss" in review status which is a stronger signal.
- **Filter state should NOT persist** to MMKV unless the user explicitly asks. Default to `'all'` on every app open. Simple.
- **Consider a "processing" badge** on feed cards that are still `pending`/`processing` — currently shown as shimmer on summary, but a small chip would make the state more obvious.

---

## Files

| File | Action |
|------|--------|
| `packages/shared/src/contracts/entry.contract.ts` | **Modify** — add `filter` to `entryListInputSchema` |
| `apps/server/src/services/entry.service.ts` | **Modify** — filter + pinned-first ordering in `listPaginated` |
| `apps/mobile/src/features/entry/components/FeedFilterBar/index.tsx` | **Create** — horizontal filter chip bar |
| `apps/mobile/src/features/entry/hooks/useEntries.ts` | **Modify** — accept filter param in `useFeedEntries` |
| `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx` | **Modify** — filter state, pass filter to query, render filter bar, pass new props |
| `apps/mobile/src/features/entry/screens/FeedScreen/components/EntryCard/index.tsx` | **Modify** — add cover image, favorite/pin indicators |
| `apps/mobile/src/features/entry/screens/FeedScreen/components/FeedListItem/index.tsx` | **Modify** — pass new props, add swipe-to-archive |

---

## Definition of Done

- [ ] `entryListInputSchema` has `filter` param with values: `all`, `favorites`, `pinned`, `to-review`
- [ ] Server `listPaginated` filters by `isArchived = false` by default (all filters)
- [ ] Server `listPaginated` applies correct WHERE for each filter value
- [ ] `'all'` filter orders pinned entries first, then by `createdAt desc`
- [ ] `useFeedEntries` accepts filter param, query key changes with filter
- [ ] `FeedFilterBar` renders horizontal chips: All, Favorites, Pinned, To Review
- [ ] Active filter chip is highlighted, tapping changes filter
- [ ] Filter change triggers query refetch (TanStack Query handles this via key)
- [ ] EntryCard shows cover image thumbnail when `coverImageUrl` exists
- [ ] EntryCard shows small pin icon when `isPinned`
- [ ] EntryCard shows small heart icon when `isFavorited`
- [ ] FeedListItem passes `coverImageUrl`, `isFavorited`, `isPinned` to EntryCard
- [ ] Swipe-right on FeedListItem reveals archive action
- [ ] Swiping archives the entry (toggleField mutation) and removes from feed
- [ ] `pnpm typecheck` passes across all workspaces
- [ ] Manual test: toggle favorite on detail → return to feed → heart icon visible on card
- [ ] Manual test: switch to "Favorites" filter → only favorited entries shown
- [ ] Manual test: swipe to archive → entry disappears from feed

---

## Commit

```
feat(feed): add cover images, indicators, filter bar, and swipe-to-archive
```
