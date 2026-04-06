import type { db } from "@mymemory/db";
import { entries } from "@mymemory/db/schema";
import { eq } from "drizzle-orm";
import type { z } from "zod";
import type { entrySchema } from "@mymemory/shared/contracts";

// Tools
import { extractContentFromUrl } from "../modules/ai/tools/extract-content.js";
import { summarizeText } from "../modules/ai/tools/summarize.js";
import { generateEmbedding } from "../modules/ai/tools/generate-embedding.js";
import { processEntry } from "../modules/ai/pipelines/ingest.js";

type Entry = z.infer<typeof entrySchema>;

export const aiService = {
  async ingest(
    database: typeof db,
    userId: string,
    input: { entryId: string }
  ): Promise<{ success: boolean; data: Entry }> {
    const { entryId } = input;

    // TODO: Ideally we pass database context to processEntry instead of it relying on a global db import.
    await processEntry(entryId, userId);

    const [updatedEntry] = await database
      .select()
      .from(entries)
      .where(eq(entries.id, entryId));

    if (!updatedEntry) {
      throw new Error("Entry not found after processing");
    }

    return {
      success: true,
      data: {
        ...updatedEntry,
        title: updatedEntry.title ?? undefined,
        summary: updatedEntry.summary ?? undefined,
        url: updatedEntry.url ?? undefined,
        error: updatedEntry.error ?? undefined,
      },
    };
  },

  async demo(
    input: { url?: string; text?: string }
  ): Promise<{ success: boolean; extractedText: string; summary: string; embeddingPreview: number[]; embeddingLength: number }> {
    const { url, text } = input;

    if (!process.env.JINA_API_KEY || !process.env.OPENAI_API_KEY) {
      throw new Error("Missing AI API keys in backend environment.");
    }

    let extractedText = text || "";

    if (url) {
      extractedText = await extractContentFromUrl(url);
    }

    if (!extractedText) {
      throw new Error("Failed to extract content, or no URL provided.");
    }

    const summary = await summarizeText(extractedText);
    const embedding = await generateEmbedding(summary);

    return {
      success: true,
      extractedText: url
        ? extractedText.substring(0, 300) + "... (truncated)"
        : extractedText,
      summary,
      embeddingPreview: embedding.slice(0, 5),
      embeddingLength: embedding.length,
    };
  }
};
