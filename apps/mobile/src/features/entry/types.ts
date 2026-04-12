import type { z } from "zod";
import { entryDetailSchema, entrySchema } from "@mymemory/shared/contracts";

/** Row shape for entries APIs and caches; contract changes → see `entry-query-cache.ts` checklist. */
export type EntryRow = z.infer<typeof entrySchema>;

/** `entries.getById` — base entry fields plus related tags and topics. */
export type EntryDetailRow = z.infer<typeof entryDetailSchema>;
