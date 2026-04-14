# T-015h: Delete Operations + Global Wiki Listing

**Status:** pending
**Phase:** Full-stack (contract → server → mobile)
**Type:** feature
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015g (compile/lint UI, mutation hooks)

---

## Goal

Give users destructive management controls they currently lack:
1. **Delete a space** — from `SpaceDetailScreen` (server endpoint exists; mobile wiring missing)
2. **Delete a wiki page** — from `WikiPageScreen` (needs new server endpoint + mobile)
3. **Delete a wiki section** — from a synthesis page's section row (needs new server endpoint that patches JSONB)
4. **All wiki pages card** — sorted by `updatedAt` desc, accessible from `SpacesScreen`

---

## Context

### What already exists

| Capability | Server | Contract | Mobile |
|------------|--------|----------|--------|
| **Delete space** | `spaceService.deleteSpace` | `spaces.delete` | `useDeleteSpace()` hook exists in `useSpaces.ts` — **not wired to any UI** |
| **Delete wiki page** | **None** | **None** | **None** |
| **Patch wiki content** | **None** | **None** | **None** |
| **All wiki pages sorted by date** | `wikiService.listPages({})` returns all pages but sorted by `sortOrder, title` | `wiki.listPages` | `useWikiPages()` — no sort option |

### Cascade behavior (Postgres FK)

| Deleted row | Cascaded deletes |
|-------------|-----------------|
| `spaces` | `entry_spaces`, `space_relations`, `space_wiki_pages` (link only — wiki pages survive) |
| `wiki_pages` | `wiki_page_versions`, `space_wiki_pages` |

### Destructive UX pattern

The app uses `BottomSheetComponent` with `tone="danger"` for destructive confirmations (see `EntryDeleteConfirmSheet`). Follow the same pattern for all three delete actions.

---

## Scope

### 1. Contract additions (`packages/shared/src/contracts/wiki.contract.ts`)

```typescript
// Delete a wiki page
wikiDeletePageInputSchema = z.object({ id: z.uuid() });

// Remove a section from a synthesis page's JSONB content
wikiRemoveSectionInputSchema = z.object({
  pageId: z.uuid(),
  sectionId: z.string().min(1),
});

// Add to wikiContract:
deletePage: oc.input(wikiDeletePageInputSchema).output(spaceMutationOkSchema),
removeSection: oc.input(wikiRemoveSectionInputSchema).output(wikiPageSchema),
```

Import `spaceMutationOkSchema` from `space.contract.ts` (already exported).

`removeSection` returns the **updated page** so the client can replace its cache without refetching.

### 2. Server: wiki page delete (`apps/server/src/modules/wiki/services/wiki.service.ts`)

```typescript
async deletePage(dbClient: Db, userId: string, input: { id: string }) {
  const [deleted] = await dbClient
    .delete(wikiPages)
    .where(and(eq(wikiPages.id, input.id), eq(wikiPages.userId, userId)))
    .returning({ id: wikiPages.id });

  if (!deleted) throw new ORPCError("NOT_FOUND", { message: "Wiki page not found" });
  return { success: true as const };
}
```

Cascade handles `wiki_page_versions` and `space_wiki_pages`.

### 3. Server: section removal (`wiki.service.ts`)

This is the tricky part. Sections live inside `content` JSONB — specifically in `content.sections[]` (synthesis) and `content.tableOfContents[]`.

