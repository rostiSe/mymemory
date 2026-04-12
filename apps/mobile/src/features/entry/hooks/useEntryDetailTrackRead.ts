import { useTrackRead } from "@/features/entry/hooks/useEntryMutations";
import { useEffect } from "react";

/** Only count a read after the user stays on the detail screen this long (ms). */
export const ENTRY_DETAIL_TRACK_READ_DELAY_MS = 2000;

/**
 * Fires `entries.trackRead` once per `entryId` mount after a delay.
 * Timer clears on unmount or when `entryId` changes (fast back-nav does not count).
 */
export function useEntryDetailTrackRead(entryId: string | undefined): void {
  const { mutate } = useTrackRead();

  useEffect(() => {
    if (!entryId?.length) return;

    const timer = setTimeout(() => {
      mutate({ id: entryId });
    }, ENTRY_DETAIL_TRACK_READ_DELAY_MS);

    return () => clearTimeout(timer);
  }, [entryId, mutate]);
}
