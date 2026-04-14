# T-015: Wiki Agent — Ticket Breakdown

## Epic Overview

Split the wiki agent architecture (designed in T-012) into implementable tickets.
Folder: `docs/tickets/wiki-agent/`

## Context

mymemory evolves from "bookmarks + notes" into a living knowledge base (Karpathy LLM Wiki pattern). Entries are immutable raw sources. Wiki pages are user-level living documents the agent writes and maintains. Spaces are thematic categories that group pages (like Wikipedia categories). The agent owns the wiki layer entirely — it creates pages, grows them over time, links them, and flags quality issues.

**Locked decisions:**
- Runtime: AI SDK v6 `generateText` + tools + `maxSteps` (already installed `ai@^6.0.146`)
- Model: gpt-4o-mini (cheapest). Writer agent upgradeable independently later.
- Trigger: Manual only for MVP. Event-driven + cron later.
- MVP scope: Ingest + Lint only. Query deferred.
- First run: LLM decides everything autonomously
- **3 specialized agents**: Curator (organize), Writer (synthesize), Linter (health-check)
- Wiki pages are user-level (not space-scoped) — "Transformers" exists once, can be in multiple spaces
- Content model: Two JSONB columns (`content` for wiki text, `properties` for typed metadata)
- Page-to-page links: UUID references in content JSONB, not [[]] markdown syntax
- Interconnections: M2M tables (entry↔space, page↔space) + JSONB links (page↔page) + computed (space↔space via shared pages/entries)
- **Content versioning**: Track page history for "what changed" and revert
- **Page type templates**: Different content JSONB templates per page type (synthesis, comparison, timeline, glossary)

---

## 1. Three-Layer Mapping (Karpathy → Our System)

| Karpathy Layer | Our System | Details |
|----------------|-----------|---------|
| **Raw Sources** | `entries` table | Immutable after ingest. Agent reads, never modifies. |
| **The Wiki** | `wiki_pages` (user-level) + `spaces` (categories) + M2M tables | Agent owns. Creates pages, grows them incrementally, links them. |
| **The Schema** | System prompt in `wiki-prompts.ts` | Rules for structure, conventions, workflows. Co-evolved over time. |

| Karpathy Operation | Our System | MVP Trigger |
|--------------------|-----------|-------------|
| **Ingest** | Compile endpoint → agent surveys entries → creates/updates pages, spaces, links, index | Manual button |
| **Lint** | Lint endpoint → agent reviews wiki → flags issues (read-only) | Manual button |
| **Query** | (Deferred) Search wiki + entries → synthesize answer | Future ticket |

---

## 2. Data Model

### 2.1 Extended `spaces` table

Add columns to existing `packages/db/src/schema/spaces.ts`:

```
+ isIndex            boolean     default false    -- one per user (partial unique index)
+ compilationStatus  enum('compilation_status'): idle | compiling | failed
+ lastCompiledAt     timestamp   nullable
+ content            jsonb       default {}       -- space-level summary, insights
+ properties         jsonb       default {}       -- agent-extended metadata
+ sortOrder          integer     default 0
```

The space `content` JSONB holds space-level overview:
```jsonb
{
  "summary": "Your AI research collection covers transformers, NLP, and...",
  "insights": ["Most sources focus on attention mechanisms", "..."],
  "contradictions": ["Entry A claims X, Entry B claims Y"],
  "openQuestions": ["How does this relate to state space models?"]
}
```

### 2.2 New `wiki_pages` table — USER-LEVEL

New file: `packages/db/src/schema/wiki-pages.ts`

```
id              uuid PK defaultRandom
userId          uuid NOT NULL
title           varchar(500) NOT NULL
slug            varchar(500) NOT NULL     -- UNIQUE(userId, slug)
pageType        enum('wiki_page_type'): synthesis | timeline | comparison | glossary | index
content         jsonb default {}          -- sections, TOC, insights, links (see below)
properties      jsonb default {}          -- agent-extended typed metadata
sourceEntryIds  jsonb default []          -- string[] of entry UUIDs that built this page
sortOrder       integer default 0
createdAt       timestamp defaultNow
updatedAt       timestamp defaultNow
```

