# T-016: Design System Standardization (epic)

**Status:** done (pending owner smoke test)
**Phase:** 5 — Design System
**Type:** epic (tokens + primitives + migration)
**Depends on:** —

---

## Goal

Every severe UI surface in the mobile app (Card, Button, EmptyState, ScreenHeader, ListRow, Sheet) has a single canonical implementation built on design tokens and `tailwind-variants`, and the worst duplication hot-spots are migrated onto them.

**Why now:** the token foundation is solid (`apps/mobile/src/global.css`, `theme/layout-imperative.ts`, `theme/tokens.ts`), but only ~12% of feature components (7 of 58) follow the `index.tsx` + `index.styles.ts` + `tv()` pattern. This causes:

- 5 near-duplicate Card components for the same job (`EntryCard`, `SearchResultCard`, `EntrySummaryCard`, `RelatedSpaceCard`, `CompileStatusCard`).
- Inline-reimplemented empty states in Feed, Search, Spaces.
- Scattered screen headers (`FeedHeader`, `EntryDetailHeader`, inline header in `SpacesScreen`).
- Raw HeroUI `Button` imports with per-call `className` / color overrides.
- No documented HeroUI theming layer — customization happens by `className` on every call site.

Refactors today are harder than they should be because changing "the Card" means changing five files. This epic fixes that.

---

## Scope

**In scope:**
- Token audit/cleanup across `global.css`, `layout-imperative.ts`, `tokens.ts`.
- HeroUI Native theming layer so primitives pick up our semantic colors/radii/sizes by default.
- `docs/DESIGN_SYSTEM.md` documenting tokens and every primitive.
- **Compound + pre-built variants** for Card: `Card.Root/Cover/Header/Body/Footer` primitives plus ready-made `EntryCard` / `SpaceCard` / `StatusCard` variants that compose them.
- Primitives: Card, Button wrapper, EmptyState, ScreenHeader, ListRow, Sheet wrapper.
- Migrating the hot-spots: the 5 duplicate cards, empty states in Feed/Search/Spaces, screen headers, all raw HeroUI `Button` usages.

**Out of scope:**
- Full 58-component sweep — only hot-spots in this epic.
- Lint rules / ESLint enforcement.
- Storybook setup.

---

## Architecture

### Component layering

```
Tokens (global.css, layout-imperative.ts, tokens.ts)
  └→ HeroUI theming layer (theme/heroui.ts)
       └→ Compound primitives (components/ui/Card, Button, EmptyState, ...)
            └→ Pre-built variants (EntryCard, SpaceCard, StatusCard)
                 └→ Screens (thin, compose only)
```

- Compound primitives expose composition (`Card.Root`, `Card.Body`, `Card.Footer`).
- Pre-built variants cover the three or four concrete shapes used across screens so consumers don't assemble the same compound each time.
- Every primitive keeps its `index.tsx` + `index.styles.ts` split per CLAUDE.md rules.

### Epic-level acceptance

- [x] All three phase tickets (T-016a, T-016b, T-016c) are marked `done` (T-016c pending owner smoke test).
- [x] Zero raw HeroUI `Button` imports in `apps/mobile/src/features/**` — feature screens use `@/components/ui/Button`; primitives (`BottomSheet`, `Dialog`, `ErrorBoundary`, `Sheet`, `EmptyState`) may still use HeroUI `Button` internally per T-016c.
- [x] Hot-spot card/header surfaces migrated onto `components/ui/Card`, `ScreenHeader`, `EmptyState`; no duplicate card components remain for those paths.
- [x] `docs/DESIGN_SYSTEM.md` documents every primitive with variant matrix and do/don't rules.
- [ ] Owner smoke test — Feed, Search, EntryDetail, Spaces (and auth/settings/wiki version history from T-016c) visually match pre-migration.

---

## Child tickets

### Foundation phase

| ID | Ticket | Type | Phase |
|----|--------|------|-------|
| [T-016a](./T-016a-tokens-heroui-theme-docs.md) | Token audit + HeroUI theming layer + `DESIGN_SYSTEM.md` scaffold | foundation | Foundation |
| [T-016b](./T-016b-primitives.md) | Primitives: Card (compound + variants), Button, EmptyState, ScreenHeader, ListRow, Sheet | feature (mobile) | Primitives |
| [T-016c](./T-016c-migration.md) | Migrate hot-spots: 5 cards, empty states, screen headers, raw Buttons | migration (mobile) | Migration |
| [T-016d](./T-016d-spaces-wiki-polish.md) | Polish: Spaces rows + Wiki page chrome consume the primitives | migration (mobile) | Polish |

### Dependency flow

```
T-016a (Foundation)
  └→ T-016b (Primitives)
       └→ T-016c (Migration)
```

---

## References

- `apps/mobile/CLAUDE.md` (root) — hard rules for tokens, `tv`, no barrels, no magic values.
- `apps/mobile/src/global.css` — current token source of truth.
- `apps/mobile/src/theme/layout-imperative.ts` — numeric mirror.
- `apps/mobile/src/theme/tokens.ts` — color mirror for StatusBar / charts / APIs that can't use CSS.
- **Migrated (T-016c):** feed/search entry rows → `@/components/ui/Card/variants/EntryCard`; entry detail summary → `EntrySummarySection` (compound `Card`); related spaces strip → `SpaceCard`; compile panel → `StatusCard` + `Button` wrapper; screen headers → `ScreenHeader`; empty states → `EmptyState`.
