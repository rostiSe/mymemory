# T-015j: Auto-Assign + Review Queue

**Status:** done  
**Phase:** Server + Mobile (ingest pipeline + suggestion inbox + settings)  
**Type:** feature  
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)  
**Depends on:** T-015i (metadata foundation — topics, contentType, depth, authors all populated)

---

## Goal

After ingest, automatically assign entries to existing spaces when the LLM is confident about the match. Low-confidence entries go to an improved suggestion inbox. Users can configure the confidence threshold. Never auto-create new spaces — only assign to **existing** ones.

---

## Problem

Today, every ingested entry creates a single `space_suggestions` row with `suggestedName = firstTopic || "New Space"`. The user must manually approve (which always creates a **new** space) or reject each one. This has several issues:

1. **Always creates new spaces** — `approveSuggestion` does `insert(spaces)`, never assigns to an existing space
2. **Suggestion quality is poor** — just the first extracted topic name, no intelligence
3. **No auto-assignment** — even obvious matches (entry about "React hooks" → existing "React" space) require manual action
4. **Single-space suggestions** — never suggests multiple spaces for cross-cutting entries
5. **No confidence signal** — user can't gauge how good the suggestion is

---

## Context

### Current ingest → suggestion flow

```
processEntry()
  → analyzeContent + generateEmbedding
  → transaction:
      save entry fields, tags, topics, embedding
      → INSERT space_suggestions (suggestedName = firstTopic)
      → INSERT entry_relations
```

### After T-015i

- Entries carry richer metadata: `contentType`, `depth`, `authors`, normalized topics
- Multi-space assignment guidance exists in curator prompt
- Existing spaces have names, descriptions, and (after curator runs) a hierarchy

### Key constraint

Auto-assign to **existing** spaces only. If no space matches, the entry queues for review. New spaces are only created during wiki compile (curator) or by the user manually.

---

## Scope

### 1. New LLM classification function: `classifyEntryToSpaces`

**File:** `apps/server/src/modules/ai/tools/classify-entry.ts` (new)

```typescript
import { z } from 'zod';

const classifyEntrySchema = z.object({
  assignments: z.array(z.object({
    spaceId: z.uuid(),
    spaceName: z.string(),
    confidence: z.number().min(0).max(1),
    reason: z.string(),
  })).max(3),
});

type ClassifyEntryResult = z.infer<typeof classifyEntrySchema>;

export async function classifyEntryToSpaces(opts: {
  entry: {
    title: string | null;
    summary: string | null;
    topics: string[];
    tags: string[];
    contentType: string | null;
    depth: string | null;
  };
  existingSpaces: Array<{
    id: string;
    name: string;
    description: string | null;
    entryCount: number;
  }>;
}): Promise<ClassifyEntryResult>
```

**Prompt strategy:**
- System: "You are a librarian. Given an entry's metadata and a list of existing spaces, determine which space(s) the entry belongs to."
- Include the entry's title, summary, topics, tags, contentType, depth
- Include the list of existing spaces with names, descriptions, and entry counts
- Ask for 0-3 assignments with confidence scores (0-1) and reasons
- 0 assignments = "doesn't fit any existing space"

**Model:** `gpt-4o-mini` — same as `analyzeContent`. Cost: ~$0.001 per entry (small input/output).

**File:** `apps/server/src/modules/ai/prompts.ts`

Add `classifyEntrySystemPrompt()` and `classifyEntryUserPrompt(...)`:

```
You are a librarian organizing a personal knowledge base. Given an entry's metadata
and a list of existing spaces (categories), determine which space(s) the entry
belongs to.

Rules:
- Return 0-3 space assignments
- Only assign when genuinely relevant — don't force-fit
- Cross-cutting entries (e.g. "AI Coding Assistants") can belong to 2-3 spaces
- Confidence 0.0-1.0: how certain you are the entry belongs in that space
  - 0.9-1.0: obvious, direct match (React tutorial → "React" space)
  - 0.7-0.9: strong match, related topic
  - 0.5-0.7: loose match, tangentially related
  - Below 0.5: don't assign
- If no space fits, return empty assignments array
- Prefer specific spaces over broad parent spaces when both exist
```