### 2.3 Wiki page `content` JSONB structure

Template the agent follows (can extend with new fields):

```jsonb
{
  "tableOfContents": [
    { "id": "overview", "title": "Overview", "level": 1 },
    { "id": "architecture", "title": "Architecture", "level": 1 },
    { "id": "self-attention", "title": "Self-Attention", "level": 2 },
    { "id": "applications", "title": "Applications", "level": 1 }
  ],
  "sections": [
    {
      "id": "overview",
      "title": "Overview",
      "body": "Transformers are a neural network architecture...",
      "sourceEntryIds": ["e1", "e3"],
      "links": [
        { "pageId": "uuid-of-attention-page", "label": "Self-Attention Mechanism" },
        { "pageId": "uuid-of-bert-page", "label": "BERT" }
      ],
      "lastUpdated": "2026-04-10T14:30:00Z"
    },
    {
      "id": "architecture",
      "title": "Architecture",
      "body": "The core innovation is the multi-head attention...",
      "sourceEntryIds": ["e1", "e2"],
      "links": [],
      "lastUpdated": "2026-04-10T14:30:00Z"
    }
  ],
  "insights": ["Most sources agree attention replaced RNNs", "..."],
  "contradictions": ["Entry A says X, Entry B says Y"],
  "openQuestions": ["How does this compare to state space models?"]
}
```

Pages grow incrementally: when a new entry arrives, the agent reads the existing content, adds/updates sections, adds sourceEntryIds, rebuilds TOC, and checks for new contradictions.

### 2.4 Wiki page `properties` JSONB structure

```jsonb
{
  "maturity": { "type": "enum", "values": ["stub", "draft", "complete"], "value": "draft" },
  "confidence": { "type": "enum", "values": ["low", "medium", "high"], "value": "high" },
  "primaryTopic": { "type": "string", "value": "Neural Networks" },
  "lastReviewedEntryCount": { "type": "number", "value": 12 }
}
```

Agent adds properties freely. User can see and edit all properties in the app.

### 2.5 New `space_wiki_pages` M2M table

New file: `packages/db/src/schema/space-wiki-pages.ts`

```
spaceId     uuid FK→spaces (cascade delete) NOT NULL
wikiPageId  uuid FK→wiki_pages (cascade delete) NOT NULL
createdAt   timestamp defaultNow
PK(spaceId, wikiPageId)
```

A wiki page can belong to multiple spaces (like Wikipedia categories).

### 2.6 New `agent_logs` table

New file: `packages/db/src/schema/agent-logs.ts`

```
id          uuid PK defaultRandom
userId      uuid NOT NULL
runId       uuid NOT NULL           -- groups logs for one compilation run
level       enum('agent_log_level'): info | warn | error | action
message     text NOT NULL
toolName    varchar(100)
toolInput   jsonb
toolOutput  jsonb
durationMs  integer
createdAt   timestamp defaultNow
```

### 2.7 Indexes

```sql
UNIQUE wiki_pages(userId, slug)
INDEX wiki_pages(userId)

INDEX space_wiki_pages(spaceId)
INDEX space_wiki_pages(wikiPageId)

INDEX agent_logs(runId)
INDEX agent_logs(userId, created_at DESC)

-- Partial unique: one index space per user
UNIQUE spaces(userId) WHERE is_index = true
```

### 2.8 Interconnection Model

| Connection | Storage | Query |
|-----------|---------|-------|
| Entry ↔ Space | `entry_spaces` M2M (existing) | JOIN |
| Wiki Page ↔ Space | `space_wiki_pages` M2M (new) | JOIN |
| Wiki Page ↔ Wiki Page | `links` array in content JSONB sections | Read JSONB |
| Wiki Page ↔ Entry | `sourceEntryIds` on wiki page (top-level + per-section) | Read JSONB |
| Space ↔ Space (implicit) | Computed from shared wiki pages or shared entries | SQL: JOIN space_wiki_pages × 2 GROUP BY |