```typescript
async removeSection(
  dbClient: Db,
  userId: string,
  input: { pageId: string; sectionId: string },
) {
  // 1. Load page (verify ownership + exists)
  const [page] = await dbClient
    .select()
    .from(wikiPages)
    .where(and(eq(wikiPages.id, input.pageId), eq(wikiPages.userId, userId)))
    .limit(1);

  if (!page) throw new ORPCError("NOT_FOUND", { message: "Wiki page not found" });
  if (page.pageType !== "synthesis") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Section removal is only supported for synthesis pages",
    });
  }

  // 2. Parse content, remove section + TOC entry
  const content = page.content as Record<string, unknown>;
  const sections = Array.isArray(content.sections) ? [...content.sections] : [];
  const toc = Array.isArray(content.tableOfContents) ? [...content.tableOfContents] : [];

  const sectionIdx = sections.findIndex(
    (s: any) => s && typeof s === "object" && s.id === input.sectionId,
  );
  if (sectionIdx === -1) {
    throw new ORPCError("NOT_FOUND", { message: "Section not found in page content" });
  }

  sections.splice(sectionIdx, 1);
  const filteredToc = toc.filter(
    (t: any) => !(t && typeof t === "object" && t.id === input.sectionId),
  );

  const updatedContent = {
    ...content,
    sections,
    tableOfContents: filteredToc,
  };

  // 3. Save a version snapshot BEFORE modifying
  const latestVersion = await dbClient
    .select({ version: wikiPageVersions.version })
    .from(wikiPageVersions)
    .where(eq(wikiPageVersions.wikiPageId, page.id))
    .orderBy(desc(wikiPageVersions.version))
    .limit(1);

  const nextVersion = (latestVersion[0]?.version ?? 0) + 1;

  await dbClient.insert(wikiPageVersions).values({
    wikiPageId: page.id,
    version: nextVersion,
    content: page.content,           // snapshot the CURRENT content before deletion
    properties: page.properties,
    sourceEntryIds: page.sourceEntryIds,
  });

  // 4. Update page with section removed
  const [updated] = await dbClient
    .update(wikiPages)
    .set({ content: updatedContent, updatedAt: new Date() })
    .where(eq(wikiPages.id, page.id))
    .returning();

  return updated;
}
```

**Safety:**
- The **old** content (with the section) is versioned before mutation — the user can always see it in version history.
- Only `synthesis` pages support section removal (other types have different content shapes — timeline events, glossary terms, etc. — and can be added later).
- If the `sectionId` doesn't exist, it 404s rather than silently succeeding.

### 4. Server router wiring (`apps/server/src/router/wiki.router.ts`)

Add `deletePage` and `removeSection` handlers following the existing pattern.

### 5. Contract: list pages sort option

Extend `wikiListPagesInputSchema` to accept an optional `sortBy`:

```typescript
export const wikiListPagesInputSchema = z.object({
  spaceId: z.uuid().optional(),
  sortBy: z.enum(["sortOrder", "updatedAt"]).optional(),
});
```

Server adjusts `orderBy` accordingly. Default remains `sortOrder, title`.

### 6. Mobile: `useDeleteSpace` wiring in `SpaceDetailScreen`

`useDeleteSpace()` already exists. Wire it:

- Add a "Delete space" `Button variant="danger"` at the bottom of `SpaceDetailScreen`
- Tap opens `BottomSheetComponent` with `tone="danger"`:
  - Title: "Delete this space?"
  - Description: "Entries will be unlinked but not deleted. Wiki pages linked to this space will also remain."
  - Primary: "Delete" → `deleteSpace.mutate({ id: spaceId })` → on success: `router.back()` + toast
  - Secondary: "Cancel"

### 7. Mobile: `useDeleteWikiPage` hook (`features/wiki/hooks/useWikiMutations.ts`)

```typescript
function useDeleteWikiPage()
// → useMutation calling orpcClient.wiki.deletePage({ id })
// onSuccess: invalidate wiki.listPages, spaces.list, navigate back
// onError: toast error
```

Wire in `WikiPageScreen` or `WikiPageShell`:
- "Delete page" as a danger `Pressable` link or `Button` in the page footer (next to "View version history")
- `BottomSheetComponent` with `tone="danger"`:
  - Title: "Delete this wiki page?"
  - Description: "This will also remove all version history. This cannot be undone."
  - Primary: "Delete" → `deleteWikiPage.mutate({ id: pageId })` → on success: `router.back()` + toast
  - Secondary: "Cancel"

### 8. Mobile: `useRemoveWikiSection` hook (`features/wiki/hooks/useWikiMutations.ts`)

```typescript
function useRemoveWikiSection()
// → useMutation calling orpcClient.wiki.removeSection({ pageId, sectionId })
// onSuccess: update wiki.getPage cache in-place with returned page
//            invalidate wiki.getPageVersions (new version was created)
//            toast: "Section removed. A version snapshot was saved."
// onError: toast error
```

**UI integration** (most complex part):

