# Refactoring roadmap — concerns, SOLID, and dumb components

This document complements `[ARCHITECTURE.md](./ARCHITECTURE.md)` and `[CLAUDE.md](../CLAUDE.md)`. Use it when planning tickets (e.g. **T-015h** delete flows) so new code does not lock in the wrong shape, and to prioritize later cleanups.

---

## How to use this doc

1. **Before a feature** — skim the relevant area (Feed, Spaces, Wiki, Server). Note what to extract *alongside* the feature vs what to defer.
2. **During implementation** — prefer **thin routes/screens**, **hooks for orchestration**, **presentational components with props in**.
3. **After a milestone** — pick one “hot” file from the tables below; refactor in a dedicated ticket so behavior stays testable.

---

## SOLID — practical mapping for this repo


| Principle                 | What it means here                                                                                                   | Smell                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **S**ingle responsibility | One file answers one question: “layout”, “fetch”, “map API → UI model”, or “render”.                                 | Screen does query + 5 `useMemo` + error UI + list + modal.   |
| **O**pen/closed           | Extend via variants (`tv`), new hooks, or new small components — not by growing one mega-component.                  | Every new feed action edits `FeedScreen` only.               |
| **L**iskov                | N/A for most UI; relevant for shared abstractions (e.g. list row props contracts).                                   | Optional row props that sometimes need fetch inside the row. |
| **I**nterface segregation | Presentational pieces take **narrow props** (`onPress`, `title`, `isLoading`) — not whole query results or `router`. | Passing `useMutation` objects three levels deep.             |
| **D**ependency inversion  | Screens depend on **hooks** and **callbacks**, not on `orpcClient` or navigation globals inside leaf components.     | `FeedListItem` calling `router.push` internally (if it did). |


**Dumb vs smart (UI)**

- **Smart (container):** owns TanStack Query, Zustand, `router`, toasts, `useState` for sheets. Lives in `screens/`* or `hooks/*`.
- **Dumb (presentational):** given data + callbacks, no `useQuery` / `useMutation`. Lives in `components/`* under the feature.

---

## Mobile — current hotspots and extraction targets

### Feed (`features/entry/screens/FeedScreen/`)

**Today:** `FeedScreen/index.tsx` is ~275 lines and mixes:

- Infinite query + filter state
- Optimistic create wiring (`useFeedOptimisticCreate`)
- Delete sheet state machine
- FlashList config (`renderItem`, `getItemType`, footer, empty, refresh)
- Full-screen error branch that duplicates header + filter


| Concern                                   | Suggested home                                               | Notes                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| “Build list data + extraData key”         | `hooks/useFeedListModel.ts` or `utils/feed-list-builders.ts` | Keeps `optimisticRows` + `listExtraData` out of the screen.                              |
| Delete flow (pending id, confirm, mutate) | `hooks/useFeedDeleteFlow.ts`                                 | Single place for `EntryDeleteConfirmSheet` pairing.                                      |
| Error state UI                            | `components/FeedErrorState/index.tsx`                        | Receives `message`, `onRetry`; no hooks.                                                 |
| FlashList shell                           | `components/FeedFlashList/index.tsx`                         | Props: `data`, `renderItem`, `onEndReached`, etc. Screen passes callbacks from hooks.    |
| Screen file                               | `FeedScreen/index.tsx`                                       | Compose: `FeedHeader`, `FeedFilterBar`, `FeedFlashList`, sheet — **< ~80 lines** target. |


**Refactor ticket idea:** `refactor(feed): extract Feed list shell + delete flow hook` (no behavior change).

---

### Spaces (`features/space/screens/SpacesScreen/`)

**Today:** `SpacesScreen/index.tsx` is ~380 lines — suggestions inbox, create-space modal, list, pull refresh, multiple mutations.


| Concern                         | Suggested home                                                                          |
| ------------------------------- | --------------------------------------------------------------------------------------- |
| Create-space modal + form state | `components/CreateSpaceSheet/` or `hooks/useCreateSpaceModal.ts`                        |
| List header composition         | `components/SpacesListHeader/` (ComposeStatusCard + hint + inbox + “Your spaces” title) |
| Row renderer                    | Already partly `SpaceListRow` — keep screen free of inline JSX blocks                   |


**Refactor ticket idea:** `refactor(spaces): extract SpacesListHeader and create-space modal`.

---

### Wiki — compile card (`features/wiki/components/CompileStatusCard/`)

**Today:** `CompileStatusCard/index.tsx` is ~270 lines — status machine, timers, dialogs, lint sheet, compile summaries, agent log expand.


| Concern                                 | Suggested home                                                    |
| --------------------------------------- | ----------------------------------------------------------------- |
| “Which tone / copy for current status?” | `useWikiCompileCardState.ts` returning a discriminated view model |
| Full recompile dialog                   | `WikiFullRecompileDialog/index.tsx` (controlled props only)       |
| Success flash + summary                 | `WikiCompileSuccessSummary/index.tsx`                             |


**When adding T-015h deletes:** avoid growing this file further; delete flows belong on **space detail** / **wiki page** / **section**, not inside the compile card.

---

### Wiki — page shell & renderers

**Today:** `WikiPageShell` owns scroll + TOC + layout context; renderers are mostly presentational — good direction.