Space connection strength query:
```sql
SELECT s2.id, s2.name, COUNT(DISTINCT swp1.wiki_page_id) as shared_pages
FROM space_wiki_pages swp1
JOIN space_wiki_pages swp2 ON swp1.wiki_page_id = swp2.wiki_page_id
  AND swp1.space_id != swp2.space_id
JOIN spaces s2 ON swp2.space_id = s2.id
WHERE swp1.space_id = $spaceId
GROUP BY s2.id, s2.name
ORDER BY shared_pages DESC
```

---

## 3. Three Specialized Agents

### 3.1 Agent Architecture

```
User presses "Compile Wiki"
  → Orchestrator (wiki-agent.ts)
      → Curator Agent: survey entries, create/update spaces, assign entries, update index
      → Writer Agent × N (per space, parallelizable): write/update wiki pages
      → (Optional) Linter Agent: quick health check
```

### 3.2 Curator Agent
**Job:** Organize knowledge — create spaces, assign entries, maintain index, create cross-links.
**Model:** gpt-4o-mini (organizational decisions don't need expensive models)
**Tools:**
- `listEntries` — survey entries (id, title, summary, topics, tags)
- `listSpaces` — see existing spaces with entry/page counts
- `createOrUpdateSpace` — create/update spaces with content + properties
- `assignEntriesToSpace` — bulk-assign entries to spaces
- `listWikiPages` — see existing pages (for index generation)
- `assignPageToSpaces` — link pages to additional spaces

### 3.3 Writer Agent
**Job:** Synthesize content — given a space and its entries, write/update wiki pages with rich structured content.
**Model:** gpt-4o-mini now, upgradeable to gpt-4o or Claude independently.
**Tools:**
- `readEntryContent` — deep-read one entry (full content, sparingly)
- `listWikiPages` — see existing pages in the space
- `createOrUpdateWikiPage` — write/update page with sections, TOC, links, insights (auto-snapshots previous version)
- `assignPageToSpaces` — link page to multiple spaces

**Called once per space** by the orchestrator. Receives space context (name, description, entry summaries) as prompt context. Can be **parallelized** across spaces.

### 3.4 Linter Agent
**Job:** Health-check the wiki — find issues, suggest fixes. Read-only.
**Model:** gpt-4o-mini
**Tools:**
- `listEntries` — find orphan entries
- `listSpaces` — find empty spaces
- `listWikiPages` — find thin/stale pages
- `flagIssue` — report problems with severity, category, suggested fix

**Enforced read-only:** Only gets read tools + flagIssue. Cannot modify content.

### 3.5 All Tools (10 total)

| # | Tool | Used by | Purpose |
|---|------|---------|---------|
| 1 | `listEntries` | Curator, Linter | Survey entries (compact: id, title, summary, topics, tags) |
| 2 | `readEntryContent` | Writer | Full content of one entry (truncated 8K). Use sparingly. |
| 3 | `listSpaces` | Curator, Linter | Spaces with entryCount, pageCount, wiki status |
| 4 | `createOrUpdateSpace` | Curator | Upsert space by (userId, name). Content + properties. |
| 5 | `assignEntriesToSpace` | Curator | Bulk-assign entries. ON CONFLICT DO NOTHING. |
| 6 | `listWikiPages` | Curator, Writer, Linter | Pages, optionally filtered by space |
| 7 | `createOrUpdateWikiPage` | Writer | Upsert page by (userId, slug). Auto-snapshots previous version. |
| 8 | `assignPageToSpaces` | Curator, Writer | Link page to spaces (M2M) |
| 9 | `flagIssue` | Linter | Report quality issues to agent_logs |
| 10 | `getPageTypeTemplate` | Writer | Returns the JSONB template for a given page type |

---

## 4. Agent Flows

### 4.1 First Run (Bootstrap)

User has 50+ entries, presses "Compile Wiki":

```
Phase 1 — SURVEY (1-2 LLM calls):
  → listEntries(limit: 100) → all summaries + topics + tags
  → listSpaces() → confirm empty (or existing user-created spaces)
  → listWikiPages() → confirm no pages exist

Phase 2 — ORGANIZE (1-3 LLM calls):
  → Agent reasons about thematic clusters from topics/tags
  → createOrUpdateSpace × N (5-12 spaces, e.g. "AI Research", "Web Dev", "Cooking")
  → assignEntriesToSpace × N (batch per space)

Phase 3 — WRITE (8-16 LLM calls, 1-2 per space):
  → For each space:
    → Optionally readEntryContent for 2-3 most important entries
    → createOrUpdateWikiPage with content JSONB (sections, TOC, insights)
    → May create multiple pages per space (overview, glossary, comparison)
    → assignPageToSpaces (link page to its primary space, plus any secondary spaces)

Phase 4 — INDEX + LINKS (1-2 LLM calls):
  → createOrUpdateSpace("Index", isIndex: true)
  → createOrUpdateWikiPage("Knowledge Base Index", pageType: "index")
  → assignPageToSpaces(indexPageId, [indexSpaceId])
  → Agent includes links to key pages in section.links arrays
```

**Token budget:** ~50 entries × 200-word summaries = ~13K tokens input per call. gpt-4o-mini 128K context. Total: ~12-22 LLM calls, ~$0.02-0.05.

### 4.2 Incremental Ingest

New entries arrive, user triggers compile:

```
1. Orchestrator injects context: "N new entries since lastCompiledAt"
2. Agent calls listEntries(unassignedOnly: true)
3. Agent calls listSpaces() + listWikiPages()
4. For each new entry:
   - Fits existing space? → assignEntriesToSpace
   - 3+ entries form new cluster? → createOrUpdateSpace
   - Orphan? → assign to closest space, set pendingReview property
5. For each space that received new entries:
   - Read existing wiki page content JSONB
   - Add/update sections with new entry content
   - Update sourceEntryIds per section
   - Rebuild tableOfContents
   - Check for new contradictions
6. Update index page
```

Key: Pages GROW. The agent reads the existing `content` JSONB, adds new sections or extends existing ones, adds new links. It doesn't rewrite from scratch.

### 4.3 Lint (read-only)

```
1. listEntries(unassignedOnly: true) → find orphan entries
2. listSpaces() → find empty spaces
3. listWikiPages() → find thin pages, stale pages
4. Check for missing links (related topics not linked)
5. Check for contradictions across pages
6. flagIssue × N for each problem found
7. Return summary
```

System prompt enforces: "Do NOT call createOrUpdateSpace, createOrUpdateWikiPage, or assignEntriesToSpace during lint. Only flagIssue."

---

## 5. System Prompt Summary

Key rules the agent follows:
- **Role:** "Wiki Compiler for a personal knowledge base"
- **Page types:** synthesis (default), timeline, comparison, glossary, index
- **Content structure:** Sections with body, sourceEntryIds, links. TOC auto-generated. Insights and contradictions at page level.
- **Slug convention:** lowercase, hyphenated, URL-safe, unique per user
- **Links:** Use `{ pageId, label }` objects in section.links arrays
- **Growth:** Prefer updating existing pages over creating new ones. Add sections, don't replace.
- **Properties:** Add freely. Include `maturity` (stub/draft/complete) on every page.
- **Spaces:** Min 2 entries per space. Broad themes, not narrow topics.
- **Index:** Exactly one index space per user. Update it after every compilation.
- **Compilation order:** Survey → Organize → Write → Index
- **Second person:** "Your research shows..." not "The user's research..."
- **Mobile-first:** Short paragraphs, bullet lists. Pages are read on phones.
- **Never hallucinate:** Every claim must trace to a source entry.

---

## 6. File Structure

```
apps/server/src/
  modules/ai/
    agents/
      wiki-orchestrator.ts    # runWikiCompile / runWikiLint — chains agents
      curator-agent.ts        # Curator: organize spaces, assign entries, build index
      writer-agent.ts         # Writer: synthesize wiki pages per space
      linter-agent.ts         # Linter: health-check, flag issues (read-only)
      wiki-tools.ts           # All 10 tool definitions, built per-agent
      wiki-prompts.ts         # System prompts per agent + page type templates
      wiki-agent.types.ts     # Shared types: WikiPageContent, SpaceContent, PropertyValue, PageTypeTemplate
  router/
    wiki.router.ts            # oRPC: wiki.compile, wiki.lint, wiki.status, wiki.logs, wiki.listPages, wiki.getPage

packages/db/src/schema/
  wiki-pages.ts               # New: wiki_pages + wiki_page_versions tables
  space-wiki-pages.ts         # New: M2M table
  agent-logs.ts               # New: agent_logs table
  spaces.ts                   # Modified: add wiki columns
  enums.ts                    # Modified: add new enums

packages/shared/src/contracts/
  wiki.contract.ts            # oRPC contract for wiki endpoints
```

---

## 7. Implementation Sequence

### Step 1: Schema + Migration
- Add enums: compilationStatus, wikiPageType, agentLogLevel
- Extend `spaces` table with wiki columns
- Create `wiki_pages`, `space_wiki_pages`, `agent_logs` tables
- Add indexes
- Run `drizzle-kit generate`

### Step 2: Agent Tools
- Implement all 9 tools in `wiki-tools.ts`
- Each tool = pure DB operation with userId closure
- Independently testable

### Step 3: System Prompt
- Write `wiki-prompts.ts` with compile/lint/incremental builders
- Include content JSONB template
- Dynamic context injection (lastCompiledAt, delta entries)

### Step 4: Agent Orchestrator
- `wiki-agent.ts` using `generateText` with tools + `maxSteps: 40`
- `onStepFinish` logs every tool call to agent_logs
- Concurrency guard: check compilationStatus before starting

### Step 5: Service + Router + Contract
- `wiki.contract.ts` in shared package
- `wiki.router.ts`: compile, lint, status, logs, listPages, getPage
- Register in app router

### Step 6: Smoke Test
- `scripts/smoke-wiki-agent.ts` — run against real data
- Verify: pages created, spaces populated, links present, index exists

---

---

## TICKET BREAKDOWN

### Dependency Flow

```
T-015a (Schema + Versioning)
  └→ T-015b (Agent Tools + Page Type Templates)
       └→ T-015c (3 Agent Prompts + Orchestrator)
            └→ T-015d (Contract + Router)
                 └→ T-015e (Smoke Test + Iteration)
                      └→ T-015f (Mobile: Wiki Page Rendering)
                           ├→ T-015g (Mobile: Compile/Lint UI)
                           └→ T-015h (Mobile: Properties Editor)
```

---

### T-015a: DB Schema + Migration + Content Versioning
**Phase:** Foundation (server)
**Depends on:** Nothing
**Scope:**
- Add enums: `compilation_status`, `wiki_page_type`, `agent_log_level`
- Extend `spaces` table: `isIndex`, `compilationStatus`, `lastCompiledAt`, `content` (jsonb), `properties` (jsonb), `sortOrder`
- Create `wiki_pages` table (user-level, UNIQUE(userId, slug), `content` jsonb, `properties` jsonb)
- Create `wiki_page_versions` table (auto-snapshot before each update):
  - `id`, `wikiPageId` FK, `content` jsonb, `properties` jsonb, `sourceEntryIds` jsonb, `version` integer, `createdAt`
  - INDEX on (wikiPageId, version DESC)
- Create `space_wiki_pages` M2M table
- Create `agent_logs` table
- Add all indexes (partial unique on isIndex, unique(userId,slug) on wiki_pages, etc.)
- Run `drizzle-kit generate` for migration
- Export new tables/types from schema index

**Files:**
- `packages/db/src/schema/spaces.ts` — modify
- `packages/db/src/schema/wiki-pages.ts` — create (wiki_pages + wiki_page_versions)
- `packages/db/src/schema/space-wiki-pages.ts` — create
- `packages/db/src/schema/agent-logs.ts` — create
- `packages/db/src/schema/enums.ts` — modify (or create if not exists)
- `packages/db/src/schema/index.ts` — modify exports

**DoD:**
- [ ] All tables created with correct types and constraints
- [ ] `wiki_page_versions` table exists with FK to wiki_pages
- [ ] Migration runs cleanly on fresh DB and existing DB
- [ ] `pnpm typecheck` passes
- [ ] Drizzle infer types work: `typeof wikiPages.$inferSelect`, `typeof wikiPageVersions.$inferSelect`

---

### T-015b: Agent Tools + Page Type Templates
**Phase:** Foundation (server)
**Depends on:** T-015a
**Scope:**
- Implement all 10 tools as pure DB operations in `wiki-tools.ts`
- 3 builder functions returning tool subsets per agent:
  - `buildCuratorTools(userId, runId)` — listEntries, listSpaces, createOrUpdateSpace, assignEntriesToSpace, listWikiPages, assignPageToSpaces
  - `buildWriterTools(userId, runId)` — readEntryContent, listWikiPages, createOrUpdateWikiPage (auto-snapshots previous version to wiki_page_versions), assignPageToSpaces, getPageTypeTemplate
  - `buildLinterTools(userId, runId)` — listEntries, listSpaces, listWikiPages, flagIssue
- `createOrUpdateWikiPage` auto-snapshots: before upsert, if page exists, INSERT previous content/properties/sourceEntryIds into `wiki_page_versions` with incremented version number
- `getPageTypeTemplate` tool returns the JSONB template for a given page type:
  - **synthesis**: sections + TOC + insights + contradictions + openQuestions
  - **comparison**: columns structure (items[], criteria[], matrix)
  - **timeline**: chronological entries (events[])
  - **glossary**: term/definition pairs (terms[])
  - **index**: space listing (spaces[])
- Shared types in `wiki-agent.types.ts` (WikiPageContent, ComparisonContent, TimelineContent, GlossaryContent, etc.)

**Files:**
- `apps/server/src/modules/ai/agents/wiki-tools.ts` — create
- `apps/server/src/modules/ai/agents/wiki-agent.types.ts` — create

**DoD:**
- [ ] Each tool callable independently with a real DB connection
- [ ] Upserts are idempotent (safe to call twice)
- [ ] `createOrUpdateWikiPage` snapshots previous version on update
- [ ] `getPageTypeTemplate` returns correct template per type
- [ ] `pnpm typecheck` passes

---

### T-015c: 3 Agent Prompts + Orchestrator
**Phase:** Foundation (server)
**Depends on:** T-015b
**Scope:**
- Write 3 system prompts in `wiki-prompts.ts`:
  - **Curator prompt**: Survey entries → create spaces → assign entries → build index. Rules for space naming, minimum entry count, broad themes.
  - **Writer prompt**: Given a space + entry summaries → write wiki pages. Content JSONB template. Page type templates. Section growth rules. Link format. Never hallucinate.
  - **Linter prompt**: Read-only. Check for orphans, empties, thin pages, missing links, contradictions. Only use flagIssue.
  - Dynamic context injection (lastCompiledAt, delta entries, incremental mode)
- Implement 3 agent runners:
  - `curator-agent.ts` — `runCurator(userId, runId, mode: 'full'|'incremental')`
  - `writer-agent.ts` — `runWriter(userId, runId, spaceId, entrySummaries[])` — called per space
  - `linter-agent.ts` — `runLinter(userId, runId)`
- Implement orchestrator in `wiki-orchestrator.ts`:
  - `runWikiCompile(userId, mode)`:
    1. Set compilationStatus = 'compiling' on index space
    2. Run Curator → get list of spaces that need writing
    3. Run Writer × N (per space that changed) — **parallelizable** via Promise.all
    4. Run Curator again → update index
    5. Set compilationStatus = 'idle', update lastCompiledAt
  - `runWikiLint(userId)`:
    1. Run Linter → get flagged issues
    2. Return issues
  - Concurrency guard: check compilationStatus before starting
  - Error handling: set compilationStatus = 'failed' on error
  - Returns `{ runId, steps, tokens, spacesCompiled }`

**Files:**
- `apps/server/src/modules/ai/agents/wiki-prompts.ts` — create
- `apps/server/src/modules/ai/agents/curator-agent.ts` — create
- `apps/server/src/modules/ai/agents/writer-agent.ts` — create
- `apps/server/src/modules/ai/agents/linter-agent.ts` — create
- `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` — create

**DoD:**
- [ ] Curator creates spaces and assigns entries when called
- [ ] Writer produces wiki pages with correct content JSONB per page type
- [ ] Linter flags issues without modifying any data
- [ ] Orchestrator chains Curator → Writer(s) → Curator(index) correctly
- [ ] Writer can be called in parallel for multiple spaces
- [ ] Concurrency guard prevents parallel compilation runs
- [ ] All steps logged to agent_logs with tool names and I/O
- [ ] `pnpm typecheck` passes

---

### T-015d: oRPC Contract + Router + Service
**Phase:** Foundation (server)
**Depends on:** T-015c
**Scope:**
- Define `wiki.contract.ts` in shared package:
  - `wiki.compile` (input: { mode: 'full' | 'incremental' })
  - `wiki.lint` (no input)
  - `wiki.status` (input: { runId })
  - `wiki.logs` (input: { runId?, limit? })
  - `wiki.listPages` (input: { spaceId? })
  - `wiki.getPage` (input: { pageId } or { slug })
  - `wiki.getPageVersions` (input: { pageId, limit? })
- Implement `wiki.router.ts` with authed middleware
- Thin service layer delegating to wiki-orchestrator
- Register in app router

**Files:**
- `packages/shared/src/contracts/wiki.contract.ts` — create
- `apps/server/src/router/wiki.router.ts` — create
- `apps/server/src/router/index.ts` — modify (add wiki router)

**DoD:**
- [ ] All endpoints callable via oRPC client
- [ ] Auth required on all endpoints
- [ ] Compile returns runId immediately
- [ ] Status endpoint returns step count + recent logs
- [ ] getPageVersions returns version history
- [ ] `pnpm typecheck` passes

---

### T-015e: Smoke Test + Iteration
**Phase:** Validation
**Depends on:** T-015d
**Scope:**
- Create `scripts/smoke-wiki-agent.ts` — runs full compile against a real user with entries
- Run it, review output, iterate on:
  - Curator quality (are spaces meaningful? are entries well-assigned?)
  - Writer quality (are pages well-structured? do they follow templates?)
  - Content JSONB shape (does the template work? does the agent follow it?)
  - Tool call patterns (is each agent efficient?)
  - Cost validation (< $0.10 for 50 entries)
- Test each page type template (synthesis, comparison, timeline, glossary)
- Fix any tool bugs or prompt issues discovered
- Run lint mode, verify issues are flagged correctly
- Run incremental compile, verify pages grow (sections added, not replaced)
- Verify version history is captured on page updates

**Files:**
- `apps/server/scripts/smoke-wiki-agent.ts` — create

**DoD:**
- [ ] First run with 10+ entries: Curator creates spaces, Writer produces pages with sections, index exists
- [ ] Wiki page content JSONB matches template per page type
- [ ] Page-to-page links exist in content JSONB
- [ ] Lint mode flags issues without modifying content
- [ ] Incremental compile grows existing pages
- [ ] wiki_page_versions has snapshots from updates
- [ ] Total cost for 50-entry first run < $0.10
- [ ] agent_logs contain full audit trail with per-agent separation

---

### T-015f: Mobile — Wiki Page Rendering
**Phase:** Mobile
**Depends on:** T-015e (needs working API)
**Scope:**
- Wiki page detail screen: render content JSONB based on pageType
  - **synthesis**: Table of contents → sections with markdown body → insights → contradictions
  - **comparison**: Matrix/table view with items and criteria
  - **timeline**: Chronological event list
  - **glossary**: Term/definition cards
  - **index**: Space listing with descriptions and page counts
- Source entry links per section (tappable → entry detail)
- Page-to-page links as tappable chips
- Space detail enhancement: show wiki pages list for this space
- TanStack Query hooks for wiki endpoints
- Version history view (list of previous versions with timestamps)

**Files:**
- `apps/mobile/src/features/wiki/` — new feature module
- Space detail screen modifications

**DoD:**
- [ ] Each page type renders with its own layout
- [ ] Source entry links navigate to entry detail
- [ ] Page-to-page links navigate to linked page
- [ ] Space detail shows list of wiki pages
- [ ] Index space shows all spaces overview
- [ ] Version history is viewable
- [ ] Loading/empty/error states handled

---

### T-015g: Mobile — Compile + Lint UI
**Phase:** Mobile
**Depends on:** T-015f
**Scope:**
- "Compile Wiki" button (in spaces screen or settings)
- Compilation status indicator (idle / compiling / failed)
- Lint trigger button
- Lint results view (list of flagged issues with severity, category, suggested fix)
- Agent logs view (optional — shows what each agent did)
- Polling for compilation status during active compile

**Files:**
- `apps/mobile/src/features/wiki/` — extend

**DoD:**
- [ ] User can trigger full and incremental compile
- [ ] User can trigger lint and see results
- [ ] Compilation status updates in real-time (polling)
- [ ] Error states handled (failed compilation, network errors)

---

### T-015h: Mobile — Properties Editor
**Phase:** Mobile
**Depends on:** T-015f
**Scope:**
- Render JSONB properties on space detail and wiki page detail
- Property type rendering: string → text input, number → number input, boolean → switch, enum → dropdown, array → chip list, date → date picker
- Edit mode: user taps property → edits value → saves
- Agent-created vs user-created indicator
- Mutation hook to update properties via API
- User can add new custom properties

**Files:**
- `apps/mobile/src/features/wiki/components/PropertiesEditor/` — new
- API mutation hook

**DoD:**
- [ ] All property types render correctly
- [ ] User can edit any property value
- [ ] Changes persist to DB
- [ ] New properties can be added by user
- [ ] Agent-created properties show origin indicator

---

## Summary

| Ticket | Scope | Phase |
|--------|-------|-------|
| **T-015a** | Schema + Migration + Content Versioning | Foundation |
| **T-015b** | Agent Tools (10) + Page Type Templates | Foundation |
| **T-015c** | 3 Agent Prompts (Curator/Writer/Linter) + Orchestrator | Foundation |
| **T-015d** | oRPC Contract + Router + Service | Foundation |
| **T-015e** | Smoke Test + Iteration | Validation |
| **T-015f** | Mobile: Wiki Page Rendering (per page type) | Mobile |
| **T-015g** | Mobile: Compile/Lint UI | Mobile |
| **T-015h** | Mobile: Properties Editor | Mobile |

**Total: 8 tickets.** Foundation (4) → Validation (1) → Mobile (3).

Key additions vs original plan:
- 3 specialized agents (Curator, Writer, Linter) instead of 1 monolithic agent
- Content versioning (wiki_page_versions table, auto-snapshot on update)
- Page type templates (different JSONB structures for synthesis/comparison/timeline/glossary/index)
- Writer parallelizable across spaces (Promise.all in orchestrator)