### 2. Integrate classification into ingest pipeline

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

After the `analyzeContent + generateEmbedding` parallel block, before the transaction:

```typescript
// Fetch existing spaces for the user
const existingSpaces = await db
  .select({
    id: spaces.id,
    name: spaces.name,
    description: spaces.description,
  })
  .from(spaces)
  .where(eq(spaces.userId, userId));

// Count entries per space
const spaceCounts = await db
  .select({
    spaceId: entrySpaces.spaceId,
    count: sql<number>`count(*)::int`,
  })
  .from(entrySpaces)
  .groupBy(entrySpaces.spaceId);

let autoAssignments: Array<{ spaceId: string; confidence: number }> = [];

if (existingSpaces.length > 0) {
  const classification = await classifyEntryToSpaces({
    entry: {
      title: resolvedTitle ?? entry.title,
      summary,
      topics: extractedTopics.map(t => t.name),
      tags: generatedTags,
      contentType,
      depth,
    },
    existingSpaces: existingSpaces.map(s => ({
      ...s,
      description: s.description ?? null,
      entryCount: spaceCounts.find(c => c.spaceId === s.id)?.count ?? 0,
    })),
  });

  const threshold = AUTO_ASSIGN_CONFIDENCE_THRESHOLD; // default 0.7
  autoAssignments = classification.assignments.filter(a => a.confidence >= threshold);
}
```

Inside the transaction:

```typescript
if (autoAssignments.length > 0) {
  // Auto-assign to spaces (high confidence)
  for (const assignment of autoAssignments) {
    await tx
      .insert(entrySpaces)
      .values({ entryId, spaceId: assignment.spaceId })
      .onConflictDoNothing();
  }
} else {
  // No confident match — create improved suggestion
  // Pick the best LLM suggestion (if any), or fall back to first topic
  const bestSuggestion = classification?.assignments[0];
  await tx.insert(spaceSuggestions).values({
    userId,
    entryId,
    suggestedName: bestSuggestion?.spaceName
      ?? extractedTopics[0]?.name
      ?? 'New Space',
    suggestedSpaceId: bestSuggestion?.spaceId ?? null,
    confidence: bestSuggestion?.confidence ?? null,
    reason: bestSuggestion?.reason
      ?? 'Suggested from extracted topics; approve in Spaces to create or assign.',
  });
}
```

**Key behavior change:** Auto-assigned entries produce **no** `space_suggestions` row. They silently appear in the space's entry list. Low-confidence entries still go to the suggestions inbox.

### 3. Schema changes: enhance `space_suggestions`

**File:** `packages/db/src/schema/space-suggestions.ts`

