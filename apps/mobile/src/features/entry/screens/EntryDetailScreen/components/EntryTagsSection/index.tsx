import { Text, View } from "react-native";
import { Chip } from "heroui-native";

/**
 * TODO: replace placeholders with tags from API when available.
 */
export function EntryTagsSection() {
  const placeholderTags = ["tag-one", "tag-two"];

  return (
    <View className="mb-4 gap-2">
      <Text className="text-foreground text-sm font-semibold">Tags</Text>
      <View className="flex-row flex-wrap gap-2">
        {placeholderTags.map((label) => (
          <Chip key={label} size="sm" variant="soft" color="accent">
            {label}
          </Chip>
        ))}
      </View>
    </View>
  );
}
