import { spaceContract, spaceSchema } from "@mymemory/shared/contracts";
import { implement } from "@orpc/server";
import { z } from "zod";
import type { ORPCContext } from "../context.js";
import { authed } from "../orpc.js";
import { spaceService } from "../modules/spaces/services/space.service.js";

export const spaceRouter = implement(spaceContract)
  .$context<ORPCContext>()
  .router({
    list: authed.output(z.array(spaceSchema)).handler(async ({ context }) => {
      return spaceService.list(context.db, context.user!.id);
    }),
    getById: authed
      .input(z.object({ id: z.uuid() }))
      .output(spaceSchema.nullable())
      .handler(async ({ input, context }) => {
        return spaceService.getById(context.db, context.user!.id, input);
      }),
    create: authed
      .input(z.object({ name: z.string(), description: z.string().optional() }))
      .output(spaceSchema)
      .handler(async ({ input, context }) => {
        return spaceService.create(context.db, context.user!.id, input);
      }),
  });
