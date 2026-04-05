# Architecture

This document describes how the template is structured, how requests and auth flow through the app, and where to add new functionality when you reuse this repo for another product.

---

## Mental model

The app is split into **thin routes** (`src/app/`), **reusable UI** (`src/components/`), **feature verticals** (`src/modules/`), and **cross-cutting infrastructure** (`src/lib/`, `src/stores/`).

```mermaid
flowchart TB
  subgraph routes [Expo Router - src/app]
    Index[index redirect]
    Auth[(auth) login signup]
    Tabs[(tabs) feed settings]
  end

  subgraph state [Client state]
    AuthStore[Auth Zustand store]
    UIStore[UI Zustand store + MMKV]
  end

  subgraph data [Remote data]
    Supabase[(Supabase Auth)]
    RQ[TanStack Query]
  end

  Index --> AuthStore
  Auth --> AuthStore
  Tabs --> AuthStore
  Tabs --> UIStore
  Tabs --> RQ
  AuthStore --> Supabase
  RQ --> Supabase
```

---

## Provider tree

The root layout wraps the navigation stack with infrastructure that every screen can rely on.

Order (outer → inner):

1. **`GestureHandlerRootView`** — required for gesture-handler and bottom sheets.
2. **`AuthStoreProvider`** — Zustand auth store bound to React.
3. **`UIStoreProvider`** — theme and UI preferences (persisted subset via MMKV).
4. **`QueryClientProvider`** — TanStack Query defaults from `src/lib/query-client.ts`.
5. **`HeroUINativeProvider`** — HeroUI Native theme and components.
6. **`ErrorBoundary`** — catches render errors in the shell.

`src/app/_layout.tsx` also:

- Calls `initialize()` on the auth store once.
- Syncs `Uniwind.setTheme(theme)` when the UI store’s theme changes.
- Aligns `expo-system-ui` background with HeroUI `background` token.
- Hides the splash screen after auth has finished its initial session read.

---

## Routing and navigation

| Route | Role |
|-------|------|
| `app/index.tsx` | **Gate**: reads auth loading + `isAuthenticated`, then `router.replace` to `/(tabs)` or `/(auth)/login`. No layout chrome. |
| `app/(auth)/` | Stack for unauthenticated flows (login, signup). |
| `app/(tabs)/` | Tab navigator with a custom `FloatingTabBar`. |
| `app/debug.tsx` | Debug screen on the root stack (header shown). |

**Rule of thumb:** keep **business logic out of route files** when it grows beyond wiring. Put it in `src/modules/<Feature>/` or `src/hooks/` and call from the screen.

---

## Authentication

- **Client:** `src/lib/supabase.ts` creates a single Supabase client. Session tokens are stored with **Expo Secure Store** (custom storage adapter), not AsyncStorage.
- **State:** `src/stores/auth.store.ts` (vanilla Zustand) holds `session`, `isAuthenticated`, `isLoading`, and actions `signIn`, `signUp`, `signOut`, `initialize`.
- **Initialization:** `getSession()` runs once; `onAuthStateChange` keeps the store in sync afterward.

New apps should keep the Supabase project and keys in `.env` (see `.env.example`). If you swap auth providers, replace `supabase.ts` and the auth store while keeping the same **provider + gate** pattern at the root.

---

## Styling and theming

- **Entry CSS:** `src/global.css` imports Tailwind, Uniwind, and HeroUI Native styles, declares `@source` paths (app + HeroUI lib), and overrides CSS variables in `@layer theme` for light/dark.
- **Runtime theme:** The UI store’s `theme` (`light` | `dark` | `system`) is applied with `Uniwind.setTheme` in both the root layout and when `setTheme` runs in the store.
- **Imperative tokens:** `src/theme/tokens.ts` mirrors key colors and spacing for code that cannot use `className` (status bar, charts, etc.). Prefer CSS variables in `global.css` as the visual source of truth.

---

## Data fetching

- **TanStack Query** is configured in `src/lib/query-client.ts` (stale time, garbage collection, retries).
- Feature screens should use `useQuery` / `useMutation` (or shared hooks) rather than ad hoc `fetch` in components when you need caching and loading states.

There is **no** in-repo Hono/tRPC/Drizzle server in this checkpoint; `CLAUDE.md` lists those as the **intended** layout when you add a backend. Until then, Supabase (and optional Edge Functions) is the natural API boundary.

---

## State management

| Store | Scope | Persistence |
|-------|--------|-------------|
| Auth | Session and auth actions | Supabase + Secure Store (not Zustand persist) |
| UI | Theme, filters, tab metadata, drafts, etc. | MMKV via `zustand/middleware` `persist` (partial state) |

Add new **global UI** flags to `ui.store.ts` or introduce a **new** store file under `src/stores/` plus a small provider if the feature is app-wide.

---

## Components vs modules

- **`src/components/`** — Design-system-level or cross-feature UI. Suggested pattern for non-trivial widgets: `ComponentName/index.tsx`, `index.styles.ts` (tailwind-variants), optional `index.types.ts` / tests.
- **`src/modules/<Name>/`** — Everything for one feature: `components/`, `hooks/`, `utils/`, `schemas/` (Zod), `types.ts` inferred from schemas, optional `state/`.

This keeps routes dumb and makes it easy to delete or reuse a feature in another app cloned from the template.

---

## AI module (optional)

`src/modules/ai/` is a **placeholder slice** for Vercel AI SDK workflows (tools, pipelines, agents). See `src/modules/ai/README.md`. Wire it from routes or tab screens as your product needs.

---

## Native and Metro

- **`metro.config.js`** wraps the default Expo config with `withUniwindConfig`, pointing at `src/global.css` and generating `src/uniwind-types.d.ts`.
- **`expo-dev-client`** is a dependency: plan on EAS Build or local `expo run:*` for devices that need native code.

---

## TypeScript paths

`tsconfig.json` maps `@/*` → `./src/*` and `@/assets/*` → `./assets/*`. Use `@/lib/...`, `@/stores/...`, etc., for imports.

---

## Related docs

- [`../CLAUDE.md`](../CLAUDE.md) — canonical directory layout
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — tokens and CSS variables
- [`../README.md`](../README.md) — setup and template usage
