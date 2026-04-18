# T-015n: User-Created Space Awareness

**Status:** done  
**Phase:** Schema + Server (spaces origin + curator/classifier awareness)  
**Type:** enhancement  
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)  
**Depends on:** T-015j (classifier in ingest), T-015k (curator hierarchy + merge/stability rules)

---

## Goal

Teach the pipeline to distinguish **user-created** spaces from **agent-created** spaces and soft-protect user spaces from being renamed, merged, or structurally overwritten by the curator. The classifier (T-015j) and curator (T-015k) both already *see* user spaces, but there's nothing preventing the curator from stomping on them.

---

## Problem

After T-015j, the user has three paths to end up with a space:

1. **Manual create** via SpacesScreen "New space" button → truly user-intent
2. **Approve suggestion** via SpaceSuggestionsInbox (with custom `spaceName`) → user-confirmed
3. **Curator compile** → agent-created

Today, all three paths produce identical rows in the `spaces` table. That means:

- `createOrUpdateSpace` (curator tool) upserts by `(userId, name)` — if the user has a carefully-described "React" space and the curator decides to create "React", the curator **silently overwrites** the user's `description`, `content`, `properties`, and `sortOrder`.
- Merge rules in the curator prompt ("merge near-duplicates") could tell the LLM to **delete** a user-created space.
- Stability rules ("don't rename spaces that have wiki pages") protect agent output but **not** user spaces that haven't been compiled yet.
- The classifier (T-015j) treats a freshly-created empty "Inbox" space the same as an established agent-filled one — entries might get auto-assigned to it aggressively.

The data model has no way to express "this space came from the user; the agent should be a guest, not a landlord."

---

## Context

### Current schema

`spaces` has no origin/creator field. Every INSERT looks identical:

```sql
INSERT INTO spaces (user_id, name, ...) VALUES (?, ?, ...)
```

Paths into the table today:

| Path | File | Creator |
|------|------|---------|
| SpacesScreen "New space" | `spaceService.create` (via `spaces.create` oRPC) | user |
| Approve suggestion (new space) | `suggestionService.approveSuggestion` | user (agent-suggested) |
| Approve suggestion (assign to existing) | `suggestionService.approveSuggestion` (T-015j) | does not insert |
| Curator compile | `createOrUpdateSpace` curator tool | agent |

### Current guards

- None. `createOrUpdateSpace` upserts any space matching `(userId, name)` — no origin check.
- Delete operations (deleteSpace, deletePageFromSpace curator tools) have no origin check.

### Reset script

`reset-wiki-data.ts` intentionally deletes **all** spaces. Per the user's decision, this behavior stays — operators who run reset are accepting a full wipe. (Follow-up could add `--preserve-user-spaces` if needed, but not this ticket.)

---

## Decisions

Confirmed with the user:

1. **Add `origin` column** to `spaces`: `'user' | 'agent'` (varchar with check constraint or pgEnum).
2. **Soft protection** — rule-based through the curator system prompt. No server-side tool guards. Trust the LLM; if it misbehaves, we iterate on the prompt.
3. **Reset script stays destructive** — full wipe. No new flag.
4. **Classifier still treats user spaces equally** — no origin-based weighting. A user-created empty space is a valid auto-assign target.

---

## Scope

### 1. Schema: add `origin` column to `spaces`

**File:** `packages/db/src/schema/enums.ts` (new enum or reuse approach)

Use **pgEnum** for origin — this is a closed, stable set (unlike contentType which evolves):

```typescript
export const spaceOriginEnum = pgEnum('space_origin', ['user', 'agent']);
```

**File:** `packages/db/src/schema/spaces.ts`

Add to the `spaces` table definition:

```typescript
origin: spaceOriginEnum('origin').notNull().default('user'),
```

