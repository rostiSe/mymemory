import type { db } from "@mymemory/db";
import {
  embeddings,
  entries,
  entryRelations,
  entryTags,
  entryTopics,
  tags,
  topics,
} from "@mymemory/db/schema";
import { entryDetailSchema, entrySchema } from "@mymemory/shared/contracts";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, getTableColumns, lt, or, sql } from "drizzle-orm";
import { z } from "zod";

type Entry = z.infer<typeof entrySchema>;
type EntryDetail = z.infer<typeof entryDetailSchema>;
type EntryRow = typeof entries.$inferSelect;

/** Cosine similarity from pgvector `1 - (vector <=> query)`; below this is noise. */
const SEMANTIC_SEARCH_MIN_SIMILARITY = 0.3;

const cursorPayloadSchema = z.object({
  createdAt: z.string(),
  id: z.guid(),
  /** Present for `filter === "all"` (pinned-first ordering). */
  isPinned: z.boolean().optional(),
});

export function toEntry(row: EntryRow): Entry {
  return {
    ...row,
    title: row.title ?? undefined,
    summary: row.summary ?? undefined,
    url: row.url ?? undefined,
    error: row.error ?? undefined,
    rawContent: row.rawContent ?? undefined,
    readableContent: row.readableContent ?? undefined,
    coverImageUrl: row.coverImageUrl ?? undefined,
    metadata: row.metadata ?? undefined,
    keyPoints: row.keyPoints ?? undefined,
    lastReadAt: row.lastReadAt ?? undefined,
    sourceApp: row.sourceApp ?? undefined,
    wordCount: row.wordCount ?? undefined,
    language: row.language ?? undefined,
  } as Entry;
}

function encodeCursor(
  row: { createdAt: Date; id: string; isPinned: boolean },
  filter: "all" | "favorites" | "pinned" | "to-review",
): string {
  const payload: {
    createdAt: string;
    id: string;
    isPinned?: boolean;
  } = {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  };
  if (filter === "all") {
    payload.isPinned = row.isPinned;
  }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): {
  createdAt: Date;
  id: string;
  isPinned?: boolean;
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
  } catch {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
  }
  const result = cursorPayloadSchema.safeParse(parsed);
  if (!result.success) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid cursor" });
  }
  return {
    createdAt: new Date(result.data.createdAt),
    id: result.data.id,
    isPinned: result.data.isPinned,
  };
}

