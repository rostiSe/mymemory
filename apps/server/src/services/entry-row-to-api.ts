import { entries } from "@mymemory/db/schema/entries";
import { entrySchema } from "@mymemory/shared/contracts";
import type { z } from "zod";
import { getSignedUrlForEntry } from "../lib/storage/entry-asset-url.js";

type Entry = z.infer<typeof entrySchema>;
type EntryRow = typeof entries.$inferSelect;

/**
 * Maps a DB row to the public entry contract. `coverImageUrl` is always a
 * client-loadable URL: signed when `coverImageStorageKey` is set, otherwise
 * legacy remote `https?://` from `coverImageUrl`, or a signed path if the legacy
 * column held a storage path.
 */
export async function entryRowToApiEntry(row: EntryRow): Promise<Entry> {
  const { coverImageStorageKey: _omitStorageKey, ...rest } = row;
  const coverImageUrl = await resolveCoverImageUrlForClient(row);

  return {
    ...rest,
    title: row.title ?? undefined,
    summary: row.summary ?? undefined,
    url: row.url ?? undefined,
    error: row.error ?? undefined,
    rawContent: row.rawContent ?? undefined,
    readableContent: row.readableContent ?? undefined,
    coverImageUrl: coverImageUrl ?? undefined,
    metadata: row.metadata ?? undefined,
    keyPoints: row.keyPoints ?? undefined,
    lastReadAt: row.lastReadAt ?? undefined,
    sourceApp: row.sourceApp ?? undefined,
    wordCount: row.wordCount ?? undefined,
    language: row.language ?? undefined,
  } as Entry;
}

async function resolveCoverImageUrlForClient(
  row: Pick<EntryRow, "coverImageUrl" | "coverImageStorageKey">,
): Promise<string | undefined> {
  const key = row.coverImageStorageKey?.trim();
  if (key) {
    const signed = await getSignedUrlForEntry(key);
    if (signed) return signed;
  }

  const legacy = row.coverImageUrl?.trim();
  if (!legacy) return undefined;
  if (legacy.startsWith("http://") || legacy.startsWith("https://")) {
    return legacy;
  }

  const signedLegacy = await getSignedUrlForEntry(legacy);
  return signedLegacy ?? legacy;
}
