# T-015b: Agent Tools (10) + Page Type Templates

**Status:** done
**Phase:** Foundation (server)
**Type:** feature (server)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015a (schema exists)

---

## Goal

Implement all 10 agent tools as pure DB operations and define page type templates. Tools are the interface between the LLM agents and the database — each tool is a Zod-validated function that reads or writes via Drizzle. No LLM logic in this ticket.

---

## Scope

### Tool builders (3 functions, one per agent)

Each builder takes `(db, userId, runId)` and returns a tool subset:

| Builder | Tools | Agent |
|---------|-------|-------|
| `buildCuratorTools()` | listEntries, listSpaces, createOrUpdateSpace, assignEntriesToSpace, listWikiPages, assignPageToSpaces | Curator |
| `buildWriterTools()` | readEntryContent, listWikiPages, createOrUpdateWikiPage, assignPageToSpaces, getPageTypeTemplate | Writer |
| `buildLinterTools()` | listEntries, listSpaces, listWikiPages, flagIssue | Linter |

### Tool definitions

**1. `listEntries`**
- Input: `{ limit: number (1-100), offset: number, topicFilter?: string, unassignedOnly?: boolean }`
- Returns: `{ entries: Array<{id, title, summary, topics: string[], tags: string[], wordCount, type, createdAt}>, total: number }`
- DB: SELECT entries with LEFT JOIN topics/tags. Only `processedStatus = 'done'`. Compact — no full content.
- If `unassignedOnly`: LEFT JOIN entry_spaces WHERE spaceId IS NULL.

**2. `readEntryContent`**
- Input: `{ entryId: string (uuid) }`
- Returns: `{ id, title, summary, readableContent, keyPoints, url, type, createdAt }` — `readableContent` truncated to 8000 chars.
- DB: SELECT single entry by id + userId.

**3. `listSpaces`**
- Input: `{}`
- Returns: `Array<{ id, name, description, isIndex, compilationStatus, lastCompiledAt, content, properties, entryCount: number, pageCount: number }>`
- DB: SELECT spaces with COUNT joins on entry_spaces and space_wiki_pages.

**4. `createOrUpdateSpace`**
- Input: `{ name: string, description?: string, isIndex?: boolean, content?: jsonb, properties?: jsonb, sortOrder?: number }`
- Returns: `{ id: string, name: string, isNew: boolean }`
- DB: UPSERT by (userId, name). ON CONFLICT(userId, name) DO UPDATE SET description, content, properties, sortOrder, updatedAt.
- If `isIndex: true`, validate no other index space exists for this user.

**5. `assignEntriesToSpace`**
- Input: `{ spaceId: string (uuid), entryIds: string[] (uuid[], max 50) }`
- Returns: `{ assigned: number }`
- DB: INSERT INTO entry_spaces ... ON CONFLICT DO NOTHING. Count inserted rows.

**6. `listWikiPages`**
- Input: `{ spaceId?: string (uuid) }`
- Returns: `Array<{ id, title, slug, pageType, sourceEntryIds, properties, updatedAt }>`
- DB: SELECT wiki_pages by userId. If spaceId provided, JOIN space_wiki_pages.
- Does NOT return full content (only metadata). Agent reads full content via the page slug when needed.

**7. `createOrUpdateWikiPage`**
- Input: `{ title: string, slug: string, pageType: enum, content: jsonb, properties?: jsonb, sourceEntryIds?: string[], sortOrder?: number }`
- Returns: `{ id: string, title: string, slug: string, isNew: boolean, versionCreated: boolean }`
- DB: 
  - If page exists (by userId + slug): snapshot current content/properties/sourceEntryIds into `wiki_page_versions` with incremented version number, then UPDATE.
  - If page doesn't exist: INSERT.
  - Always updates `updatedAt`.
- **Auto-versioning:** This is the key behavior — every update creates a version snapshot automatically.

**8. `assignPageToSpaces`**
- Input: `{ wikiPageId: string (uuid), spaceIds: string[] (uuid[]) }`
- Returns: `{ assigned: number }`
- DB: INSERT INTO space_wiki_pages ... ON CONFLICT DO NOTHING.

