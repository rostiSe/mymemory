import { Linking, View } from "react-native";
import {
  EnrichedMarkdownText,
  type EnrichedMarkdownTextProps,
} from "react-native-enriched-markdown";
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
} & Pick<
  EnrichedMarkdownTextProps,
  "flavor" | "md4cFlags" | "streamingAnimation"
>;

/**
 * Shared markdown surface: HeroUI theme colors, safe HTTP(S) link handling.
 * Use for entry body, summaries, or any inline rich text — adjust styling in one place via
 * {@link useMarkdownThemeStyle} and this component’s props.
 */
export function MarkdownRenderer({
  markdown,
  emptyFallback = "_No content yet._",
  className,
  allowTrailingMargin = true,
  flavor,
  md4cFlags,
  streamingAnimation,
}: MarkdownRendererProps) {
  const markdownStyle = useMarkdownThemeStyle();

  const onLinkPress = (event: { url: string }) => {
    if (isHttpUrl(event.url)) {
      void Linking.openURL(event.url);
    }
  };

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
      />
    </View>
  );
}
