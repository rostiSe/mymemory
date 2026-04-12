import type { z } from "zod";
import { entrySchema } from "@mymemory/shared/contracts";

type Entry = z.infer<typeof entrySchema>;

/**
 * Single-line meta for the detail header (type, date, optional URL).
 */
export function buildEntryMetaLine(entry: Entry): string {
  const date = new Date(entry.createdAt).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const url = entry.url?.trim();
  let urlPart = "";
  if (url) {
    urlPart =
      url.length > 42 ? ` · ${url.slice(0, 20)}…${url.slice(-14)}` : ` · ${url}`;
  }
  return `${entry.type} · ${date}${urlPart}`;
}

/**
 * Second line under the title: word count and language when processing is done and data exists.
 */
export function buildEntryMetaSubtitle(entry: Entry): string | undefined {
  if (entry.processedStatus !== "done") return undefined;
  const parts: string[] = [];
  if (entry.wordCount != null && entry.wordCount > 0) {
    parts.push(`${entry.wordCount} words`);
  }
  const lang = entry.language?.trim();
  if (lang) {
    parts.push(lang.length <= 3 ? lang.toUpperCase() : lang);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

/**
 * Compact hint for feed cards (word count + language) when enriched.
 */
export function buildFeedCardMetaHint(entry: Entry): string | undefined {
  return buildEntryMetaSubtitle(entry);
}