```typescript
export const spaceSuggestions = pgTable('space_suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  entryId: uuid('entry_id').references(() => entries.id, { onDelete: 'cascade' }).notNull(),
  suggestedName: varchar('suggested_name', { length: 255 }).notNull(),
  suggestedSpaceId: uuid('suggested_space_id').references(() => spaces.id, { onDelete: 'set null' }),  // NEW
  confidence: real('confidence'),  // NEW — 0.0 to 1.0
  reason: text('reason'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Migration:** Add two nullable columns `suggested_space_id` (uuid FK) and `confidence` (real).

### 4. Update `approveSuggestion` to support existing spaces

**File:** `apps/server/src/modules/spaces/services/suggestion.service.ts`

Current `approveSuggestion` always creates a new space. Update to:

```typescript
async approveSuggestion(
  database: typeof db,
  userId: string,
  input: { suggestionId: string; spaceName?: string; spaceId?: string },
): Promise<Space> {
  return database.transaction(async (tx) => {
    // ... load suggestion (same as today) ...

    let space: typeof spaces.$inferSelect;

    if (input.spaceId) {
      // Assign to existing space
      const [existing] = await tx
        .select()
        .from(spaces)
        .where(and(eq(spaces.id, input.spaceId), eq(spaces.userId, userId)))
        .limit(1);
      if (!existing) throw new ORPCError('NOT_FOUND', { message: 'Space not found' });
      space = existing;
    } else if (suggestion.suggestedSpaceId) {
      // Use the LLM-suggested existing space (unless user overrides with spaceName)
      if (input.spaceName) {
        // User wants a new space with a custom name
        [space] = await tx.insert(spaces).values({ userId, name: input.spaceName.trim() || 'New Space' }).returning();
      } else {
        const [existing] = await tx
          .select()
          .from(spaces)
          .where(and(eq(spaces.id, suggestion.suggestedSpaceId), eq(spaces.userId, userId)))
          .limit(1);
        if (existing) {
          space = existing;
        } else {
          // Suggested space was deleted; create new
          [space] = await tx.insert(spaces).values({ userId, name: suggestion.suggestedName }).returning();
        }
      }
    } else {
      // No suggested space — create new (current behavior)
      const rawName = (input.spaceName?.trim() || suggestion.suggestedName).trim() || 'New Space';
      [space] = await tx.insert(spaces).values({ userId, name: rawName }).returning();
    }

    await tx.insert(entrySpaces).values({ entryId: suggestion.entryId, spaceId: space.id }).onConflictDoNothing();
    await tx.delete(spaceSuggestions).where(eq(spaceSuggestions.id, suggestion.id));

    return toSpace(space);
  });
}
```

### 5. Update contract + router

**File:** `packages/shared/src/contracts/space.contract.ts`

Update `spaceSuggestionSchema`:

```typescript
export const spaceSuggestionSchema = z.object({
  id: z.uuid(),
  entryId: z.uuid(),
  entryTitle: z.string(),
  suggestedName: z.string(),
  suggestedSpaceId: z.uuid().nullable().optional(),  // NEW
  confidence: z.number().nullable().optional(),       // NEW
  reason: z.string().nullable().optional(),
  createdAt: dateSchema,
});
```

Update `approveSuggestion` input:

```typescript
approveSuggestion: oc
  .input(
    z.object({
      suggestionId: z.uuid(),
      spaceName: z.string().optional(),
      spaceId: z.uuid().optional(),  // NEW — assign to existing space
    }),
  )
  .output(spaceSchema),
