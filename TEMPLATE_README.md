# Template Configuration

This is a reusable starting point combining **Expo Router**, **Drizzle ORM (Supabase)**, **Zustand + MMKV**, and **Vercel AI SDK**.

## 1. Database (Drizzle + Supabase)
- **Schema**: Defined in `src/db/schema/`. `entries.ts` provides a complete example using `pgvector`.
- **Config**: `drizzle.config.ts` points to `DATABASE_URL` for running migrations.
- **Client**: `src/db/index.ts` exposes the `db` instance intended **only for server-side code** (like Expo API routes).

To run migrations:
```bash
pnpm drizzle-kit generate
pnpm drizzle-kit push # Or apply via Supabase directly
```

## 2. State & Persistence (Zustand + MMKV)
- **MMKV Instance**: `src/lib/mmkv.ts` exports the fast, synchronous storage adapter.
- **Store Pattern**: Stores are created via `createStore` in `src/stores/*.store.ts` to allow React Context injection.
- **Providers**: `src/stores/providers/` safely provides the stores to the React tree.
- **Usage**: See `src/app/template-test.tsx` for how to read and write to the persisted store.

## 3. AI Module (Vercel AI SDK + Jina)
- **Location**: `src/modules/ai/`. All logic related to LLMs, embeddings, and content ingestion should live here.
- **Jina Reader**: Used for extracting clean markdown from URLs. (See `src/modules/ai/tools/`).

## 4. Setup Checklist
1. Ensure `.env` contains `DATABASE_URL`, `OPENAI_API_KEY`, and `JINA_API_KEY`.
2. Wrap your `_layout.tsx` with `<AppStoreProvider>`.
3. Check `template-test.tsx` to verify state and styling are working.