import { MaterialIcons } from "@expo/vector-icons";
import { Card, PressableFeedback, useThemeColor } from "heroui-native";
import { Text, View } from "react-native";

export type SearchResultCardProps = {
  title: string;
  summary?: string | null;
  type: "url" | "note";
  similarity: number;
  date: string;
  isFavorited?: boolean;
  isPinned?: boolean;
  onPress: () => void;
};

function similarityPercent(similarity: number): number {
  return Math.max(0, Math.min(100, Math.round(similarity * 100)));
}

export function SearchResultCard({
  title,
  summary,
  type,
  similarity,
  date,
  isFavorited = false,
  isPinned = false,
  onPress,
}: SearchResultCardProps) {
  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");
  const dangerColor = useThemeColor("danger");

  const snippet =
    typeof summary === "string" && summary.trim().length > 0
      ? summary.trim()
      : "No summary yet.";

  return (
    <Card className="mb-3 overflow-hidden rounded-md border border-accent-soft bg-surface-secondary p-0">
      <PressableFeedback className="px-3 py-2.5" onPress={onPress}>
        <PressableFeedback.Ripple className="overflow-hidden" />
        <View className="gap-1.5">
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
              <MaterialIcons
                name={type === "url" ? "link" : "note"}
                size={18}
                color={mutedColor}
              />
              {isPinned ? (
                <MaterialIcons name="push-pin" size={13} color={accentColor} />
              ) : null}
              {isFavorited ? (
                <MaterialIcons name="favorite" size={13} color={dangerColor} />
              ) : null}
              <Text
                className="min-w-0 flex-1 text-base font-semibold text-foreground"
                numberOfLines={2}
              >
                {title}
              </Text>
            </View>
            <Text
              className="shrink-0 text-xs font-medium text-accent"
              accessibilityLabel={`Similarity ${similarityPercent(similarity)} percent`}
            >
              {similarityPercent(similarity)}%
            </Text>
          </View>
          <Text className="text-xs text-muted" numberOfLines={2}>
            {snippet}
          </Text>
          <Text className="text-xs text-muted">{date}</Text>
        </View>
      </PressableFeedback>
    </Card>
  );
}
