import { Badge } from "@/components/ui/Badge/index";
import type { EntryDetailRow } from "@/features/entry/types";
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
          <Badge key={t.id} tone="tag" size="md">
            {`#${t.name}`}
          </Badge>
        ))}
      </View>
    </View>
  );
}