- Add an **overflow/trash icon button** to `WikiSection` — appears on long-press or as a small icon in the section header row
- Preferred approach: add a delete icon (`MaterialIcons "delete-outline"`) to the right of the section title in `WikiSection`, styled as `text-muted` and small (`size={18}`)
- Tap opens `BottomSheetComponent` with `tone="danger"`:
  - Title: `Delete "${section.title}"?`
  - Description: "This section will be removed from the page. A version snapshot is saved automatically — you can view it in version history."
  - Primary: "Delete section"
  - Secondary: "Cancel"

**Prop threading:**
- `WikiPageScreen` → passes `pageId` to `WikiPageTypeBody`
- `WikiPageTypeBody` → passes `pageId` to `SynthesisRenderer`
- `SynthesisRenderer` → passes `pageId` and `onDeleteSection(sectionId)` to `WikiSection`
- `WikiSection` receives optional `onDeleteSection` — when present, renders the delete icon

Non-synthesis renderers do not receive `onDeleteSection` for now.

**After deletion:**
- The mutation returns the updated page → update cache so sections re-render without the deleted one
- `AnimatedStaggerItem` + `FadeOut` exit animation on the removed section gives visual feedback
- TOC in `WikiPageShell` automatically updates because it reads from `page.content` via `parseSynthesisContent`

### 9. All Wiki Pages card in `SpacesScreen`

Add a card below `CompileStatusCard` (and above the hint text) in `SpacesScreen` list header:

- Title: "All wiki pages"
- Subtitle: "{count} pages" or "No pages yet"
- Uses `useWikiPages()` (no `spaceId` → returns all pages)
- Sorts client-side by `updatedAt` desc (or extend server sort — see scope item 5)
- Shows up to 5 most recently updated pages as compact rows: title + type badge + relative time ("2h ago")
- "View all" link navigates to a new `wiki/all.tsx` screen or reuses a simple full-page list

#### New route: `apps/mobile/src/app/wiki/all.tsx`

- Screen: `AllWikiPagesScreen`
- `FlatList` of all wiki pages sorted by `updatedAt` desc
- Each row: `Pressable` → `Card` with title, `PageTypeBadge`, `MaturityBadge`, relative date, section count
- Pull-to-refresh
- Empty state: "No wiki pages yet. Compile your wiki to generate pages."

---

## File changes summary

### Server / shared

| File | Change |
|------|--------|
| `packages/shared/src/contracts/wiki.contract.ts` | Add `deletePage`, `removeSection` to contract; add `sortBy` to `wikiListPagesInputSchema` |
| `apps/server/src/modules/wiki/services/wiki.service.ts` | Add `deletePage`, `removeSection` methods |
| `apps/server/src/router/wiki.router.ts` | Wire `deletePage`, `removeSection` handlers |

### Mobile — new files

| File | What |
|------|------|
| `features/wiki/screens/AllWikiPagesScreen/index.tsx` | Full list of all wiki pages sorted by date |
| `app/wiki/all.tsx` | Route for all wiki pages |

### Mobile — modified files

| File | Change |
|------|--------|
| `features/wiki/hooks/useWikiMutations.ts` | Add `useDeleteWikiPage`, `useRemoveWikiSection` |
| `features/wiki/hooks/useWikiPages.ts` | Add `sortBy` option to `useWikiPages` |
| `features/wiki/screens/WikiPageScreen/index.tsx` | Pass `pageId` through to `WikiPageTypeBody` |
| `features/wiki/screens/WikiPageScreen/components/WikiPageTypeBody/index.tsx` | Accept + forward `pageId` and `onDeleteSection` |
| `features/wiki/screens/WikiPageScreen/components/SynthesisRenderer/index.tsx` | Accept `pageId` + wire `useRemoveWikiSection` + pass `onDeleteSection` to sections |
| `features/wiki/components/WikiSection/index.tsx` | Accept optional `onDeleteSection`, render delete icon + confirm sheet |
| `features/wiki/screens/WikiPageScreen/components/WikiPageShell/index.tsx` | Add "Delete page" in footer with confirm sheet |
| `features/space/screens/SpaceDetailScreen/index.tsx` | Add "Delete space" button with confirm sheet |
| `features/space/screens/SpacesScreen/index.tsx` | Add "All wiki pages" preview card in list header |
| `app/_layout.tsx` | Add `wiki/all` route |

