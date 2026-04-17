# T-015q: Query Agent + Ask-Your-Wiki UI

**Status:** pending
**Phase:** Agent Loop (server + mobile)
**Type:** feature (server + mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** [T-015c](./T-015c-agents-orchestrator.md) (agent + orchestrator pattern), [T-015b](./T-015b-agent-tools.md) (tool contract), [T-015d](./T-015d-contract-router.md) (oRPC router), [T-015f](./T-015f-wiki-page-rendering.md) (page rendering — reused for citation previews)

---

## Goal

Ship the third agent the epic explicitly defers — **Query** — and the mobile surface that uses it. Turn the wiki from a passive artifact into an answer engine: the user asks a natural-language question, the agent searches the wiki (not raw entries), synthesizes a grounded answer, and cites the exact pages + sections it used. Raw `entries` remain a secondary fallback source, never the primary search target.

This closes the Karpathy three-operation loop (Ingest + Lint + **Query**) and is the payoff that makes all the compiler work visible to the user.

---

## Context

### What exists today

- **Curator / Writer / Linter** agents with `wrapTools()` + `generateText({ tools, maxSteps, onStepFinish })` pattern in `apps/server/src/modules/ai/agents/`.
- **10 tools** in `wiki-tools.ts` including `listWikiPages`, `readEntryContent`, `listSpaces`, `listEntries`.
- `wiki_pages` with typed `content` JSONB (sections with `{ heading, body, sourceEntryIds, links: [{ pageId, label }] }`), `properties`, `maturity`.
- `wiki_page_versions` snapshots.
- `agent_logs` for step-level observability; Trigger.dev for run orchestration.
- Mobile `WikiPageDetailScreen` (T-015f) already renders sections — reusable for inline citation previews.

### What's missing for Query

- **Read-only search tools** scoped to the wiki (not the ingestion tool surface).
- A **Query agent** whose system prompt enforces: answer only from retrieved wiki content, quote/cite sections, fall back to entries only when explicitly asked or when wiki coverage is empty, never hallucinate.
- A **streaming** transport (text + tool-call events) so the mobile UI shows progress (`Searching wiki...` → `Reading "Transformers"` → `Drafting answer`).
- A **conversation surface** on mobile (chat-style, threaded by session, not a global log).
- A **query history + feedback** table so we can later tune prompts from 👍 / 👎 signal.

---

## Architecture

```
User types question in AskYourWikiScreen
  → oRPC wiki.query.ask (streaming)
      → Trigger.dev task wiki-query
          → Query Agent (gpt-4o-mini, maxSteps 12)
              tools:
                - searchWikiPages(query, limit)       [new, read-only]
                - readWikiPage(pageId)                [new, read-only]
                - listSpaces(filter?)                 [existing]
                - readEntryContent(entryId)           [existing, fallback]
              stream:
                - tool-call events  → UI step chips
                - text deltas       → answer body
                - final result      → citations[] + answer
          → persist QueryRun + QueryMessage rows
  → Mobile renders streamed answer with inline citation chips
  → Tap citation → open WikiPageDetailScreen at section anchor
```

Query is **stateless across sessions** for MVP (no long-term memory), but **multi-turn within a session** so follow-ups work ("expand on that", "which entry supports this?").

---

## Scope

### 1. Schema — query history + feedback

File: `packages/db/src/schema/wiki-queries.ts` (new) + migration.

```ts
export const wikiQuerySessions = pgTable('wiki_query_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title'),                         // first-question summary, nullable until set
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const wikiQueryMessages = pgTable('wiki_query_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => wikiQuerySessions.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['user', 'assistant'] }).notNull(),
  content: text('content').notNull(),
  citations: jsonb('citations').$type<Citation[]>().default([]),  // [{ pageId, sectionId, quote }]
  runId: uuid('run_id'),                        // links to Trigger.dev run / agent_logs
  tokens: integer('tokens'),
  latencyMs: integer('latency_ms'),
  feedback: text('feedback', { enum: ['up', 'down'] }),
  feedbackNote: text('feedback_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
```

Index: `(sessionId, createdAt)` for thread loading; `(userId, createdAt)` on sessions for history list.

### 2. New read-only tools

File: `apps/server/src/modules/ai/agents/wiki-tools.ts` (extend).

- **`searchWikiPages({ query: string, limit?: number, spaceId?: string })`**
  Postgres FTS over `wiki_pages.content` JSONB flattened (sections.heading + sections.body) and `title`. Returns `{ pageId, title, maturity, snippets: string[], score }[]`. Limit 8 default. Semantic rerank deferred to T-015y.
- **`readWikiPage({ pageId: string })`**
  Returns `{ id, title, maturity, sections: [{ id, heading, body, sourceEntryIds, links }], properties, spaceIds }`. Full content JSONB — agent reads sections it needs to quote.

Both are added to a **new** `buildQueryTools(db, userId, runId): ToolSet` export. Reuse existing `listSpaces` + `readEntryContent` by re-exporting into this set. **No write tools** exposed to the Query agent, full stop.

### 3. Query Agent

File: `apps/server/src/modules/ai/agents/query-agent.ts`.

```ts
export async function runQueryTurn(
  db: Database,
  userId: string,
  sessionId: string,
  runId: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>,
  question: string,
  onDelta: (event: QueryStreamEvent) => void,
): Promise<QueryTurnResult>
```

Uses `streamText()` (not `generateText`) so text + tool events can be forwarded. `maxSteps: 12`, `model: openai('gpt-4o-mini')`.

**System prompt key rules** (full text lives in `wiki-prompts.ts`):
- You answer questions about the user's **wiki**, which is a synthesized knowledge base built from their saved entries.
- Always search first (`searchWikiPages`) before answering. If the top results look off-topic, refine the query or list spaces.
- Quote or paraphrase **only** content you retrieved via tools. Attach a citation — `{ pageId, sectionId, quote }` — for every factual claim.
- Prefer wiki pages. Fall back to `readEntryContent` only when (a) wiki coverage is empty, or (b) the user explicitly asks "what did I originally save about X".
- If the wiki has nothing relevant, say so plainly: "Your wiki doesn't cover this yet." Do **not** fabricate.
- Second person: "Your notes on X say...". Short paragraphs, bullet lists when comparing.
- Respect follow-ups: treat the conversation history as context; the user may say "go deeper" or "show me the source entry".
- Never call any tool that writes. If you can't find a tool to do what's asked, explain the limitation.

**Returns:** `{ answer: string, citations: Citation[], steps: number, tokens: number, toolCalls: ToolCallSummary[] }`.

### 4. Orchestrator wiring + Trigger.dev task

File: `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` (extend) + `apps/server/src/trigger/wiki-query.ts` (new).

- New exported function `runWikiQuery({ userId, sessionId, question })` that loads recent `wikiQueryMessages`, calls `runQueryTurn`, persists user+assistant rows, updates `wikiQuerySessions.updatedAt`, sets `title` from first question if null.
- Trigger.dev task `wiki-query` wraps it for observability (same pattern as `wiki-compile`, `wiki-lint`).
- No concurrency guard with compile — Query is read-only and can run while a compile is in progress.

### 5. oRPC contract + streaming router

File: `packages/shared/src/contracts/wiki-query.contract.ts` (new) + `apps/server/src/modules/ai/routers/wiki-query.router.ts` (new).

Endpoints:
- `wiki.query.listSessions` → `{ id, title, updatedAt }[]`
- `wiki.query.getSession({ sessionId })` → session + messages
- `wiki.query.createSession()` → `{ sessionId }`
- `wiki.query.deleteSession({ sessionId })`
- `wiki.query.ask({ sessionId, question })` — **streaming** (oRPC `.handler` with `yield`); emits events:
  ```ts
  type QueryStreamEvent =
    | { type: 'tool-call'; name: string; args: unknown }
    | { type: 'tool-result'; name: string; durationMs: number }
    | { type: 'text-delta'; delta: string }
    | { type: 'done'; messageId: string; citations: Citation[]; tokens: number; latencyMs: number }
    | { type: 'error'; message: string };
  ```
- `wiki.query.feedback({ messageId, feedback: 'up' | 'down', note? })`

### 6. Mobile — `AskYourWikiScreen`

File: `apps/mobile/src/features/wiki-query/screens/AskYourWikiScreen/index.tsx` (new) + route entry under `src/app/`.

Composition:
- Header: session title (editable inline), session switcher, "New conversation" action.
- Message list (`FlatList`, inverted): user bubbles + assistant bubbles.
  - Assistant bubble = `AssistantMessage` component: step chips (tool calls) during streaming, then answer body with inline **citation chips**. Tap a citation → navigate to `WikiPageDetailScreen` with `scrollToSectionId` param (T-015f already supports section rendering; confirm or add anchor scroll).
  - 👍 / 👎 row on each assistant message (calls `wiki.query.feedback`).
- Composer: multiline `TextField`, send button, streaming state (disable send, show `StopButton` → aborts the oRPC stream).
- Empty state: suggestion chips sourced from recent spaces ("What's in #Transformers?", "Summarize your Reading notes").
- `rounded-card` on bubbles + composer to match T-015l.

File: `apps/mobile/src/features/wiki-query/hooks/useAskWiki.ts` — wraps the streaming oRPC call, maintains local in-flight state, writes to a React Query cache key so replays/navigation keep the thread.

File: `apps/mobile/src/features/wiki-query/components/AssistantMessage/{index.tsx,index.styles.ts}` — handles step chips, text, citation chips.

### 7. History surface

Small entry point from `SpacesScreen` or wiki home: "Ask your wiki" FAB/card. Session list screen (`AskYourWikiSessionsScreen`) with swipe-to-delete. MVP: sessions list + active chat. No search across sessions (deferred).

### 8. Observability

- Every Query run writes to `agent_logs` via `onStepFinish` (reuse T-015c pattern).
- Trigger.dev dashboard shows per-turn runs with latency + token totals.
- `wikiQueryMessages.feedback` column enables downstream eval (consumed by T-015ab when it ships).

---

## Files

| File | Action |
|------|--------|
| `packages/db/src/schema/wiki-queries.ts` | **Create** — sessions + messages tables |
| `packages/db/migrations/*_wiki_queries.sql` | **Create** — migration |
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | **Modify** — add `searchWikiPages`, `readWikiPage`, `buildQueryTools` |
| `apps/server/src/modules/ai/agents/query-agent.ts` | **Create** — Query agent (streaming) |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | **Modify** — add Query system prompt builder |
| `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` | **Modify** — add `runWikiQuery` + session persistence |
| `apps/server/src/trigger/wiki-query.ts` | **Create** — Trigger.dev task |
| `packages/shared/src/contracts/wiki-query.contract.ts` | **Create** — oRPC contract incl. streaming `ask` |
| `apps/server/src/modules/ai/routers/wiki-query.router.ts` | **Create** — router impl |
| `apps/mobile/src/features/wiki-query/screens/AskYourWikiScreen/index.tsx` | **Create** — chat surface |
| `apps/mobile/src/features/wiki-query/screens/AskYourWikiSessionsScreen/index.tsx` | **Create** — history list |
| `apps/mobile/src/features/wiki-query/components/AssistantMessage/index.tsx` | **Create** |
| `apps/mobile/src/features/wiki-query/components/AssistantMessage/index.styles.ts` | **Create** — `tv` |
| `apps/mobile/src/features/wiki-query/components/CitationChip/index.tsx` | **Create** |
| `apps/mobile/src/features/wiki-query/hooks/useAskWiki.ts` | **Create** |
| `apps/mobile/src/features/wiki-query/hooks/useWikiQuerySessions.ts` | **Create** |
| `apps/mobile/src/app/(tabs)/wiki/ask.tsx` | **Create** — route entry |
| `apps/mobile/src/features/wiki-page/screens/WikiPageDetailScreen/index.tsx` | **Modify** — accept `scrollToSectionId` param |

---

## Edge cases

- **Empty wiki** → agent returns "Your wiki doesn't cover this yet. Try compiling first." with a deep-link to CompileStatusCard.
- **Very long answer** → stream continues past `maxSteps` safeguards; if capped, append "(truncated — ask me to continue)".
- **Citation points to a page the user later deletes** → `readWikiPage` returns 404; message row keeps the stale citation but the chip renders disabled with a tooltip "Page removed".
- **Network drop mid-stream** → client flushes partial text to the cache, marks message as `incomplete`; Retry button re-issues the turn with the same `sessionId`.
- **Follow-up with no new question** ("more?") → agent uses history; don't treat empty tool search as failure.
- **User asks about raw entry** ("what did I save on 2026-02-01") → agent is allowed to call `readEntryContent` directly; still cites entries, not wiki.
- **Feedback on a message that's mid-stream** → ignore until `done`.

---

## What this does NOT include

- Semantic / embedding search (T-015y).
- Cross-session memory or personalization.
- Voice input / TTS output.
- Multi-user / shared sessions.
- Query analytics dashboard (telemetry is captured; visualization deferred).
- Prompt A/B + eval harness — T-015ab wires onto the `feedback` signal later.

---

## DoD

- [ ] Migration creates `wiki_query_sessions` + `wiki_query_messages` with indexes; `pnpm -w db:migrate` clean.
- [ ] `searchWikiPages` + `readWikiPage` tools ship in `buildQueryTools`; unit test covers a basic FTS hit.
- [ ] Query agent answers from wiki only in the happy path; falls back to entries only when explicitly asked; refuses with "not covered" when empty.
- [ ] Every assistant message has ≥ 1 citation when the answer makes a factual claim (enforced by prompt + checked in smoke test).
- [ ] Streaming: tool-call events, text deltas, and final `done` event reach the mobile UI in order.
- [ ] Mobile chat renders step chips → text → citations; tap citation opens `WikiPageDetailScreen` scrolled to the section.
- [ ] Session list + delete work; first question auto-populates `title`.
- [ ] 👍 / 👎 persists; re-render shows the selection on return.
- [ ] `StopButton` aborts the in-flight stream and marks the message incomplete.
- [ ] Trigger.dev dashboard shows `wiki-query` runs with tool-call timeline and token totals.
- [ ] No write tools are reachable from the Query agent's `ToolSet` (type-level + runtime guard test).
- [ ] `pnpm -w run typecheck` clean across server + mobile + shared.
- [ ] Epic `T-015-wiki-agent-epic.md` Quality table links this ticket (or a new "Agent Loop" table if we decide to add one).

---

## Verification

1. Compile wiki in dev with a seeded entry set (≥ 3 spaces, ≥ 5 pages).
2. Open **Ask your wiki**, ask "Summarize what I've learned about transformers" → expect streamed steps (`searchWikiPages` → `readWikiPage`) and a cited answer.
3. Tap a citation → lands inside the referenced section of the page.
4. Ask a follow-up "go deeper on attention" → agent uses history, cites additional sections.
5. Ask something unrelated ("what's the capital of France") → agent answers "Your wiki doesn't cover this yet."
6. Thumbs-down a message with a note → row reflects feedback after reload.
7. Kill network mid-stream → message marked incomplete; Retry recovers.
8. Open Trigger.dev dashboard → `wiki-query` runs listed, tool timeline visible.

---

## Ticket sequence

Follows T-015 Foundation + Mobile + Quality. Next candidates in the "Agent Loop" wave: **T-015r** (observability), **T-015s** (cancel + streaming for compile), **T-015t** (partial compile).
