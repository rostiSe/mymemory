import {
  entryByIdInputSchema,
  entryListInputSchema,
  entrySearchInputSchema,
  entrySetReviewStatusInputSchema,
  entryToggleFieldInputSchema,
} from "@mymemory/shared/contracts";
import { generateEmbedding } from "../modules/ai/tools/generate-embedding.js";
import { z } from "zod";
import { authed, base } from "../orpc.js";
import { entryService } from "../services/entry.service.js";

const createInputSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
  content: z.string().optional(),
  type: z.enum(["url", "note"]).default("url"),
});

export const entryRouter = base.router({
  list: authed
    .input(entryListInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.listPaginated(context.db, context.user!.id, input);
    }),
  getById: authed
    .input(entryByIdInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.getById(context.db, context.user!.id, input);
    }),
  create: authed
    .input(createInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.create(context.db, context.user!.id, input);
    }),
  toggleField: authed
    .input(entryToggleFieldInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.toggleField(context.db, context.user!.id, input);
    }),
  setReviewStatus: authed
    .input(entrySetReviewStatusInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.setReviewStatus(context.db, context.user!.id, input);
    }),
  trackRead: authed
    .input(entryByIdInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.trackRead(context.db, context.user!.id, input);
    }),
  retryIngest: authed
    .input(entryByIdInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.retryIngest(context.db, context.user!.id, input);
    }),
  delete: authed
    .input(entryByIdInputSchema)
    .handler(async ({ input, context }) => {
      return entryService.delete(context.db, context.user!.id, input);
    }),
  search: authed
    .input(entrySearchInputSchema)
    .handler(async ({ input, context }) => {
      const embedding = await generateEmbedding(input.query);
      return entryService.search(context.db, context.user!.id, input, embedding);
    }),
});
