import { oc } from "@orpc/contract";
import { z } from "zod";
import { entryListOutputSchema } from "./entry.contract.js";

const dateSchema = z.string().or(z.date());

export const spaceSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  centroidVector: z.array(z.number()).nullable().optional(),
  createdAt: dateSchema,  
  updatedAt: dateSchema,
});

export const spaceWithCountSchema = spaceSchema.extend({
  entryCount: z.number().int(),
  parentSpaceId: z.uuid().nullable().optional(),
  childSpaceIds: z.array(z.uuid()).optional(),
});

export const spaceSuggestionSchema = z.object({
  id: z.uuid(),
  entryId: z.uuid(),
  entryTitle: z.string(),
  suggestedName: z.string(),
  suggestedSpaceId: z.uuid().nullable().optional(),
  confidence: z.number().nullable().optional(),
  reason: z.string().nullable().optional(),
  createdAt: dateSchema,
});

export const spaceListEntriesInputSchema = z.object({
  spaceId: z.uuid(),
  limit: z.number().int().min(1).max(50).default(20),
  cursor: z.string().nullish(),
});

export const spaceMutationOkSchema = z.object({ success: z.literal(true) });

export const spaceContract = oc.router({
  list: oc.output(z.array(spaceWithCountSchema)),
  getById: oc.input(z.object({ id: z.uuid() })).output(spaceSchema.nullable()),
  create: oc
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      }),
    )
    .output(spaceSchema),
  listSuggestions: oc.output(z.array(spaceSuggestionSchema)),
  approveSuggestion: oc
    .input(
      z.object({
        suggestionId: z.uuid(),
        spaceName: z.string().optional(),
        spaceId: z.uuid().optional(),
      }),
    )
    .output(spaceSchema),
  rejectSuggestion: oc
    .input(z.object({ suggestionId: z.uuid() }))
    .output(spaceMutationOkSchema),
  listEntries: oc
    .input(spaceListEntriesInputSchema)
    .output(entryListOutputSchema),
  assignEntry: oc
    .input(
      z.object({
        entryId: z.uuid(),
        spaceId: z.uuid(),
      }),
    )
    .output(spaceMutationOkSchema),
  unassignEntry: oc
    .input(
      z.object({
        entryId: z.uuid(),
        spaceId: z.uuid(),
      }),
    )
    .output(spaceMutationOkSchema),
  delete: oc.input(z.object({ id: z.uuid() })).output(spaceMutationOkSchema),
});
