# Mobile app — documentation index

Deep dives for the Expo app (`apps/mobile`): architecture, cross-surface features, data sync, the feed, and how the app ties into the monorepo build.

| Doc | What it covers |
|-----|----------------|
| [architecture.md](./architecture.md) | Layout, layers, dual JS roots (Expo Router + Share Quick), where logic lives |
| [share-quick.md](./share-quick.md) | Android share intent, second activity, key files, QA |
| [sync-and-cache.md](./sync-and-cache.md) | TanStack cache, focus sync, Share Quick MMKV nudge (no Realtime MVP) |
| [feed-and-entries.md](./feed-and-entries.md) | Feed screen composition, optimistic create, list utilities |
| [workspace-and-build.md](./workspace-and-build.md) | `@mymemory/shared` → `dist/`, Node ESM, Turbo, CI, gitignore |

**Entries feed cache:** [`entry-query-cache.ts`](../../apps/mobile/src/features/entry/entry-query-cache.ts) — infinite feed + detail only; other features use TanStack directly ([sync-and-cache.md](./sync-and-cache.md)).

**Related (repo-wide):** [ARCHITECTURE.md](../ARCHITECTURE.md) (oRPC, contracts), [DESIGN_SYSTEM.md](../DESIGN_SYSTEM.md) (tokens), [DEPLOYMENT.md](../DEPLOYMENT.md). App folder layout: [apps/mobile/STRUCTURE.md](../../apps/mobile/STRUCTURE.md) (if present).

**Historical note:** Older single-file notes lived in [MOBILE_FEATURES.md](../MOBILE_FEATURES.md); that file now forwards here.
