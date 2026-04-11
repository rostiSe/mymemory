# Feed and entries feature

How the **feed list**, **optimistic create**, and small **pure utilities** are split so `FeedScreen` stays thin.

## Screen and composition

- **Feed screen**: `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx` — composes list, header, loading/error states; delegates behavior to hooks.
- **List rows**: `FeedScreen/components/` (`FeedListItem`, `EntryCard`, `ProcessingStatus`, etc.).
- **Capture**: `features/entry/components/CaptureComposer` — creation UX wired from the feed header.

## Data fetching

- **`useFeedEntries`** (`hooks/useEntries.ts`) — `useInfiniteQuery` for the entry list. The feed **does not** refetch on every tab focus (avoids constant reloads); use **pull-to-refresh** or rely on mutation / `entry-query-cache` updates. For other screens that truly need “refetch when focused,” use `useRefetchOnScreenFocus` there only.

## Optimistic create

**`useFeedOptimisticCreate`** (`hooks/useFeedOptimisticCreate.ts`) combines:

- React 19 **`useOptimistic`** + **`useTransition`** for a transient **pending row** on top of server pages.
- **`useCreateEntry`** for the real mutation.

It exposes **`optimisticRows`** for `FlatList`, **`isInitialLoading`** for first-load spinner policy, and **`captureComposerProps`** for `FeedHeader` → `CaptureComposer`.

## List utilities (pure, test-friendly)

| File | Responsibility |
|------|----------------|
| `utils/flattenEntryListPages.ts` | Flatten paged infinite data into a single item array for list rendering |
| `utils/feed-rows.ts` | Types / helpers for union of server row vs pending placeholder |
| `utils/optimisticRowId.ts` | Stable temporary id for optimistic rows |
| `utils/buildEntryMetaLine.ts` | Presentation string for subtitle/meta line |

Keep new feed-only formatting or row shaping in `utils/`; keep orchestration in hooks.

## Detail screen

`screens/EntryDetailScreen/` with hero, markdown body, tags, etc. **`useEntryById`** for data; scroll helpers in `hooks/useEntryDetailScroll.ts` where needed.

## When contracts or ingest change

Follow the checklist in **`entry-query-cache.ts`** (entries infinite feed + detail only): shared Zod, merge rules in that file, optimistic UI, Share Quick. Other domains: TanStack `setQueryData` / `invalidateQueries` — see [sync-and-cache.md](./sync-and-cache.md).

Build shared: [workspace-and-build.md](./workspace-and-build.md).
