import { entries, insertEntrySchema } from "@/db/schema/entries";
import { insertSpaceSchema, spaces } from "@/db/schema/spaces";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

/**
 * API JSON uses ISO strings for timestamps; default drizzle-zod select schemas use z.date(),
 * which rejects strings — so responses failed validation silently in React Query.
 */
const { createSelectSchema: createSelectCoerced } = createSchemaFactory({
  coerce: { date: true },
});

export const selectEntrySchema = createSelectCoerced(entries);
export const selectSpaceSchema = createSelectCoerced(spaces);

// Standard API Response shape
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z.string().optional(),
  });

// Entries
export const getEntriesResponseSchema = apiResponseSchema(
  z.array(selectEntrySchema),
);
export const createEntryRequestSchema = insertEntrySchema.pick({
  url: true,
  title: true,
  content: true,
  type: true,
});
export const createEntryResponseSchema = apiResponseSchema(selectEntrySchema);

// Ingest
export const ingestRequestSchema = z.object({
  entryId: z.string().uuid(),
});
export const ingestResponseSchema = apiResponseSchema(selectEntrySchema);

// Spaces
export const getSpacesResponseSchema = apiResponseSchema(
  z.array(selectSpaceSchema),
);
export const createSpaceRequestSchema = insertSpaceSchema.pick({
  name: true,
  description: true,
});
export const createSpaceResponseSchema = apiResponseSchema(selectSpaceSchema);

// Entry by ID
export const getEntryByIdResponseSchema = apiResponseSchema(selectEntrySchema);
