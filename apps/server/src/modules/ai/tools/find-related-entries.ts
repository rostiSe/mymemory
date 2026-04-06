import { db, sql } from '@mymemory/db';
import { entries, embeddings } from '@mymemory/db/schema';

/**
 * Finds the most semantically related entries to a given embedding.
 */
export async function findRelatedEntries(
  userId: string, 
  embedding: number[], 
  limit = 5, 
  excludeEntryId?: string
) {
  const query = db
    .select({
      id: entries.id,
      title: entries.title,
      summary: entries.summary,
      // Convert cosine distance (<=>) back to a 0-1 similarity score
      similarity: sql<number>`1 - (${embeddings.vector} <=> ${JSON.stringify(embedding)}::vector)`.as('similarity'),
    })
    .from(entries)
    .innerJoin(embeddings, sql`${entries.id} = ${embeddings.entryId}`)
    .where(
      sql`${entries.userId} = ${userId} 
      ${excludeEntryId ? sql`AND ${entries.id} != ${excludeEntryId}` : sql``}`
    )
    .orderBy(sql`${embeddings.vector} <=> ${JSON.stringify(embedding)}::vector`)
    .limit(limit);

  return await query;
}
