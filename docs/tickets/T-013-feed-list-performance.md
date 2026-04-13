# T-013: Feed list performance — FlashList v2, excerpt clamp, row weight

**Status:** in-progress (Phase 1 shipped in repo; manual QA + follow-ups pending)  
**Phase:** 3 — Frontend / UX quality  
**Type:** performance (mobile)  
**Risk:** medium (new list dependency, feed layout, recycling behavior)  
**Depends on:** none

---

## Problem

The home feed used `FlatList`, but with **more than ~15 entries** scrolling felt sluggish on real devices. Root causes are a mix of **list virtualization quality** and **per-row cost** (rich markdown, collapsible + reanimated clamp, dynamic image heights, repeated bottom-sheet portals).

## Goal

1. Adopt **[@shopify/flash-list](https://shopify.github.io/flash-list/) v2** for the feed so recycling and scroll performance match current Shopify recommendations ([What’s new in v2](https://shopify.github.io/flash-list/docs/v2-changes): no `estimatedItemSize`, `contentContainerStyle` supported, `onRefresh` / `refreshing`, optional `drawDistance`, `getItemType` for heterogeneous rows).
2. Replace **`CollapsibleClamp` on feed cards** with a **static** “max lines + bottom fade” component: same visual language (dimmed body + gradient) **without** expand/collapse state, Reanimated height animation, or `estimateExceedsCollapsedLines`. **Entry detail** keeps full `CollapsibleClamp` (expandable summary).
3. Leave room for follow-ups (shared delete sheet, fixed cover height) without blocking this ticket.

## Non-goals (this ticket)

- Removing markdown from feed entirely (optional future).
- Shared delete `BottomSheet` at screen level (recommended follow-up in T-013 notes).
- Changing server pagination size.

## Technical design

### FlashList v2 (`FeedScreen`)

| Topic | Decision |
|--------|-----------|
| Package | `@shopify/flash-list@^2` (installed in `apps/mobile`). |
| API | Use `FlashList` with `data`, `renderItem`, `keyExtractor`, `ListFooterComponent`, `ListEmptyComponent`, `onEndReached`, `onEndReachedThreshold`. |
| Pull-to-refresh | Prefer `refreshControl` via `ScrollViewProps` compatibility; if unsupported in a given release, fall back to `refreshing` + `onRefresh`. |
| Heterogeneous rows | `getItemType` distinguishes optimistic **pending** skeleton rows vs **entry** rows so recycled cells match content type. |
| Padding | Avoid horizontal padding on FlashList `style` when it would shrink the scroll viewport incorrectly; use `contentContainerStyle` for `paddingHorizontal` + `paddingBottom` (numeric mirror: `SPACING_SCREEN_PX`, tab clearance). |
| `maintainVisibleContentPosition` | v2 defaults may affect feeds that prepend; if optimistic creates or refetches cause surprising jumps, evaluate `maintainVisibleContentPosition={{ disabled: true }}` **after** manual QA (may be new-arch gated). |
| Scroll chrome | Keep `ScrollEdgeFade` (`ScrollShadow`) as the wrapper; FlashList remains the single scroll child. |

### Static excerpt clamp (`MaxLinesFadeClamp`)

| Topic | Decision |
|--------|-----------|
| Location | `apps/mobile/src/components/ui/MaxLinesFadeClamp/index.tsx` (presentation only; no `tv` unless variants are added later). |
| Behavior | `maxHeight = lineCount × lineHeightPx` (defaults aligned with `CollapsibleClamp` / `MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX`), `overflow: 'hidden'`, optional dim opacity, optional bottom `LinearGradient` (`transparent` → `fadeEndColor`), `fadeHeightPx` from `COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX`. |
| Consumers | **Feed** `EntryCard` only; **`EntrySummaryCard`** unchanged. |

### Files to touch

| File | Action |
|------|--------|
| `apps/mobile/package.json` | Add `@shopify/flash-list` (v2). |
| `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx` | Replace `FlatList` with `FlashList`; padding + refresh + `getItemType`. |
| `apps/mobile/src/features/entry/screens/FeedScreen/components/EntryCard/index.tsx` | Swap `CollapsibleClamp` for `MaxLinesFadeClamp`. |
| `apps/mobile/src/components/ui/MaxLinesFadeClamp/index.tsx` | **Create** — static line clamp + fade. |
| `apps/mobile/src/theme/layout-imperative.ts` | Optional: excerpt dim opacity constant (avoid magic number drift from `CollapsibleClamp`). |
| `docs/FEED_LIST_PERFORMANCE.md` | Optional follow-up: note FlashList + static clamp shipped. |

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| FlashList + Uniwind `className` on root | Rely on `contentContainerStyle` + wrapper `View` if needed. |
| Recycling + swipeable row state | `FeedListItem` already keys by `entryId`; use `getItemType` for skeleton vs entry. |
| Web build | Confirm FlashList supports RN web for this app or gate feed list (unlikely needed for Expo web). |

## Definition of done

### Phase 1 (implementation in tree)

- [x] Feed uses **`FlashList`** from `@shopify/flash-list` v2 with correct infinite scroll and pull-to-refresh.
- [x] **`getItemType`** separates pending skeleton rows from entry rows.
- [x] Feed **`EntryCard`** uses **`MaxLinesFadeClamp`** (no `CollapsibleClamp`).
- [x] **Entry detail** summary still uses **`CollapsibleClamp`** (expandable).
- [x] `pnpm exec tsc --noEmit` passes in `apps/mobile`.
- [ ] Manual smoke: scroll 30+ items, pull to refresh, load next page, optimistic create row.

### Phase 2 (follow-ups — still open)

- [ ] Shared delete sheet at feed level; stable cover height; optional plain excerpt (see backlog above).

## Follow-up backlog (not blocking)

- [ ] Single shared **`EntryDeleteConfirmSheet`** on `FeedScreen` (one portal).
- [ ] Fixed-height feed cover (`contentFit="cover"`) to avoid `onLoad` height jumps.
- [ ] Plain-text or truncated excerpt without full markdown on feed cards.

## References

- [FlashList v2 changes](https://shopify.github.io/flash-list/docs/v2-changes)
- [Feed performance research](../FEED_LIST_PERFORMANCE.md)

## Suggested commit

```
perf(feed): FlashList v2 and MaxLinesFadeClamp for entry excerpts
```
