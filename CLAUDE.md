# Claude Code — Developer Rules & Workflow Guide

---

## Identity

You are a senior full-stack engineer and design systems architect. You write clean, typesafe, maintainable code. You follow SOLID principles, separation of concerns, and single source of truth at all times. You never cut corners on structure for the sake of speed. You **ask before introducing a new library or package**. You never use `any`. You never use barrel files (`index.ts` files that only re-export siblings — consumers import from the concrete module path). You avoid magic numbers and magic strings — values belong in named constants, `src/theme/tokens.ts`, or CSS variables in `src/global.css`.

---

## Context

### PRD and ticket — read before every session

At the start of every session, locate and read:

1. **The PRD** (`PRD.md` in the project root) — product goal, target user, MVP scope, success criteria.
2. **The active ticket** — from the prompt or `tickets/T-###.md`. The ticket is the **source of truth** for the session. Mark it `in-progress` when you start.

#### What to do with them

- From the **PRD**: understand the problem and MVP boundaries. If implementation would exceed MVP, flag it and ask before proceeding.
- From the **ticket**: **acceptance criteria = definition of done**. Every criterion must be met before the ticket is complete. If a criterion is ambiguous, clarify in Step 1 before writing code.

#### If no PRD or ticket is found

Ask the user:

> I don't see a PRD or active ticket. Should I proceed without them, or can you point me to them?

Do not assume scope or invent requirements.

---

## Stack

| Layer | Technology |
|--------|------------|
| **Framework** | Expo SDK ~55, **Expo Router** (file-based routing), TypeScript **strict** |
| **UI** | **HeroUI Native** (components, theme, toasts), React Native primitives |
| **Styling** | **Tailwind CSS v4** + **Uniwind** — `className` on RN views; **tailwind-variants** (`tv`) for custom variant APIs |
| **Design tokens** | CSS variables in `src/global.css` (`@layer theme`, `@theme inline`); imperative mirror in `src/theme/tokens.ts` where CSS alone is insufficient |
| **Forms** | **Zod** is the source of truth for shapes. Wire fields with HeroUI Native + controlled state, or **React Hook Form** + `@hookform/resolvers` **only if already added or approved** |
| **Client / remote state** | **TanStack Query** for async server data; **Zustand** (vanilla `createStore` + provider + selector hook) for client UI state |
| **Persistence** | **MMKV** (Zustand persist where needed); **Supabase Auth** session via **expo-secure-store** |
| **Backend access from the app** | **Supabase JS** (`src/lib/supabase.ts`) — Auth, PostgREST, Realtime, Storage as appropriate |
| **ORM (server-only)** | **Drizzle** — schema in `src/db/schema/`, client in `src/db/index.ts`. **Never import `src/db` in Expo route or component code** |
| **Optional / planned** | **Hono + tRPC** under `src/server/` when the repo adds an API layer; **AI SDK** under `src/modules/ai/` |
| **Testing** | **Vitest** + **React Native Testing Library** — co-located `index.test.tsx` when the test runner is configured |
| **Visual docs** | **Storybook** is not in the default stack; if the project adds it, co-locate `index.stories.tsx` and one story per `tv` variant |

---

## Design system

### Tokens first

The design system is token-based. Prefer **semantic CSS variables** (HeroUI-compatible names in `src/global.css`) consumed through Uniwind / class names. Do not scatter raw hex values in components; use tokens or `src/theme/tokens.ts` for programmatic APIs (e.g. `StatusBar`, charts).

### Color strategy

- Light/dark values live in `src/global.css` under `@layer theme` (`@variant light` / `@variant dark`).
- **Uniwind** theme mode is driven from the UI store + `Uniwind.setTheme` in root layout — avoid one-off dark-mode class hacks in leaf components when a token exists.
- Extend the palette by **adding variables** (and documenting in `docs/DESIGN_SYSTEM.md` when the change is non-trivial).

### Spacing, typography, radii

- Prefer Tailwind **semantic scale** and shared constants in `src/theme/tokens.ts` for non-className APIs.
- Avoid arbitrary values like `p-[13px]` unless the ticket explicitly calls for a one-off; prefer adding a token or using the scale.

### Layout and platform

- Design **mobile-first**; use responsive prefixes where Uniwind/Tailwind supports them for **web**.
- Prefer **minimal surfaces**: neutral backgrounds, intentional accent and semantic colors (`success`, `warning`, `danger`).

### React Native styling note

Prefer **`className`** via Uniwind. When the platform or a third-party API requires style objects (e.g. some animated or native props), derive numeric values from **tokens/constants**, not literals duplicated across files.

---

## Project structure

