import {
  MMKV_SHARE_ENTRY_LAST_ID,
  MMKV_SHARE_ENTRY_SYNC_AT,
} from "@/constants/storage-keys";
import { storage } from "@/lib/mmkv";
import { Platform } from "react-native";

/**
 * Bumps a marker read by the main app after Share Quick mutates entries.
 * Optionally pass `lastCreatedEntryId` so the main surface can upsert that row via `getById`
 * without invalidating the whole feed.
 */
export function bumpShareEntrySyncMarker(lastCreatedEntryId?: string): void {
  if (Platform.OS === "web") return;
  storage.set(MMKV_SHARE_ENTRY_SYNC_AT, String(Date.now()));
  if (lastCreatedEntryId) {
    storage.set(MMKV_SHARE_ENTRY_LAST_ID, lastCreatedEntryId);
  }
}
