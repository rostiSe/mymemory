import { z } from "zod";
import { authed, base } from "../orpc.js";
import { entryService } from "../services/entry.service.js";

export const entryRouter = base.router({
  list: authed.handler(async ({ context }) => {
    return entryService.list(context.db, context.user!.id);
  }),
  getById: authed
    .input(z.object({ id: z.uuid() }))
    .handler(async ({ input, context }) => {
      return entryService.getById(context.db, context.user!.id, input);
    }),
  create: authed.input(z.any()).handler(async ({ input, context }) => {
    console.log("RAW INPUT:", input);
    return entryService.create(context.db, context.user!.id, input as any);
  }),
});