```

### 6. Update `listSuggestions` to return new fields

**File:** `apps/server/src/modules/spaces/services/suggestion.service.ts`

Add `suggestedSpaceId` and `confidence` to the SELECT and return mapping.

### 7. Mobile: Update SpaceSuggestionsInbox

**File:** `apps/mobile/src/features/space/components/SpaceSuggestionsInbox/index.tsx`

Changes:

- **Confidence indicator**: Show a colored chip (green/yellow/red) based on confidence score
- **Suggested space name**: When `suggestedSpaceId` is set, show "→ Space Name" instead of generic "Space: New Space"
- **Approve action**: When `suggestedSpaceId` exists, the "Add" button assigns to that space (pass `spaceId` in mutation). Show the space name on the button.
- **Override**: Add a small "Change space" option so the user can pick a different existing space or type a new name

**File:** `apps/mobile/src/features/space/hooks/useSpaces.ts`

Update the `approveSuggestion` mutation to pass the new `spaceId` field.

### 8. Confidence threshold configuration

**Approach:** Server-side constant with mobile override capability.

**File:** `apps/server/src/modules/ai/tools/classify-entry.ts`

```typescript
export const AUTO_ASSIGN_CONFIDENCE_THRESHOLD = 0.7;
```

**File:** `apps/server/src/modules/ai/pipelines/ingest.ts`

Import and use the threshold. For now, hardcoded. The threshold is documented and easy to find.

**Future (out of scope for this ticket):** Add a user preferences table/column and a settings screen on mobile to let users adjust the threshold (0.5-0.9 slider). Note this in the ticket as a follow-up.

---

## File changes summary

### Server — new files

| File | What |
|------|------|
| `apps/server/src/modules/ai/tools/classify-entry.ts` | `classifyEntryToSpaces()` LLM classification + threshold constant |

### Server — modified files

| File | Change |
|------|--------|
| `apps/server/src/modules/ai/prompts.ts` | Add `classifyEntrySystemPrompt()` + `classifyEntryUserPrompt()` |
| `apps/server/src/modules/ai/pipelines/ingest.ts` | Query existing spaces, call `classifyEntryToSpaces`, auto-assign or create improved suggestion |
| `apps/server/src/modules/spaces/services/suggestion.service.ts` | `approveSuggestion` supports `spaceId` (assign to existing); `listSuggestions` returns new fields |

### Schema — modified files

| File | Change |
|------|--------|
| `packages/db/src/schema/space-suggestions.ts` | Add `suggestedSpaceId` (uuid FK nullable) and `confidence` (real nullable) columns |

### Migration

| File | What |
|------|------|
| New drizzle migration | Add `suggested_space_id` and `confidence` columns to `space_suggestions` table |

### Contract — modified files

| File | Change |
|------|--------|
| `packages/shared/src/contracts/space.contract.ts` | `spaceSuggestionSchema` gains `suggestedSpaceId`, `confidence`; `approveSuggestion` input gains `spaceId` |

### Mobile — modified files

| File | Change |
|------|--------|
| `apps/mobile/src/features/space/components/SpaceSuggestionsInbox/index.tsx` | Confidence chip, suggested space display, approve-to-existing-space flow |
| `apps/mobile/src/features/space/hooks/useSpaces.ts` | Updated approve mutation to pass `spaceId` |

---

## Architecture: auto-assign flow

```
processEntry()
  → analyzeContent + generateEmbedding (parallel, unchanged)
  → query existing spaces + entry counts
  → classifyEntryToSpaces(entry metadata, spaces list)    ← NEW LLM call
  → transaction:
      save entry fields, tags, topics, embedding           (unchanged)
      ┌─ IF assignments with confidence >= threshold:
      │    INSERT entry_spaces (auto-assign, no suggestion)
      └─ ELSE:
           INSERT space_suggestions with suggestedSpaceId + confidence
      INSERT entry_relations                               (unchanged)
