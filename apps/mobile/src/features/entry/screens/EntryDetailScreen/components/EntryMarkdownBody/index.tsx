import { useMemo } from "react";
import { Linking, Text, View } from "react-native";
import {
  EnrichedMarkdownText,
  type MarkdownStyle,
} from "react-native-enriched-markdown";
import { useThemeColor } from "heroui-native";

type EntryMarkdownBodyProps = {
  markdown: string;
};

function isHttpUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Full entry body as enriched markdown. Theme colors from HeroUI tokens.
 */
export function EntryMarkdownBody({ markdown }: EntryMarkdownBodyProps) {
  const foreground = useThemeColor("foreground");
  const muted = useThemeColor("muted");
  const accent = useThemeColor("accent");
  const codeSurface = useThemeColor("surface-secondary");

  const markdownStyle = useMemo<MarkdownStyle>(
    () => ({
      paragraph: { color: foreground, fontSize: 16, lineHeight: 24 },
      h1: { color: foreground, fontSize: 24, fontWeight: "700" },
      h2: { color: foreground, fontSize: 20, fontWeight: "700" },
      h3: { color: foreground, fontSize: 18, fontWeight: "600" },
      link: { color: accent, underline: true },
      code: { color: foreground },
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
      },
      list: { color: foreground, markerColor: foreground },
    }),
    [foreground, muted, accent, codeSurface],
  );

  const onLinkPress = (event: { url: string }) => {
    if (isHttpUrl(event.url)) {
      void Linking.openURL(event.url);
    }
  };

  return (
    <View className="mb-4">
      <Text className="text-foreground text-sm font-semibold mb-2">Content</Text>
      <EnrichedMarkdownText
        markdown={markdown || "_No content yet._"}
        markdownStyle={markdownStyle}
        onLinkPress={onLinkPress}
        allowTrailingMargin
      />
    </View>
  );
}
