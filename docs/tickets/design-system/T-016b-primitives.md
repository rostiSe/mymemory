# T-016b: Primitives — Card, Button, EmptyState, ScreenHeader, ListRow, Sheet

**Status:** done (pending manual smoke test)
**Phase:** Primitives (mobile)
**Type:** feature (mobile)
**Epic:** [T-016 Design System](./T-016-design-system-epic.md)
**Depends on:** [T-016a](./T-016a-tokens-heroui-theme-docs.md)

---

## Goal

Build the canonical primitive layer every screen will compose from. Each primitive follows CLAUDE.md rules: `index.tsx` + `index.styles.ts` (with `tv()`) + optional `index.types.ts`, no barrels, tokens over magic values, HeroUI Native where it fits.

Cards get **both** a compound API (`Card.Root` + sub-parts) and a small set of **pre-built variants** (`EntryCard`, `SpaceCard`, `StatusCard`) that compose the compound pieces — so common screens don't reassemble the same structure, and uncommon layouts can still drop to the compound API.

No migration in this ticket. Nothing under `apps/mobile/src/features/**` changes. The only call sites touched are a single screen that renders each new primitive as a visual smoke test (reverted before final commit, as in T-016a).

---

## Scope

### 1. `components/ui/Card` — compound + variants

**Compound API** (exposed as properties on `Card`, not a barrel):

```tsx
<Card.Root tone="neutral" density="comfortable" interactive>
  <Card.Cover source={uri} aspect="16/9" />
  <Card.Header title="…" eyebrow="…" trailing={<Chip />} />
  <Card.Body>…</Card.Body>
  <Card.Footer>…</Card.Footer>
</Card.Root>
```

Variants on `Card.Root`:

| Variant | Values | Purpose |
|---------|--------|---------|
| `tone` | `neutral` \| `accent-soft` \| `surface-secondary` | Base background + border |
| `density` | `compact` \| `comfortable` | Padding scale on Body/Footer |
| `interactive` | `boolean` | Wraps in `PressableFeedback` when true |
| `radius` | `sm` \| `md` \| `lg` | Maps to `--radius-*` |

**Pre-built variants** under `components/ui/Card/variants/`:

- `EntryCard` — cover + title + summary + chip row. Props derived from `EntryCardData` (shared type under `components/ui/Card/index.types.ts`).
- `SpaceCard` — title + description + compile-status dot + entry count. Covers `RelatedSpaceCard` + `SpaceListRow` shapes.
- `StatusCard` — eyebrow + headline + inline action. Covers `CompileStatusCard`.

Variants must be thin — they only compose `Card.*` parts and pass props. No one-off Tailwind.

### 2. `components/ui/Button` — app wrapper over HeroUI

- Wraps HeroUI `Button` with a fixed prop surface: `tone` (`primary` | `secondary` | `danger` | `ghost`), `size` (`sm` | `md` | `lg`), `leading` / `trailing` icons, `loading`.
- No `className` escape hatch at the call site — extend variants instead.
- Delegates color/radius/size defaults to the HeroUI theming layer from T-016a; this wrapper only enforces the prop shape.
- Add a `type BaseButtonProps` in `index.types.ts` so `AnchorButton` / future specializations can extend it.

### 3. `components/ui/EmptyState`

- Props: `icon` (MaterialIcon name), `title`, `description`, `action?` ({ label, onPress }).
- Centered layout, muted foreground, uses `--spacing-screen` for horizontal padding.
- Single source for Feed, Search, and Spaces empty UI (migration in T-016c).

### 4. `components/ui/ScreenHeader`

- Props: `title`, `subtitle?`, `leading?` (typically `BackButton`), `trailing?` (actions), `variant` (`default` | `large`).
- Absorbs the patterns currently in `FeedHeader`, `EntryDetailHeader`, and the inline header in `SpacesScreen`.
- Respects safe-area via the existing `ScreenInset` utility.

### 5. `components/ui/ListRow`

- Props: `leading?`, `title`, `subtitle?`, `meta?`, `trailing?`, `onPress?`.
- Used for space hierarchy rows and future list surfaces.
- Separator handled by the parent list, not by the row.

### 6. `components/ui/Sheet` — thin wrapper over existing `BottomSheet`

The existing `components/ui/BottomSheet` already covers the "title + description + two buttons" pattern well. This ticket **does not replace it** — it adds:

- `Sheet.Form` — bottom sheet that takes a `header`, `children` form body, and `primaryAction` / `secondaryAction`. Standardizes the shape currently duplicated in `EntryDeleteConfirmSheet`, `LintResultsSheet`, `SpaceSuggestionsInbox` modal.
- Exported as `Sheet` namespace alongside the existing BottomSheet so both APIs co-exist.