```

---

## Edge cases

1. **No existing spaces (fresh user):** `classifyEntryToSpaces` is skipped entirely. Falls back to current behavior: suggestion with first topic name. User must approve to create their first space, or wiki compile creates them.

2. **LLM returns a spaceId not in the provided list:** Won't happen — structured output constrains to the provided space IDs. But defensively, validate before INSERT.

3. **Suggested space deleted between classification and approval:** `approveSuggestion` checks if `suggestedSpaceId` still exists. If deleted, falls back to creating a new space with the suggested name.

4. **Duplicate entry_spaces on re-ingest:** `onConflictDoNothing` on `entry_spaces` insert handles this. No error.

5. **Duplicate space_suggestions on re-ingest:** Currently no uniqueness constraint on `(entryId)` in `space_suggestions`. This ticket does NOT add one (re-ingest is rare). If it becomes a problem, add `UNIQUE(entry_id)` in a follow-up.

6. **User changes threshold after entries are auto-assigned:** No retroactive effect. Only new entries use the current threshold. Previously auto-assigned entries stay assigned.

7. **classifyEntryToSpaces LLM call fails:** Catch error, log warning, fall back to current suggestion behavior (first topic name). Don't block ingest.

8. **Entry has no topics, no summary, minimal metadata:** Classification will likely return 0 assignments. Entry goes to suggestion inbox with "New Space" as suggested name. Same as today.

---

## What this does NOT include

- **Auto-creating new spaces** — only assigns to existing spaces; new spaces come from curator compile or user action
- **Batch auto-assign for existing entries** — only new entries going through ingest; existing entries keep their current assignment status
- **User preferences table/screen** — threshold is a server-side constant for now (follow-up to add settings UI)
- **"Recently auto-assigned" notification** — user discovers auto-assigned entries by viewing space contents (T-015l SpacesScreen redesign may surface this)
- **Re-classification when spaces change** — if a space is renamed/merged/deleted, existing assignments are not re-evaluated
- **Mobile space picker UI for manual assignment** — user can already use `assignEntry` / `unassignEntry`; this ticket adds space picker only in the suggestion approval flow

---

## DoD

- [ ] `classifyEntryToSpaces` function exists with structured output schema
- [ ] Classification prompt correctly instructs LLM on confidence scoring
- [ ] `ingest.ts` calls classification when user has existing spaces
- [ ] High-confidence entries (>= threshold) auto-assigned via `entry_spaces` — no `space_suggestions` row
- [ ] Low-confidence entries create improved `space_suggestions` with `suggestedSpaceId` + `confidence`
- [ ] No entries go to suggestions when classification returns confident assignments
- [ ] `space_suggestions` schema has `suggested_space_id` (FK nullable) and `confidence` (real nullable) columns
- [ ] Migration generated and runs cleanly
- [ ] `approveSuggestion` supports `spaceId` input — assigns to existing space instead of creating new
- [ ] `approveSuggestion` falls back to creating new space when `spaceId` is not provided
- [ ] `listSuggestions` returns `suggestedSpaceId` and `confidence`
- [ ] Contract `spaceSuggestionSchema` includes new fields
- [ ] Contract `approveSuggestion` input includes optional `spaceId`
- [ ] Mobile `SpaceSuggestionsInbox` shows confidence indicator
- [ ] Mobile approve flow sends `spaceId` when `suggestedSpaceId` is available
- [ ] LLM classification failure falls back to current suggestion behavior (no crash)
- [ ] Classification skipped when user has 0 existing spaces
- [ ] `AUTO_ASSIGN_CONFIDENCE_THRESHOLD` constant is defined and documented
- [ ] No `any` types introduced
- [ ] `pnpm typecheck` passes (server + shared + mobile)

---

## Verification

1. **Ingest with existing spaces:** Create a few spaces manually, ingest an entry that clearly matches one → verify `entry_spaces` row exists, no `space_suggestions` row
2. **Ingest with no matching space:** Ingest an entry on a topic with no existing space → verify `space_suggestions` row exists with `confidence` and `suggestedSpaceId`
3. **Ingest with no spaces at all:** Ingest as a fresh user with 0 spaces → verify old-style suggestion (first topic name) created
4. **Approve suggestion to existing space:** In the inbox, approve a suggestion that has `suggestedSpaceId` → verify entry assigned to that space (not new space created)
5. **Approve suggestion with custom name:** Override the suggested space → verify new space created with custom name
6. **LLM failure:** Temporarily break the classification call → verify ingest completes with fallback suggestion
7. **Typecheck:** `pnpm typecheck` passes

---

## Ticket sequence (context)

```
T-015i  Metadata Foundation ✓
  → Topic normalization, contentType, depth, authors, reset script

T-015j  Auto-Assign + Review Queue (this ticket)
  → LLM classification after ingest, confidence-based auto-assign, improved suggestions

T-015k  Space Hierarchy + Curator Overhaul ✓
  → setSpaceParent tool, hierarchy prompt, merge/stability rules

T-015l  SpacesScreen Redesign
  → Grouped by parent, quality signals, auto-assigned entry indicators

T-015m  Delete Operations
  → Delete space/page/section, danger confirmation sheets
```

---

## Follow-up ideas (out of scope)

- **User preferences table** + mobile settings screen for confidence threshold slider
- **"Recently auto-assigned" badge/count** on SpacesScreen (T-015l territory)
- **Batch re-classify** existing entries when user requests it
- **Embedding-based fallback** — use cosine similarity as a fast pre-filter before LLM call to reduce cost
- **Auto-assign to hierarchy-aware spaces** — when parent+child both match, prefer child (more specific)
