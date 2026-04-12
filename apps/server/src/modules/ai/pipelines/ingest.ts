import { db, eq, and } from "@mymemory/db";
import {
  embeddings,
  entries,
  entryRelations,
  entrySpaces,
  entryTags,
  entryTopics,
  spaceSuggestions,
  tags,
  topics,
} from "@mymemory/db/schema";
import {
  extractMediumArticleWithFirecrawl,
  isMediumArticleUrl,
} from "../tools/extract-content-medium-firecrawl.js";
import { extractContentFromUrl } from "../tools/extract-content.js";
import type { ExtractionMetadata } from "../tools/extract-content.types.js";
import {
  collectImageUrls,
  extractCoverImage,
} from "../tools/extract-cover-image.js";
import { looksLikeBoilerplate, looksLikeUrl } from "../utils/title-quality.js";
import { analyzeContent } from "../tools/analyze-content.js";
import { cleanContent } from "../tools/clean-content.js";
import { generateEmbedding } from "../tools/generate-embedding.js";
import { assignSpace } from "../tools/assign-space.js";
import { findRelatedEntries } from "../tools/find-related-entries.js";

export async function processEntry(entryId: string, userId: string) {
  try {
    if (!entryId) {
      throw new Error(
        `processEntry called with undefined entryId! userId: ${userId}`,
      );
    }

    const [entry] = await db
      .update(entries)
      .set({ processedStatus: "processing", error: null })
      .where(eq(entries.id, entryId))
      .returning();

    if (!entry) throw new Error("Entry not found");

    let rawMarkdown = entry.content;
    let extractionMetadata: ExtractionMetadata | null = null;

    if (
      entry.type === "url" &&
      entry.url &&
      (!rawMarkdown || rawMarkdown.trim() === "")
    ) {
      if (isMediumArticleUrl(entry.url)) {
        if (process.env.FIRECRAWL_API_KEY?.trim()) {
          const result = await extractMediumArticleWithFirecrawl(entry.url);
          rawMarkdown = result.markdown;
          extractionMetadata = result.metadata;
        } else {
          console.warn(
            "[ingest] Medium URL but FIRECRAWL_API_KEY unset; using Jina Reader (may hit paywall)",
          );
          const result = await extractContentFromUrl(entry.url);
          rawMarkdown = result.markdown;
          extractionMetadata = result.metadata;
        }
      } else {
        const result = await extractContentFromUrl(entry.url);
        rawMarkdown = result.markdown;
        extractionMetadata = result.metadata;
      }
    }

    if (!rawMarkdown?.trim()) throw new Error("No content to process");

    let readableContent: string;
    if (entry.type === "note") {
      readableContent = rawMarkdown;
    } else {
      readableContent = await cleanContent(rawMarkdown);
    }
    readableContent = readableContent.trim();
    if (readableContent === "") {
      const extractedCover = extractCoverImage(extractionMetadata, rawMarkdown);
      await db
        .update(entries)
        .set({
          content: "",
          rawContent: rawMarkdown,
          readableContent: "",
          coverImageUrl: extractedCover,
          metadata: extractionMetadata,
          keyPoints: [],
          summary: null,
          wordCount: 0,
          language: null,
          processedStatus: "done",
          error: null,
        })
        .where(eq(entries.id, entryId));
      return;
    }

    const [existingTagRows, existingTopicRows] = await Promise.all([
      db.select({ name: tags.name }).from(tags).where(eq(tags.userId, userId)),
      db
        .select({ name: topics.name })
        .from(topics)
        .where(eq(topics.userId, userId)),
    ]);
    const existingTags = existingTagRows.map((t) => t.name);
    const existingTopics = existingTopicRows.map((t) => t.name);

    const imageUrls = collectImageUrls(extractionMetadata, rawMarkdown);

    const [analysis, embedding] = await Promise.all([
      analyzeContent({
        markdown: readableContent,
        existingTags,
        existingTopics,
        imageUrls,
      }),
      generateEmbedding(readableContent),
    ]);

    const {
      summary,
      keyPoints,
      tags: generatedTags,
      topics: extractedTopics,
      language,
      title: generatedTitle,
      heroImageUrl,
    } = analysis;

    const extractedCover = extractCoverImage(extractionMetadata, rawMarkdown);
    const resolvedCoverImageUrl = heroImageUrl ?? extractedCover;
    const wordCount = readableContent.split(/\s+/).filter(Boolean).length;

    const metadataTitle =
      extractionMetadata &&
      typeof extractionMetadata.title === "string" &&
      extractionMetadata.title.trim()
        ? extractionMetadata.title.trim()
        : null;

    const isMetadataTitleUseful =
      metadataTitle != null &&
      !looksLikeUrl(metadataTitle) &&
      !looksLikeBoilerplate(metadataTitle);

    const aiTitle = generatedTitle.trim();
    const resolvedTitle = entry.title?.trim()
      ? undefined
      : aiTitle || (isMetadataTitleUseful ? metadataTitle : null);

    const [spaceId, relatedEntries] = await Promise.all([
      assignSpace(userId, embedding),
      findRelatedEntries(userId, embedding, 5, entryId),
    ]);

    await db.transaction(async (tx) => {
      await tx
        .update(entries)
        .set({
          ...(resolvedTitle !== undefined ? { title: resolvedTitle } : {}),
          content: readableContent,
          rawContent: rawMarkdown,
          readableContent,
          coverImageUrl: resolvedCoverImageUrl,
          metadata: extractionMetadata,
          keyPoints,
          summary,
          wordCount,
          language: language ?? null,
          processedStatus: "done",
        })
        .where(eq(entries.id, entryId));

      await tx.insert(embeddings).values({
        entryId,
        vector: embedding,
      });

      if (generatedTags.length > 0) {
        for (const tagName of generatedTags) {
          let [tag] = await tx
            .select()
            .from(tags)
            .where(and(eq(tags.userId, userId), eq(tags.name, tagName)))
            .limit(1);
          if (!tag) {
            [tag] = await tx
              .insert(tags)
              .values({ userId, name: tagName })
              .returning();
          }
          await tx
            .insert(entryTags)
            .values({ entryId, tagId: tag.id })
            .onConflictDoNothing();
        }
      }

      if (extractedTopics.length > 0) {
        for (const topicInfo of extractedTopics) {
          let [topic] = await tx
            .select()
            .from(topics)
            .where(
              and(
                eq(topics.userId, userId),
                eq(topics.name, topicInfo.name),
              ),
            )
            .limit(1);
          if (!topic) {
            [topic] = await tx
              .insert(topics)
              .values({
                userId,
                name: topicInfo.name,
                description: topicInfo.description,
              })
              .returning();
          }
          await tx
            .insert(entryTopics)
            .values({ entryId, topicId: topic.id })
            .onConflictDoNothing();
        }
      }

      if (spaceId) {
        await tx
          .insert(entrySpaces)
          .values({ entryId, spaceId })
          .onConflictDoNothing();
      } else {
        await tx.insert(spaceSuggestions).values({
          userId,
          entryId,
          suggestedName: extractedTopics[0]?.name || "New Space",
          reason: "No existing spaces matched semantically.",
        });
      }

      for (const rel of relatedEntries) {
        if (rel.similarity > 0.5) {
          await tx
            .insert(entryRelations)
            .values({
              sourceEntryId: entryId,
              targetEntryId: rel.id,
              similarityScore: rel.similarity,
            })
            .onConflictDoNothing();
        }
      }
    });
  } catch (error: unknown) {
    console.error(`Pipeline failed for entry ${entryId}:`, error);
    await db
      .update(entries)
      .set({
        processedStatus: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .where(eq(entries.id, entryId));
  }
}
