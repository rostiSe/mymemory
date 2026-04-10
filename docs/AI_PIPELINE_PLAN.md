# MyMemory AI Pipeline — 4-Phase Implementation Plan

## Context
The app has a working auth flow, UI shell (tabs, settings, debug), and state management (Zustand + MMKV + TanStack Query). There is NO database schema, NO server/API layer, and NO AI integration. This plan adds AI-powered ingest/digest pipelines using Vercel AI SDK v6 + OpenAI via Expo API Routes, with Drizzle ORM for Supabase Postgres.

**Architecture decisions (confirmed):**
- Server: Expo API Routes (`app/api/...+api.ts`) → EAS Hosting (Cloudflare Workers)
- AI: OpenAI GPT-4o-mini via `@ai-sdk/openai`
- DB: Supabase Postgres + pgvector, adjacency list + junction tables
- Types: Zod schemas as single source of truth, types inferred (never hand-written)

---

## Phase 1: AI SDK + DB Foundation

### 1.1 Install dependencies
```
pnpm add ai @ai-sdk/openai zod drizzle-orm postgres
pnpm add -D drizzle-kit
```

### 1.2 Config changes
- `app.json` line 24: `"output": "static"` → `"output": "server"` (required for API routes)
- `.env` — add server-side vars: `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `JINA_API_KEY`
- `.env.example` — document new vars
- New `drizzle.config.ts` at root (schema: `./src/db/schema/*.ts`, out: `./src/db/migrations`)

### 1.3 Database schema (Drizzle + Zod)

Each file exports: Drizzle table, Zod insert/select schemas, inferred types.

| File | Tables |
|------|--------|
| `src/db/schema/enums.ts` | pgEnum definitions + Zod enum schemas |
| `src/db/schema/entries.ts` | `entries` |
| `src/db/schema/tags.ts` | `tags`, `entryTags` |
| `src/db/schema/topics.ts` | `topics`, `entryTopics` |
| `src/db/schema/spaces.ts` | `spaces`, `entrySpaces`, `spaceRelations` (NEW) |
| `src/db/schema/entry-notes.ts` | `entryNotes` |
| `src/db/schema/embeddings.ts` | `embeddings` (pgvector via `customType`) |
| `src/db/schema/digests.ts` | `digests`, `digestEntries` |
| `src/db/schema/space-suggestions.ts` | `spaceSuggestions` |
| `src/db/schema/cron-configs.ts` | `cronConfigs` |
| `src/db/schema/entry-relations.ts` | `entryRelations` (NEW — entry-to-entry links) |

**`src/db/index.ts`** — server-only DB client using `postgres` with `prepare: false` (CF Workers compatible via Supabase connection pooler port 6543).

### 1.4 AI SDK tools

Each tool in its own file under `src/lib/ai/tools/`, using `inputSchema` (not deprecated `parameters`).

| File | Input / Output | AI Call |
|------|---------------|---------|
| `src/lib/ai/provider.ts` | — | OpenAI provider + `gpt4oMini` + `embeddingModel` singletons |
| `tools/detect-type.ts` | url/content → EntryType + confidence | URL pattern match, fallback to `Output.choice()` |
| `tools/extract-content.ts` | url → markdown + metadata + thumbnail | Jina Reader HTTP (`r.jina.ai/{url}`) |
| `tools/summarize.ts` | markdown + type → summary | `generateText` with gpt4oMini |
| `tools/generate-tags.ts` | markdown + summary + existing_tags → tags[] | `generateText` + `Output.object()` |
| `tools/extract-topics.ts` | markdown + summary + existing_topics → topics[] | `generateText` + `Output.object()` |
| `tools/generate-embedding.ts` | text → embedding[] + model | `embed()` with text-embedding-3-small |
| `tools/assign-space.ts` | embedding + tags + topics + spaces → space_id | Pure cosine similarity (no AI call) |
| `tools/find-related-entries.ts` | embedding + user_id → related entries | pgvector nearest neighbor query |

### 1.5 Agent definitions (foundation for future chat)

| File | Purpose |
|------|---------|
| `src/lib/ai/agents/ingest-agent.ts` | `ToolLoopAgent` with all ingest tools + `InferAgentUIMessage` type export |
| `src/lib/ai/agents/digest-agent.ts` | `ToolLoopAgent` for digest generation |

Note: Phase 2 uses a deterministic pipeline function for actual ingest (not the agent). Agents are defined here for future chat-with-memories feature.

### 1.6 Server utilities

| File | Purpose |
|------|---------|
| `src/lib/server/auth.ts` | `requireAuth(request)` — extract Bearer token, verify via Supabase, return userId |
| `src/lib/server/supabase-admin.ts` | Service role Supabase client (bypasses RLS) |

### 1.7 API route stubs

| File | Methods | Purpose |
|------|---------|---------|
| `src/app/api/health+api.ts` | GET | Health check (no auth) |
| `src/app/api/ingest+api.ts` | POST | Accept entry_id, trigger processing (stub) |
| `src/app/api/ingest/status/[id]+api.ts` | GET | Check processing status (stub) |
| `src/app/api/digest+api.ts` | POST | Generate digest for period (stub) |
| `src/app/api/search+api.ts` | POST | Semantic search (stub) |

All stubs: Zod-validate input, call `requireAuth`, return placeholder response.

### 1.8 Migration

`src/db/migrations/0000_initial_schema.sql` generated via `drizzle-kit generate`:
- `CREATE EXTENSION IF NOT EXISTS vector`
- All tables, enums, foreign keys, defaults
- RLS policies on every table
- `match_entries` + `search_entries_text` Postgres RPC functions
- Indexes: entries(user_id, created_at), entries(processed_status), HNSW on embeddings

### Phase 1 verification
1. `pnpm tsc --noEmit` — zero errors
2. `curl localhost:8081/api/health` → `{ "status": "ok" }`
3. POST `/api/ingest` with Bearer token → 200 stub; without → 401
4. Supabase dashboard shows all tables with correct columns
5. Existing app (auth, tabs, settings) completely unaffected

---

## Phase 2: Ingest/Digest Pipeline Implementation

### 2.1 Deterministic ingest pipeline

**`src/lib/ai/pipelines/ingest.ts`** — `processEntry(entryId, userId)`:
1. Fetch entry, set status → `processing`
2. Detect type (if not set)
3. Extract content via Jina (skip for notes)
4. **Parallel**: summarize + generate embedding
5. Fetch existing tags + topics for reuse
6. **Parallel**: generate tags + extract topics
7. Assign space (cosine sim against centroids)
8. Find related entries (pgvector nearest neighbor)
9. **Transaction**: persist all results atomically
10. Set status → `done` (or `failed` on error)

Parallelization keeps total time under 30s CF Workers limit.

### 2.2 Digest pipeline

**`src/lib/ai/pipelines/digest.ts`** — `generateDigest(userId, periodStart, periodEnd)`:
1. Query entries for period with tags/topics
2. Group by topic
3. `generateText` + `Output.object()` → structured digest
4. Persist digest + digest_entries

### 2.3 Database query modules

`src/db/queries/` — entries.ts, tags.ts, topics.ts, spaces.ts, embeddings.ts, digests.ts

### 2.4 API routes filled in

Stubs from Phase 1 get real implementations. New CRUD routes added:
- `entries+api.ts` (GET paginated, POST create+trigger ingest)
- `entries/[id]+api.ts` (GET with relations, PUT, DELETE)
- `spaces+api.ts` (GET tree, POST), `spaces/[id]+api.ts` (GET/PUT/DELETE)
- `tags+api.ts` (GET user tags)

### Phase 2 verification
1. POST `/api/entries` with URL → creates entry
2. POST `/api/ingest` → entry gets summary, tags, topics, embedding, space, related entries
3. POST `/api/search` with query → returns ranked results
4. POST `/api/digest` → produces topic-grouped summary
5. Failed URLs → `processed_status: 'failed'` with error message

---

## Phase 3: Frontend with HeroUI

### 3.1 Tab expansion
Update `(tabs)/_layout.tsx` for 5 tabs: Feed, Search, Spaces, Digestion, Settings.

New screens: `search.tsx`, `spaces.tsx`, `digestion.tsx`

### 3.2 Detail screens
- `src/app/entry/[id].tsx` — full entry with TLDR, tags, topics, notes, related
- `src/app/space/[id].tsx` — space with entries and subspaces
- `src/app/digest/[id].tsx` — digest with topic-grouped content

### 3.3 Component library (few but high-quality, each with `tv()` styles)

**Entry** (`apps/mobile/src/features/entry/components/`): EntryCard, ProcessingStatus (more: EntryDetail, EntryTLDR, EntryTags as needed)
**Feed** (same **`entry`** feature): FeedScreen + feed list/input live under `features/entry/screens/` and co-located components
**Search** (`features/search/` or shared `components/ui/` for generic search chrome only)
**Space** (`apps/mobile/src/features/space/components/`): SpaceTree, SpaceCard, etc.
**Digest** (`src/components/digest/`): DigestCard, DigestContent, PeriodPicker
**Share** (`src/components/share/`): ShareForm, TypeSelector

All components use HeroUI primitives (Card, Button, Chip, Input, ListGroup, Separator) + tailwind-variants for style variants. Mock data for testing independently of backend.

### Phase 3 verification
1. All 5 tabs render without crashes
2. Components display with mock data
3. Navigation: tabs → detail → back works
4. Theme switching applies to all new components

---

## Phase 4: Connect Frontend <-> Backend (Type-safe)

### 4.1 Install
```
pnpm add @ai-sdk/react
```

### 4.2 Type-safe API layer

| File | Purpose |
|------|---------|
| `src/lib/api/contracts.ts` | Zod request/response schemas for every route, shared by server + client |
| `src/lib/api/client.ts` | Type-safe fetch wrapper: auto-attaches Bearer token, validates responses against Zod |

### 4.3 TanStack Query hooks

| File | Hooks |
|------|-------|
| `apps/mobile/src/features/entry/hooks/useEntries.ts` | `useFeedEntries`, `useCreateEntry`, `useEntryById` (extend with update/delete as needed) |
| `src/hooks/use-ingest.ts` | `useIngest` mutation, `useIngestStatus` (polls every 2s while processing) |
| `src/hooks/use-search.ts` | `useSemanticSearch` (debounced) |
| `apps/mobile/src/features/space/hooks/useSpaces.ts` | `useSpaces`, `useCreateSpace` (extend with get/update as needed) |
| `src/hooks/use-digests.ts` | `useDigests`, `useDigest`, `useGenerateDigest` |
| `src/hooks/use-tags.ts` | `useTags` |

### 4.4 Streaming foundation (future chat)
`src/hooks/use-memory-chat.ts` — `useChat` + `DefaultChatTransport` + `InferAgentUIMessage<typeof ingestAgent>`. Hook defined, chat UI deferred.

### 4.5 Wire components to real data
Replace mock data in all Phase 3 components with TanStack Query hooks.

### Phase 4 verification
1. Feed loads real entries, pull-to-refresh works
2. Create entry → live processing status → done with AI data
3. Search returns semantically relevant results
4. Spaces show real tree from API
5. Digest generation works end-to-end
6. Zero `any` types — all types flow from Zod
7. 401 triggers re-auth flow

---

## Risk mitigation

| Risk | Mitigation |
|------|-----------|
| CF Workers 30s timeout | Parallelize AI calls (steps 4+5, 6+7), GPT-4o-mini responds in 1-3s |
| Drizzle + pgvector | `customType` for vector column, `sql` template for cosine similarity |
| postgres.js on CF Workers | Supabase pooler (port 6543) + `prepare: false`. Fallback: `@supabase/supabase-js` service role |
| AI SDK v6 breaking changes | Follow common-errors.md: `inputSchema`, `Output.object()`, `maxOutputTokens`, `toUIMessageStreamResponse()` |

---

## Deferred (future phases)

- **Chat with memories** — ToolLoopAgent-based chat agent using AI SDK `useChat`, reuses existing tools
- **Notion integration** — Bidirectional sync (import Notion pages, export entries/digests)
- **Share intent** — Android share menu integration via `expo-share-intent`
- **PowerSync** — Offline-first sync layer between SQLite and Supabase
- **Knowledge graph UI** — Visual graph of entry/space/topic connections
