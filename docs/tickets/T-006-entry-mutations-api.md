# T-006: Entry Mutations API + Mobile Hooks

**Status:** done
**Phase:** 3 — Frontend Interactions
**Type:** feature (full stack)
**Risk:** low (CRUD mutations on existing columns, no schema changes)
**Depends on:** T-003 (interaction columns exist on entries table)

---

## Goal

The `entries` table has interaction columns (`isFavorited`, `isArchived`, `isPinned`, `readCount`, `lastReadAt`, `reviewStatus`) but no API endpoints or mobile hooks to mutate them. Add the server endpoints and mobile hooks so the detail screen can wire up interaction buttons in T-007.

---

## Current State

**Contract** (`entry.contract.ts`): 3 routes — `list`, `getById`, `create`. No mutations for existing entries.

**Service** (`entry.service.ts`): 3 methods — `listPaginated`, `getById`, `create`. Uses `toEntry()` helper to normalize DB rows. Auth via `context.user!.id` in WHERE clauses.

**Router** (`entry.router.ts`): Wires contract → service with `authed` middleware. Pattern: `.input(schema).handler(async ({ input, context }) => ...)`.

**Mobile hooks** (`useEntries.ts`): `useFeedEntries`, `useCreateEntry`, `useEntryById`. Cache managed via `writeEntryRowToCaches` / `removeEntryRowFromCaches` in `entry-query-cache.ts`.

---

## What to Do

### 1. Contract — add 4 routes to `entryContract`

**File:** `packages/shared/src/contracts/entry.contract.ts`

```ts
toggleField: oc
  .input(z.object({
    id: z.guid(),
    field: z.enum(['isFavorited', 'isPinned', 'isArchived']),
    value: z.boolean(),
  }))
  .output(entrySchema),

setReviewStatus: oc
  .input(z.object({
    id: z.guid(),
    status: z.enum(['unreviewed', 'kept', 'dismissed', 'remind']),
  }))
  .output(entrySchema),

trackRead: oc
  .input(z.object({ id: z.guid() }))
  .output(entrySchema),

retryIngest: oc
  .input(z.object({ id: z.guid() }))
  .output(entrySchema),

delete: oc
  .input(z.object({ id: z.guid() }))
  .output(z.object({ success: z.boolean() })),
```

**Why generic `toggleField`:** Same logic (set one boolean column on one row) for favorites, pins, and archives. One endpoint instead of three, field enum restricts which columns are writable.

### 2. Service — add 5 methods to `entryService`

**File:** `apps/server/src/services/entry.service.ts`

**`toggleField`:**
- `UPDATE entries SET [field] = value, updated_at = now() WHERE id = ? AND user_id = ?`
- Returns updated entry via `toEntry()`
- Throws `ORPCError("NOT_FOUND")` if no row matched

**`setReviewStatus`:**
- `UPDATE entries SET review_status = status, updated_at = now() WHERE id = ? AND user_id = ?`
- Same pattern as toggleField

**`trackRead`:**
- `UPDATE entries SET read_count = read_count + 1, last_read_at = now(), updated_at = now() WHERE id = ? AND user_id = ?`
- Uses `sql` template for atomic increment: `sql\`${entries.readCount} + 1\`` — not a JS read-then-write
- Import: `import { sql } from "drizzle-orm";`

**`retryIngest`:**
- Only allowed when `processedStatus === 'failed'` — throw `ORPCError("BAD_REQUEST")` otherwise
- Resets: `processedStatus = 'pending'`, `error = null`, `updatedAt = now()`
- Clears stale AI output: `summary = null`, `keyPoints = null`, `readableContent = null`, `rawContent = null`, `coverImageUrl = null`, `metadata = null`, `wordCount = null`, `language = null`
- Also deletes related rows that would be re-created: `DELETE FROM embeddings WHERE entry_id = ?`, `DELETE FROM entry_tags WHERE entry_id = ?`, `DELETE FROM entry_topics WHERE entry_id = ?`, `DELETE FROM entry_relations WHERE source_entry_id = ?`
- Returns the reset entry
- **Does NOT re-trigger `ai.ingest`** — the mobile hook does that (same pattern as `useCreateEntry`)

