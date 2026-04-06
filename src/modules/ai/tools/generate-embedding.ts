import { embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';

/** OpenAI embedding models reject inputs over 8192 tokens. */
const OPENAI_EMBEDDING_MAX_TOKENS = 8192;

/** Margin so URL-heavy markdown (high tokens/char) still fits. */
const TOKEN_SAFETY_MARGIN = 512;

/**
 * Conservative chars per token for web markdown (links, punctuation).
 * Lower = smaller chunks = fewer 400s from OpenAI.
 */
const HEURISTIC_CHARS_PER_TOKEN = 2.5;

const MAX_CHARS_PER_CHUNK = Math.floor(
  (OPENAI_EMBEDDING_MAX_TOKENS - TOKEN_SAFETY_MARGIN) * HEURISTIC_CHARS_PER_TOKEN,
);

/** Cap embedding API calls per entry (remaining text is not reflected in the vector). */
const MAX_CHUNKS = 8;

const embeddingModel = openai.embedding('text-embedding-3-small');

function splitIntoEmbeddingChunks(text: string): string[] {
  const normalized = text.trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  for (
    let i = 0;
    i < normalized.length && chunks.length < MAX_CHUNKS;
    i += MAX_CHARS_PER_CHUNK
  ) {
    chunks.push(normalized.slice(i, i + MAX_CHARS_PER_CHUNK));
  }
  return chunks;
}

/** Element-wise mean then L2-normalize (stable cosine similarity vs single-embed). */
function averagePool(vectors: number[][]): number[] {
  const n = vectors.length;
  const dim = vectors[0]?.length ?? 0;
  if (n === 0 || dim === 0) {
    throw new Error('Cannot average empty embeddings');
  }

  const acc = new Float64Array(dim);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      acc[i] += v[i]!;
    }
  }
  for (let i = 0; i < dim; i++) {
    acc[i] /= n;
  }

  let normSq = 0;
  for (let i = 0; i < dim; i++) {
    normSq += acc[i]! * acc[i]!;
  }
  const norm = Math.sqrt(normSq);
  if (norm === 0) {
    return Array.from(acc);
  }

  const out = new Array<number>(dim);
  for (let i = 0; i < dim; i++) {
    out[i] = acc[i]! / norm;
  }
  return out;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  const chunks = splitIntoEmbeddingChunks(text);
  if (chunks.length === 0) {
    throw new Error('No text to embed');
  }

  try {
    if (chunks.length === 1) {
      const { embedding } = await embed({
        model: embeddingModel,
        value: chunks[0]!,
      });
      return embedding;
    }

    const { embeddings } = await embedMany({
      model: embeddingModel,
      values: chunks,
    });
    return averagePool(embeddings);
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}
