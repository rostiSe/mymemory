import { useToggleEntryField } from "@/features/entry/hooks/useEntryMutations";
import { useCallback } from "react";

/**
 * Stable handler for feed row swipe (favorite / unfavorite). Uses the same
 * `entries.toggleField` path as entry detail.
 */
export function useFeedFavoriteToggle(): (
  entryId: string,
  currentlyFavorited: boolean,
) => void {
  const toggleField = useToggleEntryField();

  return useCallback(
    (entryId: string, currentlyFavorited: boolean) => {
      toggleField.mutate({
        id: entryId,
        field: "isFavorited",
        value: !currentlyFavorited,
      });
    },
    [toggleField],
  );
}

/**
 * Stable handler for feed row pin toggle; same `entries.toggleField` path as detail.
 */
export function useFeedPinToggle(): (
  entryId: string,
  currentlyPinned: boolean,
) => void {
  const toggleField = useToggleEntryField();

  return useCallback(
    (entryId: string, currentlyPinned: boolean) => {
      toggleField.mutate({
        id: entryId,
        field: "isPinned",
        value: !currentlyPinned,
      });
    },
    [toggleField],
  );
}
