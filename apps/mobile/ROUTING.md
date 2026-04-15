# T-015i: Wiki Organization Improvements

## Context

The wiki agent (T-015a–g) works end-to-end but the **organization layer is weak**:

- 14 spaces from 59 entries — too many, unstructured, flat list
- No auto-assignment after ingest — entries sit unassigned until manual compile
- SpacesScreen is a flat list with no visual hierarchy
- No quality signals — user can't tell if the AI did well
- space_suggestions from ingest are disconnected from the curator

This ticket improves organization without adding schema tiers or complex hierarchy. T-015h (delete operations) remains a separate ticket.

**Decisions made:**

- Auto-assign: Single LLM call per entry after ingest (~$0.0001, more accurate)
- Space count: Curator decides freely, but merge overlapping spaces (>40% shared entries)
- Background compile: Deferred to future ticket
- Ticket structure: New T-015i (this), T-015h stays for deletes

---

## Scope

### 1. Curator prompt improvements (`wiki-prompts.ts`)

**Changes to curator system prompt:**

- **Merge rule**: "After organizing, review your spaces. If two spaces share more than 40% of their entries, merge them into one broader space. Prefer fewer, broader spaces over many narrow ones."
- **Naming**: "Use 2-3 word descriptive names. Bad: 'AI'. Good: 'AI Research'. Bad: 'Street Food Festivals'. Good: 'Food & Dining'. Bad: 'Cultural Art History'. Good: 'Art & Culture'."
- **Stability (incremental)**: "On incremental compile, strongly prefer existing spaces. Only create a new space if 5+ unassigned entries share a clear theme not covered by any existing space. Never rename existing spaces unless merging."
- **Minimum entries**: Keep at 2 (current), but add: "If a space would have only 1 entry, assign that entry to the most relevant existing space instead."
- **Remove the hard 'lightweight content → utility spaces' rule** — let the curator decide organically, but mention: "Group entries by theme, not by content depth. A recipe bookmark and a detailed cooking article belong in the same food space."

These are prompt-only changes. No schema or tool modifications needed.

**File:** `apps/server/src/modules/ai/agents/wiki-prompts.ts`

### 2. Auto-assign after ingest (`ingest.ts` + new utility)

After the ingest pipeline enriches an entry (topics, summary, embedding extracted), make a single LLM call to assign it to existing spaces.

#### New function: `autoAssignEntry`

**File:** `apps/server/src/modules/ai/tools/auto-assign-entry.ts`

```typescript
async function autoAssignEntry(
  db: Db,
  userId: string,
  entry: { id: string; title: string; summary: string; topics: string[] },
): Promise<{ assignedSpaceIds: string[]; assignedSpaceNames: string[] }>;
```

**Logic:**

1. Load existing spaces for user: `SELECT id, name, description FROM spaces WHERE userId = ? AND isIndex = false`
2. If no spaces exist → return empty (nothing to assign to, compile will handle it)
3. Call gpt-4o-mini with structured output:
   - System: "You assign entries to existing knowledge spaces. Pick 1-3 spaces that best match the entry's topics. If no space fits well, return an empty array."
   - User: entry title + summary + topics + list of space names with descriptions
   - Output schema: `z.object({ spaceIds: z.array(z.string().uuid()) })`
4. Insert `entrySpaces` records for matched spaces (ON CONFLICT DO NOTHING)
5. Delete the `spaceSuggestion` for this entry (auto-handled)
6. Return assigned space names for logging

**Cost:** ~500 tokens per entry × $0.15/M = ~$0.0001 per entry. Negligible.

**Error handling:** If LLM call fails, log warning and continue — entry stays unassigned, curator picks it up on next compile. Never block ingest for auto-assign failure.

#### Integration in ingest pipeline

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

After the enrichment transaction commits (topics, tags, embedding all saved), call:

