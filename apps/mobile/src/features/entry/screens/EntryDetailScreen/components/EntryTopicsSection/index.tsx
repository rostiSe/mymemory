import { Badge } from "@/components/ui/Badge/index";
import type { EntryDetailRow } from "@/features/entry/types";
import { Text, View } from "react-native";

type EntryTopicsSectionProps = {
  topics: EntryDetailRow["topics"];
};

export function EntryTopicsSection({ topics }: EntryTopicsSectionProps) {
  if (!topics.length) return null;

  return (
    <View className="mb-4 gap-2">
      <Text className="text-foreground text-sm font-semibold">Topics</Text>
      <View className="flex-row flex-wrap gap-2">
        {topics.map((t) => (
          <Badge key={t.id} tone="topic" size="md">
            {t.name}
          </Badge>
        ))}
      </View>
    </View>
  );
}
