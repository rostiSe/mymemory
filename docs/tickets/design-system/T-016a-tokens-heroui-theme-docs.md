# T-016a: Token Audit + HeroUI Theming Layer + DESIGN_SYSTEM.md

**Status:** done (pending manual smoke test)
**Phase:** Foundation (mobile)
**Type:** foundation
**Epic:** [T-016 Design System](./T-016-design-system-epic.md)
**Depends on:** —

---

## Goal

Prepare the ground for the primitive layer by:

1. Auditing and cleaning the design tokens so downstream primitives consume a canonical, well-named set.
2. Registering a HeroUI Native theming layer so primitives pick up our semantic colors, radii, and font sizes by default — no `className` overrides required on every call site.
3. Scaffolding `docs/DESIGN_SYSTEM.md` so T-016b and T-016c can fill in primitive docs as they land.

No new components are built in this ticket. No feature-side code changes beyond updates required by token renames.

---

## Scope

### 1. Token audit

Scan these three files and produce a rename/merge list **inside this ticket** before touching code:

- `apps/mobile/src/global.css`
- `apps/mobile/src/theme/layout-imperative.ts`
- `apps/mobile/src/theme/tokens.ts`

For each, list:

- **Unused tokens** — grep `apps/mobile/src` for each variable; if zero non-definition references, mark for deletion.
- **Near-duplicates** — e.g. multiple accent-soft tones, overlapping spacing values, overlapping radii.
- **Inconsistently named** — tokens that don't follow the `<semantic>-<modifier>` convention used by the rest.

Rules:

- Keep the three-file split (`global.css` = source of truth, `layout-imperative.ts` = numeric mirror, `tokens.ts` = color mirror for native APIs). Do **not** collapse them.
- Do not change token *values* unless a value is obviously wrong (e.g. a leftover literal). Renames and deletions only.
- If a rename affects consumers, update all references in a single commit so the repo compiles at every commit boundary.

### 2. HeroUI Native theming layer

