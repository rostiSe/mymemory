import { oc } from "@orpc/contract";
import { z } from "zod";

const dateSchema = z.string().or(z.date());

export const spaceSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  centroidVector: z.array(z.number()).nullable().optional(),
  createdAt: dateSchema,
  updatedAt: dateSchema,
});

export const spaceContract = oc.router({
  list: oc.output(z.array(spaceSchema)),
  getById: oc.input(z.object({ id: z.string().uuid() })).output(spaceSchema.nullable()),
  create: oc
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
      })
    )
    .output(spaceSchema),
});
