import { oc } from "@orpc/contract";
import { z } from "zod";

const dateSchema = z.string().or(z.date());

export const entrySchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
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
});

export const spaceSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  centroidVector: z.array(z.number()).nullable().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const appContract = oc.router({
  ping: oc.output(z.string()),

  entries: oc.router({
    list: oc.output(z.array(entrySchema)),
    getById: oc
      .input(z.object({ id: z.uuid() }))
      .output(entrySchema.nullable()),
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
  }),

  spaces: oc.router({
    list: oc.output(z.array(spaceSchema)),
    getById: oc
      .input(z.object({ id: z.uuid() }))
      .output(spaceSchema.nullable()),
    create: oc
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
        }),
      )
      .output(spaceSchema),
  }),

  ai: oc.router({
    ingest: oc
      .input(
        z.object({
          entryId: z.uuid(),
        }),
      )
      .output(
        z.object({
          success: z.boolean(),
          data: entrySchema,
        }),
      ),
    demo: oc
      .input(
        z.object({
          url: z.string().url().optional(),
          text: z.string().optional(),
        }),
      )
      .output(
        z.object({
          success: z.boolean(),
          extractedText: z.string(),
          summary: z.string(),
          embeddingPreview: z.array(z.number()),
          embeddingLength: z.number(),
        }),
      ),
  }),
});
