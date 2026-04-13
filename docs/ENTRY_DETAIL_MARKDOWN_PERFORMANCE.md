# Entry detail markdown performance — research notes

## What you have today

Entry detail (`EntryDetailScreen`) renders markdown in two places:

| Location | Component | `MarkdownRenderer` variant | Notes |
|----------|-----------|----------------------------|--------|
| **Content** (main article) | `EntryMarkdownBody` | **`body` (default)** | Full `entry.content`; LaTeX enabled via `md4cFlags` (`latexMath: true`). |
| **Summary** | `EntrySummaryCard` | **`excerpt`** | Shorter TLDR; LaTeX off; wrapped in **`CollapsibleClamp`** (expand/collapse + Reanimated). |

Both use **`react-native-enriched-markdown`** (`EnrichedMarkdownText`), which parses Markdown with **md4c** and builds a **native** text/layout tree. That is powerful (GFM-style features, math, selection on body) but **work scales with document size**: long `entry.content` means a larger parse and more native nodes in a **single** subtree.

The screen uses a normal **`Animated.ScrollView`**: the body is **not virtualized**. Everything below the hero (header, summary, key points, **full markdown body**, etc.) is in one scrollable document, so the heavy markdown tree is mounted when the screen renders (modulo React scheduling), not on demand per viewport.

## Why it can feel slow even on high-end devices

1. **CPU-bound parse + layout** — One large string → one large native markdown result. JS thread and native layout both do meaningful work at mount and on content updates (e.g. refetch while processing).
2. **LaTeX path on the body** — Even when the article has no math, the **`body`** variant keeps **`latexMath: true`** in `MarkdownRenderer`, so the pipeline may still pay for math-capable parsing/rendering unless the library short-circuits aggressively internally.
3. **Summary card overhead** — `CollapsibleClamp` adds measurement, gradients, and **Reanimated** height animation around the summary markdown. That is extra work on top of the renderer for a smaller string, but it still matters for first paint and interaction.
4. **Theme style object** — `useMarkdownThemeStyle()` is memoized; `MarkdownRenderer` is `memo`’d. If `markdown` or other props are stable, re-renders are limited; **initial** mount cost still dominates for big `content`.
5. **No incremental rendering** — Unlike a virtualized list of sections, the whole body appears as one block, so there is no “render first screenful only” unless you add that pattern yourself.

## Solution directions (overview)

### A. Quick wins (keep current library)

- **Conditional LaTeX** — For `variant="body"`, set `latexMath: false` unless the string contains math delimiters (e.g. `$...$`, `$$`, `\(`). Reduces parser/renderer work for typical articles.
- **Defer non-critical work** — After first paint, use `InteractionManager.runAfterInteractions` (or a short `requestAnimationFrame` chain) to mount the **Content** markdown block so header/hero/summary appear first; show a lightweight placeholder (“Loading content…”) for one frame burst.
- **Cap or trim display** — For MVP/debug, optional “read more” after N characters with navigation to full text (product decision); reduces mount cost.
- **Stabilize props** — Ensure `entry.content` is not replaced with a new string reference on every parent render when content is unchanged (TanQuery data is usually stable; watch derived objects).

### B. Structural (still on RN, more engineering)

- **Section virtualization** — Pre-split `content` on headings (or server-provided blocks) and render **`FlashList`** / **`SectionList`** of markdown chunks. Each row runs a smaller `EnrichedMarkdownText` instance; only visible sections pay full cost. Tradeoff: implementation + styling continuity between sections.
- **Progressive hydration** — Render first chunk immediately, append chunks in idle callbacks (careful with scroll position and FlashList recycling).
- **Native / shared thread** — If the library or a fork exposes async parsing, offload where possible (depends on package; not always available).

### C. Alternative renderers (bigger bets)

| Approach | Pros | Cons |
|--------|------|------|
| **Lighter RN markdown libs** (e.g. markdown-display style) | Often fewer features, sometimes faster for simple subsets | Feature parity (math, tables, images); migration cost |
| **WebView + HTML** (`markdown-it` / `marked` → HTML + CSS) | Browser layout can be fast for long docs; familiar CSS | Bundle size, bridge, accessibility, theme sync, security (links) |
| **Expo DOM / web markdown in WebView** | Reuse web components | Same WebView tradeoffs; integration complexity |

### D. Product / backend

- **Store dual representation** — e.g. `contentPlain` or block JSON for “read mode” and raw markdown for export/editing — only if the product needs it.
- **Shorter canonical content** — Pipeline that summarizes or truncates for mobile read path (unlikely to replace full content for “memory” use case).

## Profiling (before choosing a large rewrite)

- **React Native Performance monitor** — Time to interactive when opening a long entry.
- **React DevTools** — Which props change cause `MarkdownRenderer` to remount.
- **Instrument** — Log `entry.content.length`, block count, and optional parse timing if the library exposes hooks (or wrap mount in `performance.now()` in dev).

## Summary

Slowness is less “React is slow on flagship phones” and more **large single-block native markdown + full scroll mount + optional LaTeX and summary clamp overhead**. The lowest-risk improvements are **turn off LaTeX when unused**, **defer mounting the body**, and **splitting content into virtualized sections** if documents are often long. Bigger gains may require **WebView HTML** or a **different renderer**, with explicit tradeoffs on features and theming.

See **`docs/tickets/T-014-entry-detail-markdown-performance.md`** for a ticket-shaped plan.
