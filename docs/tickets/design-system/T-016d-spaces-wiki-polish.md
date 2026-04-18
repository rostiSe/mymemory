# T-016d: Polish — Spaces + Wiki Page alignment with primitives

**Status:** done
**Phase:** Migration (mobile, second pass)
**Type:** migration (mobile)
**Epic:** [T-016 Design System](./T-016-design-system-epic.md)
**Depends on:** [T-016c](./T-016c-migration.md)

---

## Goal

Second-pass migration to close the visible gaps surfaced by the owner smoke test of T-016c: the Spaces screen looks off because its rows are still hand-rolled (own `tv`, magic paddings `px-3`, inline FAB, raw `Modal`), and the Wiki page screen skips `ScreenInset` + `ScreenHeader` on the success path. Both screens must look and feel like Feed / Search / EntryDetail — same padding rhythm, same chrome, same primitives.

This ticket is not a rewrite. It makes the two screens flow through the exact primitive stack T-016b built.

---

## Scope

### 1. Spaces — consume the primitives instead of re-rolling

**`features/space/components/SpaceListRow`:**
- Replace the internal `spaceListRowVariants` (`rounded-card border border-border bg-surface px-3 py-3`) with `Card.variants.SpaceCard`, or compose `Card.Root` + `Card.Header` + `Card.Body` if `SpaceCard`'s prop surface isn't enough. Extend `SpaceCard` if needed — don't leave a second card system alive.
- Kill the per-row `tv` file. The row becomes a thin adapter: map `SpaceRow` → `SpaceCardData`, render the variant. Mapper lives in `features/space/utils/toSpaceCardData.ts`.
- Fix the tiny dot at line 69: `size-1.5 rounded-card` → `size-1.5 rounded-full`. `rounded-card` on a 6 px dot is wrong; the `child`-variant left rail stays via `SpaceCard` border props.
- `child` variant (`ml-3 border-l-2 border-l-border/60`) moves onto `SpaceCard` as an `indent` prop, or onto the list item wrapper at the screen level — not a card-internal concern.

**`features/space/screens/SpacesScreen/index.tsx`:**
- Replace the inline "New space" `<Modal>` (lines ~476–534) with `Sheet.Form`. Standardizes the flow with `EntryDeleteConfirmSheet` / `LintResultsSheet` once those migrate (out of scope here).
- Replace the inline FAB (`<Pressable className="absolute rounded-card bg-accent px-3 py-2.5 …">`) with `@/components/ui/Button` + positioning wrapper. If a floating action is a recurring need, promote a `FloatingAction` primitive in a follow-up ticket — don't build it here.
- Standardize list padding: match the Feed pattern (`contentContainerStyle.paddingHorizontal: SPACING_SCREEN_PX`). Remove `className="flex-1 px-screen"` from the `FlatList` — that styles the outer `ScrollView`, not the content container, and diverges from Feed.
- Verify tab-layout `headerShown: false` is still in place so there is no double "Spaces" chrome.

### 2. Wiki Page — gain chrome parity

**`features/wiki/screens/WikiPageScreen/index.tsx`:**
- Wrap the success path in `ScreenInset` with `edges={["top", "left", "right"]}`, matching `SpacesScreen` / `FeedScreen`. Error and not-found paths already use it — keep, but switch their raw `px-(--spacing-screen)` to `px-screen` so all three branches use the same token surface.
- Use `@/components/ui/EmptyState` for the "Wiki page not found." branch instead of a bare `<Text>`.

**`features/wiki/screens/WikiPageScreen/components/WikiPageShell/index.tsx`:**
- Promote the title block (title + page-type badge + maturity + "Updated X" + "N source entries") into `ScreenHeader`. Use the compound slot pattern: `title={title}` + `leading={<BackButton />}` + `trailing={<View>...</View>}` carrying the badges. If the current styling doesn't fit `ScreenHeader` cleanly, extend `ScreenHeader` with `metaLine` (already added in T-016c per ticket notes) + a slot for a `subtitleBadges` row — do not fork.
- Swap `px-(--spacing-screen)` → `px-screen`. Consistency with Feed / Search / EntryDetail.
- The `Properties` / `On this page` blocks stay inside the ScrollView body but use the same `px-screen` rhythm.

### 3. Padding audit (both screens)

Grep for residual magic values in the two feature trees and fix:

```bash
rg "px-\d|py-\d|p-\d|px-\[|py-\[" apps/mobile/src/features/space apps/mobile/src/features/wiki
```

