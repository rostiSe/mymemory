# T-011a: Scaffold spaces server module + disable auto-assign

**Status:** done  
**Type:** refactor + fix  
**Risk:** low | **Effort:** small  
**Epic:** [T-011 Spaces](./T-011-spaces-screen.md)

---

## Goal

Create `apps/server/src/modules/spaces/`, move existing space logic into it, **delete** superseded files, and change ingest so the pipeline **never** auto-assigns spaces — only creates suggestions.

---

## What to do

1. Create `apps/server/src/modules/spaces/` with:
   - `services/space.service.ts` — move implementation from `apps/server/src/services/space.service.ts`
   - `services/suggestion.service.ts` — stub until T-011b (ingest writes suggestions directly)
   - `utils/` — placeholder for future matching (`utils/index.ts`)
2. Update `apps/server/src/router/space.router.ts` imports to the new module paths.
3. **Delete** `apps/server/src/services/space.service.ts` after the move (no thin re-export).
4. **Delete** `apps/server/src/modules/ai/tools/assign-space.ts` and remove all imports/usages.
5. In `apps/server/src/modules/ai/pipelines/ingest.ts`:
   - Remove `assignSpace()` and any `entrySpaces` insert used for auto-assign.
   - Always insert a `spaceSuggestions` row after topics are extracted (same transaction as today).
   - Use `extractedTopics[0]?.name || "New Space"` as `suggestedName`.
6. **`findRelatedEntries`**: keep it; no longer bundled with `assignSpace` in `Promise.all`.

---

## Definition of done

- [x] `modules/spaces/` exists with `space.service.ts` and `suggestion.service.ts`
- [x] `utils/` placeholder exists
- [x] Space router imports the new module
- [x] **Deleted:** old `services/space.service.ts`
- [x] **Deleted:** `ai/tools/assign-space.ts` and dead imports
- [x] Ingest: no `assignSpace`; always creates suggestion; no auto `entrySpaces` from pipeline
- [x] `pnpm typecheck` passes at repo root

---

## Notes

- Next ticket: [T-011b](./T-011b-spaces-management-api.md).