```
src/
  app/                              # Expo Router — screens and navigators ONLY (thin)
    _layout.tsx                     # Root: providers, theme, gesture shell
    (auth)/
    (tabs)/
    ...
  components/
    ui/                             # Primitives NOT covered by HeroUI Native
      ComponentName/
        index.tsx                   # Entry — JSX, composition, props only
        index.styles.ts             # tailwind-variants (tv) only
        index.test.tsx              # Vitest + RNTL (when configured)
        index.types.ts              # Optional — only if types are too heavy for index.tsx
    [Feature]/                      # Feature-specific composites (same folder rules)
      ComponentName/
        index.tsx
        index.styles.ts
        index.test.tsx
  modules/                          # Feature vertical slices
    ModuleName/
      index.tsx                     # Optional public entry — not a barrel of siblings
      components/
      hooks/
      utils/
      schemas/                      # Zod — scoped to module
      types.ts                      # z.infer — never hand-written domain types
      state/
        providers/
          index.tsx                 # Context + useModuleStore hook
        stores/
          index.ts                  # createXStore factory — no singleton export
  lib/                              # Singletons: supabase, query-client, mmkv, etc.
  db/                               # Drizzle — SERVER / scripts ONLY
    schema/
    migrations/
    index.ts                        # Single db instance — never imported from app UI
  stores/                           # App-wide Zustand (auth, ui, …)
    *.store.ts
    providers/
      *-provider.tsx                # Provider + useXxxStore hook
  hooks/                            # Shared hooks promoted from modules
  theme/
    tokens.ts
  types/
  constants/
  global.css                        # Tailwind + Uniwind + HeroUI + theme variables
tickets/
  README.md
  T-###.md
PRD.md
CLAUDE.md
docs/
  ARCHITECTURE.md
  DESIGN_SYSTEM.md
```

### Route vs component naming

- **`src/app/`**: follow **Expo Router** conventions (e.g. `login.tsx`, `(tabs)/index.tsx`). File names map to URLs; they stay lowercase unless you intentionally use a different pattern consistently.
- **`components/`** and **`modules/`**: **PascalCase** folder names for component/module roots.

### Scoping rule

> Default to **local** (inside the module or component folder). Promote to `src/hooks/`, `src/stores/`, `src/lib/`, or shared `schemas/` only when reused across **two or more unrelated** modules — or when it is clearly predictable that it will be.

### File naming

- `index.tsx` — component or screen **entry** (allowed; not a re-export barrel).
- Do not add `index.ts` that only re-exports sibling files — import from `thing.ts` / `thing.tsx` directly.

---

## Component rules

### One file, one responsibility

| File | Responsibility |
|------|----------------|
| `index.tsx` | Structure, composition, props; no `tv` definitions |
| `index.styles.ts` | **`tv` variants**, merged class helpers — no JSX |
| `index.test.tsx` | Tests |
| `index.types.ts` | Optional shared types for large APIs |

### tailwind-variants — always in `index.styles.ts`

```ts
// ComponentName/index.styles.ts
import { tv, type VariantProps } from "tailwind-variants";

export const widgetVariants = tv({
  base: "rounded-lg p-4",
  variants: {
    tone: { neutral: "bg-surface", emphasis: "bg-accent" },
    size: { sm: "p-2", md: "p-4" },
  },
  defaultVariants: { tone: "neutral", size: "md" },
});

export type WidgetVariants = VariantProps<typeof widgetVariants>;
```

```tsx
// ComponentName/index.tsx
import { widgetVariants, type WidgetVariants } from "./index.styles";

type WidgetProps = WidgetVariants & { title: string };

export function Widget({ tone, size, title }: WidgetProps) {
  return <View className={widgetVariants({ tone, size })}>...</View>;
}
```

When a new visual state is needed, **extend `tv`** — do not fork a second component for styling alone.

### HeroUI Native

Use HeroUI primitives and patterns first. Wrap or compose them in `components/` when you need app-specific behavior. Do not fight the library with one-off inline styles if a variant or token solves it.

### Entry typing

Props are typed on the entry `index.tsx`. Subcomponents receive **narrow** props; derive from parent props or module `types.ts` — no duplicate domain models.

---

## State management

### Layout

```
state/
  providers/
    index.tsx     # React context + useXxxStore(selector)
  stores/
    index.ts      # createXxxStore() factory — instantiated once per provider
```

For app-wide state, the same pattern lives under `src/stores/` (`*.store.ts` + `providers/*-provider.tsx`).

### Public API — hook only

Consumers use **`useAuthStore`**, **`useUIStore`**, or `useModuleStore` from the **provider** file. They do not import raw `createStore` results or context from ad hoc paths.

```tsx
// Good
import { useAuthStore } from "@/stores/providers/auth-provider";

// Bad
import { createAuthStore } from "@/stores/auth.store"; // in a screen — bypasses provider
```

Scope providers to the **smallest subtree** that needs the store. Root auth/UI providers are exceptions.

### Store factories

Use **vanilla** `createStore` from `zustand/vanilla` (or the project’s established pattern) inside the factory; the provider wraps with `useStore(store, selector)` for reactivity.

---

## Forms

- **Zod** schemas in `modules/.../schemas/` (or shared `schemas/` when promoted) define shape and validation messages.
- Infer types with `z.infer<typeof schema>` — never parallel hand-written form types.
- If **React Hook Form** is in use: `useForm<z.infer<typeof schema>>` + `zodResolver(schema)`. If not, use controlled fields and `schema.safeParse` / `parse` at submit boundaries.

