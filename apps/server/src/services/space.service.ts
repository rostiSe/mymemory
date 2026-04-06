import type { db } from "@mymemory/db";
import { spaces } from "@mymemory/db/schema";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";
import type { spaceContract, spaceSchema } from "@mymemory/shared/contracts";

type Space = z.infer<typeof spaceSchema>;

export const spaceService = {
  async list(database: typeof db, userId: string): Promise<Space[]> {
    const userSpaces = await database
      .select()
      .from(spaces)
      .where(eq(spaces.userId, userId));

    return userSpaces.map(s => ({
      ...s,
      description: s.description ?? undefined,
      centroidVector: s.centroidVector ?? undefined,
    }));
  },

  async getById(
    database: typeof db,
    userId: string,
    input: { id: string }
  ): Promise<Space | null> {
    const [row] = await database
      .select()
      .from(spaces)
      .where(and(eq(spaces.id, input.id), eq(spaces.userId, userId)))
      .limit(1);

    if (!row) return null;
    return {
      ...row,
      description: row.description ?? undefined,
      centroidVector: row.centroidVector ?? undefined,
    };
  },

  async create(
    database: typeof db,
    userId: string,
    input: { name: string; description?: string }
  ): Promise<Space> {
    const { name, description } = input || {};

    const [newSpace] = await database
      .insert(spaces)
      .values({
        userId,
        name,
        description: description || null,
      })
      .returning();

    return {
      ...newSpace,
      description: newSpace.description ?? undefined,
      centroidVector: newSpace.centroidVector ?? undefined,
    };
  },
};