**T-015h risk:** threading `pageId` + `onDeleteSection` through `WikiPageTypeBody` → `SynthesisRenderer` → `WikiSection` is correct, but:

- Prefer a **small hook** `useWikiSectionRemoval(pageId)` used only in `SynthesisRenderer` (or screen), and pass **stable** `onRemoveSection(id)` to dumb `WikiSection`.
- Keep **confirmation sheet** in a dedicated component (mirror `EntryDeleteConfirmSheet` pattern: `WikiSectionDeleteConfirmSheet`).

---

### Settings / cross-feature

**Today:** Settings gained Wiki rows; health check calls `useLintWiki` inline.


| Concern             | Suggested home                                           |
| ------------------- | -------------------------------------------------------- |
| Wiki settings block | `features/wiki/components/WikiSettingsSection/index.tsx` |


---

## Server — current hotspots and extraction targets

### Routers (`apps/server/src/router/*.ts`)

**Today:** Routers are thin — **good**. Keep them as transport only: validate context, call service, map errors.

**Rule:** New procedures (e.g. `wiki.deletePage`) should stay **one line** in the router delegating to `wikiService`.

---

### `wiki.service.ts` (~170 lines today, will grow with T-015h)


| Concern                                              | Suggested split                                                                          |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| CRUD + queries                                       | `wiki.service.ts` (or `wiki-read.service.ts` / `wiki-write.service.ts`)                  |
| JSONB content surgery (section remove, future patch) | `wiki-content-patch.ts` — **pure functions** over `Record<string, unknown>` + unit tests |
| Version snapshot helper                              | `wiki-versioning.ts` — “insert snapshot row before mutation”                             |


**SOLID angle:** `removeSection` should not know about HTTP; it should call `patchSynthesisRemoveSection(content, sectionId)` + `saveVersionSnapshot(tx, …)` so behavior is testable without DB in the ideal case (or with a thin integration test).

---

### `entry.service.ts` (~460+ lines)

**Smell:** Single module owns list pagination, cursor encoding, semantic search thresholds, mapping, and detail fetches.


| Concern                  | Suggested home                                                                          |
| ------------------------ | --------------------------------------------------------------------------------------- |
| Cursor encode/decode     | `entry-cursor.ts`                                                                       |
| `toEntry` / mappers      | `entry-mappers.ts`                                                                      |
| List vs search vs detail | Optional: `entry-list.service.ts`, `entry-search.service.ts`, `entry-detail.service.ts` |


Refactor when touching feed/search again; not blocking T-015h.

---

### AI / wiki orchestration (`modules/ai/agents/wiki-orchestrator.ts`, curator, writer, linter)

**Today:** Orchestrator coordinates long flows — acceptable as a “workflow” file, but:


| Concern                  | Suggested home                                                          |
| ------------------------ | ----------------------------------------------------------------------- |
| DB steps vs LLM steps    | Extract **tool** modules (already partly `wiki-tools.ts`)               |
| “Compile mode” branching | Strategy-style helpers: `runFullCompile`, `runIncrementalCompile`       |
| Shared logging           | Already `agent_logs` — avoid duplicating log formatting in orchestrator |


---

## Upcoming changes (e.g. T-015h) — where debt appears if we are careless


| Change           | Risk                                             | Mitigation                                                                                                    |
| ---------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| Delete space UI  | `SpaceDetailScreen` becomes another “god screen” | Extract `SpaceDangerZone` (delete only) + `useDeleteSpaceFlow(spaceId)`                                       |
| Delete wiki page | `WikiPageShell` grows with mutations             | `WikiPageDangerZone` + `useDeleteWikiPageFlow(pageId)`; shell stays mostly layout                             |
| Remove section   | `WikiSection` owns mutation + sheet              | Section stays dumb: `onRequestRemove` + parent owns hook + sheet                                              |
| All wiki list    | `SpacesScreen` header grows again                | `AllWikiPagesPreviewCard` + `AllWikiPagesScreen` already planned — keep **preview** dumb (props: pages slice) |


---

## Suggested refactor phases (priority order)

1. **Feed** — highest user traffic, largest mixed-concern screen. Extract list shell + delete flow hook first.
2. **Spaces** — second-largest screen; extract header + create modal.
3. **Wiki content patching (server)** — isolate JSONB helpers before adding more patch types.
4. **entry.service split** — when search/list work resumes; reduces regression risk on feed.
5. **Orchestrator** — only when adding new compile modes or triggers; avoid drive-by refactors during small fixes.

---

## Definition of “done” for a refactored screen

- Screen file **imports** hooks + dumb sections; **no** `useMutation` in leaf list items.
- Presentational components **do not** import `@/lib/orpc` or `expo-router` unless it is a dedicated navigation chip with a single responsibility.
- New tokens / spacing follow `global.css` + `layout-imperative.ts` (per project rules).
- Behavior covered by at least **one** of: existing manual QA checklist, new hook unit test, or co-located test when Vitest is wired.

---

## Related docs

- `[docs/ARCHITECTURE.md](./ARCHITECTURE.md)` — providers, boundaries, data flow
- `[docs/DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md)` — tokens and UI consistency
- Wiki tickets: `[docs/tickets/wiki-agent/](./tickets/wiki-agent/)` — e.g. T-015h scope

