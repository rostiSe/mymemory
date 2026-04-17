import { EntryCard } from "@/components/ui/Card/variants/EntryCard/index";
import type { EntryRow } from "@/features/entry/types";
import {
  FEED_CARD_SWIPE_ACTIVE_OFFSET_X_PX,
  FEED_CARD_SWIPE_FRICTION,
} from "@/theme/layout-imperative";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import type { FC } from "react";
import { memo, useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

export type FeedListItemProps = {
  entryId: string;
  title: string;
  summary: string;
  summaryLoading: boolean;
  type: "url" | "note";
  createdAt: string | Date;
  metaHint?: string;
  /** Resolved like detail hero: `coverImageUrl`, else first image in content, else direct image URL. */
  heroImageUri?: string;
  isFavorited?: boolean;
  isPinned?: boolean;
  processedStatus?: EntryRow["processedStatus"];
  onPressEntry: (id: string) => void;
  onToggleFavorite: (id: string, currentlyFavorited: boolean) => void;
  /** Opens feed-level delete confirmation (single BottomSheet — avoids N portals with FlashList). */
  onRequestDelete: (id: string) => void;
};

const FeedListItemInner: FC<FeedListItemProps> = function FeedListItemInner({
  entryId,
  title,
  summary,
  summaryLoading,
  type,
  createdAt,
  metaHint,
  heroImageUri,
  isFavorited = false,
  isPinned,
  processedStatus,
  onPressEntry,
  onToggleFavorite,
  onRequestDelete,
}) {
  const dangerFg = useThemeColor("danger-foreground");
  const accentSoftFg = useThemeColor("accent-soft-foreground");
  const dangerColor = useThemeColor("danger");
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  // FlashList recycles row instances: close any in-flight swipe when the underlying
  // entry changes so the gesture native state can't dispatch against a stale row.
  useEffect(() => {
    swipeableRef.current?.close();
  }, [entryId]);

  const displayDate = new Date(createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });

  const renderLeftActions = useCallback(
    () => (
      <View
        accessibilityLabel={
          isFavorited ? "Remove from favorites" : "Add to favorites"
        }
        className="justify-center self-stretch rounded-sm bg-accent px-5"
      >
        <MaterialIcons
          name={isFavorited ? "favorite" : "favorite-border"}
          size={24}
          color={isFavorited ? dangerColor : accentSoftFg}
        />
      </View>
    ),
    [accentSoftFg, dangerColor, isFavorited],
  );

  const renderRightActions = useCallback(
    () => (
      <View
        accessibilityLabel="Delete entry"
        className="justify-center self-stretch rounded-sm bg-danger px-5"
      >
        <MaterialIcons name="delete-outline" size={24} color={dangerFg} />
      </View>
    ),
    [dangerFg],
  );

  const handleSwipeableOpen = useCallback(
    (direction: SwipeDirection.LEFT | SwipeDirection.RIGHT) => {
      if (direction === SwipeDirection.RIGHT) {
        onRequestDelete(entryId);
        queueMicrotask(() => {
          swipeableRef.current?.close();
        });
        return;
      }
      if (direction === SwipeDirection.LEFT) {
        onToggleFavorite(entryId, isFavorited);
        queueMicrotask(() => {
          swipeableRef.current?.close();
        });
      }
    },
    [entryId, isFavorited, onRequestDelete, onToggleFavorite],
  );

  const handlePress = useCallback(() => {
    onPressEntry(entryId);
  }, [entryId, onPressEntry]);

  return (
    <View className="mb-4">
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeableOpen}
        overshootLeft={false}
        overshootRight={false}
        friction={FEED_CARD_SWIPE_FRICTION}
        dragOffsetFromLeftEdge={FEED_CARD_SWIPE_ACTIVE_OFFSET_X_PX}
        dragOffsetFromRightEdge={FEED_CARD_SWIPE_ACTIVE_OFFSET_X_PX}
      >
        <EntryCard
          item={{
            id: entryId,
            title,
            summary,
            type,
            date: displayDate,
            metaHint,
            heroImageUri,
            isFavorited,
            isPinned,
            processedStatus,
          }}
          summaryLoading={summaryLoading}
          onPress={handlePress}
        />
      </ReanimatedSwipeable>
    </View>
  );
};

export const FeedListItem = memo(FeedListItemInner) as typeof FeedListItemInner;
