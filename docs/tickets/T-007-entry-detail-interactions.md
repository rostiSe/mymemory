# T-007: Wire Entry Detail Interactions

**Status:** done
**Phase:** 3 — Frontend Interactions
**Type:** feature (mobile only)
**Risk:** low (UI wiring to hooks from T-006, no server changes)
**Depends on:** T-006 (mutation endpoints + mobile hooks exist)

---

## Goal

Wire the mutation hooks from T-006 into the EntryDetailScreen. The user should be able to:
- **Favorite** an entry (heart toggle in header)
- **Pin** an entry (pin toggle in header)
- **Set review status** (replace TODO placeholder with action sheet)
- **Retry ingestion** (button shown when `processedStatus === 'failed'`)
- **Delete** an entry (destructive action with confirmation)
- **Track reads** automatically when the detail screen opens

---

## Current State

**`EntryDetailScreen/index.tsx`** renders 10 sections vertically. Interaction-relevant parts:

- **`EntryDetailHeader`** (`components/EntryDetailHeader/index.tsx`): Shows title, subtitle, metaLine. **No action buttons.** Props: `{ title, subtitle, metaLine }`.
- **`EntryReviewedAction`** (`components/EntryReviewedAction/index.tsx`): Single `<Button>` with `/* TODO */` onPress. No props — doesn't know about entry state.
- **`ProcessingStatus`**: Shows status badge when not "done". **No retry button.**
- **`EntrySpacesPlaceholder`**: Placeholder text. Out of scope for this ticket (needs spaces API).

**Icons:** `MaterialIcons` from `@expo/vector-icons` used throughout.
**UI lib:** `heroui-native` — `Button`, `Chip`, `Card` available.

---

## What to Do

### 1. Add action buttons to `EntryDetailHeader`

**File:** `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntryDetailHeader/index.tsx`

Add props for interaction state and callbacks:

```ts
export type EntryDetailHeaderProps = {
  title: string;
  subtitle: string;
  metaLine: string;
  // New interaction props
  isFavorited: boolean;
  isPinned: boolean;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
};
```

Add an action row below the title with icon buttons:

```tsx
<View className="flex-row items-center gap-3">
  <Pressable onPress={onToggleFavorite} hitSlop={8}>
    <MaterialIcons
      name={isFavorited ? "favorite" : "favorite-border"}
      size={22}
      color={isFavorited ? dangerColor : mutedColor}
    />
  </Pressable>
  <Pressable onPress={onTogglePin} hitSlop={8}>
    <MaterialIcons
      name={isPinned ? "push-pin" : "push-pin"}
      size={22}
      color={isPinned ? accentColor : mutedColor}
    />
  </Pressable>
</View>
```

Use `useThemeColor` for `dangerColor`, `accentColor`, `mutedColor` — same pattern as other components in the codebase.

### 2. Replace `EntryReviewedAction` with real review status UI

**File:** `apps/mobile/src/features/entry/screens/EntryDetailScreen/components/EntryReviewedAction/index.tsx`

Replace the TODO button with a component that:
- Shows the current `reviewStatus` as a label
- Provides action buttons to cycle through statuses

```ts
type EntryReviewedActionProps = {
  reviewStatus: 'unreviewed' | 'kept' | 'dismissed' | 'remind';
  onSetStatus: (status: 'unreviewed' | 'kept' | 'dismissed' | 'remind') => void;
};
```

Design: a row of 3 pill buttons (Chip or small Button):
- **Keep** (check icon) — sets `'kept'`
- **Remind** (alarm icon) — sets `'remind'`
- **Dismiss** (close icon) — sets `'dismissed'`

The active status gets a filled/highlighted style, others are outlined. If already `'kept'`, tapping "Keep" again resets to `'unreviewed'` (toggle behavior).

### 3. Add retry button to `ProcessingStatus`

**File:** `apps/mobile/src/features/entry/components/ProcessingStatus/index.tsx`

When `status === 'failed'`, add a retry button next to the error message:

```ts
type ProcessingStatusProps = {
  status: string;
  error?: string;
  onRetry?: () => void;  // new — only passed when status is 'failed'
};
```

```tsx
{status === 'failed' && onRetry && (
  <Button size="sm" variant="outlined" onPress={onRetry}>
    Retry
  </Button>
)}
```

### 4. Add delete action (menu or button)

Add a "more" menu (3-dot icon) in the header or a delete button at the bottom. Recommended approach:

**Option A (simpler):** Add a `<Pressable>` with `MaterialIcons name="more-vert"` in the header action row. On press, show an `Alert.alert` confirmation dialog with "Delete Entry" as a destructive option.

**Option B (nicer):** Use a bottom sheet / action sheet. Only do this if the project already has a sheet component.

For now, **go with Option A** — `Alert.alert` confirmation is standard RN and zero dependencies.

### 5. Wire everything in `EntryDetailScreen/index.tsx`

Import and use the hooks from T-006:

```ts
import { useToggleEntryField, useSetReviewStatus, useTrackRead, useRetryIngest, useDeleteEntry } from "@/features/entry/hooks/useEntryMutations";
```

