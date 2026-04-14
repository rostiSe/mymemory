# T-015c: 3 Agent Prompts + Orchestrator + Trigger.dev

**Status:** done
**Phase:** Foundation (server)
**Type:** feature (server)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015b (tools implemented)

---

## Goal

Implement the 3 specialized agents (Curator, Writer, Linter) with system prompts, wire them into an orchestrator that chains them correctly, and integrate Trigger.dev for observability and background execution from day one.

---

## Context

T-015b implemented 10 tools as `ToolDefinition` objects with `{ description, inputSchema (Zod), execute }`. Three builder functions exist:

```typescript
// apps/server/src/modules/ai/agents/wiki-tools.ts
buildCuratorTools(db, userId, runId): ToolSet  // 6 tools
buildWriterTools(db, userId, runId): ToolSet   // 5 tools
buildLinterTools(db, userId, runId): ToolSet   // 4 tools
```

These need to be wrapped with AI SDK's `tool()` function before passing to `generateText()`:

```typescript
import { tool } from 'ai';

// Wrap ToolDefinition → AI SDK tool
function wrapTools(toolSet: ToolSet) {
  return Object.fromEntries(
    Object.entries(toolSet).map(([name, def]) => [
      name,
      tool({
        description: def.description,
        parameters: def.inputSchema,
        execute: async (input) => def.execute(input),
      }),
    ])
  );
}
```

**Model:** `openai('gpt-4o-mini')` for all 3 agents (cheapest). Writer upgradeable later.

**AI SDK pattern:** `generateText()` with `tools` + `maxSteps` (NOT `ToolLoopAgent` class — `maxSteps` on `generateText` is sufficient and already used in the codebase for `analyzeContent`).

---

## Scope

### 1. Tool wrapper utility

Create a `wrapTools()` helper that converts `ToolSet` (custom) → AI SDK tool format.

File: `apps/server/src/modules/ai/agents/wiki-tools.ts` (add to existing)

### 2. Curator Agent

File: `apps/server/src/modules/ai/agents/curator-agent.ts`

```typescript
export async function runCurator(
  db: Database,
  userId: string,
  runId: string,
  mode: 'full' | 'incremental'
): Promise<CuratorResult>
```

**System prompt key rules:**
- Survey all entries (or new entries since lastCompiledAt if incremental)
- Create spaces for thematic clusters (broad themes, not narrow topics)
- Min 2 entries per space. Single orphans → assign to closest space, set `pendingReview` property.
- If 3+ uncategorized entries form a new cluster → create new space
- Assign entries to spaces (entries can be in multiple spaces)
- Build/update the index space (isIndex: true, exactly one per user)
- **Content weight classification:** Lightweight entries (short notes, bookmarks, shopping lists) go into utility spaces like "Quick Notes" or "Bookmarks" — don't synthesize them deeply
- **Incremental mode:** Focus on entries added since `lastCompiledAt`. Prefer assigning to existing spaces over creating new ones.

**Returns:** `{ spacesCreated: string[], spacesUpdated: string[], entriesAssigned: number, steps: number, tokens: number }`

**maxSteps:** 25

### 3. Writer Agent

File: `apps/server/src/modules/ai/agents/writer-agent.ts`

```typescript
export async function runWriter(
  db: Database,
  userId: string,
  runId: string,
  spaceId: string,
  entrySummaries: Array<{ id: string; title: string; summary: string; topics: string[] }>
): Promise<WriterResult>
```

**Called once per space** by the orchestrator. Receives the space context + entry summaries in the user prompt (not via tool calls — saves round trips).

**System prompt key rules:**
- Write wiki pages with structured content JSONB following the page type template
- Use `getPageTypeTemplate()` to get the expected shape
- Pages grow incrementally: read existing page → add/update sections → don't rewrite from scratch
- Every claim must cite `sourceEntryIds`. Never hallucinate.
- Use `{ pageId, label }` objects in section.links arrays for page-to-page links
- Include `maturity` property on every page (stub/draft/complete)
- Second person: "Your research shows..." not "The user's research..."
- Mobile-first: short paragraphs, bullet lists
- May create multiple pages per space (overview, glossary, comparison)
- For utility spaces (Quick Notes, Bookmarks): create a simple reference list page, not deep synthesis

**Returns:** `{ pagesCreated: string[], pagesUpdated: string[], versionsCreated: number, steps: number, tokens: number }`

**maxSteps:** 15 per space

### 4. Linter Agent

File: `apps/server/src/modules/ai/agents/linter-agent.ts`

```typescript
export async function runLinter(
  db: Database,
  userId: string,
  runId: string
): Promise<LinterResult>
```

**System prompt key rules:**
- Read-only. ONLY use `listEntries`, `listSpaces`, `listWikiPages`, `flagIssue`.
- Do NOT call any write tools (createOrUpdateSpace, createOrUpdateWikiPage, etc.)
- Check for: orphan entries, empty spaces, stale pages, thin pages (<200 chars synthesis), missing links between related spaces, duplicate/overlapping spaces, unresolved contradictions
- Flag each issue with severity, category, message, suggestedFix, autoFixable

**Returns:** `{ issues: Array<{ severity, category, message, suggestedFix }>, steps: number, tokens: number }`

**maxSteps:** 15

### 5. Orchestrator

File: `apps/server/src/modules/ai/agents/wiki-orchestrator.ts`

```typescript
export async function runWikiCompile(
  db: Database,
  userId: string,
  mode: 'full' | 'incremental'
): Promise<CompileResult>

export async function runWikiLint(
  db: Database,
  userId: string
): Promise<LintResult>
```

