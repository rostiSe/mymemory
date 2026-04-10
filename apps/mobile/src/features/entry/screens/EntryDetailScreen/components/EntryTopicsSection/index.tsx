import { Text, View } from "react-native";
import { Chip } from "heroui-native";

/**
 * TODO: replace placeholders with topics from API when available.
 */
export function EntryTopicsSection() {
  const placeholderTopics = ["Topic A", "Topic B", "Topic C"];

  return (
    <View className="mb-4 gap-2">
      <Text className="text-foreground text-sm font-semibold">Topics</Text>
      <View className="flex-row flex-wrap gap-2">
        {placeholderTopics.map((label) => (
          <Chip key={label} size="sm" variant="secondary" color="default">
            {label}
          </Chip>
        ))}
      </View>
    </View>
  );
}
