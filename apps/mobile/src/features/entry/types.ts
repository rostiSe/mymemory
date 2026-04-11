import type { z } from "zod";
import { entrySchema } from "@mymemory/shared/contracts";

/** Row shape for entries APIs and caches; contract changes → see `entry-query-cache.ts` checklist. */
export type EntryRow = z.infer<typeof entrySchema>;
