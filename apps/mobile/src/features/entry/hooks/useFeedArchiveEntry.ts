import { useToggleEntryField } from "@/features/entry/hooks/useEntryMutations";
import { useCallback } from "react";

/**
 * Swipe-to-archive on the feed: marks the entry archived server-side and drops it from list caches.
 */
export function useFeedArchiveEntry(): (entryId: string) => void {
  const toggleField = useToggleEntryField();

  return useCallback(
    (entryId: string) => {
      toggleField.mutate({
        id: entryId,
        field: "isArchived",
        value: true,
      });
    },
    [toggleField],
  );
}
