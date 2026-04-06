import { embed } from 'ai';
import { openai } from '@ai-sdk/openai';

// Stub for generating vector embeddings
export async function generateEmbedding(text: string) {
  try {
    const { embedding } = await embed({
      model: openai.embedding('text-embedding-3-small'),
      value: text,
    });
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