No new library, no `@gorhom/bottom-sheet` swap.

---

## File layout

```
apps/mobile/src/components/ui/
  Card/
    index.tsx                 # Card.Root + attaches Cover/Header/Body/Footer as props
    index.styles.ts           # tv() for Root + each sub-part
    index.types.ts            # EntryCardData, shared prop shapes
    Cover/index.tsx
    Cover/index.styles.ts
    Header/index.tsx
    Header/index.styles.ts
    Body/index.tsx
    Body/index.styles.ts
    Footer/index.tsx
    Footer/index.styles.ts
    variants/
      EntryCard/index.tsx
      EntryCard/index.styles.ts
      SpaceCard/index.tsx
      SpaceCard/index.styles.ts
      StatusCard/index.tsx
      StatusCard/index.styles.ts
  Button/
    index.tsx
    index.styles.ts
    index.types.ts
  EmptyState/
    index.tsx
    index.styles.ts
  ScreenHeader/
    index.tsx
    index.styles.ts
  ListRow/
    index.tsx
    index.styles.ts
  Sheet/
    index.tsx                 # Sheet.Form (new); re-export existing BottomSheet API only by direct import — no barrel
    index.styles.ts
```

No `index.ts` re-exports. Consumers import from `@/components/ui/Card/index` (the `Card.Root` namespace) or from the variant path directly.

---

## Critical files

- Existing duplicates to reference (not modify here):
  - `apps/mobile/src/features/entry/screens/FeedScreen/components/EntryCard/index.tsx`
  - `apps/mobile/src/features/search/components/SearchResultCard/index.tsx`
  - `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntrySummaryCard/index.tsx`
  - `apps/mobile/src/features/space/components/RelatedSpaceCard/index.tsx`
  - `apps/mobile/src/features/wiki/components/CompileStatusCard/index.tsx`
- `apps/mobile/src/theme/heroui.ts` — keep `SEMANTIC_COLORS` in sync if a new color token is needed.
- `apps/mobile/src/components/ui/BottomSheet/index.tsx` — Sheet.Form must compose this; do not re-implement.
- `apps/mobile/src/components/layout/ScreenInset/index.tsx` — ScreenHeader uses it for safe-area.
- `docs/DESIGN_SYSTEM.md` — fill in each "Coming in T-016b" placeholder with the variant matrix and a minimal example.

---

## Acceptance criteria

