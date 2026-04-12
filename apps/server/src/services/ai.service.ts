import type { db } from "@mymemory/db";
import { entries } from "@mymemory/db/schema";
import { entrySchema } from "@mymemory/shared/contracts";
import { eq } from "drizzle-orm";
import { z } from "zod";

// Tools
import { processEntry } from "../modules/ai/pipelines/ingest.js";
import { extractContentFromUrl } from "../modules/ai/tools/extract-content.js";
import { generateEmbedding } from "../modules/ai/tools/generate-embedding.js";
import { summarizeText } from "../modules/ai/tools/summarize.js";

type Entry = z.infer<typeof entrySchema>;

export const aiService = {
  async ingest(
    database: typeof db,
    userId: string,
    input: { entryId: string },
  ): Promise<{ success: boolean; data: Entry }> {
    const { entryId } = input;
    if (!entryId) {
      throw new Error("Entry ID is required");
    }

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
        rawContent: updatedEntry.rawContent ?? undefined,
        readableContent: updatedEntry.readableContent ?? undefined,
        coverImageUrl: updatedEntry.coverImageUrl ?? undefined,
        metadata: updatedEntry.metadata ?? undefined,
        keyPoints: updatedEntry.keyPoints ?? undefined,
        lastReadAt: updatedEntry.lastReadAt ?? undefined,
        sourceApp: updatedEntry.sourceApp ?? undefined,
        wordCount: updatedEntry.wordCount ?? undefined,
        language: updatedEntry.language ?? undefined,
      } as Entry,
    };
  },

  async demo(input: { url?: string; text?: string }): Promise<{
    success: boolean;
    extractedText: string;
    summary: string;
    embeddingPreview: number[];
    embeddingLength: number;
  }> {
    const inputData = input as any;
    const url = inputData?.url || inputData?.data?.url;
    const text = inputData?.text || inputData?.data?.text;

    if (!process.env.JINA_API_KEY || !process.env.OPENAI_API_KEY) {
      throw new Error("Missing AI API keys in backend environment.");
    }

    let extractedText = text || "";

    if (url) {
      extractedText = (await extractContentFromUrl(url)).markdown;
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
  },
};
