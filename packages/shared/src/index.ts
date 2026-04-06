import { oc } from "@orpc/contract";
import { z } from "zod";

export const appContract = oc.router({
  ping: oc.output(z.string()),
  ai: oc.router({
    ingest: oc
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
  }),
});
