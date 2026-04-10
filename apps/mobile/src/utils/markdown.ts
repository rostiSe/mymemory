/**
 * Shared markdown string helpers (URLs, images) for any screen that renders markdown.
 */

/**
 * Standard image: `![alt](url)` or `![alt](url "optional title")`.
 * Allows whitespace after `]` / around parens (some editors wrap lines).
 */
const MARKDOWN_IMAGE_RE =
  /!\[[^\]]*]\s*\(\s*(https?:\/\/[^)\s]+)(?:\s+"[^"]*")?\s*\)/;

/** HTML img src (common in fetched article HTML stored as content). */
const HTML_IMG_SRC_RE = /<img[^>]+src=["'](https?:\/\/[^"']+)/i;

/** First bare image URL in text (own line or inline). */
const BARE_IMAGE_URL_RE =
  /(https?:\/\/[^\s<>"')]+\.(?:jpg|jpeg|png|gif|webp|avif)(?:\?[^\s<>"')]*)?)/i;

/**
 * Returns the first image URL found in `content`: Markdown `![](url)`, `<img src>`, or bare https image link.
 */
export function extractFirstMarkdownImageUrl(content: string): string | undefined {
  if (!content.trim()) return undefined;
  const md = content.match(MARKDOWN_IMAGE_RE);
  if (md?.[1]) return md[1];
  const html = content.match(HTML_IMG_SRC_RE);
  if (html?.[1]) return html[1];
  const bare = content.match(BARE_IMAGE_URL_RE);
  if (bare?.[1]) return bare[1];
  return undefined;
}
