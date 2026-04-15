# T-015k: Space Hierarchy + Curator Overhaul

**Status:** done  
**Phase:** Server + Mobile (curator pipeline + SpacesScreen)  
**Type:** feature  
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)  
**Depends on:** T-015i (metadata foundation complete)

---

## Goal

Prevent flat space sprawl by enabling the curator to organize spaces into a two-tier hierarchy via `space_relations`. Overhaul the curator prompt for stability, merge rules, and hierarchical reasoning. Recompile the wiki and benchmark against the flat baseline.

---

## Problem

With 100+ entries the curator produces 15-25 flat spaces. Related spaces like "Machine Learning", "LLMs", "Deep Learning", and "Computer Vision" sit next to "Cooking" and "Fitness" with no grouping. The user sees a long unstructured list in SpacesScreen.

The `space_relations` table (`parent_space_id`, `child_space_id`) already exists in the schema but is never populated or queried by the wiki pipeline.

---

## Context

### Current state

- `space_relations` table exists in `packages/db/src/schema/spaces.ts` (composite PK, cascade deletes)
- No curator tool writes to `space_relations`
- `listSpaces` returns flat list — no parent/child info
- `createOrUpdateSpace` has no `parentSpaceId` parameter
- Curator prompt says nothing about hierarchy
- Mobile SpacesScreen renders a flat list

### After T-015i

- Entries carry richer metadata (contentType, depth, authors, normalized topics)
- Curator receives this metadata via `listEntries`
- Multi-assignment guidance tells curator to assign cross-cutting entries to 2-3 spaces
- These improvements make hierarchy decisions more informed

---

## Scope

### 1. New curator tool: `setSpaceParent`

**File:** `apps/server/src/modules/ai/agents/wiki-tools.ts`

```typescript
const setSpaceParent = makeTool(
  'Set a parent-child relationship between two spaces. The child space becomes a sub-space of the parent.',
  z.object({
    childSpaceId: uuidSchema,
    parentSpaceId: uuidSchema,
  }),
  async ({ childSpaceId, parentSpaceId }) => {
    // Validate both spaces exist and belong to user
    // Prevent cycles (a space cannot be its own ancestor)
    // Prevent depth > 2 (parent cannot already be a child)
    await db.insert(spaceRelations)
      .values({ parentSpaceId, childSpaceId })
      .onConflictDoNothing();
    return { success: true };
  },
);
```

Constraints:
- Max 2 levels deep (parent → child, no grandchildren)
- A space can have at most one parent
- Index space cannot be a child
- Cycle detection: parent cannot already be a descendant of child

### 2. Update `listSpaces` tool to return hierarchy

**File:** `apps/server/src/modules/ai/agents/wiki-tools.ts`

Add `parentSpaceId` and `childSpaceIds` to each space in the response so the curator sees the tree.

### 3. Curator prompt overhaul

**File:** `apps/server/src/modules/ai/agents/wiki-prompts.ts`

#### Hierarchy rules

```
## Space hierarchy

After creating and assigning spaces, organize them into a two-tier hierarchy:
- Create broad PARENT spaces for major themes (e.g. "AI & Machine Learning", "Web Development", "Lifestyle")
- Group related spaces as CHILDREN under the appropriate parent
- Parent spaces contain broadly relevant entries; children contain specific entries
- Max 2 levels: parent → child. No grandchildren.
- Not every space needs a parent — standalone spaces are fine for unique topics
- The index space is always a root (no parent)
```

#### Merge rules

```
## Merge / dedup rules

- If two spaces cover the same theme with different names (e.g. "ML" and "Machine Learning"), merge into one
- Merging = move all entries from the smaller space to the larger, then delete the smaller
- Prefer the more descriptive name
- After merge, reassign any orphaned wiki pages
```

#### Stability rules

```
## Stability

- Re-running compilation should produce the SAME space structure unless entries changed
- Do NOT rename spaces that already have wiki pages unless the name is clearly wrong
- Do NOT reorganize hierarchy unless new entries create a clear need
- Prefer incremental changes (add child, add entries) over restructuring
```

### 4. Update `createOrUpdateSpace` tool

Add optional `parentSpaceId` parameter so the curator can set hierarchy at creation time (convenience — equivalent to `createOrUpdateSpace` + `setSpaceParent`).

### 5. Wiki service: return hierarchy in space queries

**File:** `apps/server/src/modules/wiki/services/wiki.service.ts`

Update `listSpacesForUser` (or equivalent) to join `space_relations` and return the parent/child tree for the mobile UI.

### 6. Reset + recompile + benchmark

1. Run `reset-wiki-data` (from T-015i) to clear all wiki data
2. Recompile with hierarchical curator
3. Compare output:
   - Number of spaces (expect fewer top-level, grouped into parents)
   - Entry coverage (all entries assigned, no orphans)
   - Topic fragmentation (fewer near-duplicate spaces)
   - Multi-assignment quality (cross-cutting entries in 2-3 spaces)

---

## File changes summary

### Server — modified files

| File | Change |
|------|--------|
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | Add `setSpaceParent` tool, update `listSpaces` to return hierarchy, add `parentSpaceId` to `createOrUpdateSpace` |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | Hierarchy rules, merge rules, stability rules in curator prompt |
| `apps/server/src/modules/ai/agents/curator-agent.ts` | Register `setSpaceParent` in curator tool set |
| `apps/server/src/modules/wiki/services/wiki.service.ts` | Return hierarchy in space queries |

---

## What this does NOT include

- **Grandchild spaces** (3+ depth) — not worth the complexity for personal wikis
- **User-created hierarchy** — this ticket is curator-managed only; user drag-and-drop is deferred
- **Mobile SpacesScreen redesign** — that's T-015l (depends on this ticket)
- **Auto-assign after ingest** — that's T-015j

---

## Edge cases

1. **Curator creates a cycle**: Validation in `setSpaceParent` prevents this. Query ancestors before inserting.

2. **Curator assigns a parent that's already a child**: The depth-2 check rejects this. Return an error message so the curator can adjust.

3. **Recompile produces different hierarchy**: Stability rules in the prompt minimize this. Acceptable drift: new children may appear, but existing parent-child relationships should persist.

4. **Orphaned children after parent deletion**: Cascade delete in `space_relations` removes the relationship row. Children become root-level spaces, not deleted.

5. **Index space as child**: Explicitly blocked. Index is always root-level.

---

## DoD

- [ ] `setSpaceParent` tool exists with cycle detection and depth-2 constraint
- [ ] `listSpaces` returns `parentSpaceId` and `childSpaceIds` per space
- [ ] `createOrUpdateSpace` accepts optional `parentSpaceId`
- [ ] Curator prompt includes hierarchy, merge, and stability rules
- [ ] Wiki service returns hierarchy for mobile consumption
- [ ] Full recompile produces organized hierarchy (manual verification)
- [ ] No orphan entries after recompile
- [ ] Near-duplicate spaces merged (fewer than flat baseline)
- [ ] No `any` types introduced
- [ ] `pnpm typecheck` passes

---

## Verification

1. **Reset + recompile** → verify spaces are organized into parent/child groups
2. **Check `space_relations`** → verify rows exist linking child spaces to parents
3. **`listSpaces` response** → verify hierarchy info is present
4. **Re-run compile** → verify hierarchy is stable (no unnecessary restructuring)
5. **Benchmark** → compare space count, entry coverage, and topic fragmentation vs flat baseline
6. **Typecheck**: `pnpm typecheck` passes
