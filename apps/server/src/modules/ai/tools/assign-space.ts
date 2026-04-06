import { db, sql } from '@mymemory/db';
import { spaces } from '@mymemory/db/schema';

/**
 * Finds the most semantically relevant space for a given embedding.
 * Uses pgvector's cosine distance operator (<=>).
 */
export async function assignSpace(userId: string, embedding: number[]): Promise<string | null> {
  const result = await db
    .select({
      id: spaces.id,
      distance: sql<number>`${spaces.centroidVector} <=> ${JSON.stringify(embedding)}::vector`,
    })
    .from(spaces)
    .where(sql`${spaces.userId} = ${userId} AND ${spaces.centroidVector} IS NOT NULL`)
    .orderBy(sql`${spaces.centroidVector} <=> ${JSON.stringify(embedding)}::vector`)
    .limit(1);

  // If a space is found and the distance is below an arbitrary threshold (e.g. 0.3 means highly similar), assign it
  if (result.length > 0 && result[0].distance < 0.3) {
    return result[0].id;
  }
  
  return null;
}
