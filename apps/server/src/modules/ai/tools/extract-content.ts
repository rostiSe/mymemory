// Jina Reader API Integration
// Extracts clean Markdown from any URL using ReaderLM v2

import type { ExtractionMetadata, ExtractionResult } from './extract-content.types.js';

function ogImageFromJinaImages(images: unknown): string | undefined {
  if (!images || !Array.isArray(images) || images.length === 0) return undefined;
  const first = images[0];
  if (typeof first === 'string' && first.trim()) return first.trim();
  if (
    first &&
    typeof first === 'object' &&
    'src' in first &&
    typeof (first as { src: unknown }).src === 'string'
  ) {
    const src = (first as { src: string }).src.trim();
    return src || undefined;
  }
  return undefined;
}

function buildJinaMetadata(data: {
  title?: string;
  description?: string;
  url?: string;
  images?: unknown;
  siteName?: string;
  author?: string;
  publishedTime?: string;
}): ExtractionMetadata | null {
  const ogImage = ogImageFromJinaImages(data.images);
  const meta: ExtractionMetadata = {
    title: data.title,
    description: data.description,
    ogImage,
    siteName: data.siteName,
    author: data.author,
    publishedAt: data.publishedTime,
    sourceUrl: data.url,
  };
  const hasAny =
    meta.title != null ||
    meta.description != null ||
    meta.ogImage != null ||
    meta.siteName != null ||
    meta.author != null ||
    meta.publishedAt != null ||
    data.url != null;
  return hasAny ? meta : null;
}

export async function extractContentFromUrl(url: string): Promise<ExtractionResult> {
  const jinaKey = process.env.JINA_API_KEY;
  if (!jinaKey) {
    throw new Error('JINA_API_KEY is not set');
  }

  const jinaUrl = `https://r.jina.ai/${encodeURIComponent(url)}`;

  try {
    const response = await fetch(jinaUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${jinaKey}`,
        'X-Reader-Model': 'readerlm-v2',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jina Reader API error: ${response.statusText}`);
    }

    const json: unknown = await response.json();

    if (!json || typeof json !== 'object' || Array.isArray(json)) {
      throw new Error('Jina Reader returned empty or invalid content');
    }

    const payload = (json as { data?: unknown }).data;
    if (
      payload == null ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw new Error('Jina Reader returned empty or invalid content');
    }

    const data = payload as {
      content?: unknown;
      title?: string;
      description?: string;
      url?: string;
      images?: unknown;
      siteName?: string;
      author?: string;
      publishedTime?: string;
    };

    const content = data.content;
    if (typeof content !== 'string') {
      throw new Error('Jina Reader returned empty or invalid content');
    }

    const markdown = content.trim();
    if (markdown.length === 0) {
      throw new Error('Jina Reader returned empty or invalid content');
    }

    return {
      markdown,
      metadata: buildJinaMetadata(data),
    };
  } catch (error) {
    console.error('Error extracting content via Jina Reader:', error);
    throw error;
  }
}
