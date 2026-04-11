import { useCallback } from "react";
import { Platform } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import {
  MMKV_SHARE_ENTRY_LAST_ID,
  MMKV_SHARE_ENTRY_SYNC_AT,
} from "@/constants/storage-keys";
import {
  invalidateEntriesDomain,
  writeEntryRowToCaches,
} from "@/features/entry/entry-query-cache";
import { useCrossSurfaceNudge } from "@/hooks/useCrossSurfaceNudge";
import { storage } from "@/lib/mmkv";
import { orpcClient } from "@/lib/orpc";

/**
 * Share Quick runs in a second JS root; when it bumps the MMKV marker, merge the latest
 * row into the main app's TanStack cache (or fall back to domain invalidation).
 *
 * Single-device MVP: no Supabase Realtime — entry updates come from oRPC mutations + this nudge.
 */
export function useEntrySync(): void {
  const onCrossSurfaceBump = useCallback((queryClient: QueryClient) => {
    if (Platform.OS === "web") return;

    const lastId = storage.getString(MMKV_SHARE_ENTRY_LAST_ID);
    if (lastId) {
      storage.remove(MMKV_SHARE_ENTRY_LAST_ID);
      void orpcClient.entries
        .getById({ id: lastId })
        .then((row) => {
          if (row) {
            writeEntryRowToCaches(queryClient, row);
          }
        })
        .catch(() => {
          invalidateEntriesDomain(queryClient);
        });
      return;
    }

    invalidateEntriesDomain(queryClient);
  }, []);

  useCrossSurfaceNudge({
    mmkvKey: MMKV_SHARE_ENTRY_SYNC_AT,
    onBump: onCrossSurfaceBump,
  });
}
