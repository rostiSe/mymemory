# T-014: Entry detail markdown performance (`EnrichedMarkdownText` / long `content`)

**Status:** proposed  
**Phase:** 3 — Frontend / UX quality  
**Type:** performance + architecture (mobile)  
**Risk:** low–high depending on phase (Phase 1 low; Phase 3 medium–high)  
**Depends on:** none

---

## Problem

Opening **entry detail** feels sluggish on real devices when the **Content** section (and to a lesser extent the **Summary** card) renders, even on high-end hardware. The main body uses **`MarkdownRenderer`** → **`react-native-enriched-markdown`** with the default **`body`** variant (incl. LaTeX) inside a non-virtualized **`ScrollView`**.

## Goal

Improve **time-to-readable** and **scroll smoothness** for typical and long entries, without breaking GFM-style reading, links, images, code blocks, or (where required) math.

## Findings (short)

- Cost scales with **`entry.content` size** — one parse, one large native tree, mounted with the screen.
- **`body`** uses **`latexMath: true`** even when the document has no math → candidate for conditional opt-out.
- **Summary** adds **CollapsibleClamp + Reanimated** around markdown (extra layout/animation cost).
- No **virtualization** for the article body.

Full write-up: **`docs/ENTRY_DETAIL_MARKDOWN_PERFORMANCE.md`**.

---

## Phase 1 — Measure + low-risk optimizations (ship first)

**Outcome:** Confirm bottleneck; ship safe wins.

| # | Task | Notes |
|---|------|--------|
| 1.1 | Add **dev-only** logging (gated): `content.length`, optional word count, `performance.now()` around first mount of `EntryMarkdownBody` | Validates “big string” hypothesis. |
| 1.2 | **Conditional LaTeX** in `MarkdownRenderer` for `variant="body"`: enable `latexMath` only if markdown matches a small delimiter heuristic (`$`, `$$`, `\(` , `\[`) | Reduces work for most articles; document false-negative risk (rare math syntax). |
| 1.3 | **Defer body markdown** mount: after hero + header paint, `InteractionManager.runAfterInteractions` → set state to show `MarkdownRenderer`; skeleton line or “…” placeholder until then | Improves perceived performance; tune placeholder copy. |
| 1.4 | Review **summary** path: ensure `EntrySummaryCard` uses cheapest variant; consider **fade-only** clamp vs full expand if product allows | Optional; smaller surface than body. |

**Definition of done (Phase 1)**

- [ ] Heuristic LaTeX toggle covered by a short unit test or snapshot of flag function (pure helper in `utils/`).
- [ ] Deferred body behind a flag or always-on with UX-approved placeholder.
- [ ] Manual test: long article (paste 20k+ chars), short article, article with real `$$` math.
- [ ] `pnpm typecheck` / lint clean for touched files.

---

## Phase 2 — Virtualized or chunked content (medium effort)

**Outcome:** Bound work per frame for long reads.

| # | Task | Notes |
|---|------|--------|
| 2.1 | Spike **splitting** `entry.content` on `##` / `---` / server blocks into an array of sections | Pure function + tests. |
| 2.2 | Render sections in **`FlashList`** (vertical) nested in scroll OR replace outer scroll with list-only layout for the lower pane | Watch **nested scroll** / `scrollEnabled` patterns; may need flat combined layout refactor. |
| 2.3 | Each row: smaller **`MarkdownRenderer`** instance OR dedicated “section” component | Reuse `keyExtractor` by index + heading slug. |

**Definition of done (Phase 2)**

- [ ] Document chosen split strategy (client vs API).
- [ ] No regressions: links, images, code blocks in split boundaries.
- [ ] Manual scroll test on iOS + Android with50+ kb content.

---

## Phase 3 — Alternative stack (optional, product + eng sign-off)

**Outcome:** If Phase 1–2 are insufficient, pick a larger pivot.

| Option | When to choose |
|--------|----------------|
| **WebView + HTML** | Very long documents; team accepts theme bridge + a11y tradeoffs |
| **Different RN markdown library** | Need simpler feature set and measurable win on benchmark |
| **Server-rendered HTML / blocks API** | Backend can own canonical “display” shape |

**Definition of done (Phase 3)**

- [ ] ADR or ticket appendix: chosen approach, security (links), offline, theming.
- [ ] Parity checklist: headings, lists, code, links, images, dark mode.

---

## Out of scope (unless product asks)

- Replacing markdown with plain text for the main body.
- Removing math support globally without a replacement story.

## Suggested commits

```
perf(entry-detail): conditional latex and deferred markdown body mount

perf(entry-detail): virtualize markdown sections with FlashList
```

## References

- `docs/ENTRY_DETAIL_MARKDOWN_PERFORMANCE.md`
- `apps/mobile/src/components/ui/MarkdownRenderer/index.tsx`
- `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntryMarkdownBody/index.tsx`
- `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntrySummaryCard/index.tsx`
