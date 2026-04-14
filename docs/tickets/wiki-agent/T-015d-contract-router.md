# T-015d: oRPC Contract + Router + Service

**Status:** done
**Phase:** Foundation (server)
**Type:** feature (server)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015c (agents + orchestrator implemented)

---

## Goal

Expose the wiki agent system over oRPC so the mobile app (and future consumers) can trigger compilation, check status, browse wiki pages, view agent logs, and read version history — all behind auth.

---

## Context

T-015c delivered the orchestrator (`runWikiCompile`, `runWikiLint`) and Trigger.dev tasks (`wikiCompileTask`, `wikiLintTask`). The DB schema from T-015a has tables: `wiki_pages`, `wiki_page_versions`, `space_wiki_pages`, `agent_logs`, and the extended `spaces` table with `compilationStatus`/`lastCompiledAt`.

The codebase uses a consistent oRPC pattern:
- **Contract** in `packages/shared/src/contracts/*.contract.ts` — Zod schemas + `oc.router()` endpoint definitions
- **Router** in `apps/server/src/router/*.router.ts` — `implement(contract).$context<ORPCContext>().router()` with `authed` middleware
- **Service** — plain object with methods taking `(db, userId, input)`, throwing `ORPCError` on failures
- **Registration** — add to `appContract` in `packages/shared/src/contracts/index.ts` and `appRouter` in `apps/server/src/router/index.ts`

Reference files: `ai.contract.ts` / `ai.router.ts` for a simple router; `space.contract.ts` / `space.router.ts` for a comprehensive one.

---

## Scope

### 1. Contract (`packages/shared/src/contracts/wiki.contract.ts`)

Define Zod schemas and the `wikiContract` router:

#### Schemas

```typescript
// Reusable output schemas
wikiPageSchema        // id, userId, title, slug, pageType, content, properties, sourceEntryIds, sortOrder, createdAt, updatedAt
wikiPageVersionSchema // id, wikiPageId, version, content, properties, sourceEntryIds, createdAt
agentLogSchema        // id, userId, runId, level, message, toolName, toolInput, toolOutput, durationMs, createdAt
compileResultSchema   // runId, mode, totalTokens, error?, curatorInitial summary, writers summary, curatorFinalize summary
lintResultSchema      // runId, issues[], totalTokens
compilationStatusSchema // status: idle|compiling|failed, lastCompiledAt
```

#### Endpoints

| Endpoint | Input | Output | Purpose |
|----------|-------|--------|---------|
| `wiki.compile` | `{ mode: 'full' \| 'incremental' }` | `compileResultSchema` | Trigger wiki compilation (calls orchestrator directly for now; Trigger.dev task integration later via T-015g) |
| `wiki.lint` | — | `lintResultSchema` | Trigger read-only lint pass |
| `wiki.status` | — | `compilationStatusSchema` | Get current compilation status from index space |
| `wiki.logs` | `{ runId?: string, limit?: number }` | `agentLogSchema[]` | Get agent logs, optionally filtered by runId |
| `wiki.listPages` | `{ spaceId?: string }` | `wikiPageSchema[]` | List wiki pages, optionally filtered by space |
| `wiki.getPage` | `{ id?: string, slug?: string }` | `wikiPageSchema \| null` | Get single page by id OR slug |
| `wiki.getPageVersions` | `{ pageId: string, limit?: number }` | `wikiPageVersionSchema[]` | Get version history for a page |

### 2. Service (`apps/server/src/modules/wiki/services/wiki.service.ts`)

Thin service layer with these methods — each takes `(db, userId, input?)`:

- **`compile(db, userId, mode)`** — Calls `runWikiCompile(db, userId, mode)` directly. Returns the `CompileResult`. (For MVP, this runs synchronously in the request. T-015g will switch to Trigger.dev task for background execution with realtime status.)
- **`lint(db, userId)`** — Calls `runWikiLint(db, userId)`. Returns the `LintResult`.
- **`getStatus(db, userId)`** — Queries the index space (`isIndex=true`) for `compilationStatus` and `lastCompiledAt`. If no index space exists, returns `{ status: 'idle', lastCompiledAt: null }`.
- **`getLogs(db, userId, { runId?, limit? })`** — Queries `agent_logs` filtered by userId, optionally by runId. Orders by `createdAt DESC`. Default limit 100.
- **`listPages(db, userId, { spaceId? })`** — Queries `wiki_pages` for the user. If `spaceId` provided, joins through `space_wiki_pages`. Orders by `sortOrder ASC, title ASC`.
- **`getPage(db, userId, { id?, slug? })`** — Finds a single page by id or by (userId, slug). Returns null if not found.
- **`getPageVersions(db, userId, { pageId, limit? })`** — Queries `wiki_page_versions` for the page, verifying page ownership via userId. Orders by `version DESC`. Default limit 20.

### 3. Router (`apps/server/src/router/wiki.router.ts`)

Implement the contract:
```typescript
implement(wikiContract).$context<ORPCContext>().router({ ... })
```

All endpoints use `authed` middleware. Each handler delegates to `wikiService` methods passing `context.db` and `context.user!.id`.

### 4. Registration

- `packages/shared/src/contracts/index.ts` — Export `wikiContract` and add to `appContract`
- `apps/server/src/router/index.ts` — Import `wikiRouter` and add to `appRouter`

---

## Files

| File | Action |
|------|--------|
| `packages/shared/src/contracts/wiki.contract.ts` | **Create** — Zod schemas + contract |
| `packages/shared/src/contracts/index.ts` | **Modify** — export + register wiki contract |
| `apps/server/src/modules/wiki/services/wiki.service.ts` | **Create** — service methods |
| `apps/server/src/router/wiki.router.ts` | **Create** — oRPC router |
| `apps/server/src/router/index.ts` | **Modify** — register wiki router |

---

## Notes

- **Compile runs synchronously** in the HTTP request for MVP. This is acceptable because gpt-4o-mini is fast and step limits are conservative (Curator: 10 steps, Writer: 5 steps). The mobile UI in T-015g will switch `wiki.compile` to trigger the Trigger.dev task (`wikiCompileTask`) and poll via `wiki.status` + `wiki.logs`.
- **No pagination on listPages/getLogs** beyond a `limit` param for MVP. Users won't have hundreds of pages initially.
- **getPage accepts id OR slug** — contract validates at least one is provided. The slug lookup uses the unique `(userId, slug)` index.
- Follow existing patterns exactly: `implement(contract).$context<ORPCContext>()`, `authed` middleware from `../orpc.js`, `ORPCError` for not-found/validation errors.

---

## Definition of done

- [x] `wiki.contract.ts` defines all 7 endpoints with Zod input/output schemas
- [x] `wiki.service.ts` implements all 7 methods with correct Drizzle queries
- [x] `wiki.router.ts` implements the contract with `authed` on all endpoints
- [x] Wiki contract registered in `appContract`, router registered in `appRouter`
- [x] `wiki.compile` calls `runWikiCompile` and returns the result
- [x] `wiki.lint` calls `runWikiLint` and returns issues
- [x] `wiki.status` reads compilation status from the index space
- [x] `wiki.logs` returns agent logs filtered by userId (and optionally runId)
- [x] `wiki.listPages` returns pages, optionally filtered by spaceId via M2M join
- [x] `wiki.getPage` returns a single page by id or slug, null if not found
- [x] `wiki.getPageVersions` returns version history ordered by version DESC
- [x] All endpoints require authentication
- [x] `pnpm typecheck` passes
