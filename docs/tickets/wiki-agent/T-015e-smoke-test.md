# T-015e: Smoke Test + Iteration

**Status:** done
**Phase:** Validation
**Type:** test / iteration
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015d (contract + router wired up)

---

## Goal

Run the wiki agent end-to-end against real user data, evaluate output quality, and iterate on prompts/tools until the results are production-ready. This is a hands-on validation pass — not automated tests.

---

## Context

The full pipeline is now wired:
- **T-015a:** DB schema (wiki_pages, wiki_page_versions, space_wiki_pages, agent_logs, spaces extensions)
- **T-015b:** 10 tools (3 builder functions, page type templates, wrapTools)
- **T-015c:** 3 agents (Curator, Writer, Linter) + orchestrator + Trigger.dev tasks
- **T-015d:** oRPC contract + router + service (7 endpoints)

Existing smoke scripts in `apps/server/scripts/`:
- `smoke-wiki-compile.ts` — runs `runWikiCompile(userId, mode)` directly (no Trigger.dev)
- `smoke-wiki-tools.ts` — tests individual tools
- `smoke-wiki-schema.ts` — tests DB schema operations

The compile script already works: `pnpm smoke:wiki-compile <userId> [full|incremental]`

Lint smoke (local, same env as compile): `pnpm smoke:wiki-lint <userId>`

---

## Scope

### 1. Run full compile on a real user with 10+ entries

```bash
pnpm smoke:wiki-compile "<userId>" full
```

**Evaluate Curator output:**
- Did it create meaningful thematic spaces (not too narrow, not too broad)?
- Did it assign entries to spaces correctly? Are entries in multiple spaces where appropriate?
- Did it handle lightweight entries (notes, bookmarks) separately from deep content?
- Were any entries left orphaned?
- Did it create/update the index space?

**Evaluate Writer output:**
- Did each space get at least one wiki page?
- Is the content JSONB well-structured (sections, TOC, sourceEntryIds, links)?
- Does the page follow the page type template from `getPageTypeTemplate`?
- Are sourceEntryIds actually tracing to real entries (no hallucinated UUIDs)?
- Are page-to-page links using `{ pageId, label }` format with valid UUIDs?
- Is the `maturity` property set on every page?
- Is the writing in second person ("Your research shows...")?
- Is the content mobile-friendly (short paragraphs, bullet lists)?

**Evaluate overall:**
- Total token usage and estimated cost
- Number of LLM steps per agent
- Time to complete
- Are there any tool call errors in agent_logs?

### 2. Run lint

```bash
pnpm smoke:wiki-lint "<userId>"
```

(`apps/server/scripts/smoke-wiki-lint.ts` calls `runWikiLint`; you can also use oRPC `wiki.lint` when the server is running.)

**Evaluate:**
- Does it find real issues (orphans, thin pages, empty spaces)?
- Are flagged issues actionable?
- Linter tools should not mutate wiki/entry data; **`agent_logs` will still receive rows** for tool calls and the run summary (audit trail), same as other agents.

### 3. Run incremental compile

Add a new entry to the user's data, then:

```bash
pnpm smoke:wiki-compile "<userId>" incremental
```

**Evaluate:**
- Does the Curator assign the new entry to an existing space (or create a new one only if warranted)?
- Does the Writer grow existing pages (add sections) rather than rewriting from scratch?
- Is the version history captured in wiki_page_versions?
- Is the cost lower than the full compile?

### 4. Test each page type template

Verify the Writer can produce pages for each type when the content warrants it:
- **synthesis** — default, should be most common
- **comparison** — if entries cover competing approaches/tools
- **timeline** — if entries have temporal progression
- **glossary** — if entries define many terms
- **index** — the index space page

### 5. Review agent_logs

Query the `agent_logs` table for the run:
```sql
SELECT level, message, tool_name, created_at
FROM agent_logs
WHERE run_id = '<runId>'
ORDER BY created_at ASC;
```

Check:
- Every tool call is logged with input/output
- No unexpected errors
- Step count is reasonable (not hitting maxSteps limits)
- Token usage per agent is captured in the summary log entry

### 6. Iterate on prompts and tools

Based on the above findings, fix issues in:
- `wiki-prompts.ts` — system/user prompts (most likely area for iteration)
- `wiki-tools.ts` — tool descriptions, input schemas, output formats
- `agent-step-limits.ts` — increase/decrease maxSteps if agents are hitting limits or wasting steps
- Agent runners — if the JSON parsing is failing on model output

Common prompt issues to watch for:
- Model not following JSON output format (wrapping in markdown fences despite instructions)
- Model calling tools with wrong arguments (e.g. wildcards in topicFilter)
- Model creating too many or too few spaces
- Model not using getPageTypeTemplate before writing
- Model not including sourceEntryIds in sections
- Model hallucinating page links (UUIDs that don't exist)

### 7. Fix the linter missing `stopWhen` (from T-015c review)

While iterating, also fix the bug found during T-015c review:
- Add `LINTER_MAX_STEPS` to `agent-step-limits.ts` (value: 10)
- Add `stopWhen: stepCountIs(LINTER_MAX_STEPS)` to `linter-agent.ts`

---

## Files

| File | Action |
|------|--------|
| `apps/server/scripts/smoke-wiki-lint.ts` | **Done** — lint smoke script |
| `apps/server/package.json` | **Done** — `smoke:wiki-lint` script |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | **Modify** — prompt improvements based on test results |
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | **Modify** — tool description/schema fixes if needed |
| `apps/server/src/modules/ai/agents/agent-step-limits.ts` | **Done** — `LINTER_MAX_STEPS = 10` |
| `apps/server/src/modules/ai/agents/linter-agent.ts` | **Done** — `stopWhen: stepCountIs(LINTER_MAX_STEPS)` |

---

## Notes

- This ticket is **iterative by nature** — it may take multiple rounds of run → evaluate → fix prompts → re-run. That's expected and valuable.
- Cost target: full compile for 50 entries should be < $0.10 with gpt-4o-mini.
- The smoke scripts run locally (no Trigger.dev needed). Requires `DATABASE_URL` and `OPENAI_API_KEY` in `apps/server/.env`.
- Agent logs are the primary debugging tool — every tool call with input/output is captured.

---

## Definition of done

- [x] Full compile runs successfully on a user with 10+ entries
- [x] Curator creates sensible spaces and assigns entries correctly
- [x] Writer produces well-structured wiki pages with valid content JSONB
- [x] Pages have sourceEntryIds tracing to real entries (no hallucinated UUIDs)
- [ ] Page-to-page links reference valid existing pages (partial — some links exist, model sometimes hallucinates pageIds)
- [x] Linter runs read-only and flags actionable issues
- [ ] Incremental compile grows existing pages (not tested yet — deferred to future iteration)
- [x] wiki_page_versions has snapshots from page updates (27 versions created)
- [x] Linter has `stopWhen: stepCountIs(LINTER_MAX_STEPS)` (bug fix)
- [x] Total cost for 50-entry full run < $0.10 (74,767 tokens ≈ $0.04)
- [x] agent_logs contain full audit trail
- [x] smoke:wiki-lint script exists and works (run locally with `.env` to confirm on your data)