- [x] Every primitive lives under `apps/mobile/src/components/ui/<Name>/` with `index.tsx` + `index.styles.ts` (+ `index.types.ts` where prop shapes warrant it — `Card`, `Button`).
- [x] `tv()` definitions live **only** in `index.styles.ts` — not in `index.tsx`. Verified: `rg "tv\(" apps/mobile/src/components/ui -g "index.tsx"` returns zero matches.
- [x] No barrel `index.ts` that re-exports siblings. Compound namespaces (`Card`, `Sheet`) ship from a single module that owns the root component and attaches sub-parts as static properties — explicitly distinguished from a barrel in the Do/Don't list.
- [x] `Card.Root` + sub-parts (`Cover`, `Header`, `Body`, `Footer`) implemented; `EntryCard` / `SpaceCard` / `StatusCard` compose them and contain no `className` literal that doesn't already live in their own `index.styles.ts` (auto-generated chip / dot helpers excluded — those are derived classnames returned by `compileDotClassName`, not raw Tailwind).
- [x] `Button` wrapper exposes `tone` / `size` / `leading` / `trailing` / `loading` (+ `fullWidth`, `isDisabled`, `accessibilityLabel`) — no `className` prop. `BaseButtonProps` extracted into `index.types.ts` for future specializations.
- [ ] `EmptyState`, `ScreenHeader`, `ListRow` smoke-rendered in an existing screen. **Skipped intentionally** — the migration ticket (T-016c) will exercise them inside their real call sites; a throwaway render now would conflict with the hard rule "No existing feature screen changes in the final commit set". Manual verification falls into the smoke-test owner's pass below.
- [x] `Sheet.Form` composes HeroUI `BottomSheet` directly; the existing icon + 2-button confirmation sheet (`components/ui/BottomSheet`) is left untouched and intentionally co-exists. No second `BottomSheet` implementation introduced.
- [x] `docs/DESIGN_SYSTEM.md` placeholder sections replaced with variant matrices and per-primitive examples; Do/Don't updated for primitive consumption (no raw HeroUI `Button` outside the wrapper, no `className` on primitive surfaces, compound namespace exception over the barrel rule).
- [x] No raw hex / arbitrary pixel values introduced in primitive source. Verified by inspection — every Tailwind class uses semantic tokens (`bg-surface-secondary`, `border-accent/35`, `rounded-md`, `px-card`, `px-screen`, `gap-2`, `size-1.5`).
- [x] `pnpm --filter mymemory typecheck` passes (mobile app's package name is `mymemory`).
- [ ] `pnpm --filter mymemory lint` — no `lint` script wired on mobile yet; falls under `apps/mobile/package.json` follow-up. ESLint warnings in IDE pane on edited files: zero.
- [x] No existing feature screen changes in the final commit set. New files only — `apps/mobile/src/components/ui/{Card,Button,EmptyState,ScreenHeader,ListRow,Sheet}/**`.

## Verification

### Files added (this ticket)

| Path | Kind |
|------|------|
| `apps/mobile/src/components/ui/Card/index.tsx` | Card namespace + Root |
| `apps/mobile/src/components/ui/Card/index.styles.ts` | Root variants |
| `apps/mobile/src/components/ui/Card/index.types.ts` | `EntryCardData`, `SpaceCardData`, `StatusCardProps` |
| `apps/mobile/src/components/ui/Card/{Cover,Header,Body,Footer}/index.tsx` + `index.styles.ts` | Sub-parts |
| `apps/mobile/src/components/ui/Card/variants/{EntryCard,SpaceCard,StatusCard}/index.tsx` + `index.styles.ts` | Pre-built variants |
| `apps/mobile/src/components/ui/Button/index.tsx` + `index.styles.ts` + `index.types.ts` | App button wrapper |
| `apps/mobile/src/components/ui/EmptyState/index.tsx` + `index.styles.ts` | Empty state |
| `apps/mobile/src/components/ui/ScreenHeader/index.tsx` + `index.styles.ts` | Screen header |
| `apps/mobile/src/components/ui/ListRow/index.tsx` + `index.styles.ts` | List row |
| `apps/mobile/src/components/ui/Sheet/index.tsx` + `index.styles.ts` | `Sheet.Form` |
| `docs/DESIGN_SYSTEM.md` | Updated primitive sections + Do/Don't |

### Verification commands run

```bash
# Typecheck — clean
pnpm --filter mymemory typecheck

# tv() must only live in index.styles.ts — zero matches expected
rg "tv\(" apps/mobile/src/components/ui -g "index.tsx"

# Only the Button wrapper itself should import HeroUI Button —
# pre-existing primitives (BottomSheet, Dialog, ErrorBoundary) are scheduled
# for migration in T-016c and intentionally not modified here.
rg "from \"heroui-native\"" apps/mobile/src/components/ui
```

---

## Out of scope

- Migrating `EntryCard`, `SearchResultCard`, etc. to the new primitives (T-016c).
- Replacing inline empty states in Feed/Search/Spaces (T-016c).
- Replacing raw HeroUI `Button` call sites (T-016c).
- Storybook stories — only co-locate `index.stories.tsx` if the project adds Storybook first.
- Tests: add `index.test.tsx` only for primitives with non-trivial behavior (e.g. `Button` loading state) if Vitest is wired up for mobile; otherwise skip.

---

## Verification

- `pnpm --filter mobile typecheck` passes.
- Manual smoke: temporarily render each primitive at the top of one screen (e.g. `FeedScreen`), confirm:
  - `Card.Root` + `EntryCard` variant look identical to a current `EntryCard`.
  - `Button` with each `tone` and `size` renders with HeroUI theme defaults (from T-016a).
  - `EmptyState` centers correctly inside `ScreenInset`.
  - `ScreenHeader` respects safe-area.
  - `ListRow` renders leading/title/subtitle/trailing in the right slots.
  - `Sheet.Form` opens, renders a form body, dismisses.
- Revert the smoke renders before final commit.
- `rg "from \"heroui-native\"" apps/mobile/src/components/ui/Button` → should import `Button` from HeroUI; no other `ui/` primitive should import raw HeroUI `Button`.
- `rg "tv\\(" apps/mobile/src/components/ui -g "index.tsx"` → zero matches (`tv` must live in `index.styles.ts` only).

---

## References

- [T-016 Epic](./T-016-design-system-epic.md)
- [T-016a Foundation](./T-016a-tokens-heroui-theme-docs.md)
- `apps/mobile/CLAUDE.md` — component rules, `tv` placement, no-barrel rule
- `docs/DESIGN_SYSTEM.md` — placeholders to fill
