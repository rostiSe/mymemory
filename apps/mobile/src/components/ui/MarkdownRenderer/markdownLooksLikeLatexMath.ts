/**
 * Cheap heuristic for whether `react-native-enriched-markdown` should enable
 * `md4cFlags.latexMath`. Most entries never use math; skipping LaTeX parsing
 * reduces native work (parse + optional math layout).
 *
 * **False negatives:** Unusual delimiters only (e.g. `\begin{align}` without
 * `$$` / `\(` / `\[` / paired `$…$`) may render math as plain text until
 * `md4cFlags={{ latexMath: true }}` is passed explicitly.
 */
export function markdownLooksLikeLatexMath(markdown: string): boolean {
  if (markdown.includes("$$")) return true;
  if (markdown.includes("\\(") || markdown.includes("\\[")) return true;
  if (markdown.includes("\\begin{")) return true;
  // Inline `$…$` on one line (avoids lone `$` from currency, etc.)
  return /\$[^\$\n]+\$/m.test(markdown);
}
