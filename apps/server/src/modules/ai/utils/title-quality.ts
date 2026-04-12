/**
 * Heuristics for when a page `<title>` is worth keeping as a fallback
 * (used only when the user did not set a title and AI title is missing).
 */

export function looksLikeUrl(text: string): boolean {
  return /^https?:\/\//.test(text) || /^www\./i.test(text);
}

export function looksLikeBoilerplate(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower === "home" ||
    lower === "untitled" ||
    lower.length < 3 ||
    /^[a-z0-9.-]+\.(com|org|net|io|dev|co)\b/i.test(text)
  );
}
