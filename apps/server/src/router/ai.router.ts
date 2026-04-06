import { aiContract, entrySchema } from "@mymemory/shared/contracts";
import { implement } from "@orpc/server";
import { z } from "zod";
import type { ORPCContext } from "../context.js";
import { authed } from "../orpc.js";
import { aiService } from "../services/ai.service.js";

const aiIngestOutput = z.object({
  success: z.boolean(),
  data: entrySchema,
});

const aiDemoOutput = z.object({
  success: z.boolean(),
  extractedText: z.string(),
  summary: z.string(),
  embeddingPreview: z.array(z.number()),
  embeddingLength: z.number(),
});

export const aiRouter = implement(aiContract)
  .$context<ORPCContext>()
  .router({
    ingest: authed
      .input(z.object({ entryId: z.uuid() }))
      .output(aiIngestOutput)
      .handler(async ({ input, context }) => {
        return aiService.ingest(context.db, context.user!.id, input);
      }),
    demo: authed
      .input(
        z.object({
          url: z.url().optional(),
          text: z.string().optional(),
        }),
      )
      .output(aiDemoOutput)
      .handler(async ({ input }) => {
        return aiService.demo(input);
      }),
  });
