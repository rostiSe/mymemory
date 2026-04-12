import { Linking, View } from "react-native";
import {
  EnrichedMarkdownText,
  type EnrichedMarkdownTextProps,
} from "react-native-enriched-markdown";
import { memo, useCallback, useMemo } from "react";
import { useMarkdownThemeStyle } from "./useMarkdownThemeStyle";

function isHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

export type MarkdownRendererProps = {
  markdown: string;
  /** Markdown shown when `markdown` is empty. */
  emptyFallback?: string;
  /** Uniwind classes on the wrapper `View`. */
  className?: string;
  allowTrailingMargin?: boolean;
  /**
   * `excerpt` — feed cards: lighter parsing (no LaTeX), no selection, slightly tighter type.
   * `body` — entry detail and full content.
   */
  variant?: "excerpt" | "body";
} & Pick<
  EnrichedMarkdownTextProps,
  "flavor" | "md4cFlags" | "streamingAnimation"
>;

/**
 * Shared markdown surface: HeroUI theme colors, safe HTTP(S) link handling.
 * Memoized so parent list re-renders don’t re-touch native markdown unless props change.
 */
export const MarkdownRenderer = memo(function MarkdownRenderer({
  markdown,
  emptyFallback = "_No content yet._",
  className,
  allowTrailingMargin = true,
  variant = "body",
  flavor,
  md4cFlags: md4cFlagsProp,
  streamingAnimation = false,
}: MarkdownRendererProps) {
  const baseMarkdownStyle = useMarkdownThemeStyle();

  const markdownStyle = useMemo(() => {
    if (variant === "excerpt") {
      const p = baseMarkdownStyle.paragraph;
      return {
        ...baseMarkdownStyle,
        paragraph: {
          ...p,
          fontSize: 14,
          lineHeight: 20,
        },
      };
    }
    return baseMarkdownStyle;
  }, [variant, baseMarkdownStyle]);

  const md4cFlags = useMemo(() => {
    if (md4cFlagsProp !== undefined) return md4cFlagsProp;
    if (variant === "excerpt") {
      return { underline: false, latexMath: false };
    }
    return { underline: false, latexMath: true };
  }, [md4cFlagsProp, variant]);

  const onLinkPress = useCallback((event: { url: string }) => {
    if (isHttpUrl(event.url)) {
      void Linking.openURL(event.url);
    }
  }, []);

  const selectable = variant !== "excerpt";

  return (
    <View className={className}>
      <EnrichedMarkdownText
        markdown={markdown.trim() === "" ? emptyFallback : markdown}
        markdownStyle={markdownStyle}
        onLinkPress={onLinkPress}
        allowTrailingMargin={allowTrailingMargin}
        flavor={flavor}
        md4cFlags={md4cFlags}
        streamingAnimation={streamingAnimation}
        selectable={selectable}
      />
    </View>
  );
});
