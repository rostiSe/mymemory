import type { ExtractionMetadata } from './extract-content.types.js';

/** Markdown image: ![alt](url) — aligned with `apps/mobile/src/utils/markdown.ts`. */
const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*]\s*\(\s*(https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\s*\)/;

/** HTML img tag in markdown content */
const HTML_IMG_SRC_RE = /<img[^>]+src=["'](https?:\/\/[^"']+)/i;

/** Bare image URL */
const BARE_IMAGE_URL_RE =
  /(https?:\/\/[^\s<>"')]+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?[^\s<>"')]*)?)/i;

/**
 * Extract the best cover image from metadata and markdown content.
 * Pure function — no AI, no network calls.
 */
export function extractCoverImage(
  metadata: ExtractionMetadata | null,
  rawMarkdown: string,
): string | null {
  if (metadata?.ogImage && isValidImageUrl(metadata.ogImage)) {
    return metadata.ogImage;
  }

  const md = rawMarkdown.match(MARKDOWN_IMAGE_RE);
  if (md?.[1]) return md[1];

  const html = rawMarkdown.match(HTML_IMG_SRC_RE);
  if (html?.[1]) return html[1];

  const bare = rawMarkdown.match(BARE_IMAGE_URL_RE);
  if (bare?.[1]) return bare[1];

  return null;
}

function isValidImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}
