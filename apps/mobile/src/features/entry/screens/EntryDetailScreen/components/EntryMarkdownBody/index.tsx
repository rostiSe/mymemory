import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Text, View } from "react-native";

type EntryMarkdownBodyProps = {
  markdown: string;
};

/**
 * Entry detail “Content” section — markdown via shared {@link MarkdownRenderer}.
 */
export function EntryMarkdownBody({ markdown }: EntryMarkdownBodyProps) {
  return (
    <View className="mb-4">
      <Text className="text-foreground mb-2 text-sm font-semibold">
        Content
      </Text>
      <MarkdownRenderer markdown={markdown} />
    </View>
  );
}
