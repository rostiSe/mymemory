# Project Structure

> This document defines the folder structure, naming conventions, and organization rules for this Expo project. For routing-specific conventions, see [ROUTING.md](./ROUTING.md).

---

## Top-Level Overview

```
apps/mobile/src/
├── app/                  # Expo Router — routing only (see ROUTING.md)
├── features/             # Feature modules — business logic, screens, hooks, api
├── components/           # Shared UI components
├── stores/               # Global Zustand stores and providers
├── hooks/                # Shared hooks (non-feature-specific)
├── lib/                  # Third-party setup and utilities
├── theme/                # Design tokens (programmatic)
├── constants/            # App-wide constants (optional)
└── types/                # Global TypeScript types (optional)
```

---

## Component Convention — `CapitalFolder/index.tsx`

**Every component lives in its own folder.** No exceptions, regardless of size. This keeps the structure uniform and makes co-location of scoped files natural without refactoring later.

### Folder anatomy

```
ComponentName/
├── index.tsx             # Component definition and default export
├── types.ts              # Types local to this component (if substantial)
└── utils/                # Scoped utilities subfolder (if needed)
    └── validation.ts
```

**Rules:**

- The folder name is `PascalCase`, matching the component name
- `index.tsx` is the single entry point — always exports the component as default
- `types.ts` lives alongside `index.tsx` when types are non-trivial; otherwise define inline
- Scoped utilities go in a `utils/` subfolder — never as flat sibling files
- Do not create subfolders other than `utils/` unless there is a clear, discussed reason

### Examples

**Simple component — no scoped files needed:**

```
Button/
└── index.tsx
```

**Component with local types:**

```
Avatar/
├── index.tsx
└── types.ts
```

**Complex component with scoped utilities:**

```
LoginForm/
├── index.tsx
├── types.ts
└── utils/
    └── validation.ts
```

### Importing components

Always import from the folder, never the file directly:

```ts
// ✅ Correct — default export from the component folder
import Button from "@/components/ui/Button";
import LoginForm from "@/features/auth/components/LoginForm";

// ❌ Wrong
import Button from "@/components/ui/Button/index";
```

---

## No barrel files

**Do not** add files whose only job is re-exporting siblings so callers get a shorter path (for example `features/auth/index.ts` that only `export { … } from "./screens/…"`).

**Allowed:** `ComponentName/index.tsx` (or `ScreenName/index.tsx`) that **defines** the component/screen and **default-exports** it — that is the real entry file, not a barrel.

**Consumers** (including `app/` route wrappers) import from the **concrete module path**, for example:

```ts
import LoginScreen from "@/features/auth/screens/LoginScreen";
```

---

## Shared Components — `components/`

Components that are **generic** and reused in multiple places live here. Anything **tied to a product area** (entries, spaces, auth flows, etc.) belongs under that feature's `components/` folder — not under `components/`.

### `components/ui/` — app-level UI building blocks

Use **`components/ui/`** for:

- Thin wrappers around **HeroUI Native** (or similar) that you reuse when composing screens and feature components
- Small, **domain-agnostic** pieces (e.g. a standardized `TextField` shell, icon button, chip) that are not about "an entry" or "a space"

Do **not** put domain widgets here. Example: **`EntryCard`** and **`ProcessingStatus`** live under `features/entry/components/…` because they are about entries, even though they use HeroUI `Card` / layout primitives internally.

### `components/layout/` — structural shell

Nav chrome, floating tab bars, section shells — shared layout only.

```
components/
├── ui/                   # Reusable HeroUI-forwarded / generic UI (not domain-specific)
│   ├── TextFieldShell/
│   │   └── index.tsx
│   └── …
└── layout/               # Structural layout components
    ├── FloatingTabBar/
    │   └── index.tsx
    └── …
```

**Ask yourself before adding under `components/`:** Is this truly generic, or does it encode entry/space/auth/search semantics? If it encodes a domain, put it in **`features/<area>/components/`**.

---

## Features — `features/`

A **feature** is a **product area**, not necessarily "one folder per screen". Prefer **fewer, broader** features when screens and logic naturally belong together — avoid splitting only because you can.

**Examples in this app:**

- **`entry`** — feed + entry detail + entry-specific components (`EntryCard`, `ProcessingStatus`) + entry data hooks (`useEntries.ts`). Multiple routes can point at different screens inside the same feature.
- **`space`** — spaces tab + space detail + `SpaceTree` + `useSpaces` (and related API usage). One feature owns everything "spaces".

