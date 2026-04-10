import { extractFirstMarkdownImageUrl } from "@/utils/markdown";

const DIRECT_IMAGE_PATH_RE = /\.(jpg|jpeg|png|gif|webp|avif)(\?|#|$)/i;

function isLikelyDirectImageUrl(url: string): boolean {
  try {
    const path = new URL(url).pathname;
    return DIRECT_IMAGE_PATH_RE.test(path);
  } catch {
    return DIRECT_IMAGE_PATH_RE.test(url);
  }
}

type EntryHeroSource = {
  content: string;
  url?: string | null;
};

/**
 * Hero image: prefer first image in `content`; if none, use `url` when it points at an image file.
 */
export function resolveEntryHeroImageUri(entry: EntryHeroSource): string | undefined {
  const fromContent = extractFirstMarkdownImageUrl(entry.content);
  if (fromContent) return fromContent;
  const pageUrl = entry.url?.trim();
  if (pageUrl && isLikelyDirectImageUrl(pageUrl)) return pageUrl;
  return undefined;
}
