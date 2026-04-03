src/
  app/                              # Expo Router routes only — no logic here
    _layout.tsx                     # Root: providers, theme, gesture handler
    (auth)/
      _layout.tsx
      login.tsx
      signup.tsx
    (tabs)/
      _layout.tsx
      index.tsx
  components/
    ui/                             # Custom primitives NOT covered by HeroUI Native
      ComponentName/
        index.tsx                   # Entry point — JSX + props only
        index.styles.ts             # tailwind-variants (tv) — nothing else
        index.test.tsx              # Vitest + Testing Library
        index.types.ts              # Types if complex enough to isolate
    [feature]/                      # Feature-specific composite components
      ComponentName/
        index.tsx
        index.styles.ts
        index.test.tsx
  modules/                          # Feature modules — self-contained vertical slices
    ModuleName/
      index.tsx
      components/
      hooks/
      utils/
      schemas/                      # Zod schemas — scoped to this module
      types.ts                      # Inferred from schemas — never hand-written
      state/
        providers/
          index.tsx
        stores/
          index.ts
  lib/                              # Singletons and clients
    supabase.ts                     # One instance
    trpc.ts                         # tRPC React client
    query-client.ts                 # TanStack Query config
    mmkv.ts                         # One MMKV instance
  server/                           # Hono + tRPC server
    index.ts
    middleware/
      auth.ts
    router/
      _app.ts
  db/                               # Drizzle ORM
    schema/
    index.ts
    migrations/
  stores/                           # Zustand stores — one file per domain
    auth.store.ts
    ui.store.ts
  hooks/                            # Shared custom hooks
  theme/
    tokens.ts                       # Design token definitions — single source of truth
  types/
  constants/
tickets/                            # One .md file per ticket
  README.md
  T-000.md
PRD.md
CLAUDE.md