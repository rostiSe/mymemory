# Expo + Uniwind + HeroUI Native — app template

This repository is an **Expo SDK 55** mobile (and web) starter structured for real products: file-based routing, Supabase auth with secure storage, TanStack Query, Zustand + MMKV, Tailwind CSS v4 via **Uniwind**, and **HeroUI Native** for components.

Use it as a **checkpoint template**: copy or fork the repo when you start a new app, then rename identifiers and environment values (see [Using this repo as a template](#using-this-repo-as-a-template)).

---

## What you get

| Area | Choice |
|------|--------|
| Framework | [Expo](https://expo.dev) ~55, [Expo Router](https://docs.expo.dev/router/introduction/) |
| UI | [HeroUI Native](https://github.com/heroui-inc/heroui-native), [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) + [Uniwind](https://github.com/uniwind/uniwind) (`className` on RN views) |
| Auth | [Supabase Auth](https://supabase.com/docs/guides/auth) with [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) session persistence |
| Server state | [TanStack Query](https://tanstack.com/query) |
| Client state | [Zustand](https://zustand-demo.pmnd.rs/) (vanilla stores + React providers); theme/search UI state persisted with [MMKV](https://github.com/mrousavy/react-native-mmkv) |
| Validation | [Zod](https://zod.dev) |
| AI (optional slice) | Vercel [AI SDK](https://sdk.vercel.ai/docs) + `@ai-sdk/openai` — see `src/modules/ai/README.md` |

For **folder conventions** (routes vs modules vs components), see [`CLAUDE.md`](./CLAUDE.md) and [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

---

## Prerequisites

- **Node.js** (LTS recommended)
- **pnpm** (lockfile is `pnpm-lock.yaml`; npm/yarn work if you regenerate the lockfile)
- For native modules (MMKV, Secure Store, Reanimated, etc.), use a [**development build**](https://docs.expo.dev/develop/development-builds/introduction/) — Expo Go is not sufficient for everything in this stack.

---

## Quick start

1. **Install dependencies**

   ```bash
   pnpm install
   ```

2. **Environment**

   ```bash
   cp .env.example .env
   ```

   Set `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` (Supabase **anon** public key). The app reads these in `src/lib/supabase.ts` and throws at startup if they are missing.

3. **Start Metro**

   ```bash
   pnpm start
   ```

   Then open iOS simulator, Android emulator, or a dev client build. For web:

   ```bash
   pnpm web
   ```

4. **Native run** (after `expo prebuild` or with a configured dev client)

   ```bash
   pnpm ios
   pnpm android
   ```

---

## Scripts

| Script | Purpose |
|--------|---------|
| `pnpm start` | Expo dev server |
| `pnpm ios` / `pnpm android` | Run native apps |
| `pnpm web` | Web target |
| `pnpm lint` | `expo lint` |

---

## Using this repo as a template

When you spin up a **new** project from this checkpoint:

1. **Clone or copy** the tree into a new folder and initialize git as needed.
2. **Rename the app** in:
   - `package.json` → `name`
   - `app.json` → `expo.name`, `expo.slug`, `expo.scheme`, `expo.android.package` (and iOS bundle id if you add it)
3. **Replace Supabase** project URL and anon key in `.env` (or point auth at another backend and adjust `src/lib/supabase.ts` + `src/stores/auth.store.ts`).
4. **Search/replace** branding strings only where you care (e.g. comments in `src/global.css`, `src/theme/tokens.ts`).
5. **Optional:** trim feature-specific UI store fields in `src/stores/ui.store.ts` if you do not need them.

`CLAUDE.md` describes the intended **source layout** so new code stays consistent across apps you scaffold from here.

---

## Project layout (short)

```
src/
  app/           # Expo Router: screens and navigators only
  components/    # Shared UI (primitives under components/ui/)
  modules/       # Vertical slices (feature code, schemas, hooks)
  lib/           # Singleton clients (Supabase, QueryClient, MMKV)
  stores/        # Zustand stores + React providers
  hooks/         # Shared hooks
  theme/         # Imperative tokens; CSS theme lives in global.css
  global.css     # Tailwind + Uniwind + HeroUI + design tokens
```

Metro is configured for Uniwind in `metro.config.js` (`cssEntryFile: ./src/global.css`, typings in `src/uniwind-types.d.ts`).

---

## Documentation index

| Doc | Contents |
|-----|----------|
| [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) | Layers, providers, auth flow, where to add features |
| [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Colors, tokens, HeroUI variables |
| [`docs/AI_PIPELINE_PLAN.md`](./docs/AI_PIPELINE_PLAN.md) | Planned AI pipeline notes |
| [`CLAUDE.md`](./CLAUDE.md) | Directory contract for agents and humans |
| [`src/modules/ai/README.md`](./src/modules/ai/README.md) | AI module folder intent |

---

## Learn more

- [Expo documentation](https://docs.expo.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