**`delete`:**
- `DELETE FROM entries WHERE id = ? AND user_id = ?`
- Returns `{ success: true }`
- Cascade deletes handle embeddings, tags, topics, relations (all FKs have `ON DELETE cascade`)

### 3. Router — wire 5 handlers

**File:** `apps/server/src/router/entry.router.ts`

Add to the `base.router({})` object, same pattern as existing routes:

```ts
toggleField: authed
  .input(z.object({
    id: z.guid(),
    field: z.enum(['isFavorited', 'isPinned', 'isArchived']),
    value: z.boolean(),
  }))
  .handler(async ({ input, context }) => {
    return entryService.toggleField(context.db, context.user!.id, input);
  }),

setReviewStatus: authed
  .input(z.object({ id: z.guid(), status: z.enum([...]) }))
  .handler(async ({ input, context }) => {
    return entryService.setReviewStatus(context.db, context.user!.id, input);
  }),

trackRead: authed
  .input(z.object({ id: z.guid() }))
  .handler(async ({ input, context }) => {
    return entryService.trackRead(context.db, context.user!.id, input);
  }),

retryIngest: authed
  .input(z.object({ id: z.guid() }))
  .handler(async ({ input, context }) => {
    return entryService.retryIngest(context.db, context.user!.id, input);
  }),

delete: authed
  .input(z.object({ id: z.guid() }))
  .handler(async ({ input, context }) => {
    return entryService.delete(context.db, context.user!.id, input);
  }),
```

### 4. Mobile hooks — `useEntryMutations.ts`

**File:** `apps/mobile/src/features/entry/hooks/useEntryMutations.ts`

Create 5 hooks:

**`useToggleEntryField()`** — optimistic cache update:
```ts
export function useToggleEntryField() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; field: 'isFavorited' | 'isPinned' | 'isArchived'; value: boolean }) =>
      orpcClient.entries.toggleField(input),
    onMutate: async (input) => {
      // Optimistically flip the boolean in detail cache
      const key = entryDetailQueryKey(input.id);
      const prev = queryClient.getQueryData(key);
      if (prev) {
        queryClient.setQueryData(key, { ...prev, [input.field]: input.value });
      }
      return { prev };
    },
    onError: (_err, input, ctx) => {
      // Rollback on failure
      if (ctx?.prev) {
        queryClient.setQueryData(entryDetailQueryKey(input.id), ctx.prev);
      }
    },
    onSuccess: (result) => {
      writeEntryRowToCaches(queryClient, result);
    },
  });
}
```

**`useSetReviewStatus()`** — same optimistic pattern but for `reviewStatus` string.

**`useTrackRead()`** — fire-and-forget, called when detail screen mounts. No optimistic update needed (informational field). Use `useMutation` with `onSuccess: writeEntryRowToCaches`.

**`useRetryIngest()`** — resets the entry on server, then triggers `ai.ingest` (same pattern as `useCreateEntry` post-creation):
```ts
export function useRetryIngest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string }) => {
      // 1. Reset entry status on server
      const resetEntry = await orpcClient.entries.retryIngest(input);
      writeEntryRowToCaches(queryClient, resetEntry);
      // 2. Re-trigger pipeline (fire-and-forget — detail screen polls via refetchInterval)
      orpcClient.ai.ingest({ entryId: input.id }).then((result) => {
        writeEntryRowToCaches(queryClient, result);
      }).catch(() => {
        invalidateEntriesDomain(queryClient);
      });
      return resetEntry;
    },
  });
}
```
The detail screen already polls while `processedStatus` is `'pending'` or `'processing'`, so it auto-updates when retry succeeds. No extra UI work needed.

