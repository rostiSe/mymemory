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

export const entryContract = oc.router({
  list: oc.output(z.array(entrySchema)),
  getById: oc.input(z.object({ id: z.uuid() })).output(entrySchema.nullable()),
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
