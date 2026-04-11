/** Monotonic marker when ShareQuick mutates entries; main app syncs cache if newer. */
export const MMKV_SHARE_ENTRY_SYNC_AT = "share_entry_sync_at";

/** Last entry id written by Share Quick; main app can `getById` + upsert instead of refetching the whole list. */
export const MMKV_SHARE_ENTRY_LAST_ID = "share_entry_last_id";
