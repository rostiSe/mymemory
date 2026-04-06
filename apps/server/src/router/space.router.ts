import { implement } from "@orpc/server";
import { base, authed } from "../orpc.js";
import { spaceContract } from "@mymemory/shared/contracts";
import { spaceService } from "../services/space.service.js";

const router = base.router({
  list: authed.handler(async ({ context }) => {
    return spaceService.list(context.db, context.user!.id);
  }),
  getById: authed.handler(async ({ input, context }) => {
    return spaceService.getById(context.db, context.user!.id, input as { id: string });
  }),
  create: authed.handler(async ({ input, context }) => {
    return spaceService.create(context.db, context.user!.id, input as { name: string; description?: string });
  }),
});

export const spaceRouter = implement(spaceContract).router(router as any);