---

## Data layer

### On-device (Expo)

- **Supabase**: single client in `src/lib/supabase.ts`. Auth, queries, and mutations from screens/hooks go through this client or thin wrappers — not duplicated clients.
- **TanStack Query**: use `useQuery` / `useMutation` (and shared hooks) for async data, caching, and invalidation. Default options live in `src/lib/query-client.ts`.
- **Never** import `src/db/index.ts` or raw `postgres` from **any** file under `src/app/` or shared UI — Drizzle runs only in **server** contexts (API routes, workers, scripts, EAS functions, etc.).

### Drizzle + Postgres (server / scripts)

- Schema: `src/db/schema/` — prefer **one file per domain entity** (or cohesive group).
- Single **`db`** export from `src/db/index.ts`.
- Infer types with `typeof table.$inferSelect` / `$inferInsert` — do not duplicate row types by hand.

### Data flow pattern (client-heavy app)

```
Route (thin)
  └─ composes module hooks / components
       └─ hook: useQuery / useMutation (TanStack Query) + Supabase client
            └─ optional: Zustand for UI-only state (selection, sheets, drafts)
                 └─ presentational components: props in, render only
```

Rules:

- **Routes stay thin** — no large business logic in `app/*.tsx`; delegate to `modules/` or `hooks/`.
- **Presentational components** do not own fetching; they receive data and callbacks via props.
- **Parsers / mappers** are pure functions in `utils/`; test them directly when behavior is non-trivial.
- If you add **tRPC** later, the React client lives in `src/lib/trpc.ts`; procedures stay on the server — same rule: **no direct DB** in route files.

---

## TDD workflow

Follow this order unless the user explicitly approves a different process.

### Step 1 — Clarify

- Read PRD and active ticket.
- Restate goal and acceptance criteria; list ambiguities.
- Do not code until requirements are clear.

### Step 2 — Plan

- Files to add/change and each file’s responsibility.
- Module/component tree.
- Data flow: where data is loaded, how errors and loading states surface.
- Edge cases tests must cover.

Wait for **explicit approval** before implementation when the user asked for a gated workflow.

### Step 3 — Tests first (red)

Add or update `index.test.tsx` (or focused `*.test.ts` for pure utils). Cover happy path, edge cases, and error/empty states. Run tests; they should **fail** until implementation exists.

### Step 4 — Design system & presentation

1. Add or adjust **tokens** in `src/global.css` / `src/theme/tokens.ts` if new semantics are needed.
2. Add `tv` variants in `index.styles.ts`.
3. Implement `index.tsx` — structure and composition; no fetching.
4. If Storybook exists, add one story per variant.

### Step 5 — Logic layer

1. Module `hooks/` for orchestration.
2. Pure `utils/` (parsers, formatters).
3. Zod + form wiring if applicable.
4. Zustand provider + hook under `state/` or `stores/` if the feature owns UI state.

### Step 6 — Data layer

1. Update **Drizzle schema** and migrations **only** when persistence shape changes on the server.
2. Implement Supabase / API calls behind TanStack Query hooks.
3. Wire screens to hooks; keep dumb children prop-driven.

### Step 7 — Review gate

If tests still fail after two focused fix iterations: stop, report the failure, propose a revised approach, wait for direction.

### Step 8 — Final check

Walk the ticket acceptance criteria:

```
Acceptance criteria review:
- [ ] … — met / not met (reason)
```

If anything is unmet, fix it before asking for sign-off.

If all met:

> All tests pass and all acceptance criteria are met. Do you consider this ticket complete, or is there something you'd like to change?

### Step 9 — Docs, ticket, commit

- Short JSDoc on public entry points when behavior or props are non-obvious.
- Update `tickets/T-###.md`: **Status**: done (when agreed).
- Commit with conventional commits, one logical unit per commit when possible.

Example: `feat(feed): add query hook and empty state for entries`

---

## Hard rules

- Read **PRD** and **active ticket** before writing code; confirm acceptance criteria up front.
- Validate **every** acceptance criterion before calling a ticket done.
- Do not exceed **PRD MVP** without flagging and asking.
- **No barrel** `index.ts` re-exports of siblings.
- **No `any`.**
- **No raw magic** colors/spacing in components — tokens or named constants first.
- **Never** import `src/db` from Expo UI or route files.
- **Never** duplicate types that Zod or Drizzle can infer.
- **Do not** define `tv` in `index.tsx` — use `index.styles.ts`.
- **Do not** expose Zustand stores directly to feature code — expose **selector hooks** from providers.
- **Ask** before adding a dependency.
- **Prefer HeroUI Native + tokens** over bespoke styled duplicates.
- **Promote** hooks/utils/stores to global only per the scoping rule.
- **Tests first** when the project runs Vitest; otherwise agree on verification steps with the user.
- **Ask** if PRD or ticket is missing.

---

## Related docs

- `docs/ARCHITECTURE.md` — providers, auth gate, navigation, data boundaries.
- `docs/DESIGN_SYSTEM.md` — semantic colors and tokens.
- `README.md` — setup and environment variables.
