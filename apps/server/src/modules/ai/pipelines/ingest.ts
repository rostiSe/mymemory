import { db, eq } from '@mymemory/db';
import { 
  entries, 
  embeddings, 
  tags, 
  entryTags, 
  topics, 
  entryTopics, 
  spaces, 
  entrySpaces, 
  entryRelations,
  spaceSuggestions
} from '@mymemory/db/schema';
import { extractContentFromUrl } from '../tools/extract-content.js';
import {
  extractMediumArticleWithFirecrawl,
  isMediumArticleUrl,
} from '../tools/extract-content-medium-firecrawl.js';
import { summarizeText } from '../tools/summarize.js';
import { generateEmbedding } from '../tools/generate-embedding.js';
import { generateTags } from '../tools/generate-tags.js';
import { extractTopics } from '../tools/extract-topics.js';
import { assignSpace } from '../tools/assign-space.js';
import { findRelatedEntries } from '../tools/find-related-entries.js';

export async function processEntry(entryId: string, userId: string) {
  try {
    // 1. Fetch Entry & Mark Processing
    const [entry] = await db
      .update(entries)
      .set({ processedStatus: 'processing', error: null })
      .where(eq(entries.id, entryId))
      .returning();

    if (!entry) throw new Error('Entry not found');

    let markdown = entry.content;

    // 2. Extract content for URLs if content is empty or not yet extracted
    if (entry.type === 'url' && entry.url && (!markdown || markdown.trim() === '')) {
      if (isMediumArticleUrl(entry.url)) {
        if (process.env.FIRECRAWL_API_KEY?.trim()) {
          markdown = await extractMediumArticleWithFirecrawl(entry.url);
        } else {
          console.warn(
            '[ingest] Medium URL but FIRECRAWL_API_KEY unset; using Jina Reader (may hit paywall)',
          );
          markdown = await extractContentFromUrl(entry.url);
        }
      } else {
        markdown = await extractContentFromUrl(entry.url);
      }
      // We don't save immediately, we'll save in the final transaction to avoid partial states
    }

    if (!markdown) throw new Error('No content to process');

    // 3. Parallel: Summarize + Embed
    const [summary, embedding] = await Promise.all([
      summarizeText(markdown),
      generateEmbedding(markdown),
    ]);

    // 4. Parallel: Generate Tags & Extract Topics
    // For a real app, we'd fetch existing tags/topics here to pass in, but skipping for brevity
    const [generatedTags, extractedTopics] = await Promise.all([
      generateTags(markdown, summary),
      extractTopics(markdown, summary),
    ]);

    // 5. Semantic operations (need embedding)
    const { assignSpace } = await import('../tools/assign-space.js');
    const { findRelatedEntries } = await import('../tools/find-related-entries.js');
    
    const [spaceId, relatedEntries] = await Promise.all([
      assignSpace(userId, embedding),
      findRelatedEntries(userId, embedding, 5, entryId),
    ]);

    // 6. Transaction: Persist all results atomically
    await db.transaction(async (tx) => {
      // Update entry with new content and summary
      await tx.update(entries).set({
        content: markdown,
        summary,
        processedStatus: 'done',
      }).where(eq(entries.id, entryId));

      // Insert embedding
      await tx.insert(embeddings).values({
        entryId,
        vector: embedding,
      });

      // Tags
      if (generatedTags.length > 0) {
        for (const tagName of generatedTags) {
          let [tag] = await tx.select().from(tags).where(eq(tags.name, tagName)).limit(1);
          if (!tag) {
            [tag] = await tx.insert(tags).values({ userId, name: tagName }).returning();
          }
          await tx.insert(entryTags).values({ entryId, tagId: tag.id }).onConflictDoNothing();
        }
      }

      // Topics
      if (extractedTopics.length > 0) {
        for (const topicInfo of extractedTopics) {
          let [topic] = await tx.select().from(topics).where(eq(topics.name, topicInfo.name)).limit(1);
          if (!topic) {
            [topic] = await tx.insert(topics).values({ 
              userId, 
              name: topicInfo.name, 
              description: topicInfo.description 
            }).returning();
          }
          await tx.insert(entryTopics).values({ entryId, topicId: topic.id }).onConflictDoNothing();
        }
      }

      // Spaces
      if (spaceId) {
        await tx.insert(entrySpaces).values({ entryId, spaceId }).onConflictDoNothing();
        // Here we could also recalculate the centroid vector of the space
      } else {
        // Suggest a space
        await tx.insert(spaceSuggestions).values({
          userId,
          entryId,
          suggestedName: extractedTopics[0]?.name || 'New Space',
          reason: 'No existing spaces matched semantically.',
        });
      }

      // Relations
      for (const rel of relatedEntries) {
        if (rel.similarity > 0.5) { // Only link if reasonably similar
          await tx.insert(entryRelations).values({
            sourceEntryId: entryId,
            targetEntryId: rel.id,
            similarityScore: rel.similarity,
          }).onConflictDoNothing();
        }
      }
    });

  } catch (error: unknown) {
    console.error(`Pipeline failed for entry ${entryId}:`, error);
    await db.update(entries)
      .set({ processedStatus: 'failed', error: error instanceof Error ? error.message : 'Unknown error' })
      .where(eq(entries.id, entryId));
  }
}
