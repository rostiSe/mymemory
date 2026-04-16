/**
 * Collapse a markdown string to plain, single-line-friendly text for feed excerpts.
 *
 * Why: feed rows are recycled in FlashList. Rendering the native
 * `react-native-enriched-markdown` view inside recycled cells caused Android crashes
 * under fast scrolling (T-013 follow-up). Plain `<Text>` is safe to recycle and cheap
 * to re-layout.
 *TODO: Remove this once we have a proper markdown parser.
 * This is intentionally lightweight (regex-based) — it strips the syntax users typically
 * produce in summaries (headings, emphasis, code fences, links, images, lists, blockquotes,
 * HTML comments) so the first few lines read naturally. It is not a full parser.
 */
export function stripMarkdownToPlainText(input: string): string {
  if (!input) return "";

  let out = input;

  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/```[\s\S]*?```/g, " ");
  out = out.replace(/`([^`]+)`/g, "$1");
  out = out.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  out = out.replace(/^\s{0,3}>+\s?/gm, "");
  out = out.replace(/^\s{0,3}#{1,6}\s+/gm, "");
  out = out.replace(/^\s{0,3}(?:[-*+]|\d+[.)])\s+/gm, "");
  out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
  out = out.replace(/__([^_]+)__/g, "$1");
  out = out.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1$2");
  out = out.replace(/(^|[^_])_([^_\n]+)_/g, "$1$2");
  out = out.replace(/~~([^~]+)~~/g, "$1");
  out = out.replace(/\r/g, "");
  out = out.replace(/\n{2,}/g, "\n\n");
  out = out.replace(/[ \t]+/g, " ");

  return out.trim();
}
