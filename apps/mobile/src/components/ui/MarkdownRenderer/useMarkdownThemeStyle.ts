import { useThemeColor } from "heroui-native";
import { useMemo } from "react";
import type { MarkdownStyle } from "react-native-enriched-markdown";

/**
 * App-wide markdown typography and colors for {@link MarkdownRenderer}.
 * Change tokens here (or in `global.css`) to update every markdown surface.
 */
export function useMarkdownThemeStyle(): MarkdownStyle {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const accent = useThemeColor("accent");
  const border = useThemeColor("border");
  const codeSurface = useThemeColor("surface-secondary");
  /** Inline `code` / highlight chips — must override library defaults (light pink bg) for dark mode. */
  const codeHighlightBg = useThemeColor("surface-tertiary");

  return useMemo(
    () => ({
      paragraph: { color: foreground, fontSize: 16, lineHeight: 24 },
      h1: { color: foreground, fontSize: 24, fontWeight: "700" },
      h2: { color: foreground, fontSize: 20, fontWeight: "700" },
      h3: { color: foreground, fontSize: 18, fontWeight: "600" },
      link: { color: accent, underline: true },
      strong: { color: foreground, fontWeight: "bold" },
      em: { color: foreground, fontStyle: "italic" },
      code: {
        color: foreground,
        backgroundColor: codeHighlightBg,
        borderColor: border,
      },
      codeBlock: {
        color: foreground,
        backgroundColor: codeSurface,
        borderRadius: 8,
        padding: 12,
      },
      blockquote: {
        color: muted,
        borderColor: muted,
        borderWidth: 4,
        backgroundColor: codeSurface,
      },
      list: { color: foreground, markerColor: foreground },
      math: {
        color: foreground,
        backgroundColor: codeSurface,
      },
      inlineMath: { color: foreground },
      image: {
        height: 240,
        borderRadius: 2,
        marginTop: 0,
        marginBottom: 0,
      },
    }),
    [foreground, muted, accent, border, codeSurface, codeHighlightBg],
  );
}
