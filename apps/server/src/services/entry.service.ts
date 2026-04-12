import type { db } from "@mymemory/db";
import {
  entries,
  entryTags,
  entryTopics,
  tags,
  topics,
} from "@mymemory/db/schema";
import { entryDetailSchema, entrySchema } from "@mymemory/shared/contracts";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { z } from "zod";

type Entry = z.infer<typeof entrySchema>;
type EntryDetail = z.infer<typeof entryDetailSchema>;
type EntryRow = typeof entries.$inferSelect;

const cursorPayloadSchema = z.object({
  createdAt: z.string(),
  id: z.guid(),
});

function toEntry(row: EntryRow): Entry {
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

function encodeCursor(row: { createdAt: Date; id: string }): string {
  const payload = {
    createdAt: row.createdAt.toISOString(),
    id: row.id,
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } {
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
  };
}

export const entryService = {
  async listPaginated(
    database: typeof db,
    userId: string,
    input: { limit: number; cursor?: string | null },
  ): Promise<{ items: Entry[]; nextCursor: string | null }> {
    const limit = Math.min(Math.max(Number(input.limit ?? 20), 1), 50);
    const take = limit + 1;

    let cursor: { createdAt: Date; id: string } | undefined;
    if (input.cursor?.length) {
      cursor = decodeCursor(input.cursor);
    }

    const whereClause = cursor
      ? and(
          eq(entries.userId, userId),
          or(
            lt(entries.createdAt, cursor.createdAt),
            and(
              eq(entries.createdAt, cursor.createdAt),
              lt(entries.id, cursor.id),
            ),
          ),
        )
      : eq(entries.userId, userId);

    const rows = await database
      .select()
      .from(entries)
      .where(whereClause)
      .orderBy(desc(entries.createdAt), desc(entries.id))
      .limit(take);

    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const items = slice.map(toEntry);

    const last = slice[slice.length - 1];
    const nextCursor =
      hasMore && last
        ? encodeCursor({
            createdAt: last.createdAt,
            id: last.id,
          })
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
};