**Rationale for default `'user'`:** The migration backfills all existing rows. We treat legacy spaces as user-created by default — the most conservative assumption (curator won't touch them). Operators who want to reset and start fresh will use `reset-wiki-data` anyway.

**Migration:** `drizzle-kit generate` → new migration creating the enum and adding the column with default `'user'`.

### 2. Write `origin` on every insert path

**File:** `apps/server/src/services/space.service.ts` (or wherever `spaceService.create` lives)

When a user calls `spaces.create`, set `origin: 'user'`.

**File:** `apps/server/src/modules/spaces/services/suggestion.service.ts`

In `approveSuggestion`, when it falls back to creating a new space (no `spaceId`, no `suggestedSpaceId`), set `origin: 'user'` — the user explicitly approved this.

**File:** `apps/server/src/modules/ai/agents/wiki-tools.ts`

In `createOrUpdateSpace` (curator tool):
- On INSERT (new space), set `origin: 'agent'`
- On UPDATE (existing space), **do not touch `origin`** — preserve whatever's there. An agent updating an already-existing user space shouldn't retroactively claim it.

### 3. Expose `origin` to the curator via `listSpaces`

**File:** `apps/server/src/modules/ai/agents/wiki-tools.ts`

Add `origin` to the `listSpaces` SELECT and return mapping. The curator prompt needs this field to reason about protection.

### 4. Curator prompt: respect user-created spaces

**File:** `apps/server/src/modules/ai/agents/wiki-prompts.ts`

Add a new section to `buildCuratorSystemPrompt`, placed right after the existing **Stability** block:

```
User-created spaces (origin="user"):
- Spaces with origin="user" were created or approved by the user directly. Treat them as read-only scaffolding.
- DO: assign entries to user spaces, read their content/properties, and set parent/child relationships involving them.
- DO NOT: rename, merge, delete, or overwrite the description/content/properties of a user space.
- If a user space and an agent space cover the same theme, prefer keeping the user space and moving agent-space entries into it, then deleting the agent space — never the other way around.
- When creating hierarchy, user spaces can be either parents or children; you do not need to convert them.
- Agent-created spaces (origin="agent") follow the normal merge / dedup / stability rules above.
```

Also update the **Merge / dedup rules** section to cross-reference:

```
- NEVER merge away a user-created space (origin="user"). See "User-created spaces" below.
```

### 5. Contract + mobile surface (minimal)

The mobile UI doesn't strictly need to render `origin` for this ticket — that's T-015l's job (SpacesScreen Redesign may add a "yours" badge). But the contract should expose the field so T-015l can consume it without a follow-up schema change.

**File:** `packages/shared/src/contracts/space.contract.ts`

Add `origin` to `spaceSchema`:

```typescript
export const spaceSchema = z.object({
  // ...existing...
  origin: z.enum(['user', 'agent']).optional(),
});
```

Optional on the schema for backward compatibility, but the server will always populate it after this ticket ships.

**File:** `apps/server/src/modules/spaces/services/space.service.ts`

`list` and `getById` SELECTs already return `spaces.*` via the Drizzle row spread. Verify `origin` flows through in the `toSpace()` helper — add it if needed.

### 6. Classifier input unchanged

**File:** `apps/server/src/modules/ai/tools/classify-entry.ts`

Per decision 4: no change. The classifier still treats all spaces equally. Documented here so the ticket is explicit about what's NOT changing.

---

## File changes summary

### Schema — modified files

| File | Change |
|------|--------|
| `packages/db/src/schema/enums.ts` | Add `spaceOriginEnum` pgEnum |
| `packages/db/src/schema/spaces.ts` | Add `origin` column with default `'user'` |

### Migration

| File | What |
|------|------|
| New drizzle migration | Create `space_origin` enum + add `origin` column with default |

### Server — modified files

| File | Change |
|------|--------|
| `apps/server/src/services/space.service.ts` | `create` writes `origin: 'user'` |
| `apps/server/src/modules/spaces/services/suggestion.service.ts` | `approveSuggestion` new-space branch writes `origin: 'user'` |
| `apps/server/src/modules/ai/agents/wiki-tools.ts` | `createOrUpdateSpace` sets `origin: 'agent'` on INSERT only, preserves on UPDATE; `listSpaces` returns `origin` |
| `apps/server/src/modules/ai/agents/wiki-orchestrator.ts` | `ensureIndexSpace` insert sets `origin: 'agent'` (system index space) |
| `apps/server/src/modules/ai/agents/wiki-prompts.ts` | Curator prompt: new "User-created spaces" section + cross-reference in merge rules |

### Contract — modified files

| File | Change |
|------|--------|
| `packages/shared/src/contracts/space.contract.ts` | Add `origin` to `spaceSchema` |

---

## Edge cases

1. **Legacy spaces (no origin before migration):** All existing rows get `origin = 'user'` via the column default. This is the safe default — the curator treats them as untouchable. If you ran the reset script before this ticket and re-compiled, those agent-created spaces exist in the DB with `origin = 'user'` after migration and the curator will preserve them. Acceptable — a future `reset-wiki-data` run will fix it, since reset wipes everything.

2. **Curator creates a space and later the user takes ownership:** There's no UI for this. A space keeps its `origin` forever (per decision: UPDATE doesn't change origin). If a user needs to "claim" an agent space, they'd have to do it manually via SQL or wait for a future feature. Not worth solving now.