```typescript
// After transaction commit, line ~250
try {
  const topics = extractedTopics.map((t) => t.name);
  await autoAssignEntry(db, userId, {
    id: entryId,
    title: analysis.title ?? entry.title ?? "",
    summary: analysis.summary ?? "",
    topics,
  });
} catch (error) {
  logger.warn("Auto-assign failed, entry will be assigned on next compile", {
    entryId,
    error,
  });
}
```

This runs **outside** the main transaction so failures don't roll back the enrichment.

### 3. SpacesScreen UI improvements

#### A. Pinned spaces section

**Schema change:** Add `isPinned boolean default false` to `spaces` table.

**File:** `packages/db/src/schema/spaces.ts` — add column
**File:** New migration via `drizzle-kit generate`

**SpacesScreen layout:**

```
CompileStatusCard
─────────────────────
[Pinned]  (section, only if any pinned spaces)
  AI Research        12 entries · 3 pages
  Web Development     8 entries · 2 pages
─────────────────────
[All Wiki Pages]  (card, top 5 by updatedAt)
  Recent page 1       synthesis · 2h ago
  Recent page 2       timeline · 1d ago
  ...
  "View all →"
─────────────────────
[Spaces]  (section)
  Food & Dining        6 entries · 2 pages
  Notes & Ideas        4 entries · 1 page
  ...
─────────────────────
[hint + New space button]
```

**Pin/unpin UX:** Long-press on space card → context menu with "Pin to top" / "Unpin". Or: small pin icon in SpaceDetailScreen header.

**File:** `features/space/screens/SpacesScreen/index.tsx` — split list into sections
**File:** `features/space/hooks/useSpaces.ts` — add `isPinned` to space type, add `useToggleSpacePin` mutation

#### B. Sorted spaces

Sort non-pinned spaces by entry count descending (most populated first). The existing `sortOrder` column can be used, or sort client-side.

#### C. All Wiki Pages preview card

From T-015h scope — move it here since it's a UI improvement:

- Shows top 5 most recently updated wiki pages
- Each row: title + PageTypeBadge + relative time
- "View all" navigates to `wiki/all` screen
- Uses `useWikiPages()` (no spaceId → all pages), sorted client-side by `updatedAt` desc

**New files:**

- `features/wiki/screens/AllWikiPagesScreen/index.tsx` — full list
- `app/wiki/all.tsx` — route

**Modified:**

- `features/space/screens/SpacesScreen/index.tsx` — add preview card
- `app/_layout.tsx` — register `wiki/all` route

### 4. Space pin contract + server

**Contract addition** (`packages/shared/src/contracts/space.contract.ts`):

```typescript
togglePin: oc.input(z.object({ id: z.uuid(), isPinned: z.boolean() })).output(
  spaceSchema,
);
```

**Router** (`apps/server/src/router/space.router.ts`):
Wire `togglePin` → update `spaces` set `isPinned` where id + userId.

### 5. Quality signals (lightweight)

#### A. Freshness on page cards

In SpaceDetailScreen page cards and AllWikiPagesScreen, show relative time with color:

- Updated today → green text
- Updated this week → default text
- Updated > 1 week ago → muted text

No backend change — `updatedAt` already exists on wiki pages.

#### B. Entry coverage on SpaceDetailScreen

Show: "8 of 12 entries synthesized" — compare `space.entryCount` vs count of unique sourceEntryIds across the space's pages.

Client-side calculation from existing data (useWikiPages returns sourceEntryIds).

#### C. Health score on CompileStatusCard

After lint runs, cache the issue count. Show: "Wiki health: Good" / "3 issues" as a small badge.

Store last lint issue count in `useCompilationStatus` query data or MMKV.

---

## File Changes Summary

### Server — new files

| File                                                    | What                                |
| ------------------------------------------------------- | ----------------------------------- |
| `apps/server/src/modules/ai/tools/auto-assign-entry.ts` | LLM-based entry-to-space assignment |

### Server — modified files

