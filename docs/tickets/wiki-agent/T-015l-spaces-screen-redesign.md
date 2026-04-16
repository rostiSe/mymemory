# T-015l: Mobile — SpacesScreen Redesign (hierarchy, search, quality signals)

**Status:** done  
**Phase:** Quality  
**Type:** feature (mobile)  
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)  
**Depends on:** [T-015k](./T-015k-space-hierarchy-curator-overhaul.md) (parent/child hierarchy), [T-015n](./T-015n-user-space-awareness.md) (`origin` column), [T-015g](./T-015g-compile-lint-ui.md) (CompileStatusCard), [T-015j](./T-015j-auto-assign-review-queue.md) (SpaceSuggestionsInbox)

---

## Goal

Redesign `SpacesScreen` around Quality-phase data: 2-level hierarchy, `user`/`agent` origin, and per-space compilation status. Flatter “square card” layout with **HeroUI `SearchField`** (debounced client-side search on name/description), **grouped sections** when the tree has parents, and **no parent hashtag filter row** (deferred — did not ship).

---

## Shipped implementation (summary)

- **`--radius-card`** in `global.css` + Uniwind **`rounded-card`** / **`rounded-t-card`** on new surfaces.
- **`SpacesSearchField`**: compound `SearchField` + `SearchField.Group` / `Input` / `ClearButton`, 150ms debounce to parent.
- **`SpaceListRow`**: `tv` variants (`default` | `child`), accent square, entry chip, compile dot, origin dot, relative `lastCompiledAt`, description line.
- **`SpacesScreen`**: `CompileStatusCard` → search → `SpaceSuggestionsInbox` → `FlatList` with section headers + rows; floating **New space** FAB; create modal `rounded-t-card`.
- **Contract + API**: `spaceSchema` / list includes optional `compilationStatus`, `lastCompiledAt`; `spaceService.list` selects and returns them.

---

## File structure (as built)

```
apps/mobile/src/
  features/space/
    screens/SpacesScreen/index.tsx
    components/
      SpaceListRow/index.tsx
      SpaceListRow/index.styles.ts
      SpacesSearchField/index.tsx
  global.css
packages/shared/src/contracts/space.contract.ts
apps/server/src/modules/spaces/services/space.service.ts
docs/DESIGN_SYSTEM.md
```

---

## DoD

- [x] `--radius-card` in `global.css`; documented in `DESIGN_SYSTEM.md`.
- [x] New surfaces use `rounded-card` (and full circles only on status dots).
- [x] `SpaceListRow` extracted with `index.styles.ts` (`tv`).
- [x] Search uses **HeroUI `SearchField`**; debounce 150ms; case-insensitive name + description.
- [x] Grouped list when `#All`-equivalent (no search) and at least one parent has children; **Standalone** group for orphans; flat list when search is non-empty.
- [x] Rows show entry count, compile dot, origin marker, optional last-compiled relative time.
- [x] Floating New space + modal `rounded-t-card`.
- [x] Empty copy for no matches vs no spaces.
- [x] Accessibility on search, rows, FAB.
- [x] Existing hooks only; suggestions + compile card + pull-to-refresh preserved.
- [x] `pnpm -w run typecheck` clean.
- [x] Epic links this file.
- [x] Parent hashtag chips **out of scope** for this delivery.

---

## Deferred / not included

- `SpaceFilterChips` / `#All` / `#Uncategorized` hashtag row.
- Sort UI, drag reorder, delete affordance (T-015m), redesign of other wiki screens.

---

## Verification

1. Open Spaces: grouped headers when hierarchy exists; search narrows rows; compile/origin dots match server state.
2. New space FAB + modal corners square-ish (`rounded-t-card`).
3. Pull-to-refresh refetches spaces and suggestions.
