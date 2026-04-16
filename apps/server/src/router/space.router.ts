import {
  entryListOutputSchema,
  spaceContract,
  spaceListEntriesInputSchema,
  spaceMutationOkSchema,
  spaceSchema,
  spaceSuggestionSchema,
  spaceWithCountSchema,
} from "@mymemory/shared/contracts";
import { implement } from "@orpc/server";
import { z } from "zod";
import type { ORPCContext } from "../context.js";
import { suggestionService } from "../modules/spaces/services/suggestion.service.js";
import { spaceService } from "../modules/spaces/services/space.service.js";
import { authed } from "../orpc.js";

export const spaceRouter = implement(spaceContract)
  .$context<ORPCContext>()
  .router({
    list: authed
      .output(z.array(spaceWithCountSchema))
      .handler(async ({ context }) => {
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
    listSuggestions: authed
      .output(z.array(spaceSuggestionSchema))
      .handler(async ({ context }) => {
        const rows = await suggestionService.listSuggestions(
          context.db,
          context.user!.id,
        );
        return rows;
      }),
    approveSuggestion: authed
      .input(
        z.object({
          suggestionId: z.uuid(),
          spaceName: z.string().optional(),
          spaceId: z.uuid().optional(),
        }),
      )
      .output(spaceSchema)
      .handler(async ({ input, context }) => {
        return suggestionService.approveSuggestion(
          context.db,
          context.user!.id,
          input,
        );
      }),
    rejectSuggestion: authed
      .input(z.object({ suggestionId: z.uuid() }))
      .output(spaceMutationOkSchema)
      .handler(async ({ input, context }) => {
        return suggestionService.rejectSuggestion(
          context.db,
          context.user!.id,
          input,
        );
      }),
    listEntries: authed
      .input(spaceListEntriesInputSchema)
      .output(entryListOutputSchema)
      .handler(async ({ input, context }) => {
        return spaceService.listEntries(context.db, context.user!.id, input);
      }),
    assignEntry: authed
      .input(
        z.object({
          entryId: z.uuid(),
          spaceId: z.uuid(),
        }),
      )
      .output(spaceMutationOkSchema)
      .handler(async ({ input, context }) => {
        return spaceService.assignEntry(context.db, context.user!.id, input);
      }),
    unassignEntry: authed
      .input(
        z.object({
          entryId: z.uuid(),
          spaceId: z.uuid(),
        }),
      )
      .output(spaceMutationOkSchema)
      .handler(async ({ input, context }) => {
        return spaceService.unassignEntry(context.db, context.user!.id, input);
      }),
    delete: authed
      .input(z.object({ id: z.uuid() }))
      .output(spaceMutationOkSchema)
      .handler(async ({ input, context }) => {
        return spaceService.deleteSpace(context.db, context.user!.id, input);
      }),
  });