---

## Edge cases and safety

### Section deletion gotchas

1. **Race with compile**: if a compile is running while the user deletes a section, the compile's Writer may re-create the section. Acceptable for MVP — the user can delete again. Guard with a UI warning when `compilationStatus === "compiling"`.
2. **Last section**: deleting the last section of a synthesis page leaves `sections: []`. The page still renders (empty body, badges/properties remain). The linter will flag it as "thin_page". Do **not** auto-delete the page.
3. **Orphaned TOC entries**: `removeSection` cleans both `sections` and `tableOfContents` atomically on the server.
4. **Version snapshot**: the server creates a new version row with the **pre-deletion** content, so the user can always revert via version history.
5. **Concurrent section deletes**: two rapid deletes could conflict. The server reads-then-writes, so each delete sees the latest content. No transaction isolation issue because each request is serialized per user in practice.

### Space deletion gotchas

1. **Index space**: the `isIndex` space is a system space. Add a guard: refuse to delete where `is_index = true`. Return a descriptive error: "The Index space is managed by the wiki agent and cannot be deleted."
2. **Wiki pages survive**: deleting a space only removes `space_wiki_pages` links. The wiki pages remain and show up in "All wiki pages." This is intentional — pages may be linked to multiple spaces.

### Wiki page deletion gotchas

1. **Index page**: the page with `pageType === "index"` is special. Allow deletion but warn: "This is the wiki index page. It will be re-created on the next compile."
2. **Cross-page links**: other pages may link to the deleted page via `WikiLinkChip`. After deletion, `WikiLinkChip` already handles invalid page IDs (renders disabled muted chip). No extra work needed.

---

## UX flow

```
SpacesScreen
  ├─ CompileStatusCard
  ├─ All Wiki Pages preview card (top 5 by date) → "View all" → wiki/all
  ├─ hint text + New space button
  └─ space list

SpaceDetailScreen
  └─ [Delete space] button at bottom → BottomSheet(danger) → confirm → delete + router.back()

WikiPageScreen (any page type)
  └─ Footer
       ├─ View version history
       └─ [Delete page] → BottomSheet(danger) → confirm → delete + router.back()

WikiPageScreen (synthesis only)
  └─ WikiSection header row
       └─ [trash icon] → BottomSheet(danger) → confirm → removeSection → animate out

wiki/all (new screen)
  └─ FlatList of all pages by updatedAt desc → tap → wiki/[id]
```

---

## DoD (Definition of Done)

- [ ] `wiki.deletePage` contract + server endpoint deletes a wiki page (cascades versions + space links)
- [ ] `wiki.removeSection` contract + server endpoint removes a synthesis section from JSONB + creates version snapshot
- [ ] `removeSection` refuses non-synthesis pages with descriptive error
- [ ] Index space (`is_index`) cannot be deleted — server guard
- [ ] `useDeleteWikiPage` mutation hook with cache invalidation
- [ ] `useRemoveWikiSection` mutation hook with in-place cache update
- [ ] `SpaceDetailScreen` has "Delete space" button with danger confirmation sheet
- [ ] `WikiPageShell` footer has "Delete page" with danger confirmation sheet
- [ ] `WikiSection` has delete icon (synthesis only) with danger confirmation sheet
- [ ] Section removal animates out with `FadeOut` and updates TOC
- [ ] "All wiki pages" preview card in `SpacesScreen` showing top 5 by date
- [ ] `AllWikiPagesScreen` at `wiki/all` with full sorted list, pull-to-refresh
- [ ] `wikiListPagesInputSchema` extended with optional `sortBy`
- [ ] Toast notifications on all delete successes and errors
- [ ] Warning when attempting section delete while compile is running
- [ ] No `any` types, `tv()` variants in `index.styles.ts` where applicable
- [ ] `pnpm typecheck` passes (server + mobile)

---

## Out of scope (deferred)

- Undo / restore deleted pages (version history preserves content but no one-tap restore)
- Bulk delete (multi-select pages or sections)
- Section deletion for non-synthesis page types (timeline events, glossary terms, comparison items)
- Drag-to-reorder sections
- Page archival (soft delete) as alternative to hard delete
