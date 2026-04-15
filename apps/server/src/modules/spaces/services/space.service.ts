import type { db } from "@mymemory/db";
import { entries } from "@mymemory/db/schema/entries";
import { entrySpaces, spaces } from "@mymemory/db/schema/spaces";
import {
  entrySchema,
  type spaceSchema,
  type spaceWithCountSchema,
} from "@mymemory/shared/contracts";
import { toEntry } from "../../../services/entry.service.js";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

type Space = z.infer<typeof spaceSchema>;
type SpaceWithCount = z.infer<typeof spaceWithCountSchema>;
type Entry = z.infer<typeof entrySchema>;

const spaceEntryCursorSchema = z.object({
  createdAt: z.string(),
  id: z.guid(),
});

function encodeSpaceEntryCursor(row: { createdAt: Date; id: string }): string {
  return Buffer.from(
    JSON.stringify({
      createdAt: row.createdAt.toISOString(),
      id: row.id,
    }),
    "utf8",
  ).toString("base64url");
}

function decodeSpaceEntryCursor(cursor: string): {
  createdAt: Date;
  id: string;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
  }
  const result = spaceEntryCursorSchema.safeParse(parsed);
  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
  }
  return {
    createdAt: new Date(result.data.createdAt),
    id: result.data.id,
  };
}

export const spaceService = {
  async list(database: typeof db, userId: string): Promise<SpaceWithCount[]> {
    const rows = await database
      .select({
        id: spaces.id,
        userId: spaces.userId,
        name: spaces.name,
        description: spaces.description,
        centroidVector: spaces.centroidVector,
        createdAt: spaces.createdAt,
        updatedAt: spaces.updatedAt,
        entryCount: sql<number>`coalesce(count(${entrySpaces.entryId})::int, 0)`,
      })
      .from(spaces)
      .leftJoin(entrySpaces, eq(entrySpaces.spaceId, spaces.id))
      .where(eq(spaces.userId, userId))
      .groupBy(spaces.id);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      name: r.name,
      description: r.description ?? undefined,
      centroidVector: r.centroidVector ?? undefined,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      entryCount: r.entryCount,
    }));
  },

  async getById(
    database: typeof db,
    userId: string,
    input: { id: string },
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
    input: { name: string; description?: string },
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

  async listEntries(
    database: typeof db,
    userId: string,
    input: { spaceId: string; limit: number; cursor?: string | null },
  ): Promise<{ items: Entry[]; nextCursor: string | null }> {
    const [spaceRow] = await database
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, input.spaceId), eq(spaces.userId, userId)))
      .limit(1);

    if (!spaceRow) {
      throw new ORPCError("NOT_FOUND", { message: "Space not found" });
    }

    const limit = Math.min(Math.max(Number(input.limit ?? 20), 1), 50);
    const take = limit + 1;

    let cursor: { createdAt: Date; id: string } | undefined;
    if (input.cursor?.length) {
      cursor = decodeSpaceEntryCursor(input.cursor);
    }

    const baseFilter = and(
      eq(entrySpaces.spaceId, input.spaceId),
      eq(entries.userId, userId),
      eq(entries.isArchived, false),
    );

    const paginationClause =
      cursor === undefined
        ? undefined
        : or(
            lt(entries.createdAt, cursor.createdAt),
            and(
              eq(entries.createdAt, cursor.createdAt),
              lt(entries.id, cursor.id),
            ),
          );

    const whereClause =
      paginationClause !== undefined
        ? and(baseFilter, paginationClause)
        : baseFilter;

    const rows = await database
      .select({ entry: entries })
      .from(entrySpaces)
      .innerJoin(entries, eq(entrySpaces.entryId, entries.id))
      .where(whereClause)
      .orderBy(desc(entries.createdAt), desc(entries.id))
      .limit(take);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map((r) => toEntry(r.entry));

    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeSpaceEntryCursor({
            createdAt: last.entry.createdAt,
            id: last.entry.id,
          })
        : null;

    return { items, nextCursor };
  },

  async assignEntry(
    database: typeof db,
    userId: string,
    input: { entryId: string; spaceId: string },
  ): Promise<{ success: true }> {
    const [spaceRow] = await database
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, input.spaceId), eq(spaces.userId, userId)))
      .limit(1);

    if (!spaceRow) {
      throw new ORPCError("NOT_FOUND", { message: "Space not found" });
    }

    const [entryRow] = await database
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, input.entryId), eq(entries.userId, userId)))
      .limit(1);

    if (!entryRow) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }

    await database
      .insert(entrySpaces)
      .values({ entryId: input.entryId, spaceId: input.spaceId })
      .onConflictDoNothing();

    return { success: true };
  },

  async unassignEntry(
    database: typeof db,
    userId: string,
    input: { entryId: string; spaceId: string },
  ): Promise<{ success: true }> {
    const [spaceRow] = await database
      .select({ id: spaces.id })
      .from(spaces)
      .where(and(eq(spaces.id, input.spaceId), eq(spaces.userId, userId)))
      .limit(1);

    if (!spaceRow) {
      throw new ORPCError("NOT_FOUND", { message: "Space not found" });
    }

    const [entryRow] = await database
      .select({ id: entries.id })
      .from(entries)
      .where(and(eq(entries.id, input.entryId), eq(entries.userId, userId)))
      .limit(1);

    if (!entryRow) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }

    await database
      .delete(entrySpaces)
      .where(
        and(
          eq(entrySpaces.entryId, input.entryId),
          eq(entrySpaces.spaceId, input.spaceId),
        ),
      );

    return { success: true };
  },

  async deleteSpace(
    database: typeof db,
    userId: string,
    input: { id: string },
  ): Promise<{ success: true }> {
    const removed = await database
      .delete(spaces)
      .where(and(eq(spaces.id, input.id), eq(spaces.userId, userId)))
      .returning({ id: spaces.id });

    if (removed.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Space not found" });
    }
    return { success: true };
  },
};