**`useDeleteEntry()`** — on success, call `removeEntryRowFromCaches(queryClient, id)` and navigate back.

### 5. Export query key helper from cache module

**File:** `apps/mobile/src/features/entry/entry-query-cache.ts`

If not already exported, add:

```ts
export function entryDetailQueryKey(id: string) {
  return orpc.entries.getById.queryOptions({ input: { id } }).queryKey;
}
```

This lets mutation hooks target the detail cache for optimistic updates.

---

## Suggestions & Improvements

- **Optimistic updates for toggles** make favorites/pins/archive feel instant. The toggle flips in the UI immediately; server confirms in the background. Rollback on error.
- **`trackRead` should be debounced** on the mobile side — don't fire on every mount during fast navigation. Consider a `useEffect` with a short delay (e.g. 500ms) or only fire if the screen stays visible for 2+ seconds.
- **`delete` needs a confirmation dialog** on the mobile side — not in this ticket (T-007), but the hook should exist ready to be called.
- **No `update` endpoint** for general field editing (title, content) — not needed yet. Add when the app supports editing entries.
- **Ownership check** is implicit in the WHERE clause (`user_id = ?`). No row returned = NOT_FOUND, whether the entry doesn't exist or belongs to another user. This is correct — don't leak info about other users' entries.

---

## Files

| File | Action |
|------|--------|
| `packages/shared/src/contracts/entry.contract.ts` | **Modify** — add 4 routes to `entryContract` |
| `apps/server/src/services/entry.service.ts` | **Modify** — add 4 methods |
| `apps/server/src/router/entry.router.ts` | **Modify** — add 4 handlers |
| `apps/mobile/src/features/entry/hooks/useEntryMutations.ts` | **Create** — 4 mutation hooks |
| `apps/mobile/src/features/entry/entry-query-cache.ts` | **Modify** — export `entryDetailQueryKey` helper |

---

## Definition of Done

- [ ] `entryContract` has 5 new routes: `toggleField`, `setReviewStatus`, `trackRead`, `retryIngest`, `delete`
- [ ] `entryService` has 5 new methods with correct SQL + ownership checks
- [ ] `trackRead` uses atomic `sql` increment (not read-then-write)
- [ ] `delete` cascade-removes related rows (embeddings, tags, topics, relations)
- [ ] `retryIngest` guards on `processedStatus === 'failed'` — rejects otherwise
- [ ] `retryIngest` clears stale AI output (summary, keyPoints, readableContent, rawContent, coverImageUrl, metadata, wordCount, language)
- [ ] `retryIngest` deletes stale related rows (embeddings, entry_tags, entry_topics, entry_relations)
- [ ] `entryRouter` has 5 new handlers using `authed` middleware
- [ ] All endpoints return updated `entrySchema` (except delete which returns `{ success }`)
- [ ] All endpoints reject unauthenticated requests
- [ ] All endpoints only mutate entries owned by the requesting user
- [ ] `useToggleEntryField` hook created with optimistic cache update + rollback
- [ ] `useSetReviewStatus` hook created with optimistic cache update
- [ ] `useTrackRead` hook created (fire-and-forget)
- [ ] `useRetryIngest` hook created — resets entry, re-triggers `ai.ingest`, detail screen auto-polls
- [ ] `useDeleteEntry` hook created with cache removal
- [ ] `entryDetailQueryKey` helper exported from cache module
- [ ] `pnpm typecheck` passes across all workspaces
- [ ] Manual test: toggle favorite via API → entry.isFavorited flips in DB
- [ ] Manual test: trackRead via API → readCount increments, lastReadAt updates
- [ ] Manual test: retryIngest on failed entry → status resets to pending, ai.ingest re-runs
- [ ] Manual test: retryIngest on non-failed entry → BAD_REQUEST error
- [ ] Manual test: delete via API → entry + related data removed

---

## Commit

```
feat(entry): add mutation endpoints and mobile hooks for entry interactions
```
