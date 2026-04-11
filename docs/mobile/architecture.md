# Mobile architecture

## Role in the monorepo

The mobile app is a **consumer** of `@mymemory/shared` (Zod + oRPC contracts), `@orpc/client` + TanStack Query for API calls, and **Supabase for auth only** (no Realtime subscriptions in MVP). It does **not** import server-only packages (`@mymemory/db`, Drizzle, etc.).

## Layers (where to put code)

- **`src/app/`** — Expo Router routes only; keep screens thin and delegate to `features/`.
- **`src/features/<Domain>/`** — Vertical slices: hooks, screens, components, `utils/`, `types` aligned with one product area (e.g. `entry`, `share`).
- **`src/components/ui/`** — Reusable primitives not covered by HeroUI Native.
- **`src/lib/`** — Singletons and cross-cutting helpers (`query-client`, `orpc`, `mmkv`).
- **`features/entry/entry-query-cache.ts`** — **entries feed + detail only**: merge rows into infinite list cache + key helpers; see [sync-and-cache.md](./sync-and-cache.md) (Track A vs B).
- **`src/hooks/`** — Shared hooks used by multiple features (e.g. navigation focus, cross-surface nudge).

Match existing naming: PascalCase folders under `features/` and `components/`.

## Two JavaScript roots in one binary

On Android, **Share Quick** uses a **separate activity** that mounts `ShareQuickRoot` via `AppRegistry`, while the main app uses Expo Router’s entry. Both share **one Metro bundle**.

Implications:

- **`apps/mobile/index.js`** must register the share root **before** `expo-router/entry` so the native side can start either root.
- Anything imported from that chain must exist in the repo (untracked files break EAS the same as the main graph).

See [share-quick.md](./share-quick.md) for the flow and file list.

## Styling and tokens

Uniwind + Tailwind v4 with tokens in `src/global.css`. Both roots should stay on the same theme variables so Share Quick and the main shell do not drift.

## Navigation and data

- **React Navigation** drives tabs and stacks; use `useFocusEffect` when a screen should refresh on focus (see [feed-and-entries.md](./feed-and-entries.md)).
- **TanStack Query** is the client cache; see [sync-and-cache.md](./sync-and-cache.md) for mutations, app focus, and Share Quick coordination.

## Metro and the monorepo

`metro.config.js` sets `watchFolders` to the **repo root**, `nodeModulesPaths` for app + root `node_modules`, and `disableHierarchicalLookup: true` so pnpm’s layout resolves predictably. Uniwind wraps the config for `global.css` and generated types.

Workspace packages (including `@mymemory/shared`) resolve through normal `package.json` `exports`; shared ships **compiled `dist/`** — build shared before bundling if `dist/` is missing. Details: [workspace-and-build.md](./workspace-and-build.md).
