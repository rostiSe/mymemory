# T-011c: Spaces screen + suggestion review (mobile)

**Status:** done  
**Type:** feature (mobile)  
**Risk:** low | **Effort:** medium  
**Epic:** [T-011 Spaces](./T-011-spaces-screen.md)  
**Depends on:** [T-011b](./T-011b-spaces-management-api.md)

---

## Goal

Spaces list, suggestion banner, create-space flow, and inline suggestion review — **HeroUI** throughout.

---

## Implemented

**Hooks** (`features/space/hooks/useSpaces.ts`)

- `useSpaceSuggestions`, `useApproveSuggestion`, `useRejectSuggestion`, `useDeleteSpace`, `useSpace`, `useSpaces`, `useCreateSpace`
- Shared invalidation for `spaces.list` and `spaces.listSuggestions` after mutations

**`SuggestionReviewList`** (`features/space/components/SuggestionReviewList/index.tsx`)

- Per-card editable space name, reason, Approve / Reject

**`SpacesScreen`**

- Copy + **New space** CTA, pull-to-refresh
- Expand/collapse banner with **Chip** count when there are pending suggestions
- **FlatList** of spaces with **entry count** chip, folder icon, navigate to `space/[id]`
- Empty states for no spaces / no suggestions (when loaded)
- Create modal (name + optional description)

**Root stack:** `space/[id]` screen title default **Space** (`app/_layout.tsx`)

---

## Deferred (out of scope)

- Tab badge for new suggestions  
- Push notifications  

---

## Definition of done

- [x] Spaces list with counts
- [x] Suggestions banner when pending
- [x] Approve creates space + links entry; reject removes suggestion
- [x] Editable name before approve
- [x] Create space form
- [x] Empty states for no spaces and no suggestions
- [x] HeroUI: Card, Button, Input, Chip

---

## Next

- [T-011d](./T-011d-space-detail-assignment-mobile.md)
