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
  /** Set by ingest pipeline (OG / first article image). */
  coverImageUrl?: string | null;
};

function isHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Hero image: prefer pipeline `coverImageUrl`, then first image in `content`, then direct image `url`.
 */
export function resolveEntryHeroImageUri(entry: EntryHeroSource): string | undefined {
  const cover = entry.coverImageUrl?.trim();
  if (cover && isHttpUrl(cover)) return cover;
  const fromContent = extractFirstMarkdownImageUrl(entry.content);
  if (fromContent) return fromContent;
  const pageUrl = entry.url?.trim();
  if (pageUrl && isHttpUrl(pageUrl) && isLikelyDirectImageUrl(pageUrl)) return pageUrl;
  return undefined;
}