**Compile flow:**
```
1. Generate runId
2. Concurrency guard: check if any space has compilationStatus = 'compiling'
   → if yes, throw "compilation already in progress"
3. Set index space compilationStatus = 'compiling' (or create index space if first run)
4. Run Curator (full or incremental)
5. Get list of spaces that need writing (spacesCreated + spacesUpdated from Curator)
6. For each space: load entry summaries via listEntries
7. Run Writer × N in parallel (Promise.all with concurrency limit of 3-4)
8. Run Curator again: update index space content
9. Set index space compilationStatus = 'idle', update lastCompiledAt
10. Return results
```

**Error handling:**
- On any error: set compilationStatus = 'failed' on index space
- Log error to agent_logs
- Return partial results + error

**Lint flow:**
```
1. Generate runId
2. Run Linter
3. Return issues
```

### 6. Trigger.dev Integration

**New dependency:** `@trigger.dev/sdk` + `trigger.config.ts`

File: `apps/server/src/trigger/wiki-compile.ts`

```typescript
import { task } from '@trigger.dev/sdk/v3';

export const wikiCompileTask = task({
  id: 'wiki-compile',
  run: async (payload: { userId: string; mode: 'full' | 'incremental' }) => {
    const result = await runWikiCompile(db, payload.userId, payload.mode);
    return result;
  },
});

export const wikiLintTask = task({
  id: 'wiki-lint',
  run: async (payload: { userId: string }) => {
    const result = await runWikiLint(db, payload.userId);
    return result;
  },
});
```

File: `trigger.config.ts` (project root)

```typescript
import { defineConfig } from '@trigger.dev/sdk/v3';

export default defineConfig({
  project: 'mymemory',
  dirs: ['apps/server/src/trigger'],
});
```

**What Trigger.dev provides:**
- Dashboard: run history, status, timing, logs for every compile/lint run
- Automatic retries on failure (configurable)
- Concurrency control (optional: limit to 1 concurrent compile per user)
- Real-time log streaming (agent steps appear as they execute)

### 7. Agent step logging

Each agent uses `onStepFinish` callback to log every tool call:

```typescript
const { text, steps, usage } = await generateText({
  model: openai('gpt-4o-mini'),
  system: systemPrompt,
  prompt: userPrompt,
  tools: wrappedTools,
  maxSteps: 25,
  onStepFinish: async ({ toolCalls, toolResults, usage: stepUsage }) => {
    for (const call of toolCalls ?? []) {
      await db.insert(agentLogs).values({
        userId,
        runId,
        level: 'action',
        message: `Called ${call.toolName}`,
        toolName: call.toolName,
        toolInput: call.args,
        toolOutput: toolResults?.find(r => r.toolCallId === call.toolCallId)?.result,
      });
    }
  },
});
```

Token usage is captured from `usage` object and logged at the end of each agent run.

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | **Modify** — add `wrapTools()` helper |
| `apps/server/src/modules/ai/agents/curator-agent.ts` | **Create** — Curator agent with system prompt |
| `apps/server/src/modules/ai/agents/writer-agent.ts` | **Create** — Writer agent with system prompt |
| `apps/server/src/modules/ai/agents/linter-agent.ts` | **Create** — Linter agent with system prompt |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | **Create** — system prompt builders (compile/lint/incremental, per agent) |
| `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` | **Create** — orchestrator (compile flow + lint flow) |
| `apps/server/src/trigger/wiki-compile.ts` | **Create** — Trigger.dev task definitions |
| `apps/server/trigger.config.ts` | **Use/Configure** — Trigger.dev project config |
| `apps/server/package.json` | **Modify** — add `@trigger.dev/sdk` dependency |

---

## Notes

- **Ask before adding `@trigger.dev/sdk`** — per CLAUDE.md rules, new dependencies need user approval. This should be confirmed at implementation time.
- The Writer receives entry summaries in the prompt context (pre-loaded by orchestrator), not via tool calls. This saves LLM round-trips — the Writer only calls tools to read full entry content when needed and to write pages.
- The orchestrator limits Writer parallelism to 3-4 concurrent spaces to avoid rate limits on the OpenAI API.
- System prompts are in a separate `wiki-prompts.ts` file, not inline in agent files. This makes them easy to iterate on during T-015e (smoke test).
- `onStepFinish` logging means every tool call is captured in `agent_logs`. Combined with Trigger.dev dashboard, this gives full observability.

---

## Definition of done

- [x] `wrapTools()` converts `ToolSet` → AI SDK tool format
- [x] Curator agent: given entries, creates spaces and assigns entries correctly
- [x] Writer agent: given a space + entry summaries, produces wiki pages with correct content JSONB
- [x] Linter agent: reads wiki state and flags issues without modifying any data
- [x] Orchestrator chains: Curator → Writer(s) parallel → Curator(index) → done
- [x] Concurrency guard prevents parallel compilation runs for same user
- [x] Error handling: sets compilationStatus = 'failed' on error, logs to agent_logs
- [x] Writer runs in parallel across spaces (3-4 concurrent)
- [x] All agent steps logged to `agent_logs` via `onStepFinish`
- [x] Token usage captured and logged per agent run
- [x] Trigger.dev tasks defined: `wiki-compile` and `wiki-lint`
- [x] `apps/server/trigger.config.ts` exists and points to `src/trigger`
- [x] Trigger.dev dashboard shows run history and logs
- [x] `pnpm typecheck` passes
- [x] System prompts include content weight classification rules (lightweight vs heavyweight entries)
- [x] System prompts include page type template references
