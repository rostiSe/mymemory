import { MaterialIcons } from "@expo/vector-icons";
import { Card, PressableFeedback, useThemeColor } from "heroui-native";
import { Text, View } from "react-native";

interface EntryCardProps {
  title?: string;
  summary?: string;
  type?: "url" | "note";
  date?: string;
  onPress?: () => void;
}

export default function EntryCard({
  title,
  summary,
  type = "url",
  date,
  onPress,
}: EntryCardProps) {
  const mutedColor = useThemeColor("muted");

  return (
    <Card className="dark:bg-surface-secondary rounded-md border dark:border-accent-soft p-0 ">
      <PressableFeedback className="p-card" onPress={onPress}>
        <PressableFeedback.Ripple className="overflow-hidden" />
        <Card.Body className="gap-2">
          <View className="flex-row gap-0.5 items-start justify-between">
            <View className="flex-row items-center gap-2 flex-1">
              <MaterialIcons
                name={type === "url" ? "link" : "note"}
                size={20}
                color={mutedColor}
              />
              <Text
                className="text-foreground font-bold text-base flex-1"
                numberOfLines={2}
              >
                {title || "Untitled Memory"}
              </Text>
            </View>
            {date && <Text className="text-muted text-xs item">{date}</Text>}
          </View>

          <Text className="text-muted text-sm" numberOfLines={3}>
            {summary || "No summary available."}
          </Text>
        </Card.Body>
      </PressableFeedback>
    </Card>
  );
}
