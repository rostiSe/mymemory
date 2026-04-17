# T-016c: Migrate Hot-Spots onto Primitives

**Status:** done (pending owner smoke test)
**Phase:** Migration (mobile)
**Type:** migration (mobile)
**Epic:** [T-016 Design System](./T-016-design-system-epic.md)
**Depends on:** [T-016b](./T-016b-primitives.md)

---

## Goal

Cut over the duplication hot-spots identified in the epic audit to the primitives shipped in T-016b. After this ticket, every Card-shaped surface, empty state, screen header, and button call site in the migrated screens goes through `components/ui/*` — not through bespoke Tailwind.

This is a mechanical migration: behavior must not change. Visual parity is the bar.

---

## Scope

### 1. Card migration (5 duplicates → `components/ui/Card`)

| From | To | Variant |
|------|----|---------|
| `apps/mobile/src/features/entry/screens/FeedScreen/components/EntryCard/index.tsx` | `Card.variants.EntryCard` | `EntryCard` |
| `apps/mobile/src/features/search/components/SearchResultCard/index.tsx` | `Card.variants.EntryCard` (+ optional score chip via `Card.Header` trailing) | `EntryCard` |
| `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntrySummaryCard/index.tsx` | `Card.Root` + `Card.Header` + `Card.Body` (compound API — this one isn't cover-driven) | compound |
| `apps/mobile/src/features/space/components/RelatedSpaceCard/index.tsx` | `Card.variants.SpaceCard` | `SpaceCard` |
| `apps/mobile/src/features/wiki/components/CompileStatusCard/index.tsx` | `Card.variants.StatusCard` | `StatusCard` |

Delete each old folder after callers are updated. Type-check after each deletion — do not leave orphan re-exports.

**Data mapping rule:** shared data types (`EntryCardData`, `SpaceCardData`) are owned by `components/ui/Card/index.types.ts`. Feature-side mappers (e.g. `toEntryCardData(entry)`) live next to the caller (the screen or its `utils/` folder), not inside `ui/Card`.

### 2. Empty states (3 screens → `components/ui/EmptyState`)

Replace the inline empty `<View><Text>` blocks in:

- `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx`
- `apps/mobile/src/features/search/screens/SearchScreen/index.tsx`
- `apps/mobile/src/features/space/screens/SpacesScreen/index.tsx`

Each call site supplies `icon`, `title`, `description`, and an `action` where one currently exists (e.g. "Capture your first entry" on Feed). Copy preserved verbatim.

### 3. Screen headers (3 sites → `components/ui/ScreenHeader`)

| From | Replace with |
|------|--------------|
| `apps/mobile/src/features/entry/screens/FeedScreen/components/FeedHeader/index.tsx` | `ScreenHeader` variant `default` (or `large` if the tab-like styling lives on `ScreenHeader` now) |
| `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntryDetailHeader/index.tsx` | `ScreenHeader` with `leading={<BackButton />}` + `trailing={…actions}` |
| Inline header in `apps/mobile/src/features/space/screens/SpacesScreen/index.tsx` | `ScreenHeader` |

Delete `FeedHeader/` and `EntryDetailHeader/` folders after callers are updated.

### 4. Raw HeroUI `Button` → `components/ui/Button`

Known screens/components importing `Button` from `heroui-native` (T-016b audit):

- `features/entry/screens/FeedScreen/index.tsx`
- `features/space/screens/SpacesScreen/index.tsx`
- `features/space/components/SpacesSearchField/index.tsx`
- `features/space/components/SpaceSuggestionsInbox/index.tsx`
- `features/wiki/screens/WikiVersionHistoryScreen/index.tsx`
- `features/wiki/components/LintResultsSheet/index.tsx`
- `features/wiki/components/AgentLogViewer/index.tsx`
- `features/wiki/components/CompileStatusCard/index.tsx` (covered by Card migration above)
- `features/settings/screens/SettingsScreen/index.tsx`
- `features/entry/components/EntryDeleteConfirmSheet/index.tsx`
- `features/search/screens/SearchScreen/index.tsx`
- `features/entry/components/ProcessingStatus/index.tsx`
- `features/entry/components/CaptureComposer/index.tsx`
- `features/debug/screens/TemplateTestScreen/index.tsx`
- `features/debug/screens/DebugScreen/index.tsx`
- `features/auth/screens/SignupScreen/index.tsx`
- `features/auth/screens/LoginScreen/index.tsx`

Per file:
- Swap the import to `@/components/ui/Button/index`.
- Translate HeroUI props → wrapper props: `color` → `tone`, `size` stays, `startContent` → `leading`, `endContent` → `trailing`, `isLoading` → `loading`.
- Remove `className` overrides that the wrapper now covers. If the call site truly needs something the wrapper doesn't expose, raise it as a follow-up — don't bypass the wrapper with an inline style.

**Exception:** `components/ui/BottomSheet`, `components/ui/Dialog`, `components/ui/ErrorBoundary`, `components/ui/Sheet`, `components/ui/EmptyState` may still import HeroUI `Button` internally — they are the primitive layer. Only feature-side imports are in scope here.

### 5. Sheet.Form adoption (opportunistic)

If the migration naturally benefits (`EntryDeleteConfirmSheet`, `LintResultsSheet`, `SpaceSuggestionsInbox`), convert to `Sheet.Form`. If not clean, leave it and file a follow-up — this ticket doesn't block on sheet rewrites.

**Outcome:** `Sheet.Form` not adopted here — `LintResultsSheet` stays a `Modal`; `EntryDeleteConfirmSheet` stays on `BottomSheet`; inbox stays `Dialog`.

---

## Critical files

- Primitives from T-016b under `apps/mobile/src/components/ui/{Card,Button,EmptyState,ScreenHeader,ListRow,Sheet}/**`.
- Hot-spot source files enumerated above.
- `docs/DESIGN_SYSTEM.md` — update any example that referenced an old duplicate path.

---

## Acceptance criteria

- [x] All 5 card duplicates deleted; their former call sites render via `Card` (variant or compound). Entry detail summary → `EntrySummarySection` (`components/.../EntryDetailScreen/components/EntrySummarySection/`).
- [x] `FeedHeader/` and `EntryDetailHeader/` folders deleted; feed uses `ScreenHeader` + `CaptureComposer`; entry detail uses `ScreenHeader` (stack back remains native; no duplicate back). Spaces uses `ScreenHeader`; **tabs** `spaces` route sets `headerShown: false` to avoid double “Spaces” chrome.
- [x] Inline empty states in Feed / Search / Spaces replaced by `EmptyState` with identical copy (Feed empty icon `rss-feed`; Search uses two `EmptyState`s for zero-query vs no-results).
- [x] Zero remaining feature-side imports of `Button` from `heroui-native`. Verified:
  ```bash
  rg "Button.*from \"heroui-native\"|from \"heroui-native\".*Button" apps/mobile/src/features
  # → zero matches
  ```
- [x] Hot-spot card/header/button migration complete; remaining `<Card` from `heroui-native` under `features/**` are wiki/entry sections (non-duplicate surfaces), out of scope for this ticket.
- [x] `pnpm --filter mymemory exec tsc --noEmit` passes.
- [ ] Manual smoke (owner) — visually confirm parity on: Feed, Search, EntryDetail, Spaces, LoginScreen, SignupScreen, SettingsScreen, WikiVersionHistoryScreen. No layout, color, radius, or spacing regression.
- [x] `docs/DESIGN_SYSTEM.md` primitive table updated for post-migration call sites.
- [x] Epic-level checklist in [T-016](./T-016-design-system-epic.md) updated; epic marked done pending smoke test.

---

## Implementation notes (execution log)

- **`EntryCard`:** `EntryCardData.similarity?: number` drives search % badge and date placement (matches old `SearchResultCard`).
- **`StatusCard`:** `title` optional; `description` accepts `ReactNode` for compile success / compiling rich layouts.
- **`Card.Header`:** `sectionLabel` for uppercase single-line label (summary card).
- **`ScreenHeader`:** `metaLine`, `rowAlign`, `subtitleSize`, `titleNumberOfLines` for entry detail parity.

---

## Out of scope

- Refactoring non-hot-spot feature components (the other ~40 components not covered above).
- Rewriting `BottomSheet`, `Dialog`, `ErrorBoundary`, `MarkdownRenderer`, `CollapsibleClamp`, `MaxLinesFadeClamp`, `SkeletonListItem`, `ScrollEdgeFade` — these stay.
- Behavior / UX changes. Visual and functional parity only.
- Lint rules to prevent regression (deferred).
- Storybook.

---

## Verification

```bash
# Typecheck
pnpm --filter mymemory exec tsc --noEmit

# No feature-side HeroUI Button imports
rg "Button.*from \"heroui-native\"|from \"heroui-native\".*Button" apps/mobile/src/features

# No lingering imports of deleted feature components (comments in ui/ may still mention old names)
rg "from \"@/features/.*/(FeedHeader|EntryDetailHeader|SearchResultCard|EntrySummaryCard|RelatedSpaceCard|EntryCard)\"" apps/mobile/src
```

---

## Rollout

Recommended commit order (each a separate commit so reviews stay scoped):

1. Card migration — EntryCard + SearchResultCard call sites → delete old folders.
2. Card migration — EntrySummaryCard → delete old folder.
3. Card migration — RelatedSpaceCard + CompileStatusCard → delete old folders.
4. ScreenHeader migration (3 sites) → delete `FeedHeader` and `EntryDetailHeader` folders.
5. EmptyState migration (3 screens).
6. Button migration — batch 1 (auth + settings + debug screens).
7. Button migration — batch 2 (entry + search + wiki + space screens).
8. Doc sync (`docs/DESIGN_SYSTEM.md`) + close the epic.

---

## References

- [T-016 Epic](./T-016-design-system-epic.md)
- [T-016a Foundation](./T-016a-tokens-heroui-theme-docs.md)
- [T-016b Primitives](./T-016b-primitives.md)
- `apps/mobile/CLAUDE.md` — hard rules the migration must not regress