Smaller or standalone flows (e.g. **auth**, **bootstrap** redirect, **debug**) can stay as their own feature when that keeps the tree easy to navigate.

**Rules of thumb:**

- Co-locate **screens**, **hooks**, and **components** that change together for the same user journey.
- Do **not** create a new top-level feature for every new route if it fits an existing area.
- **Cross-feature imports** are allowed when necessary, but if two screens always share hooks and UI, consider merging them into one feature first.
- Truly generic pieces still belong in `components/ui/` or `hooks/` (see below).

```
features/
├── auth/
│   ├── screens/
│   │   ├── LoginScreen/
│   │   └── SignupScreen/
│   ├── components/
│   └── hooks/
├── entry/
│   ├── screens/
│   │   ├── FeedScreen/
│   │   └── EntryDetailScreen/
│   ├── components/
│   │   ├── EntryCard/
│   │   └── ProcessingStatus/
│   └── hooks/
│       └── useEntries.ts
├── space/
│   ├── screens/
│   │   ├── SpacesScreen/
│   │   └── SpaceDetailScreen/
│   ├── components/
│   │   └── SpaceTree/
│   └── hooks/
│       └── useSpaces.ts
└── …
```

Import screens, hooks, and types from **explicit paths** inside the feature (see [No barrel files](#no-barrel-files)). Do not add `features/<feature>/index.ts` re-export barrels.

---

## Global State — `stores/`

Zustand stores and their providers live here (this app uses `stores/` at `src/stores/`, not a separate `state/` root).

```
stores/
├── auth.store.ts
├── ui.store.ts
├── app.store.ts
└── providers/
    ├── auth-provider.tsx
    ├── ui-provider.tsx
    └── app-provider.tsx
```

### Store convention

Stores are named `[domain].store.ts`. Each store defines its state, actions, and selectors in one file.

```ts
// stores/auth.store.ts
import { create } from "zustand";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  setUser: (user: AuthUser) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: true }),
  clearAuth: () => set({ user: null, isAuthenticated: false }),
}));

export const selectUser = (state: AuthState) => state.user;
export const selectIsAuthenticated = (state: AuthState) =>
  state.isAuthenticated;
```

### Provider convention (`providers/`)

Providers wrap store access for React. Each provider exposes typed hooks (see existing `auth-provider.tsx`, `ui-provider.tsx`, etc.).

**Rules:**

- Selectors are defined in the store file — avoid ad-hoc inline selectors at call sites when a named selector exists
- Providers live in `stores/providers/`
- Providers are composed in the root `app/_layout.tsx` — not nested ad-hoc in screens

---

## Shared Hooks — `hooks/`

Hooks that are not tied to any single feature and are used across multiple parts of the app.

```
hooks/
├── useTheme.ts
├── useDebounce.ts
└── useKeyboard.ts
```

If a hook is only used within one feature, it belongs in `features/[feature]/hooks/` instead.

---

## Lib — `lib/`

Third-party client setup and shared utility functions. One file per concern.

```
lib/
├── supabase.ts           # Supabase client
├── query.ts              # TanStack Query client setup
├── api.ts                # Base API fetch wrapper
└── date.ts               # Date utility functions
```

No business logic here — only setup and generic utilities.

---

## Constants — `constants/`

```
constants/
├── api.ts                # Endpoint paths, timeouts
└── theme.ts              # Design tokens not covered by NativeWind
```

---

## Types — `types/`

Global TypeScript types that are not owned by any feature or component.

```
types/
└── global.ts
```

Feature-specific types always live inside the feature. Component-specific types live in `types.ts` alongside the component's `index.tsx`. Only truly app-wide types (e.g. API response envelopes, navigation param types) belong here.

---

## Naming Conventions Summary

| Thing                  | Convention           | Example                         |
| ---------------------- | -------------------- | ------------------------------- |
| Component folders      | `PascalCase`         | `LoginForm/`                    |
| Component entry        | `index.tsx`          | `LoginForm/index.tsx`           |
| Scoped utils subfolder | `utils/`             | `LoginForm/utils/validation.ts` |
| Feature folders        | `camelCase`          | `features/auth/`                |
| Store files            | `camelCase.store.ts` | `auth.store.ts`                 |
| Provider files         | `PascalCase.tsx`     | `AuthProvider.tsx`              |
| Hook files             | `camelCase`          | `useAuth.ts`                    |
| API files              | `camelCase.api.ts`   | `auth.api.ts`                   |
| Shared hooks           | `camelCase`          | `useDebounce.ts`                |
| Barrel re-exports      | **Do not use**       | No `features/foo/index.ts`-only exports |
