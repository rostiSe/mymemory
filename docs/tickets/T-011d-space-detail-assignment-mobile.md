# T-011d: Space detail + entry assignment (mobile)

**Status:** planned  
**Type:** feature (mobile)  
**Risk:** low | **Effort:** medium  
**Epic:** [T-011 Spaces](./T-011-spaces-screen.md)  
**Depends on:** [T-011c](./T-011c-spaces-screen-mobile.md)

---

## Goal

Space detail lists entries; entry detail shows assigned spaces; user can assign and remove manually.

---

## Space detail

**`SpaceDetailScreen`** (`features/space/screens/SpaceDetailScreen/index.tsx`)

- Header: name + entry count
- Paginated `FlatList` of entries in the space
- Compact cards (pattern like `SearchResultCard`: title, snippet, date) → entry detail
- Remove from space: swipe **or** long-press + action — clarify in session (`unassignEntry`)

---

## Entry detail

**`EntryDetailScreen`** (`features/entry/screens/EntryDetailScreen/`)

- Section: assigned spaces as `Chip`; tap → space detail
- `[+ Add to space]` → sheet listing spaces → `assignEntry`
- Optional subtle “AI suggested” / assignment source — clarify in session (schema flag vs copy only)

---

## Hooks

- `useSpaceEntries(spaceId)` — paginated
- `useAssignEntry()`
- `useUnassignEntry()`

---

## Definition of done

- [ ] Paginated entries on space detail
- [ ] Compact cards + navigation to entry
- [ ] Remove entry from space (agreed gesture)
- [ ] Entry detail: space chips + add picker
- [ ] Manual assign creates `entrySpaces` row

---

## Next (research / smart suggestions)

- [T-011e](./T-011e-spaces-algorithm-research.md)  
- [T-011f](./T-011f-spaces-smart-suggestions.md)
