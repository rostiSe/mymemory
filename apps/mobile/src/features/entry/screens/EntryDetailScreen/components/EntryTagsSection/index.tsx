import type { EntryDetailRow } from "@/features/entry/types";
import { Chip } from "heroui-native";
import { Text, View } from "react-native";

type EntryTagsSectionProps = {
  tags: EntryDetailRow["tags"];
};

export function EntryTagsSection({ tags }: EntryTagsSectionProps) {
  if (!tags.length) return null;

  return (
    <View className="mb-4 gap-2">
      <Text className="text-foreground text-sm font-semibold">Tags</Text>
      <View className="flex-row flex-wrap gap-2">
        {tags.map((t) => (
          <Chip key={t.id} size="sm" variant="soft" color="accent">
            {t.name}
          </Chip>
        ))}
      </View>
    </View>
  );
}