For each hit that isn't a semantic class (`px-screen`, `px-card`, etc.), either replace with a token or — if the use case genuinely needs a one-off — flag it inline with a `// one-off: …` comment explaining why. Bias towards the token.

---

## Critical files

- `apps/mobile/src/features/space/components/SpaceListRow/index.tsx` + `index.styles.ts` (styles file likely deleted by end)
- `apps/mobile/src/features/space/screens/SpacesScreen/index.tsx`
- `apps/mobile/src/features/wiki/screens/WikiPageScreen/index.tsx`
- `apps/mobile/src/features/wiki/screens/WikiPageScreen/components/WikiPageShell/index.tsx`
- `apps/mobile/src/components/ui/Card/variants/SpaceCard/{index.tsx,index.styles.ts}` — extend if needed
- `apps/mobile/src/components/ui/ScreenHeader/index.tsx` — extend if needed for wiki page
- `apps/mobile/src/components/ui/Sheet/index.tsx` — used for New Space modal

---

## Acceptance criteria

- [x] `SpaceListRow` renders through `Card.variants.SpaceCard` (or compound `Card.*`); its local `tv` file is deleted.
- [x] No `rounded-card` applied to a dot-sized element in `SpaceListRow` / `SpaceCard` (status dot uses `rounded-full`).
- [x] `SpacesScreen` "New space" modal replaced by `Sheet.Form`.
- [x] `SpacesScreen` FAB uses `@/components/ui/Button`; no inline `Pressable` with `bg-accent px-3 py-2.5`.
- [x] `SpacesScreen` `FlatList` padding uses `contentContainerStyle.paddingHorizontal: SPACING_SCREEN_PX` (matching Feed); no `className="px-screen"` on the `FlatList` itself.
- [x] `WikiPageScreen` success path is wrapped in `ScreenInset`; all three branches (success / error / not-found) use `px-screen` (no `px-(--spacing-screen)`).
- [x] `WikiPageScreen` "not found" branch uses `EmptyState`.
- [x] `WikiPageShell` title block replaced by `ScreenHeader` (`trailing` = badge row; `leading` = back; `wiki/[id]` stack header hidden to avoid double chrome).
- [ ] `rg "px-\\d|py-\\d|p-\\d|px-\\[|py-\\["` in `features/space` and `features/wiki` returns only annotated one-offs or zero hits. *(Deferred: many hits remain in files explicitly out of scope for this ticket — e.g. `SpaceSuggestionsInbox`, `SpaceTree`, `AgentLogViewer`, renderers.)*
- [x] `pnpm --filter mymemory exec tsc --noEmit` passes.
- [ ] Manual smoke (owner) — Spaces screen rows, Spaces "New space" flow, Wiki page top chrome, and wiki error/not-found states render with the same padding rhythm and card shape as Feed / Search / EntryDetail.

---

## Out of scope

- Migrating `EntryDeleteConfirmSheet` / `LintResultsSheet` / `SpaceSuggestionsInbox` to `Sheet.Form` (epic punted this; still deferred).
- Promoting a `FloatingAction` primitive — follow-up ticket if it recurs.
- Touching other wiki surfaces (`WikiVersionHistoryScreen`, `AgentLogViewer`, `InsightCard`, `WikiSection`).
- Non-hot-spot components in `features/space` (`RelatedSpacesStrip`, `SpaceTree`, `SuggestionReviewList`, etc.).

---

## Verification

```bash
pnpm --filter mymemory exec tsc --noEmit

# No lingering space-side tv / magic padding
rg "tv\(" apps/mobile/src/features/space/components/SpaceListRow
rg "px-\\d|py-\\d|p-\\d" apps/mobile/src/features/space apps/mobile/src/features/wiki

# No raw Modal import in SpacesScreen
rg "from \"react-native\".*Modal|\\bModal\\b" apps/mobile/src/features/space/screens/SpacesScreen

# No raw px-(--spacing-screen)
rg "px-\\(--spacing-screen\\)" apps/mobile/src
```

Smoke walk:
1. Open Spaces tab → rows have identical corner radius, border, spacing to Feed cards.
2. Tap "New space" → `Sheet.Form` opens, form fields render inside the sheet, primary/secondary actions live at the bottom.
3. Open a wiki page → top chrome (title, badges, updated date) sits under `ScreenInset` with the same top padding as Feed; horizontal padding matches.
4. Open a non-existent wiki page URL → `EmptyState` renders instead of bare text.

---

## References

- [T-016 Epic](./T-016-design-system-epic.md)
- [T-016b Primitives](./T-016b-primitives.md)
- [T-016c Migration](./T-016c-migration.md)
- `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx` — reference pattern
