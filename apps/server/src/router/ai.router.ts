import { implement } from "@orpc/server";
import { base, authed } from "../orpc.js";
import { aiContract } from "@mymemory/shared/contracts";
import { aiService } from "../services/ai.service.js";

const router = base.router({
  ingest: authed.handler(async ({ input, context }) => {
    return aiService.ingest(context.db, context.user!.id, input as { entryId: string });
  }),
  demo: authed.handler(async ({ input }) => {
    return aiService.demo(input as { url?: string; text?: string });
  }),
});

export const aiRouter = implement(aiContract).router(router as any);
