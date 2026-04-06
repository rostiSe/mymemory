import { implement } from "@orpc/server";
import { base, authed } from "../orpc.js";
import { entryContract } from "@mymemory/shared/contracts";
import { entryService } from "../services/entry.service.js";
import type { ORPCContext } from "../context.js";

const router = base.router({
  list: authed.handler(async ({ context }) => {
    return entryService.list(context.db, context.user!.id);
  }),
  getById: authed.handler(async ({ input, context }) => {
    return entryService.getById(context.db, context.user!.id, input as { id: string });
  }),
  create: authed.handler(async ({ input, context }) => {
    return entryService.create(context.db, context.user!.id, input as { url?: string; title?: string; content?: string; type?: "url" | "note" });
  }),
});

export const entryRouter = implement(entryContract).router(router as any);
