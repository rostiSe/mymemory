import { oc } from "@orpc/contract";
import { z } from "zod";
import { entrySchema } from "./entry.contract.js";

export const aiContract = oc.router({
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
        url: z.url().optional(),
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
});