export const entryService = {
  async listPaginated(
    database: typeof db,
    userId: string,
    input: {
      limit: number;
      cursor?: string | null;
      filter?: "all" | "favorites" | "pinned" | "to-review";
    },
  ): Promise<{ items: Entry[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(Number(input.limit ?? 20), 1), 50);
    const take = limit + 1;
    const filter = input.filter ?? "all";

    let cursor:
      | { createdAt: Date; id: string; isPinned?: boolean }
      | undefined;
    if (input.cursor?.length) {
      cursor = decodeCursor(input.cursor);
    }

    let filterClause = and(
      eq(entries.userId, userId),
      eq(entries.isArchived, false),
    );

    switch (filter) {
      case "favorites":
        filterClause = and(filterClause, eq(entries.isFavorited, true));
        break;
      case "pinned":
        filterClause = and(filterClause, eq(entries.isPinned, true));
        break;
      case "to-review":
        filterClause = and(filterClause, eq(entries.reviewStatus, "unreviewed"));
        break;
      default:
        break;
    }

    let paginationClause;
    if (!cursor) {
      paginationClause = undefined;
    } else if (filter !== "all" || cursor.isPinned === undefined) {
      paginationClause = or(
        lt(entries.createdAt, cursor.createdAt),
        and(
          eq(entries.createdAt, cursor.createdAt),
          lt(entries.id, cursor.id),
        ),
      );
    } else if (cursor.isPinned) {
      paginationClause = or(
        and(
          eq(entries.isPinned, true),
          or(
            lt(entries.createdAt, cursor.createdAt),
            and(
              eq(entries.createdAt, cursor.createdAt),
              lt(entries.id, cursor.id),
            ),
          ),
        ),
        eq(entries.isPinned, false),
      );
    } else {
      paginationClause = and(
        eq(entries.isPinned, false),
        or(
          lt(entries.createdAt, cursor.createdAt),
          and(
            eq(entries.createdAt, cursor.createdAt),
            lt(entries.id, cursor.id),
          ),
        ),
      );
    }

    const whereClause =
      paginationClause !== undefined
        ? and(filterClause, paginationClause)
        : filterClause;

    const orderByClause =
      filter === "all"
        ? [desc(entries.isPinned), desc(entries.createdAt), desc(entries.id)]
        : [desc(entries.createdAt), desc(entries.id)];

    const rows = await database
      .select()
      .from(entries)
      .where(whereClause)
      .orderBy(...orderByClause)
      .limit(take);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map(toEntry);

    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor(
            {
              createdAt: last.createdAt,
              id: last.id,
              isPinned: last.isPinned,
            },
            filter,
          )
        : null;

    return { items, nextCursor };
  },

  async getById(
    database: typeof db,
    userId: string,
    input: { id: string },
  ): Promise<EntryDetail | null> {
    const [row] = await database
      .select()
      .from(entries)
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .limit(1);

    if (!row) return null;

    const base = toEntry(row);
    const [tagRows, topicRows] = await Promise.all([
      database
        .select({ id: tags.id, name: tags.name })
        .from(entryTags)
        .innerJoin(tags, eq(entryTags.tagId, tags.id))
        .where(
          and(eq(entryTags.entryId, input.id), eq(tags.userId, userId)),
        ),
      database
        .select({
          id: topics.id,
          name: topics.name,
          description: topics.description,
        })
        .from(entryTopics)
        .innerJoin(topics, eq(entryTopics.topicId, topics.id))
        .where(
          and(eq(entryTopics.entryId, input.id), eq(topics.userId, userId)),
        ),
    ]);

    return {
      ...base,
      tags: tagRows,
      topics: topicRows.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? undefined,
      })),
    };
  },

  async create(
    database: typeof db,
    userId: string,
    input: {
      url?: string;
      title?: string;
      content?: string;
      type?: "url" | "note";
    },
  ): Promise<Entry> {
    console.log("[entry.service.ts] create input:", input);
    const { url, title, type = "url", content = "" } = input || {};

    const [newEntry] = await database
      .insert(entries)
      .values({
        userId,
        url: url || null,
        title: title || null,
        type,
        content,
        processedStatus: "pending",
      })
      .returning();
    return toEntry(newEntry);
  },

  async toggleField(
    database: typeof db,
    userId: string,
    input: {
      id: string;
      field: "isFavorited" | "isPinned" | "isArchived";
      value: boolean;
    },
  ): Promise<Entry> {
    const patch =
      input.field === "isFavorited"
        ? { isFavorited: input.value, updatedAt: new Date() }
        : input.field === "isPinned"
          ? { isPinned: input.value, updatedAt: new Date() }
          : { isArchived: input.value, updatedAt: new Date() };

    const [row] = await database
      .update(entries)
      .set(patch)
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .returning();

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }
    return toEntry(row);
  },

  async setReviewStatus(
    database: typeof db,
    userId: string,
    input: {
      id: string;
      status: "unreviewed" | "kept" | "dismissed" | "remind";
    },
  ): Promise<Entry> {
    const [row] = await database
      .update(entries)
      .set({
        reviewStatus: input.status,
        updatedAt: new Date(),
      })
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .returning();

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }
    return toEntry(row);
  },

  async trackRead(
    database: typeof db,
    userId: string,
    input: { id: string },
  ): Promise<Entry> {
    const [row] = await database
      .update(entries)
      .set({
        readCount: sql`${entries.readCount} + 1`,
        lastReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .returning();

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }
    return toEntry(row);
  },

  async retryIngest(
    database: typeof db,
    userId: string,
    input: { id: string },
  ): Promise<Entry> {
    const [existing] = await database
      .select()
      .from(entries)
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }
    if (existing.processedStatus !== "failed") {
      throw new ORPCError("BAD_REQUEST", {
        message: "retryIngest is only allowed when processedStatus is failed",
      });
    }

    await database.transaction(async (tx) => {
      await tx.delete(embeddings).where(eq(embeddings.entryId, input.id));
      await tx.delete(entryTags).where(eq(entryTags.entryId, input.id));
      await tx.delete(entryTopics).where(eq(entryTopics.entryId, input.id));
      await tx.delete(entryRelations).where(
        or(
          eq(entryRelations.sourceEntryId, input.id),
          eq(entryRelations.targetEntryId, input.id),
        ),
      );

      await tx
        .update(entries)
        .set({
          processedStatus: "pending",
          error: null,
          summary: null,
          keyPoints: null,
          readableContent: null,
          rawContent: null,
          coverImageUrl: null,
          metadata: null,
          wordCount: null,
          language: null,
          updatedAt: new Date(),
        })
        .where(and(eq(entries.id, input.id), eq(entries.userId, userId)));
    });

    const [row] = await database
      .select()
      .from(entries)
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .limit(1);

    if (!row) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }
    return toEntry(row);
  },

  async search(
    database: typeof db,
    userId: string,
    input: { query: string; limit: number },
    embedding: number[],
  ): Promise<{ items: Array<Entry & { similarity: number }> }> {
    const limit = Math.min(Math.max(input.limit, 1), 30);
    const vectorLiteral = JSON.stringify(embedding);
    const fetchCap = Math.min(limit * 8, 120);

    const rows = await database
      .select({
        ...getTableColumns(entries),
        similarity:
          sql<number>`1 - (${embeddings.vector} <=> ${vectorLiteral}::vector)`.as(
            "similarity",
          ),
      })
      .from(entries)
      .innerJoin(embeddings, eq(entries.id, embeddings.entryId))
      .where(
        and(eq(entries.userId, userId), eq(entries.isArchived, false)),
      )
      .orderBy(sql`${embeddings.vector} <=> ${vectorLiteral}::vector`)
      .limit(fetchCap);

    const filtered = rows
      .filter((r) => r.similarity >= SEMANTIC_SEARCH_MIN_SIMILARITY)
      .slice(0, limit);

    return {
      items: filtered.map((r) => {
        const { similarity, ...row } = r;
        return { ...toEntry(row), similarity };
      }),
    };
  },

  async delete(
    database: typeof db,
    userId: string,
    input: { id: string },
  ): Promise<{ success: true }> {
    const removed = await database
      .delete(entries)
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .returning({ id: entries.id });

    if (removed.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Entry not found" });
    }
    return { success: true };
  },
};
