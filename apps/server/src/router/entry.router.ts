import { entryListInputSchema } from "@mymemory/shared/contracts";
import { z } from "zod";
import { authed, base } from "../orpc.js";
import { entryService } from "../services/entry.service.js";

export const entryRouter = base.router({
  list: authed
    .input(entryListInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.listPaginated(context.db, context.user!.id, input);
    }),
  getById: authed
    .input(z.object({ id: z.uuid() }))
    .handler(async ({ input, context }) => {
      return entryService.getById(context.db, context.user!.id, input);
    }),
  create: authed.input(z.any()).handler(async ({ input, context }) => {
    return entryService.create(context.db, context.user!.id, input as any);
  }),
});