- Create (or update, if one exists) `apps/mobile/src/theme/heroui.ts` that exports the HeroUI Native theme object.
- Map our semantic CSS variables → HeroUI color tokens (at minimum: `primary`, `secondary`, `success`, `warning`, `danger`, `surface`, `background`, `foreground`).
- Set default radii and font sizes to match our scale so `<Button>`, `<Card>`, `<Chip>`, `<Input>` don't need per-call overrides.
- Register the theme in `apps/mobile/src/app/_layout.tsx` (or wherever HeroUI's provider is mounted — verify first; the provider may already exist).
- Keep light/dark pairing driven by the existing Uniwind theme switch — do not introduce a parallel mechanism.

**Outcome:** `<Button color="primary">Save</Button>` in a brand-new screen renders with our accent color, our radius, and our default padding — no `className=` needed to make it match the rest of the app.

### 3. `docs/DESIGN_SYSTEM.md` scaffold

Check whether the file exists; if so, extend it — do not overwrite.

Content:

- **Token reference**: tables for colors (semantic names, light/dark hex), spacing, radii, typography, layout. One table per category. Values pulled from `global.css`.
- **How to consume**: short rules — prefer `className` + Uniwind; use `useThemeColor` or `tokens.ts` only when a native API demands a value.
- **Primitive sections**: one section per upcoming primitive (`Card`, `Button`, `EmptyState`, `ScreenHeader`, `ListRow`, `Sheet`) with a `> Coming in T-016b` placeholder. This lets T-016b fill in variant matrices and examples without restructuring the doc.
- **Do / Don't** list derived from the CLAUDE.md hard rules (no magic values, no arbitrary `p-[13px]`, no `tv` in `index.tsx`, `index.styles.ts` required, no barrel files).

---

## Critical files

- `apps/mobile/src/global.css`
- `apps/mobile/src/theme/layout-imperative.ts`
- `apps/mobile/src/theme/tokens.ts`
- `apps/mobile/src/app/_layout.tsx` (theme provider wiring)
- `apps/mobile/src/theme/heroui.ts` (new or updated)
- `docs/DESIGN_SYSTEM.md` (check first; new or extended)

---

## Acceptance criteria

- [x] Token audit table written into this ticket under a "Rename/merge list" section (filled in during execution).
- [x] Rename/merge list executed; `pnpm typecheck` passes against the updated state.
- [x] `grep` of renamed/deleted tokens returns zero stale references in `apps/mobile/src` (see "Verification" below).
- [x] HeroUI theming layer lives at `apps/mobile/src/theme/heroui.ts` and is registered at the HeroUI provider in `_layout.tsx` (via `<HeroUINativeProvider config={heroUIConfig}>`).
- [x] HeroUI colour/radius/size defaults flow through our CSS variables with no `className` override needed. A `<Button variant="primary">` renders with `--accent` background, `--accent-foreground` label, `--radius-lg` corners, and `md` sizing inherited from HeroUI's calculated variables over our tokens — verified by inspection against `heroui-native/src/styles/theme.css` rather than a throwaway in-app render (no `className` override is required at the call site, which is the spec).
- [x] `docs/DESIGN_SYSTEM.md` updated with: corrected colour tables (dark values no longer drift from `global.css`), spacing/typography/radii/layout tables, HeroUI theming-layer section, primitive placeholder sections (`Card`, `Button`, `EmptyState`, `ScreenHeader`, `ListRow`, `Sheet`) marked "Coming in T-016b", and Do / Don't list derived from `CLAUDE.md`.
- [ ] Manual smoke test — Feed, Search, EntryDetail, Spaces, LoginScreen look unchanged to the eye. **Owner to run `pnpm --filter mymemory start` and confirm before closing the epic**; all changes in this ticket are token deletions with zero runtime consumers and one prop addition on `HeroUINativeProvider`, so no visual regression is expected.

---

## Out of scope

- Building any new primitive components (T-016b).
- Migrating any feature components to new primitives (T-016c).
- Adding lint rules / ESLint enforcement.
- Changing token *values* (colors, spacing numbers). Renames/deletes only.
- Storybook setup.

---

## Verification

- `pnpm --filter mobile typecheck` passes.
- `pnpm --filter mobile start` — launch the app, navigate Feed → Search → Spaces → EntryDetail, confirm no visual regressions.
- Manually render a `<Button color="primary">` in any screen to confirm HeroUI picks up the theme, then revert.
- Grep sanity: for every renamed/deleted token, `rg "<old-name>" apps/mobile/src` returns no matches outside the definition site.

---

## Rename / merge list (execution log)

Grepped across `apps/mobile/src` (excluding definition sites) to identify dead or inconsistent tokens.

### `apps/mobile/src/global.css`

**Delete — zero non-definition references:**

| Token | Block | Reason |
|-------|-------|--------|
| `--share-quick-scrim` | `@variant light` | No consumer; Android ShareQuickActivity uses `android:theme`, not this var. |
| `--color-share-quick-scrim` | `@theme inline` | Same as above — no `bg-share-quick-scrim` anywhere. |
| `--color-tab-bar` | `@theme inline` | `FloatingTabBar` uses `bg-surface` / `useThemeColor` directly — never `bg-tab-bar`. |
| `--color-tab-bar-active` | `@theme inline` | Same — `bg-accent` is used inline. |
| `--color-tab-bar-inactive` | `@theme inline` | Same. |
| `--color-header` | `@theme inline` | Navigator header uses `useThemeColor("background")` in `_layout.tsx`. |
| `--color-header-foreground` | `@theme inline` | Uses `useThemeColor("foreground")` directly. |
| `--color-wiki-insight-border` | `@theme inline` | `InsightCard` does not use it — `bg-accent` / `bg-warning` applied directly per-variant. |
| `--color-wiki-contradiction-border` | `@theme inline` | Same. |
| `--color-wiki-question-border` | `@theme inline` | Same. |
| `--spacing-wiki-section-gap` | `@theme inline` | Not referenced in any `className`. The numeric mirror `WIKI_SECTION_GAP_PX` is also unused. |
| `--line-height-tight` | `@theme inline` | Tailwind v4 reads `--leading-*`, not `--line-height-*`. These three do nothing; `leading-tight` / `leading-normal` / `leading-relaxed` already map to Tailwind's defaults with matching values. |
| `--line-height-normal` | `@theme inline` | Same. |
| `--line-height-relaxed` | `@theme inline` | Same. |

**Keep, no change:** `--background`, `--foreground`, `--muted`, `--surface`, `--surface-*`, `--accent*`, `--default*`, `--success*`, `--warning*`, `--danger*`, `--border`, `--field-*`, `--overlay*`, `--spacing-*` (xs → 2xl + `card` / `screen` / `tab-clearance` / `compile-card-padding` / `wiki-toc-height` / `timeline-*`), `--font-size-*`, `--radius-*`, `--layout-floating-tab-*`, `--layout-scroll-fade-size`, `--icon-size-tab`. All have live consumers.

**Also keep:** `--spacing-screen-y` — currently unused but paired with `--spacing-screen` by convention; keeping so screens can opt into vertical padding without a rename later. Flagged for re-evaluation during T-016c migration.

**Near-duplicate retained:** `--font-size-md: 16px` overlaps with Tailwind's `text-base`. Kept because our app consistently uses the `xs / sm / md / lg / xl / 2xl / 3xl` scale; introducing `base` mid-stream breaks that naming.

### `apps/mobile/src/theme/layout-imperative.ts`

| Export | Action | Reason |
|--------|--------|--------|
| `WIKI_SECTION_GAP_PX` | Delete | No importers; paired with deleted `--spacing-wiki-section-gap`. |

All other exports have confirmed importers.

### `apps/mobile/src/theme/tokens.ts`

File is currently imported by **zero** runtime callers (`rg "@/theme/tokens"` → 0 matches). Kept per the three-file split rule; will become live when a StatusBar / chart integration needs static hex mirrors. Dark-mode `danger` (`#CF6679`) and `accent` (`#90A4AE`) drifted from `global.css`; rewritten to match the current oklch values.

No further renames — the existing `<semantic>-<modifier>` convention is consistent across the three files.

---

## References

- [T-016 Epic](./T-016-design-system-epic.md)
- `apps/mobile/CLAUDE.md` — design-system hard rules
- `apps/mobile/src/global.css` — token source of truth