**9. `flagIssue`**
- Input: `{ severity: 'info' | 'warn' | 'error', category: string, message: string, targetId?: string (uuid), suggestedFix?: string, autoFixable?: boolean }`
- Categories: `orphan_entry`, `empty_space`, `stale_page`, `missing_link`, `contradiction`, `duplicate_space`, `thin_page`
- Returns: `{ logged: true }`
- DB: INSERT INTO agent_logs with level = severity, toolName = 'flagIssue', toolInput = full input.

**10. `getPageTypeTemplate`**
- Input: `{ pageType: 'synthesis' | 'timeline' | 'comparison' | 'glossary' | 'index' }`
- Returns: `{ template: jsonb, description: string }`
- Pure function (no DB). Returns the expected content JSONB shape for the given page type.
- NOT an AI SDK tool — just a helper the Writer prompt references. But defined here for consistency.

### Page type templates

Each template defines the expected `content` JSONB shape:

**`synthesis`** (default):
```jsonb
{
  "tableOfContents": [{ "id": "string", "title": "string", "level": "number" }],
  "sections": [{
    "id": "string",
    "title": "string",
    "body": "string (markdown)",
    "sourceEntryIds": ["uuid"],
    "links": [{ "pageId": "uuid", "label": "string" }],
    "lastUpdated": "ISO timestamp"
  }],
  "insights": ["string"],
  "contradictions": ["string"],
  "openQuestions": ["string"]
}
```

**`comparison`**:
```jsonb
{
  "items": [{ "name": "string", "description": "string", "sourceEntryIds": ["uuid"] }],
  "criteria": ["string"],
  "matrix": { "[itemName]": { "[criterion]": "string" } },
  "verdict": "string",
  "sourceEntryIds": ["uuid"]
}
```

**`timeline`**:
```jsonb
{
  "events": [{
    "date": "string (ISO or descriptive)",
    "title": "string",
    "body": "string (markdown)",
    "sourceEntryIds": ["uuid"],
    "links": [{ "pageId": "uuid", "label": "string" }]
  }],
  "insights": ["string"]
}
```

**`glossary`**:
```jsonb
{
  "terms": [{
    "term": "string",
    "definition": "string",
    "sourceEntryIds": ["uuid"],
    "links": [{ "pageId": "uuid", "label": "string" }]
  }]
}
```

**`index`**:
```jsonb
{
  "spaces": [{
    "spaceId": "uuid",
    "name": "string",
    "summary": "string",
    "pageCount": "number",
    "entryCount": "number"
  }],
  "totalPages": "number",
  "totalEntries": "number",
  "lastCompiled": "ISO timestamp"
}
```

### Shared types

Define in `wiki-agent.types.ts`:
- `WikiPageContent` — union of all page type content shapes
- `SynthesisContent`, `ComparisonContent`, `TimelineContent`, `GlossaryContent`, `IndexContent`
- `SpaceContent` — shape of `spaces.content` JSONB
- `PropertyValue` — `{ type: PropertyType, value: unknown, values?: string[], description?: string, createdBy: 'agent' | 'user' }`
- `PropertyType` — `'string' | 'number' | 'boolean' | 'date' | 'enum' | 'array'`

---

## Files

| File | Action |
|------|--------|
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | **Create** — all 10 tool definitions + 3 builder functions |
| `apps/server/src/modules/ai/agents/wiki-agent.types.ts` | **Create** — shared types for content, properties, templates |

---

## Definition of done

- [x] All 10 tools implemented with Zod input schemas
- [x] 3 builder functions return correct tool subsets per agent
- [x] `createOrUpdateWikiPage` auto-snapshots to `wiki_page_versions` on update
- [x] `getPageTypeTemplate` returns correct template for all 5 page types
- [x] All upserts are idempotent (calling twice with same input = same result)
- [x] All shared types exported from `wiki-agent.types.ts`
- [x] `pnpm typecheck` passes
- [x] Each tool testable independently via a smoke script or manual DB verification (`apps/server/scripts/smoke-wiki-tools.ts`)
