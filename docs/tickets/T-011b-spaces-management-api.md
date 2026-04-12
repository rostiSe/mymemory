# T-011b: Space suggestion + management API

**Status:** done  
**Type:** feature (server)  
**Risk:** low | **Effort:** medium  
**Epic:** [T-011 Spaces](./T-011-spaces-screen.md)  
**Depends on:** [T-011a](./T-011a-spaces-server-scaffold.md)

---

## Goal

Add server endpoints for suggestion review and manual space management. **API only** — no mobile UI in this ticket.

---

## Contract (`packages/shared/src/contracts/space.contract.ts`)

Implemented: `spaceSuggestionSchema`, `spaceWithCountSchema`, `spaceListEntriesInputSchema`, `spaceMutationOkSchema`, and routes `listSuggestions`, `approveSuggestion`, `rejectSuggestion`, `listEntries`, `assignEntry`, `unassignEntry`, `delete`. **`list`** now returns `spaceWithCountSchema[]`.

---

## Services

- **`suggestion.service.ts`** — `listSuggestions`, `approveSuggestion` (transaction: create space, `entrySpaces`, delete suggestion), `rejectSuggestion`.
- **`space.service.ts`** — `list` with entry counts; `listEntries` (cursor pagination); `assignEntry` / `unassignEntry`; `deleteSpace`.

---

## Definition of done

- [x] New/updated routes typecheck against contract
- [x] `approveSuggestion` is one transaction (space + link + remove suggestion)
- [x] `list` returns entry counts
- [x] `listEntries` is cursor-paginated
- [x] All procedures enforce user ownership
- [x] `pnpm typecheck` passes at repo root
- [ ] Manual smoke (curl / client) — optional follow-up

---

## Next

- [T-011c](./T-011c-spaces-screen-mobile.md)
