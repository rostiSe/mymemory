# T-015: Wiki Agent (epic)

**Status:** in-progress
**Phase:** 4 — Spaces + Wiki Agent
**Type:** epic (schema + server + mobile)
**Epic:** [T-011 Spaces](../T-011-spaces-screen.md)
**Depends on:** T-012 (research done), T-011a-c (spaces module exists)

---

## Goal

Implement the Karpathy LLM Wiki pattern as a 3-agent pipeline that transforms saved entries into a living, interconnected personal knowledge base.

**Three layers:**
- **Raw sources** = `entries` table (immutable after ingest, agent reads but never modifies)
- **The wiki** = `wiki_pages` (user-level) + `spaces` (categories) + M2M tables (agent owns, creates, maintains)
- **The schema** = system prompts per agent (rules for structure, conventions, workflows)

**Three operations (MVP: Ingest + Lint only):**
- **Ingest (compile):** Agent surveys entries → creates spaces → writes wiki pages → builds index
- **Lint:** Agent health-checks wiki → flags issues (read-only)
- **Query (deferred):** Ask questions against the wiki → synthesized answers

---

## Architecture: 3 Specialized Agents

```
User presses "Compile Wiki"
  → Orchestrator
      → Curator Agent: survey entries, create spaces, assign entries
      → Writer Agent × N (per space, parallel): write/update wiki pages
      → Curator Agent: update index space
      → (Optional) Linter Agent: health-check
```

| Agent | Role | Model | Tools |
|-------|------|-------|-------|
| **Curator** | Organize: create spaces, assign entries, build index | gpt-4o-mini | listEntries, listSpaces, createOrUpdateSpace, assignEntriesToSpace, listWikiPages, assignPageToSpaces |
| **Writer** | Synthesize: write wiki pages per space, grow incrementally | gpt-4o-mini (upgradeable) | readEntryContent, listWikiPages, createOrUpdateWikiPage, assignPageToSpaces, getPageTypeTemplate |
| **Linter** | Validate: health-check, flag issues (read-only) | gpt-4o-mini | listEntries, listSpaces, listWikiPages, flagIssue |

---

## Key design decisions

- **Wiki pages are user-level** — "Transformers" exists once, linked to multiple spaces via M2M (`space_wiki_pages`)
- **Two JSONB columns**: `content` (wiki text — sections, TOC, links, insights) + `properties` (typed metadata — agent/user editable)
- **Pages grow incrementally** — agent adds sections, doesn't rewrite from scratch
- **Page-to-page links**: UUID references in content JSONB (`{ pageId, label }`)
- **Content versioning**: `wiki_page_versions` table, auto-snapshot before each update
- **Page type templates**: Different content JSONB shapes per type (synthesis, comparison, timeline, glossary, index)
- **Agent decides content weight** — no schema changes for entry types; Curator classifies via prompts
- **Interconnections**: `entry_spaces` M2M (existing) + `space_wiki_pages` M2M (new) + JSONB links (page↔page) + computed strength (shared pages between spaces)
- **Manual trigger only** for MVP. Event-driven + cron deferred.
- **Model: gpt-4o-mini** (cheapest). Writer upgradeable independently.

---

## Child tickets

| ID | Ticket | Type | Phase |
|----|--------|------|-------|
| [T-015a](./T-015a-schema-migration.md) | Schema + Migration + Content Versioning | schema | Foundation |
| [T-015b](./T-015b-agent-tools.md) | Agent Tools (10) + Page Type Templates | feature (server) | Foundation |
| [T-015c](./T-015c-agents-orchestrator.md) | 3 Agent Prompts + Orchestrator | feature (server) | Foundation |
| [T-015d](./T-015d-contract-router.md) | oRPC Contract + Router + Service | feature (server) | Foundation |
| [T-015e](./T-015e-smoke-test.md) | Smoke Test + Iteration | validation | Validation |
| [T-015f](./T-015f-mobile-wiki-rendering.md) | Mobile: Wiki Page Rendering | feature (mobile) | Mobile |
| [T-015g](./T-015g-mobile-compile-lint-ui.md) | Mobile: Compile/Lint UI | feature (mobile) | Mobile |
| [T-015h](./T-015h-mobile-properties-editor.md) | Mobile: Properties Editor | feature (mobile) | Mobile |

### Dependency flow

```
T-015a (Schema)
  └→ T-015b (Tools + Templates)
       └→ T-015c (3 Agents + Orchestrator)
            └→ T-015d (Contract + Router)
                 └→ T-015e (Smoke Test)
                      └→ T-015f (Mobile: Rendering)
                           ├→ T-015g (Mobile: Compile/Lint)
                           └→ T-015h (Mobile: Properties)
```

---

## References

- [T-012 Research](../T-012-wiki-agent-research.md) — architecture investigation
- [T-011 Spaces epic](../T-011-spaces-screen.md) — parent epic
- [Karpathy LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f)
- `packages/db/src/schema/spaces.ts` — current spaces schema
- `apps/server/src/modules/ai/` — existing AI module
