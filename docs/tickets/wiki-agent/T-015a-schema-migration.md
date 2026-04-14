# T-015a: DB Schema + Migration + Content Versioning

**Status:** done
**Phase:** Foundation (server)
**Type:** schema
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-011a (spaces module exists)

---

## Goal

Create the database foundation for the wiki agent: new tables, extended columns, enums, indexes, and Drizzle migrations. No application logic — pure schema.

---

## Scope

### New enums

| Enum | Values | Used by |
|------|--------|---------|
| `compilation_status` | `idle`, `compiling`, `failed` | `spaces.compilationStatus` |
| `wiki_page_type` | `synthesis`, `timeline`, `comparison`, `glossary`, `index` | `wiki_pages.pageType` |
| `agent_log_level` | `info`, `warn`, `error`, `action` | `agent_logs.level` |

### Extend `spaces` table

Add columns to existing `packages/db/src/schema/spaces.ts`:

| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `isIndex` | `boolean` | `false` | One per user (partial unique index) |
| `compilationStatus` | `compilation_status` enum | `'idle'` | Agent run status |
| `lastCompiledAt` | `timestamp` | `null` | When agent last compiled this space |
| `content` | `jsonb` | `{}` | Space-level wiki content (summary, insights) |
| `properties` | `jsonb` | `{}` | Agent-extended typed metadata |
| `sortOrder` | `integer` | `0` | Display ordering |

### New table: `wiki_pages` (user-level)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `defaultRandom()` |
| `userId` | `uuid` NOT NULL | Owner |
| `title` | `varchar(500)` NOT NULL | Page title |
| `slug` | `varchar(500)` NOT NULL | URL-safe identifier, `UNIQUE(userId, slug)` |
| `pageType` | `wiki_page_type` enum | Default `'synthesis'` |
| `content` | `jsonb` default `{}` | Wiki content: sections, TOC, insights, links (shape varies by pageType) |
| `properties` | `jsonb` default `{}` | Agent-extended typed metadata (user-editable) |
| `sourceEntryIds` | `jsonb` default `[]` | `string[]` of entry UUIDs that built this page |
| `sortOrder` | `integer` default `0` | Display ordering |
| `createdAt` | `timestamp` | `defaultNow()` |
| `updatedAt` | `timestamp` | `defaultNow()` |

**Key:** Pages are user-level, NOT space-scoped. "Transformers" exists once per user and can appear in multiple spaces via M2M.

### New table: `wiki_page_versions` (content versioning)

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `defaultRandom()` |
| `wikiPageId` | `uuid` FK → `wiki_pages.id` | `ON DELETE CASCADE` |
| `version` | `integer` NOT NULL | Incrementing version number |
| `content` | `jsonb` | Snapshot of previous `wiki_pages.content` |
| `properties` | `jsonb` | Snapshot of previous `wiki_pages.properties` |
| `sourceEntryIds` | `jsonb` | Snapshot of previous `wiki_pages.sourceEntryIds` |
| `createdAt` | `timestamp` | `defaultNow()` |

### New table: `space_wiki_pages` (M2M)

| Column | Type | Notes |
|--------|------|-------|
| `spaceId` | `uuid` FK → `spaces.id` | `ON DELETE CASCADE` |
| `wikiPageId` | `uuid` FK → `wiki_pages.id` | `ON DELETE CASCADE` |
| `createdAt` | `timestamp` | `defaultNow()` |
| PK | composite | `(spaceId, wikiPageId)` |

### New table: `agent_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | `defaultRandom()` |
| `userId` | `uuid` NOT NULL | |
| `runId` | `uuid` NOT NULL | Groups logs for one compilation run |
| `level` | `agent_log_level` enum | Default `'info'` |
| `message` | `text` NOT NULL | Human-readable log message |
| `toolName` | `varchar(100)` | Which agent tool was called |
| `toolInput` | `jsonb` | Tool input arguments |
| `toolOutput` | `jsonb` | Tool return value |
| `durationMs` | `integer` | Tool execution time |
| `createdAt` | `timestamp` | `defaultNow()` |

### Indexes

```sql
-- wiki_pages
UNIQUE INDEX wiki_pages_user_slug ON wiki_pages(user_id, slug);
INDEX wiki_pages_user_id ON wiki_pages(user_id);

-- wiki_page_versions
INDEX wiki_page_versions_page ON wiki_page_versions(wiki_page_id, version DESC);

-- space_wiki_pages
INDEX space_wiki_pages_space ON space_wiki_pages(space_id);
INDEX space_wiki_pages_page ON space_wiki_pages(wiki_page_id);

-- agent_logs
INDEX agent_logs_run ON agent_logs(run_id);
INDEX agent_logs_user_created ON agent_logs(user_id, created_at DESC);

-- spaces (partial unique)
UNIQUE INDEX spaces_user_index ON spaces(user_id) WHERE is_index = true;
```

---

## Files

| File | Action |
|------|--------|
| `packages/db/src/schema/spaces.ts` | **Modify** — add wiki columns (isIndex, compilationStatus, lastCompiledAt, content, properties, sortOrder) |
| `packages/db/src/schema/wiki-pages.ts` | **Create** — wiki_pages + wiki_page_versions tables + enums |
| `packages/db/src/schema/space-wiki-pages.ts` | **Create** — M2M table |
| `packages/db/src/schema/agent-logs.ts` | **Create** — agent_logs table + enum |
| `packages/db/src/schema/index.ts` | **Modify** — export new tables |
| `packages/db/src/migrations/` | **Create** — generated migration file |

---

## Notes

- The existing `spaceRelations` table (parent/child hierarchy) stays as-is. The wiki agent may use it later for hierarchical categorization.
- The existing `spaceSuggestions` table stays as-is. The wiki agent replaces the suggestion workflow but old suggestions remain until cleaned up.
- `centroidVector` on spaces stays but is no longer used for auto-assign (disabled in T-011a). Future cleanup ticket.
- No application logic in this ticket — just schema, migration, and type exports.

---

## Definition of done

- [x] All enums created: `compilation_status`, `wiki_page_type`, `agent_log_level`
- [x] `spaces` table extended with all new columns
- [x] `wiki_pages` table created with UNIQUE(userId, slug)
- [x] `wiki_page_versions` table created with FK to wiki_pages
- [x] `space_wiki_pages` M2M table created
- [x] `agent_logs` table created
- [x] All indexes created (including partial unique on spaces.isIndex)
- [x] Migration generated via `drizzle-kit generate` and runs cleanly (`0003_t015a_wiki_agent_schema.sql`)
- [x] All new tables exported from `packages/db/src/schema/index.ts`
- [x] Drizzle infer types work: `typeof wikiPages.$inferSelect`, `typeof wikiPageVersions.$inferSelect`, etc.
- [x] `pnpm typecheck` passes across all workspaces

**Note:** The previous draft `0003_red_ego` migration (space-scoped wiki + `space_cross_refs`) was removed from the journal and replaced by this migration. If you already applied that draft to a database, do not run the new `0003` on top of it—restore from backup or hand-write a corrective migration (drop draft wiki tables/types, then apply `0003_t015a_wiki_agent_schema.sql`).
