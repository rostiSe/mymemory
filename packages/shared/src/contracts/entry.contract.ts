import { oc } from "@orpc/contract";
import { z } from "zod";

const dateSchema = z.string().or(z.date());

export const entrySchema = z.object({
  /** Postgres / gen_random_uuid may not satisfy RFC variant bits; use guid not strict uuid */
  id: z.guid(),
  userId: z.guid(),
  title: z.string().nullable().optional(),
  content: z.string(),
  summary: z.string().nullable().optional(),
  url: z.string().nullable().optional(),
  type: z.enum(["url", "note"]).default("url"),
  processedStatus: z
    .enum(["pending", "processing", "done", "failed"])
    .default("pending"),
  error: z.string().nullable().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,

  // Enriched content
  rawContent: z.string().nullable().optional(),
  readableContent: z.string().nullable().optional(),
  coverImageUrl: z.string().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  keyPoints: z.array(z.string()).nullable().optional(),

  // User interaction
  isFavorited: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  readCount: z.number().int().default(0),
  lastReadAt: dateSchema.nullable().optional(),

  // Lifecycle
  reviewStatus: z
    .enum(["unreviewed", "kept", "dismissed", "remind"])
    .default("unreviewed"),

  // Source context
  sourceApp: z.string().nullable().optional(),

  // Content metrics
  wordCount: z.number().int().nullable().optional(),
  language: z.string().nullable().optional(),
});

export const entryListInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().nullish(),
});

export const entryListOutputSchema = z.object({
  items: z.array(entrySchema),
  nextCursor: z.string().nullable(),
});

/** Tag row returned with entry detail (read-only). */
export const entryTagItemSchema = z.object({
  id: z.guid(),
  name: z.string(),
});

/** Topic row returned with entry detail (read-only). */
export const entryTopicItemSchema = z.object({
  id: z.guid(),
  name: z.string(),
  description: z.string().nullable().optional(),
});

/** Full entry row plus related tags and topics (e.g. `getById`). */
export const entryDetailSchema = entrySchema.extend({
  tags: z.array(entryTagItemSchema),
  topics: z.array(entryTopicItemSchema),
});

export const entryContract = oc.router({
  list: oc.input(entryListInputSchema).output(entryListOutputSchema),
  getById: oc
    .input(z.object({ id: z.guid() }))
    .output(entryDetailSchema.nullable()),
  create: oc
    .input(
      z.object({
        url: z.string().optional(),
        title: z.string().optional(),
        content: z.string().optional(),
        type: z.enum(["url", "note"]).default("url"),
      }),
    )
    .output(entrySchema),
});