| File                                                | Change                                                      |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | Curator prompt: merge rules, naming, stability, min entries |
| `apps/server/src/modules/ai/pipelines/ingest.ts`    | Call autoAssignEntry after enrichment                       |
| `packages/db/src/schema/spaces.ts`                  | Add `isPinned` column                                       |
| `packages/shared/src/contracts/space.contract.ts`   | Add `togglePin` endpoint                                    |
| `apps/server/src/router/space.router.ts`            | Wire `togglePin` handler                                    |

### Mobile — new files

| File                                                       | What                                       |
| ---------------------------------------------------------- | ------------------------------------------ |
| `features/wiki/screens/AllWikiPagesScreen/index.tsx`       | Full list of all wiki pages sorted by date |
| `features/wiki/screens/AllWikiPagesScreen/index.styles.ts` | Styles                                     |
| `app/wiki/all.tsx`                                         | Route                                      |

### Mobile — modified files

| File                                                   | Change                                             |
| ------------------------------------------------------ | -------------------------------------------------- |
| `features/space/screens/SpacesScreen/index.tsx`        | Pinned section, sorted spaces, All Wiki Pages card |
| `features/space/screens/SpaceDetailScreen/index.tsx`   | Entry coverage indicator, pin button               |
| `features/space/hooks/useSpaces.ts`                    | Add `useToggleSpacePin` mutation                   |
| `features/wiki/components/CompileStatusCard/index.tsx` | Health score badge                                 |
| `app/_layout.tsx`                                      | Register `wiki/all` route                          |

### Migration

| File                  | What                                           |
| --------------------- | ---------------------------------------------- |
| New drizzle migration | Add `isPinned` boolean default false to spaces |

---

## Edge Cases

1. **Auto-assign with 0 spaces**: Skip LLM call entirely. Entry stays unassigned.
2. **Auto-assign LLM returns invalid spaceId**: Validate UUIDs against loaded spaces. Ignore invalid ones.
3. **Auto-assign during compile**: If compile is running, auto-assign still works — it only INSERTs entrySpaces (idempotent). No conflict.
4. **Pinning the index space**: Disallow — index space is system-managed, hidden from list.
5. **Merge rule in curator**: Curator should list all spaces with entry overlap before deciding merges. This is prompt guidance, not enforced server-side.

---

## DoD

- [ ] Curator prompt updated with merge rules, naming guidelines, stability rules
- [ ] `autoAssignEntry` function created with structured LLM output
- [ ] Ingest pipeline calls autoAssignEntry after enrichment (non-blocking)
- [ ] `isPinned` column added to spaces with migration
- [ ] `togglePin` contract + server endpoint
- [ ] SpacesScreen shows pinned section, sorted spaces, All Wiki Pages card
- [ ] AllWikiPagesScreen at `wiki/all` with full sorted list, pull-to-refresh
- [ ] SpaceDetailScreen shows entry coverage ("X of Y entries synthesized")
- [ ] CompileStatusCard shows health score from last lint
- [ ] Page cards show freshness-colored relative time
- [ ] Auto-assign errors don't block ingest pipeline
- [ ] No `any` types, `tv()` variants where applicable
- [ ] `pnpm typecheck` passes (server + mobile)
- [ ] Full compile produces fewer, broader spaces than before (manual verification)

---

## Verification

1. **Curator improvements**: Run full compile on existing 59 entries → verify spaces are broader and better named than the 14 from benchmark
2. **Auto-assign**: Create a new entry via API → verify it appears in a space without manual compile
3. **Auto-assign failure**: Mock LLM failure → verify entry still ingests successfully
4. **SpacesScreen**: Open app → see pinned section (if any), sorted spaces, All Wiki Pages card
5. **Pin/unpin**: Long-press space → pin → verify it moves to pinned section
6. **AllWikiPagesScreen**: Tap "View all" → see all pages sorted by date, pull to refresh
7. **Quality signals**: Check page cards for freshness color, SpaceDetailScreen for coverage, CompileStatusCard for health
8. **Typecheck**: `pnpm typecheck` passes
