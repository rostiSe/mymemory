# Routing

> This document defines routing conventions for this Expo Router project. For folder structure and component conventions, see [STRUCTURE.md](./STRUCTURE.md).

---

## Core Principle — `app/` is for Routing Only

The `app/` directory is owned by Expo Router and is the **only** place that defines navigation structure. Files in `app/` are thin wrappers — they import a screen from `features/` and render it. No logic, no state, no JSX beyond the screen component itself.

```ts
// app/(auth)/login.tsx
import LoginScreen from '@/features/auth/screens/LoginScreen'

export default function LoginRoute() {
  return <LoginScreen />
}
```

If you find yourself writing hooks, conditionals, or JSX inside an `app/` file, that code belongs in the feature screen instead.

---

## Directory Structure

```
app/
├── _layout.tsx               # Root layout — providers, global navigation shell
├── (auth)/
│   ├── _layout.tsx           # Auth stack layout
│   ├── login.tsx
│   └── signup.tsx
├── (tabs)/
│   ├── _layout.tsx           # Tab navigator config
│   ├── index.tsx             # Feed tab
│   ├── search.tsx
│   ├── spaces.tsx
│   ├── digestion.tsx
│   └── settings.tsx
├── entry/
│   └── [id].tsx
├── digest/
│   └── [id].tsx
├── space/
│   └── [id].tsx
├── debug.tsx
└── template-test.tsx
```

### Route groups `(group)`

Use route groups to scope layouts without affecting the URL path. Every group gets its own `_layout.tsx`.

- `(auth)` — unauthenticated flows (login, signup, onboarding)
- `(tabs)` — main authenticated tab navigation
- Add new groups only when you need a distinct layout or navigation shell

### Layouts `_layout.tsx`

Layouts configure navigators and inject any route-group-scoped logic (e.g. auth guards). They do not render screen content.

```ts
// app/(auth)/_layout.tsx
import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  )
}
```

The root `app/_layout.tsx` is also where global providers are composed (for example under `stores/providers/` in this app).

```ts
// app/_layout.tsx (pattern — match actual provider imports in the repo)
import { Stack } from 'expo-router'
import { AuthStoreProvider } from '@/stores/providers/auth-provider'
import { UIStoreProvider } from '@/stores/providers/ui-provider'

export default function RootLayout() {
  return (
    <AuthStoreProvider>
      <UIStoreProvider>
        <Stack />
      </UIStoreProvider>
    </AuthStoreProvider>
  )
}
```

---

## Route File Rules

| Rule                                    | Why                                       |
| --------------------------------------- | ----------------------------------------- |
| Route files are `.tsx`, not `.ts`       | Expo Router requires a default JSX export |
| Default export only — no named exports  | Expo Router convention                    |
| No hooks or logic in route files        | Belongs in the feature screen             |
| One screen import per route file        | Keeps routing intent clear                |
| Route filename matches the path segment | Predictable, no surprises                 |

---

## Screen → Route Mapping

Every screen in `features/` that needs a route gets a corresponding thin file in `app/`. The mapping is always 1:1 at the **route** level; **multiple routes may import different screens from the same feature** (prefer that over one feature per screen).

```
features/auth/screens/LoginScreen/       →   app/(auth)/login.tsx
features/auth/screens/SignupScreen/    →   app/(auth)/signup.tsx
features/entry/screens/FeedScreen/      →   app/(tabs)/index.tsx
features/entry/screens/EntryDetailScreen/ → app/entry/[id].tsx
features/space/screens/SpacesScreen/    →   app/(tabs)/spaces.tsx
features/space/screens/SpaceDetailScreen/ → app/space/[id].tsx
features/settings/screens/SettingsScreen/ → app/(tabs)/settings.tsx
```

Screens that are navigated to programmatically within a feature (e.g. a modal, a detail view) still need a route file if they are part of the Expo Router tree.

**Feature granularity:** Keep routes thin; group related screens under one feature folder (e.g. `entry`, `space`) when they share components and hooks. Do not add a new top-level feature for every screen by default.

---

## Navigation Between Routes

Use Expo Router's `router` or `Link` — never pass navigation props down through components.

```ts
import { router } from 'expo-router'

// Imperative navigation
router.push('/(auth)/login')
router.replace('/(tabs)/')

// Link component
import { Link } from 'expo-router'
<Link href="/(auth)/signup">Create account</Link>
```

Route params are typed via `expo-router`'s generated types. Do not type them manually.

---

## Auth Guard Pattern

Auth guards live in the layout, not in individual screens.

```ts
// app/(tabs)/_layout.tsx
import { Redirect } from 'expo-router'
import { useAuthStore } from '@/stores/providers/auth-provider'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />
  }

  return <Tabs />
}
```

This means screens inside `(tabs)` never need to handle unauthenticated state — the layout guarantees it.

---

## Adding a New Route — Checklist

1. Create the screen in `features/[feature]/screens/ScreenName/index.tsx` (default export the screen — not a barrel file).
2. Create the route file in `app/` — **one** default export that imports the screen from its **concrete path** (e.g. `@/features/.../screens/ScreenName`) and renders it; no other logic.
3. If the route needs a new group or layout, add `_layout.tsx` to that group.
4. If the route is protected, add the auth guard to the group layout — not the screen.

**Do not** add `features/<feature>/index.ts` (or similar) only to re-export screens for shorter imports — see [STRUCTURE.md](./STRUCTURE.md#no-barrel-files).