**Track read on mount:**
```ts
const trackRead = useTrackRead();
useEffect(() => {
  if (entry?.id) {
    const timer = setTimeout(() => trackRead.mutate({ id: entry.id }), 2000);
    return () => clearTimeout(timer);
  }
}, [entry?.id]);
```
Debounced — only counts as "read" if user stays on screen for 2+ seconds.

**Toggle callbacks:**
```ts
const toggleField = useToggleEntryField();
const handleToggleFavorite = useCallback(() => {
  if (!entry) return;
  toggleField.mutate({ id: entry.id, field: 'isFavorited', value: !entry.isFavorited });
}, [entry?.id, entry?.isFavorited]);

const handleTogglePin = useCallback(() => {
  if (!entry) return;
  toggleField.mutate({ id: entry.id, field: 'isPinned', value: !entry.isPinned });
}, [entry?.id, entry?.isPinned]);
```

**Review status:**
```ts
const setReviewStatus = useSetReviewStatus();
const handleSetReviewStatus = useCallback((status: 'unreviewed' | 'kept' | 'dismissed' | 'remind') => {
  if (!entry) return;
  const newStatus = entry.reviewStatus === status ? 'unreviewed' : status;
  setReviewStatus.mutate({ id: entry.id, status: newStatus });
}, [entry?.id, entry?.reviewStatus]);
```

**Retry:**
```ts
const retryIngest = useRetryIngest();
const handleRetry = useCallback(() => {
  if (!entry) return;
  retryIngest.mutate({ id: entry.id });
}, [entry?.id]);
```

**Delete:**
```ts
const deleteEntry = useDeleteEntry();
const handleDelete = useCallback(() => {
  if (!entry) return;
  Alert.alert('Delete Entry', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    {
      text: 'Delete',
      style: 'destructive',
      onPress: () => {
        deleteEntry.mutate({ id: entry.id });
        router.back();
      },
    },
  ]);
}, [entry?.id]);
```

**Pass new props to children:**

```tsx
<EntryDetailHeader
  title={headerProps.title}
  subtitle={headerProps.subtitle}
  metaLine={headerProps.metaLine}
  isFavorited={entry.isFavorited}
  isPinned={entry.isPinned}
  onToggleFavorite={handleToggleFavorite}
  onTogglePin={handleTogglePin}
/>

<ProcessingStatus
  status={entry.processedStatus}
  error={entry.error}
  onRetry={entry.processedStatus === 'failed' ? handleRetry : undefined}
/>

<EntryReviewedAction
  reviewStatus={entry.reviewStatus}
  onSetStatus={handleSetReviewStatus}
/>
```

---

## Suggestions & Improvements

- **Favorite toggle feels instant** thanks to optimistic updates in `useToggleEntryField` (T-006). The heart fills immediately; server confirms in background.
- **`trackRead` with 2-second debounce** prevents counting fast back-navigations as reads. Only fires once per mount (no re-fire on re-renders).
- **Review status as toggle** — tapping the active status resets to `'unreviewed'`. This is more intuitive than a separate "unreview" action.
- **Delete navigates back immediately** after confirmation — don't wait for server response. The cache removal (`removeEntryRowFromCaches`) handles cleanup.
- **Don't show favorite/pin buttons while processing** — they're not useful until content exists. Conditionally render action row only when `processedStatus === 'done'`.
- **Archive is not in the detail screen** — it's a feed-level action (swipe-to-archive or long-press menu). Wire it in T-008 (feed improvements).

---

## Files

| File | Action |
|------|--------|
| `apps/mobile/src/features/entry/screens/EntryDetailScreen/index.tsx` | **Modify** — import hooks, wire callbacks, pass props |
| `.../components/EntryDetailHeader/index.tsx` | **Modify** — add favorite/pin/delete icon buttons |
| `.../components/EntryReviewedAction/index.tsx` | **Rewrite** — accept props, render status pills |
| `apps/mobile/src/features/entry/components/ProcessingStatus/index.tsx` | **Modify** — add optional retry button |

---

## Definition of Done

- [ ] `EntryDetailHeader` shows favorite heart icon (filled when favorited, outline when not)
- [ ] `EntryDetailHeader` shows pin icon (highlighted when pinned)
- [ ] Tapping favorite/pin toggles state immediately (optimistic) and persists to server
- [ ] `EntryReviewedAction` shows 3 status pills: Keep, Remind, Dismiss
- [ ] Active review status pill is highlighted; tapping active pill resets to `unreviewed`
- [ ] `ProcessingStatus` shows "Retry" button when `status === 'failed'`
- [ ] Retry resets entry to `pending` and re-triggers ingestion pipeline
- [ ] Detail screen auto-polls after retry (existing `useEntryById` refetchInterval behavior)
- [ ] Delete action shows `Alert.alert` confirmation dialog
- [ ] Delete removes entry from caches and navigates back
- [ ] Read tracked automatically after 2 seconds on screen
- [ ] Favorite/pin buttons hidden while entry is still processing
- [ ] No new dependencies added
- [ ] TypeScript compiles (`pnpm typecheck`)

---

## Commit

```
feat(entry): wire detail screen interactions — favorite, pin, review, retry, delete
```
