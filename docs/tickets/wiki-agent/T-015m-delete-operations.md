# T-015m: Mobile — Delete Operations (space, page, section)

**Status:** pending
**Phase:** Quality
**Type:** feature (server + mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** [T-015j](./T-015j-auto-assign-review-queue.md), [T-015k](./T-015k-space-hierarchy-curator-overhaul.md), [T-015l](./T-015l-spaces-screen-redesign.md) (row layout + menu hook-in points)

---

## Goal

Give the user a safe, consistent way to delete the three wiki-editable objects: a **space**, a **wiki page**, and an individual **section** inside a wiki page. All flows run through a single reusable confirm sheet, protect destructive actions behind explicit confirmation, and never touch the immutable `entries` source data.

---

## Context

### What can currently be deleted

- `useDeleteSpace()` already exists at [apps/mobile/src/features/space/hooks/useSpaces.ts:246](../../../apps/mobile/src/features/space/hooks/useSpaces.ts) — mutation wired to the existing server endpoint.
- Wiki page and section deletion are **not exposed on mobile** today. Verify against the T-015d contract whether `wiki.deletePage` exists; if not, this ticket adds it.
- Wiki sections live inside `wiki_pages.content` JSONB — deleting one is a content update, not a row delete. The existing `updateWikiPage` mutation carries this.

### Why entries are never deleted from this surface

Entries are the raw-source layer of the Karpathy wiki pattern (see epic). They are immutable once ingested. Deleting a space unassigns the `entry_spaces` edges; the entries themselves stay.

### Index-space protection

`spaces.isIndex` marks the per-user index space (T-015a). Deletion must be blocked at the UI level with a toast; the server-side guard (if any) is already a matter for T-015j/T-015d.

---

## File structure

```
apps/mobile/src/
  components/ui/
    ConfirmDangerSheet/
      index.tsx                              (NEW)
      index.styles.ts                        (NEW)
  features/space/
    components/SpaceListRow/
      index.tsx                              (MOD — add long-press)
    screens/SpaceDetailScreen/
      index.tsx                              (MOD — add delete header action)
    hooks/
      useDeleteWikiPage.ts                   (NEW — if not present on T-015d contract, add to hook layer)
  features/wiki/
    screens/WikiPageDetailScreen/
      index.tsx                              (MOD — add delete header action)
    components/WikiSectionRenderer/
      index.tsx                              (MOD — add per-section overflow menu)
apps/server/src/modules/ai/
  ...                                        (MOD — add wiki.deletePage endpoint only if missing)
```

---

## Scope

### 1. `ConfirmDangerSheet` primitive

**Files:**
- `apps/mobile/src/components/ui/ConfirmDangerSheet/index.tsx`
- `apps/mobile/src/components/ui/ConfirmDangerSheet/index.styles.ts`

Props:

```ts
type ConfirmDangerSheetProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;          // e.g. "Delete space"
  cancelLabel?: string;          // default "Cancel"
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Optional extra content slot (radio group for delete strategies, etc.). */
  children?: React.ReactNode;
};
```

Implementation:

- Reuse the bottom-sheet Modal pattern from `SpacesScreen` (create modal): dimmed `Pressable` backdrop + slide-up surface.
- Surface uses `rounded-t-sm bg-surface px-screen pt-4 pb-8 border-t border-border` to match T-015l.
- Title: `text-foreground text-lg font-semibold`.
- Message: `text-muted text-sm mt-2`.
- Optional `children` slot below the message for per-flow controls (e.g. delete-strategy radio).
- Button row: `Button variant="ghost"` (cancel) + `Button variant="primary" className="bg-danger"` (confirm). Disabled while `isPending`. Confirm button label shows `${confirmLabel}…` when pending.
- `accessibilityRole="button"` on both actions; confirm has `accessibilityHint="Destructive action"`.

### 2. Delete space flow

**Touched files:** `SpaceListRow/index.tsx`, `SpaceDetailScreen/index.tsx`.

Triggers:

- **List row**: long-press (`onLongPress`) on a `SpaceListRow` opens a small HeroUI bottom menu with a single destructive item `Delete space`. Tapping it opens `ConfirmDangerSheet`.
- **Detail screen**: header overflow menu item `Delete space`.

Confirm sheet contents:

- Title: `Delete ${space.name}?`
- Message: `${entryCount} entries will be unassigned. Entries themselves are kept.`
- `children`: a disabled radio group with two options to make the behavior explicit:
  - `Unassign entries` (selected, default)
  - `Delete everything` (disabled with copy "Coming soon")

Mutation:

- Reuse `useDeleteSpace()` from [useSpaces.ts](../../../apps/mobile/src/features/space/hooks/useSpaces.ts).
- On success: `toast.success("Space deleted", space.name)`, invalidate `spaces` + `wiki-pages` queries (if mutation does not already do so), and if the user was on `SpaceDetailScreen`, `router.back()`.
- On error: `toast.error("Delete failed", …)`, keep the sheet open.

Index-space guard:

- If `space.isIndex === true`, the menu item is hidden on the row, and the detail-screen header item is hidden. Belt-and-braces: if somehow triggered, short-circuit with `toast.warning("The index space can't be deleted.", undefined)`.

Optimistic UX:

- Optimistically remove from the `useSpaces()` cache list on `onMutate`, restore on error. Follow the pattern already present in `useCreateSpace` (line 57 of `useSpaces.ts`) which does optimistic inserts.

### 3. Delete wiki page flow

**Touched files:** `WikiPageDetailScreen/index.tsx`, `useDeleteWikiPage.ts`, possibly the AI module contract.

Contract check:

- Inspect `apps/server/src/modules/ai/...` for an existing `wiki.deletePage` (or equivalent) oRPC procedure. If present, wire the hook to it.
- If missing, **add** it in this ticket:
  - Input: `{ pageId: string }`.
  - Behavior: deletes the `wiki_pages` row; cascades `space_wiki_pages` and `wiki_page_versions` via existing FK `onDelete: cascade` (verify schema — patch in this ticket if not cascading).
  - Output: `{ deletedPageId: string }`.
  - Auth: scoped to the current user via the standard session guard.

Hook: `apps/mobile/src/features/space/hooks/useDeleteWikiPage.ts` (new) — `useMutation` wrapping the oRPC call, invalidates `wiki-pages` (all space scopes) and `spaces` (page counts) on success.

UI:

- `WikiPageDetailScreen` header action → overflow menu → `Delete page`.
- `ConfirmDangerSheet`:
  - Title: `Delete page "${page.title}"?`
  - Message: `This page is linked to ${spaceCount} space(s). It will be removed from all of them. ${sectionCount} sections will be lost.`
- On success: `toast.success("Page deleted", page.title)`, `router.back()`.
- On error: keep sheet open, toast error.

### 4. Delete section flow

**Touched files:** `WikiSectionRenderer/index.tsx` (find by grep if the filename differs).

Triggers:

- Per-section overflow button (three-dot icon) at the top-right of each rendered section block. Opens a small menu with `Delete section`.
- Tapping opens `ConfirmDangerSheet`:
  - Title: `Delete section "${section.heading ?? 'Untitled'}"?`
  - Message: `This removes the section from this page only.`

Mutation:

- Reuse the existing `updateWikiPage` mutation from T-015f. Build the payload by filtering the section out of `page.content.sections` (or the equivalent JSONB shape from T-015b's synthesis template).
- `onMutate`: optimistic update of the page query.
- On success: `toast.success("Section deleted", undefined)`.
- On error: rollback + `toast.error`.

No server contract change for sections — they're a content edit.

### 5. Toasts + query invalidation

All three flows use the existing `useAppToast()` hook. Query invalidation keys:

| Mutation | Invalidates |
|---|---|
| `useDeleteSpace` | `["spaces"]`, `["wiki-pages"]`, `["space-suggestions"]` |
| `useDeleteWikiPage` | `["wiki-pages"]`, `["spaces"]` (page counts on each space summary) |
| Section delete (via `updateWikiPage`) | Already handled by the existing `updateWikiPage` hook |

### 6. Accessibility

- Long-press targets on `SpaceListRow` are paired with an always-tappable overflow button (three-dot icon) so users who cannot long-press still have access.
- Each overflow menu item has `accessibilityRole="button"` and a clear destructive label.
- `ConfirmDangerSheet` buttons: `accessibilityHint="Destructive action"` on confirm; the entire sheet uses `accessibilityViewIsModal` when visible.

---

## File changes summary

| Action | File | Purpose |
|--------|------|---------|
| NEW | `apps/mobile/src/components/ui/ConfirmDangerSheet/index.tsx` | Reusable destructive-confirm bottom sheet |
| NEW | `apps/mobile/src/components/ui/ConfirmDangerSheet/index.styles.ts` | `tv` variants for sheet + confirm button |
| NEW | `apps/mobile/src/features/space/hooks/useDeleteWikiPage.ts` | Mutation hook for page delete |
| MOD | `apps/mobile/src/features/space/components/SpaceListRow/index.tsx` | Long-press + overflow-menu affordance, index-space guard |
| MOD | `apps/mobile/src/features/space/screens/SpaceDetailScreen/index.tsx` | Header overflow → delete space |
| MOD | `apps/mobile/src/features/wiki/screens/WikiPageDetailScreen/index.tsx` | Header overflow → delete page |
| MOD | `apps/mobile/src/features/wiki/components/WikiSectionRenderer/index.tsx` | Per-section overflow → delete section |
| MOD (conditional) | `apps/server/src/modules/ai/...` contract/router | Add `wiki.deletePage` if it does not already exist; verify/patch cascade deletes |
| MOD | `docs/tickets/wiki-agent/T-015-wiki-agent-epic.md` | Link T-015m row to this file |

---

## Edge cases

- **Delete a parent space with children**: children become orphans — their `spaceRelations` row is cascaded away, their `parentSpaceId` is cleared. They appear under `#Uncategorized` in the redesigned screen. Note copy in the sheet: `${childCount} child space(s) will become standalone.`
- **Delete a space linked to a page via `space_wiki_pages`, where the page is also linked to other spaces**: the page stays; only the `space_wiki_pages` row goes.
- **Delete a page linked to multiple spaces**: delete affects all of them (single action, no per-space unlink option).
- **Delete the only section in a page**: allowed; the page now has an empty section list. Page itself is not auto-deleted.
- **Delete while a compile is running for that space**: guard in `SpaceListRow` — if `compilationStatus === "compiling"`, overflow menu item is disabled with hint `Wait for compile to finish`.
- **Network/server error mid-delete**: optimistic state rolls back; sheet stays open; toast surfaces the error message.
- **Stale row**: if the space no longer exists (deleted from another device), server returns not-found → toast `Space already deleted`, refresh list.

---

## What this does NOT include

- Bulk deletion (multi-select + delete) — future follow-up.
- Soft-delete / trash / restore — hard delete for MVP.
- Deletion of underlying `entries` rows — entries are immutable raw source.
- Per-space "delete everything including entries" — disabled radio option only; never implemented in this ticket.
- Undo via snackbar — rely on explicit confirm; can revisit later.
- Redesign of `SpaceDetailScreen` or `WikiPageDetailScreen` beyond adding the header overflow action.
- Server-side cascade rework for `entry_spaces` (already handled by existing FK).

---

## DoD

- [ ] `ConfirmDangerSheet` exists under `components/ui/ConfirmDangerSheet/` with `tv` styles, props as specified, and `rounded-t-sm` surface.
- [ ] `SpaceListRow` long-press + overflow menu opens the space delete sheet.
- [ ] `SpaceDetailScreen` header overflow contains `Delete space`.
- [ ] Index space is hidden from both delete entry points; a defensive toast fires if somehow triggered.
- [ ] Deleting a space unassigns `entry_spaces` (entries remain), cascades `space_wiki_pages`, cascades `space_relations`.
- [ ] Optimistic removal of the deleted space from the list; rolled back on server error.
- [ ] `WikiPageDetailScreen` header overflow contains `Delete page`; confirm sheet shows linked-space count + section count.
- [ ] `wiki.deletePage` exists on the server (either previously or added in this ticket) and cascades `space_wiki_pages` + `wiki_page_versions`.
- [ ] `useDeleteWikiPage.ts` mutation hook exists and invalidates `wiki-pages` + `spaces`.
- [ ] Per-section overflow menu opens section delete sheet.
- [ ] Section delete is implemented as an `updateWikiPage` content edit; no new server endpoint for sections.
- [ ] Compiling state disables the overflow menu with a hint.
- [ ] All three flows show correct toasts on success + error.
- [ ] All new destructive buttons use `bg-danger`.
- [ ] Accessibility: overflow buttons reachable without long-press; sheet is modal; destructive buttons hinted.
- [ ] `pnpm typecheck` clean; no unused imports or dead helpers.
- [ ] `T-015-wiki-agent-epic.md` Quality table links `T-015m` to this file.

---

## Verification

Set up: compile a fresh wiki (`wiki.compile`) so at least one parent space + two children + one wiki page with 3 sections exist. Also create one user-made space with no children.

1. **Section delete**
   - Open the wiki page. Tap the three-dot icon on section 2 → `Delete section` → confirm.
   - Expect the section to disappear, toast `Section deleted`, remaining sections unchanged.
   - Kill the network, repeat → toast shows server error, section returns.

2. **Page delete**
   - From the same page, header overflow → `Delete page` → confirm sheet shows "linked to N space(s), M sections will be lost".
   - Confirm → toast `Page deleted`, screen pops back, the page is gone from every linked space's wiki list.

3. **Space delete — user-created**
   - On SpacesScreen, long-press the user-created space → overflow `Delete space` → confirm sheet shows entry count.
   - Confirm → row disappears optimistically, toast `Space deleted`. Entries remain reachable via other spaces or search.

4. **Space delete — parent with children**
   - Long-press a parent space → confirm sheet mentions `${childCount} child space(s) will become standalone`.
   - Confirm → parent gone; formerly-child spaces now appear under `#Uncategorized` / Standalone group.

5. **Index-space guard**
   - Verify the index space does not show an overflow menu.

6. **Compile guard**
   - Trigger a compile, while `compilationStatus === "compiling"` try long-press on the compiling space → overflow menu disabled with hint.

7. **Error recovery**
   - Stub a server error (network off) during space delete → optimistic state rolls back; toast surfaces the error; retry after restoring network succeeds.

---

## Ticket sequence (context)

```
T-015l (row layout + menu hook-ins)
  └→ T-015m (this ticket)
       └→ (epic complete)
```

---

## Follow-up ideas (out of scope)

- Undo via timed snackbar on space delete.
- Bulk select + bulk delete from SpacesScreen.
- Soft-delete + trash view.
- Per-space "Delete everything including entries" as an explicit opt-in flow.
- Server-side audit log for destructive actions.
