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
