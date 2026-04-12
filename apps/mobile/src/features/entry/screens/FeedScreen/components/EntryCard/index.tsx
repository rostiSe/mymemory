import { CollapsibleClamp } from "@/components/ui/CollapsibleClamp";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import type { EntryRow } from "@/features/entry/types";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import {
  Card,
  Chip,
  PressableFeedback,
  SkeletonGroup,
  useThemeColor,
} from "heroui-native";
import { FEED_ENTRY_CARD_COVER_HEIGHT_PX } from "@/theme/layout-imperative";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

interface EntryCardProps {
  title?: string;
  summary?: string;
  /** When true, summary lines show as shimmer placeholders (title still visible). */
  summaryLoading?: boolean;
  type?: "url" | "note";
  date?: string;
  /** e.g. word count + language when `processedStatus === done` */
  metaHint?: string;
  /** Same resolution as entry detail hero (`resolveEntryHeroImageUri`). */
  heroImageUri?: string;
  isFavorited?: boolean;
  isPinned?: boolean;
  /** When pending or processing, shows a compact status chip above the summary. */
  processedStatus?: EntryRow["processedStatus"];
  onPress?: () => void;
}

export default function EntryCard({
  title,
  summary,
  summaryLoading = false,
  type = "url",
  date,
  metaHint,
  heroImageUri,
  isFavorited = false,
  isPinned = false,
  processedStatus,
  onPress,
}: EntryCardProps) {
  const mutedColor = useThemeColor("muted");
  const surfaceSecondaryColor = useThemeColor("surface-secondary");
  const accentColor = useThemeColor("accent");
  const dangerColor = useThemeColor("danger");

  const [coverLoadFailed, setCoverLoadFailed] = useState(false);
  useEffect(() => {
    setCoverLoadFailed(false);
  }, [heroImageUri]);

  const showCover =
    typeof heroImageUri === "string" &&
    heroImageUri.length > 0 &&
    !coverLoadFailed;

  const showProcessingChip =
    processedStatus === "pending" || processedStatus === "processing";

  return (
    <Card className="bg-surface-secondary overflow-hidden rounded-md border border-accent-soft p-0 ">
      {showCover ? (
        <Image
          source={{ uri: heroImageUri }}
          style={styles.coverImage}
          contentFit="cover"
          accessibilityIgnoresInvertColors
          onError={() => setCoverLoadFailed(true)}
        />
      ) : null}

      <PressableFeedback className="px-card pt-card" onPress={onPress}>
        <PressableFeedback.Ripple className="overflow-hidden" />
        <Card.Body className="gap-2">
          <View className="flex-row gap-0.5 items-start justify-between">
            <View className="flex-row items-center gap-1.5 flex-1 min-w-0">
              <MaterialIcons
                name={type === "url" ? "link" : "note"}
                size={20}
                color={mutedColor}
              />
              {isPinned ? (
                <MaterialIcons name="push-pin" size={14} color={accentColor} />
              ) : null}
              {isFavorited ? (
                <MaterialIcons name="favorite" size={14} color={dangerColor} />
              ) : null}
              <Text
                className="text-foreground font-bold text-base flex-1 min-w-0"
                numberOfLines={2}
              >
                {title || "Untitled Memory"}
              </Text>
            </View>
            {date ? (
              <Text className="text-muted text-xs shrink-0">{date}</Text>
            ) : null}
          </View>

          {metaHint ? (
            <Text className="text-muted text-xs" numberOfLines={1}>
              {metaHint}
            </Text>
          ) : null}

          {showProcessingChip ? (
            <Chip
              size="sm"
              variant="soft"
              color="accent"
              className="self-start"
            >
              <Chip.Label className="text-xs">
                {processedStatus === "pending" ? "Pending" : "Processing"}
              </Chip.Label>
            </Chip>
          ) : null}

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

const styles = StyleSheet.create({
  coverImage: {
    width: "100%",
    height: FEED_ENTRY_CARD_COVER_HEIGHT_PX,
  },
});