3. **User renames or edits their space, then the curator sees it:** The curator sees `origin = 'user'` and won't touch it. Good.

4. **User approves a suggestion that assigns to an agent space (T-015j flow):** No new space is created — existing agent space stays agent. Correct.

5. **User approves a suggestion with a custom name that matches an existing agent space name:** `approveSuggestion` upserts into `spaces` by `(userId, name)` is **NOT** what happens — `approveSuggestion` calls `insert(spaces)` without `onConflictDoUpdate`, so this will fail with the unique index. This is pre-existing behavior (the suggestion flow does not handle name collisions). Out of scope for this ticket — the suggestion inbox already lets the user pick an existing space via `spaceId` (T-015j).

6. **LLM decides to rename a user space anyway:** Soft protection only. If it happens, we iterate on the prompt or add a server guard in a follow-up. Log such events as a signal.

---

## What this does NOT include

- **Hard server-side guards** (blocking `createOrUpdateSpace` from renaming user spaces) — decision was soft-only
- **Reset script preserving user spaces** — stays as full wipe
- **Classifier weighting user spaces differently** — equal treatment
- **Mobile "yours" badge on SpaceListRow** — T-015l will do this
- **Telemetry for curator prompt violations** — follow-up if misbehavior appears
- **UI to change a space's origin** — not needed

---

## DoD

- [x] `space_origin` pgEnum exists with values `'user'` and `'agent'`
- [x] `spaces.origin` column added with `NOT NULL DEFAULT 'user'`
- [x] Migration generated and runs cleanly on a populated database
- [x] `spaceService.create` writes `origin: 'user'`
- [x] `suggestionService.approveSuggestion` new-space branch writes `origin: 'user'`
- [x] `createOrUpdateSpace` curator tool sets `origin: 'agent'` on INSERT
- [x] `createOrUpdateSpace` curator tool **does not** modify `origin` on UPDATE (verified by reading the `updateSet` object)
- [x] `listSpaces` curator tool returns `origin` per space
- [x] Curator system prompt contains the "User-created spaces" section
- [x] Merge rules reference the user-space exception
- [x] `spaceSchema` (shared contract) includes `origin`
- [x] Space service `list` / `getById` return `origin` in the response
- [x] No `any` types introduced
- [x] `pnpm -w run typecheck` passes

---

## Verification

1. **Fresh user-created space:** Create a space via SpacesScreen "New space" → SELECT directly from DB, verify `origin = 'user'`.
2. **Approved suggestion (new space):** Approve a suggestion with a custom name → verify `origin = 'user'`.
3. **Curator compile:** Run a wiki compile → verify spaces created via `createOrUpdateSpace` have `origin = 'agent'`.
4. **Curator upsert of user space:** Manually create a space called "React" with `origin = 'user'` and a detailed description. Run curator compile with entries that would cause it to upsert "React" → verify `origin` stays `'user'` and the user's `description` is preserved. (Soft protection: the prompt should prevent this, but the code guards against origin overwrite regardless.)
5. **`listSpaces` output:** Call the curator tool directly (smoke test) → verify `origin` is in the returned shape.
6. **Contract:** Mobile `useSpaces()` hook should now include `origin` in the returned row type — verify by inspecting the inferred type.
7. **Typecheck:** `pnpm -w run typecheck` passes.

---

## Ticket sequence (context)

```
T-015i  Metadata Foundation ✓
T-015j  Auto-Assign + Review Queue ✓
T-015k  Space Hierarchy + Curator Overhaul ✓

T-015n  User-Created Space Awareness (this ticket)
  → origin column, curator prompt protection, contract surface

T-015l  SpacesScreen Redesign
  → will consume `origin` for a "yours" badge and sort order
  → grouped by parent, quality signals

T-015m  Delete Operations
  → user-visible delete confirmations; may need to block agent delete of user spaces (but that's a curator prompt concern, not a UI one)
```

---

## Follow-up ideas (out of scope)

- **Hard server-side guard** on `createOrUpdateSpace` if LLM prompt proves unreliable
- **`reset-wiki-data --preserve-user-spaces`** flag once user spaces are common
- **Telemetry:** detect and log when a curator tool call *would have* mutated a user space (dry-run metric)
- **Migration UI:** let a user "adopt" an agent-created space (flip its `origin`)
