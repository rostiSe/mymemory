# Feed list performance — research notes

This document explains why the home feed can feel slow once there are more than ~15 items **even though the screen uses `FlatList`**, and summarizes cross‑platform list best practices. It complements product tickets that track concrete remediation work.

## Why `FlatList` alone is not enough

`FlatList` (and `SectionList`) **virtualize**: they only mount native views for a window around the visible viewport. That saves memory versus a `ScrollView` that lays out every child up front.

It does **not** remove these costs:

1. **Per-row work** — Every cell that mounts still runs React reconciliation, layout, and any expensive subtrees (images, markdown, gestures, animations, portals).
2. **Variable heights** — When item heights are unknown or change after mount (e.g. image `onLoad` updating layout), the list must **remeasure** and adjust offsets. That shows up as jank when scrolling or when many images resolve at once.
3. **Overscan** — React Native still renders **more than one screen** of rows above/below the viewport (`windowSize` defaults to `21` in units of viewport height). Heavy rows × overscan = noticeable main-thread load on any device.

So “we use FlatList” answers **memory for huge lists**, not **cost per row** or **layout stability**.

## What the current feed implementation is doing

The following are **observations tied to this repo**, not accusations — together they explain why ~15+ rows can already feel heavy.

### 1. Heavy content inside every visible row

`FeedListItem` wraps `EntryCard`, which for normal rows renders:

- **`MarkdownRenderer` → `EnrichedMarkdownText` (`react-native-enriched-markdown`)** — markdown parsing and rich text for the summary on **every** card. Feed excerpts are a hot path; full markdown stacks are often overkill for a two‑line preview.
- **`CollapsibleClamp` in `fade-only` mode** — still composes clamped layout, gradients, and (for expandable mode elsewhere) Reanimated. Even `fade-only` adds structure and measurement work around the markdown subtree.
- **`expo-image` with dynamic aspect ratio** — initial render uses a fixed height; `onLoad` can call `setCoverAspect`, which **changes layout** and forces the list to revisit row height.
- **`ReanimatedSwipeable` per row** — gesture + reanimated machinery per item is normal for swipe UX but is not free when many instances exist in the virtualized window.

Files: `FeedScreen/index.tsx`, `FeedListItem/index.tsx`, `EntryCard/index.tsx`.

### 2. A delete confirmation bottom sheet per list item

Each `FeedListItem` mounts `EntryDeleteConfirmSheet`, which uses a `BottomSheet` with **`BottomSheet.Portal`**. That means **one portal/sheet subtree per row** in the tree, even when only one delete dialog should ever be visible.

Mounting many modal/portal-backed components is a common source of scroll jank and memory pressure. A single shared sheet at the screen level (or a lightweight `Alert`/`Modal` pattern) scales better.

Files: `FeedListItem/index.tsx`, `EntryDeleteConfirmSheet/index.tsx`, `components/ui/BottomSheet/index.tsx`.

### 3. No list tuning or alternative list implementation

`FeedScreen`’s `FlatList` does not set performance-related props such as `windowSize`, `maxToRenderPerBatch`, `updateCellsBatchingPeriod`, or `initialNumToRender`. Defaults are reasonable for **simple rows**; they are often too aggressive for **rich cards**.

There is no `getItemLayout` — which is expected when heights vary — but that reinforces the need for **stable row heights** or a list implementation that handles **estimated** sizes well (e.g. FlashList).

The app does not currently depend on `@shopify/flash-list`.

### 4. Legitimate re-renders from data and mutations

Infinite query pages, optimistic updates, favorites toggles, and pull-to-refresh can change `data` or row props. `FeedListItem` is wrapped in `memo`, which helps **if props are stable**. Any handler or object identity churn in `renderItem` still forces work for affected rows.

## Best practices (industry + RN ecosystem)

The following are widely recommended; they align with general Expo/RN guidance (e.g. list virtualization, memoization, avoiding unnecessary work per row) such as [Optimizing Performance in React Native Apps (Expo) on DEV](https://dev.to/vrinch/optimizing-performance-in-react-native-apps-expo-354k) and list-focused writeups like [Rendering performant cross-platform lists in React Native and Expo (Medium)](https://jaamaalxyz.medium.com/rendering-performant-cross-platform-lists-in-react-native-and-expo-26bdb8fa99b1).

### Row design

- **Prefer the cheapest representation that matches the product** — plain `Text` or a minimal subset renderer for feed excerpts; reserve full markdown for detail screens.
- **Stabilize row height** — fixed cover height + `contentFit="cover"` (or similar) avoids layout jumps when metadata loads.
- **Defer non-critical effects** — don’t start heavy work in every `useEffect` for off-screen rows beyond what the list already mounts.

### FlatList tuning (when staying on FlatList)

- Tune **`initialNumToRender`**, **`windowSize`**, **`maxToRenderPerBatch`**, and **`updateCellsBatchingPeriod`** based on profiling; reduce overscan for heavy rows.
- **`removeClippedSubviews`** can help on Android; validate with gestures and overlays (swipe, sheets) because clipping can interact badly with some views.
- **`keyExtractor`** stable string ids (already in use) — good.
- **`renderItem` / callbacks** — keep stable with `useCallback`; avoid passing fresh object literals if it defeats `memo`.
- Where item heights are **fixed or predictable**, **`getItemLayout`** avoids measurement passes (harder for cards with variable markdown and images unless those are stabilized).

### Alternative: FlashList

Shopify’s **FlashList** recycles views more aggressively and is designed around **estimated item size**, which often improves perceived scroll performance for heterogeneous lists. Adding it is a dependency and integration decision (see ticket).

### Measurement

- Use React Native / Expo performance tooling and **React Compiler / why-did-you-render style** investigations for unnecessary parent re-renders.
- Profile on a mid-range Android device; iOS high-end hardware can hide issues.

## Summary

The feed is slow past ~15 items primarily because **each row is a rich, expensive subtree** (markdown, images with changing height, swipeable, and repeated portal/sheet infrastructure), not because `FlatList` is missing. Virtualization limits how many rows are mounted, but the **cost per mounted row** and **layout instability** still dominate.

See **`docs/tickets/T-013-feed-list-performance.md`** for the active ticket. **Update:** the feed now uses **FlashList v2** and feed cards use **`MaxLinesFadeClamp`** instead of `CollapsibleClamp` (detail screen still uses expandable `CollapsibleClamp`).
