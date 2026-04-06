import type { db } from "@mymemory/db";
import { entries } from "@mymemory/db/schema";
import { and, desc, eq } from "drizzle-orm";
import type { z } from "zod";
import type { entryContract, entrySchema } from "@mymemory/shared/contracts";

type Entry = z.infer<typeof entrySchema>;

export const entryService = {
  async list(database: typeof db, userId: string): Promise<Entry[]> {
    const userEntries = await database
      .select()
      .from(entries)
      .where(eq(entries.userId, userId))
      .orderBy(desc(entries.createdAt));

    return userEntries.map(e => ({
      ...e,
      title: e.title ?? undefined,
      summary: e.summary ?? undefined,
      url: e.url ?? undefined,
      error: e.error ?? undefined,
    }));
  },

  async getById(
    database: typeof db,
    userId: string,
    input: { id: string }
  ): Promise<Entry | null> {
    const [row] = await database
      .select()
      .from(entries)
      .where(and(eq(entries.id, input.id), eq(entries.userId, userId)))
      .limit(1);

    if (!row) return null;
    return {
      ...row,
      title: row.title ?? undefined,
      summary: row.summary ?? undefined,
      url: row.url ?? undefined,
      error: row.error ?? undefined,
    };
  },

  async create(
    database: typeof db,
    userId: string,
    input: { url?: string; title?: string; content?: string; type?: "url" | "note" }
  ): Promise<Entry> {
    const { url, title, type = "url", content = "" } = input;

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

    return {
      ...newEntry,
      title: newEntry.title ?? undefined,
      summary: newEntry.summary ?? undefined,
      url: newEntry.url ?? undefined,
      error: newEntry.error ?? undefined,
    };
  },
};
