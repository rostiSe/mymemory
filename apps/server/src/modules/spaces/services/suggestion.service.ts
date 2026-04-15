import type { db } from "@mymemory/db";
import { entries } from "@mymemory/db/schema/entries";
import { spaceSuggestions } from "@mymemory/db/schema/space-suggestions";
import { entrySpaces, spaces } from "@mymemory/db/schema/spaces";
import type { spaceSchema } from "@mymemory/shared/contracts";
import { ORPCError } from "@orpc/server";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";

type Space = z.infer<typeof spaceSchema>;

function toSpace(row: typeof spaces.$inferSelect): Space {
  return {
    ...row,
    description: row.description ?? undefined,
    centroidVector: row.centroidVector ?? undefined,
  };
}

export const suggestionService = {
  async listSuggestions(
    database: typeof db,
    userId: string,
  ): Promise<
    {
      id: string;
      entryId: string;
      entryTitle: string;
      suggestedName: string;
      reason: string | null;
      createdAt: Date;
    }[]
  > {
    const rows = await database
      .select({
        id: spaceSuggestions.id,
        entryId: spaceSuggestions.entryId,
        entryTitle: entries.title,
        entryUrl: entries.url,
        suggestedName: spaceSuggestions.suggestedName,
        reason: spaceSuggestions.reason,
        createdAt: spaceSuggestions.createdAt,
      })
      .from(spaceSuggestions)
      .innerJoin(entries, eq(spaceSuggestions.entryId, entries.id))
      .where(
        and(
          eq(spaceSuggestions.userId, userId),
          eq(entries.userId, userId),
        ),
      )
      .orderBy(desc(spaceSuggestions.createdAt));

    return rows.map((r) => ({
      id: r.id,
      entryId: r.entryId,
      entryTitle:
        (r.entryTitle && r.entryTitle.trim()) ||
        (r.entryUrl && r.entryUrl.trim()) ||
        "Untitled",
      suggestedName: r.suggestedName,
      reason: r.reason,
      createdAt: r.createdAt,
    }));
  },

  async approveSuggestion(
    database: typeof db,
    userId: string,
    input: { suggestionId: string; spaceName?: string },
  ): Promise<Space> {
    return database.transaction(async (tx) => {
      const [suggestion] = await tx
        .select()
        .from(spaceSuggestions)
        .where(
          and(
            eq(spaceSuggestions.id, input.suggestionId),
            eq(spaceSuggestions.userId, userId),
          ),
        )
        .limit(1);

      if (!suggestion) {
        throw new ORPCError("NOT_FOUND", { message: "Suggestion not found" });
      }

      const [entryRow] = await tx
        .select({ id: entries.id })
        .from(entries)
        .where(
          and(
            eq(entries.id, suggestion.entryId),
            eq(entries.userId, userId),
          ),
        )
        .limit(1);

      if (!entryRow) {
        throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
      }

      const rawName =
        (input.spaceName?.trim() || suggestion.suggestedName).trim() ||
        "New Space";

      const [space] = await tx
        .insert(spaces)
        .values({
          userId,
          name: rawName,
        })
        .returning();

      if (!space) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to create space",
        });
      }

      await tx
        .insert(entrySpaces)
        .values({ entryId: suggestion.entryId, spaceId: space.id })
        .onConflictDoNothing();

      await tx
        .delete(spaceSuggestions)
        .where(eq(spaceSuggestions.id, suggestion.id));

      return toSpace(space);
    });
  },

  async rejectSuggestion(
    database: typeof db,
    userId: string,
    input: { suggestionId: string },
  ): Promise<{ success: true }> {
    const removed = await database
      .delete(spaceSuggestions)
      .where(
        and(
          eq(spaceSuggestions.id, input.suggestionId),
          eq(spaceSuggestions.userId, userId),
        ),
      )
      .returning({ id: spaceSuggestions.id });

    if (removed.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Suggestion not found" });
    }
    return { success: true };
  },
};
