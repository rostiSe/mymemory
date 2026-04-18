import { Card } from "@/components/ui/Card/index";
import type { EntryCardData } from "@/components/ui/Card/index.types";
import { MaxLinesFadeClamp } from "@/components/ui/MaxLinesFadeClamp";
import { stripMarkdownToPlainText } from "@/features/entry/utils/stripMarkdownToPlainText";
import {
  FEED_ENTRY_CARD_COVER_HEIGHT_PX,
  MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
} from "@/theme/layout-imperative";
import { MaterialIcons } from "@expo/vector-icons";
import { Chip, SkeletonGroup, useThemeColor } from "heroui-native";
import { useMemo, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { entryCardVariants } from "./index.styles";

function similarityPercent(similarity: number): number {
  return Math.max(0, Math.min(100, Math.round(similarity * 100)));
}

export type EntryCardProps = {
  item: EntryCardData;
  /** When true, summary lines render as shimmer placeholders. */
  summaryLoading?: boolean;
  onPress?: () => void;
  /**
   * Optional overlay over the hero strip (e.g. quick actions from the feature
   * layer). With a hero and `processedStatus === "done"`, duplicate pin/favorite
   * glyphs in the title row are hidden.
   */
  coverOverlay?: ReactNode;
};

/**
 * Pre-built `EntryCard` variant — composes `Card.Root + Cover + Body` into the
 * canonical entry layout used in Feed, Search results, and EntryDetail summary.
 *
 * The compound API is exposed for one-off layouts; this variant is the default
 * for any list of entries.
 */
export function EntryCard({
  item,
  summaryLoading = false,
  onPress,
  coverOverlay,
}: EntryCardProps) {
  const styles = entryCardVariants();
  const mutedColor = useThemeColor("muted");
  const surfaceSecondaryColor = useThemeColor("surface-secondary");
  const accentColor = useThemeColor("accent");
  const dangerColor = useThemeColor("danger");

  const plainSummary = useMemo(
    () => stripMarkdownToPlainText(item.summary ?? ""),
    [item.summary],
  );

  const showProcessingChip =
    item.processedStatus === "pending" || item.processedStatus === "processing";

  const interactive = onPress != null;
  const sim = item.similarity;
  const searchLayout = sim != null && !Number.isNaN(sim);
  const pct = searchLayout ? similarityPercent(sim) : null;

  const showCoverOverlaySlot =
    Boolean(item.heroImageUri) &&
    item.processedStatus === "done" &&
    coverOverlay != null;

  const showTitleStatusGlyphs =
    !showCoverOverlaySlot &&
    (Boolean(item.isPinned) || Boolean(item.isFavorited));

  return (
    <Card.Root
      tone="accent-soft"
      radius="md"
      interactive={interactive}
      onPress={onPress}
      accessibilityLabel={item.title ?? "Untitled memory"}
    >
      {item.heroImageUri ? (
        <View className="relative w-full">
          <Card.Cover
            aspect="fill"
            style={{ height: FEED_ENTRY_CARD_COVER_HEIGHT_PX }}
            source={item.heroImageUri}
          />
          {showCoverOverlaySlot ? (
            <View
              className="absolute right-2 top-2 z-10"
              pointerEvents="box-none"
            >
              {coverOverlay}
            </View>
          ) : null}
        </View>
      ) : null}
      <Card.Body className="max-h-[200px]">
        <View className={styles.titleRow()}>
          <View className={styles.titleGroup()}>
            <MaterialIcons
              name={item.type === "note" ? "note" : "link"}
              size={20}
              color={mutedColor}
            />
            {showTitleStatusGlyphs ? (
              <>
                {item.isPinned ? (
                  <MaterialIcons name="push-pin" size={14} color={accentColor} />
                ) : null}
                {item.isFavorited ? (
                  <MaterialIcons name="favorite" size={14} color={dangerColor} />
                ) : null}
              </>
            ) : null}
            <Text className={styles.title()} numberOfLines={2}>
              {item.title || "Untitled Memory"}
            </Text>
          </View>
          {pct != null ? (
            <Text
              className={styles.similarity()}
              accessibilityLabel={`Similarity ${pct} percent`}
            >
              {pct}%
            </Text>
          ) : item.date ? (
            <Text className={styles.date()}>{item.date}</Text>
          ) : null}
        </View>

        {item.metaHint ? (
          <Text className={styles.metaHint()} numberOfLines={1}>
            {item.metaHint}
          </Text>
        ) : null}

        {showProcessingChip ? (
          <Chip
            size="sm"
            variant="soft"
            color="accent"
            className={styles.chipRow()}
          >
            <Chip.Label className="text-xs">
              {item.processedStatus === "pending" ? "Pending" : "Processing"}
            </Chip.Label>
          </Chip>
        ) : null}

        {summaryLoading ? (
          <SkeletonGroup className="py-2" isLoading variant="shimmer">
            <View className="gap-2 pt-0.5">
              <SkeletonGroup.Item className="h-3 w-full rounded-md" />
              <SkeletonGroup.Item className="h-3 w-11/12 rounded-md" />
              <SkeletonGroup.Item className="h-3 w-4/5 rounded-md" />
            </View>
          </SkeletonGroup>
        ) : (
          <MaxLinesFadeClamp
            lineCount={4}
            dimContent
            showFadeGradient
            fadeEndColor={surfaceSecondaryColor}
          >
            <Text
              className={styles.summary()}
              style={summaryStyles.summary}
              numberOfLines={4}
            >
              {plainSummary || "No summary available."}
            </Text>
          </MaxLinesFadeClamp>
        )}
        {searchLayout && item.date ? (
          <Text className={styles.date()}>{item.date}</Text>
        ) : null}
      </Card.Body>
    </Card.Root>
  );
}

const summaryStyles = StyleSheet.create({
  summary: {
    lineHeight: MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
  },
});
