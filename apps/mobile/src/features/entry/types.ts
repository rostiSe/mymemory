import type { z } from "zod";
import { entrySchema } from "@mymemory/shared/contracts";

export type EntryRow = z.infer<typeof entrySchema>;
