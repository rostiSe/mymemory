import { CollapsibleClamp } from "@/components/ui/CollapsibleClamp";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { MaterialIcons } from "@expo/vector-icons";
import {
  Card,
  PressableFeedback,
  SkeletonGroup,
  useThemeColor,
} from "heroui-native";
import { Text, View } from "react-native";

interface EntryCardProps {
  title?: string;
  summary?: string;
  /** When true, summary lines show as shimmer placeholders (title still visible). */
  summaryLoading?: boolean;
  type?: "url" | "note";
  date?: string;
  onPress?: () => void;
}

export default function EntryCard({
  title,
  summary,
  summaryLoading = false,
  type = "url",
  date,
  onPress,
}: EntryCardProps) {
  const mutedColor = useThemeColor("muted");
  const surfaceSecondaryColor = useThemeColor("surface-secondary");

  return (
    <Card className="bg-surface-secondary rounded-md border border-accent-soft p-0 ">
      <PressableFeedback className="px-card pt-card" onPress={onPress}>
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

          {summaryLoading ? (
            <SkeletonGroup isLoading variant="shimmer">
              <View className="gap-2 pt-0.5">
                <SkeletonGroup.Item className="h-3 w-full rounded-md" />
                <SkeletonGroup.Item className="h-3 w-11/12 rounded-md" />
                <SkeletonGroup.Item className="h-3 w-4/5 rounded-md" />
              </View>
            </SkeletonGroup>
          ) : (
            <CollapsibleClamp
              contentKey={summary}
              collapsedLineCount={3}
              dimWhenCollapsed
              showFadeGradient
              expandHint={summary || "No summary available."}
              fadeGradientEndColor={surfaceSecondaryColor}
            >
              <MarkdownRenderer
                className="text-xs"
                markdown={summary || "No summary available."}
              />
            </CollapsibleClamp>
          )}
        </Card.Body>
      </PressableFeedback>
    </Card>
  );
}
