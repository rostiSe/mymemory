# T-012: Research — Wiki Agent Architecture

**Status:** todo
**Phase:** 4 — Spaces + Wiki Agent
**Type:** research (no code — findings + recommendation doc)
**Risk:** n/a (research only)
**Depends on:** T-011a (spaces module exists, auto-assign disabled)

---

## Goal

Investigate and document the best architecture for mymemory's wiki agent — the background system that reads entries, creates/updates spaces, compiles wiki content, manages cross-references, and extends space properties. This is a **research ticket**: the deliverable is a document, not code.

---

## Context

The agent is the core differentiator. It turns mymemory from "bookmarks + notes" into "a living knowledge base that builds itself." The Karpathy LLM Wiki pattern:

- **Raw sources** (entries) are immutable after ingest
- **Wiki** (spaces) are compiled artifacts maintained by the agent
- **Schema** (agent instructions) tells the agent how to structure and maintain the wiki
- The agent does the grunt work: summarizing, cross-referencing, filing, flagging contradictions
- The user curates sources, asks questions, and reviews the agent's work

Key constraint: the system should be **agent-driven, not schema-driven**. Spaces have a template skeleton (typed columns) + JSONB properties the agent extends freely. Like Notion databases where the agent defines the columns.

---

## What to Investigate

### 1. Agent Runtime Patterns

**File-based memory (CLAUDE.md / memory.md / soul.md):**
- Agent maintains markdown files as working memory
- Human-readable, version-controllable, dead simple
- Used by: Claude Code memory, Cursor rules, various open-source agents
- Question: can this work when the "files" are DB rows, not filesystem?

**Agent frameworks:**
- **Vercel AI SDK agents** — multi-step tool-use loops with `generateText` + tools. We already use AI SDK v6.
- **Mastra** — TypeScript agent framework with memory, tools, workflows. Open source.
- **LangGraph** — stateful agent graphs. Python-heavy but has JS SDK.
- **Claude Agent SDK** — Anthropic's own agent framework for building autonomous agents
- Question: which integrates best with our existing stack (AI SDK + Hono + Drizzle)?

**Background task runners:**
- **Trigger.dev** — already connected as MCP in this project. Event-driven or scheduled tasks. Serverless.
- **BullMQ / Redis queues** — self-hosted job queue. More control, more infra.
- **Simple cron** — a scheduled function that runs periodically. Simplest but least flexible.
- **Railway cron** — if deployed on Railway, built-in cron support.
- Question: does the agent need event-driven triggers (new entry → compile) or is periodic enough?

**Autonomous agent patterns:**
- Agent gets tools (read DB, write DB, call LLM, search embeddings) and a goal
- It decides what to do: create a space, update a wiki page, add cross-refs
- More flexible but harder to control — needs guardrails
- Question: how much autonomy vs. how much structure?

### 2. Agent Memory & State

How does the agent remember what it's done and what needs doing?

- **DB state as memory** — agent reads the DB to know current state (what spaces exist, when they were last compiled, what entries are new)
- **Explicit log table** — append-only log of agent actions (like Karpathy's log.md)
- **File-based soul** — a markdown file that describes the agent's purpose, rules, and current understanding
- **Conversation memory** — the agent maintains a running context across compilations

### 3. Compilation Pipeline Design

When the agent "compiles" a space, what's the flow?

- **Input:** all entries in the space (or new entries since last compilation)
- **Output:** updated wiki content (synthesis, insights, contradictions, cross-refs, log entry)
- **LLM calls needed:** how many? One big call with all context? Multiple focused calls?
- **Token budget:** a space with 50 entries × 500-word summaries = 25K words of input. Fits in Claude's context window. But 500 entries?
- **Incremental vs. full recompile:** can the agent update the wiki incrementally (just process new entries) or does it need to re-read everything?

### 4. JSONB Property System

The agent should be able to add custom properties to spaces. Research:

- **Notion's approach:** each database has a schema (property definitions), each page has values. Schema is user-editable.
- **What properties would an agent naturally create?** Run a thought experiment: if the agent is compiling a "Recipes" space, it might add `cuisine`, `difficulty`, `prepTime`. For "React Native" it might add `platform`, `version`, `complexity`.
- **Property types:** string, number, boolean, date, enum, array, reference (link to another space/entry)
- **Schema discovery:** should the agent declare property schemas before using them, or just write JSONB and we infer the schema?
- **Querying:** can we query JSONB properties efficiently? (Postgres GIN indexes on JSONB)

### 5. Cross-Reference System

How should spaces link to each other?

- **Explicit table** (`space_cross_refs` with source_space_id, target_space_id, reason)
- **Embedded in wiki content** (markdown links `[[Space Name]]` like Obsidian)
- **Both** — table for queryability, markdown for readability
- **Bidirectional or unidirectional?**

### 6. Existing Tools & Integrations

- **NemoKlaw** — research what this is and if it's relevant
- **Obsidian integration** — could the wiki be exported/synced to Obsidian?
- **qmd** — local markdown search engine mentioned in Karpathy's doc
- **Trigger.dev** — already in MCP, natural fit for background agent tasks?

---

## Deliverable

**File:** `docs/WIKI-AGENT-ARCHITECTURE.md`

Contents:
1. **Comparison table** of agent runtime options (simplicity, cost, flexibility, our-stack fit)
2. **Recommended runtime** with rationale
3. **Compilation pipeline design** — step-by-step flow, LLM calls, token budget
4. **Memory/state model** — how the agent tracks what's done
5. **JSONB property system design** — schema, types, querying
6. **Cross-reference model** — table design, bidirectional linking
7. **Schema changes needed** — what columns/tables to add to support the agent
8. **Prototype plan** — what the first runnable prototype looks like
9. **Cost estimate** — LLM calls per compilation, per day, per month
10. **Open questions** for user to decide

---

## Definition of Done

- [ ] `docs/WIKI-AGENT-ARCHITECTURE.md` written with all 10 sections
- [ ] At least 3 agent runtime options compared with pros/cons
- [ ] Recommended approach justified with our stack context (AI SDK v6, Hono, Drizzle, Trigger.dev)
- [ ] Compilation pipeline detailed enough to implement
- [ ] JSONB property system designed with example property schemas
- [ ] Cross-reference model designed
- [ ] Cost estimate calculated for realistic usage (100 entries, 10 spaces)
- [ ] Prototype scope defined (what to build first, what to defer)
- [ ] User has reviewed and approved the recommendation before implementation begins
