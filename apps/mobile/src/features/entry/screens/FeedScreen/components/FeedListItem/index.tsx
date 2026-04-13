import type { EntryRow } from "@/features/entry/types";
import { EntryDeleteConfirmSheet } from "@/features/entry/components/EntryDeleteConfirmSheet";
import {
  FEED_CARD_SWIPE_ACTIVE_OFFSET_X_PX,
  FEED_CARD_SWIPE_FRICTION,
} from "@/theme/layout-imperative";
import type { FC } from "react";
import { memo, useCallback, useRef, useState } from "react";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import EntryCard from "../EntryCard";
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
  onDeleteEntry: (id: string) => void;
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
  onDeleteEntry,
}) {
  const dangerFg = useThemeColor("danger-foreground");
  const accentSoftFg = useThemeColor("accent-soft-foreground");
  const dangerColor = useThemeColor("danger");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const swipeableRef = useRef<SwipeableMethods | null>(null);

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
        setDeleteOpen(true);
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
    [entryId, isFavorited, onToggleFavorite],
  );

  const handleConfirmDelete = useCallback(() => {
    onDeleteEntry(entryId);
  }, [entryId, onDeleteEntry]);

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
          title={title}
          summary={summary}
          summaryLoading={summaryLoading}
          type={type}
          date={displayDate}
          metaHint={metaHint}
          heroImageUri={heroImageUri}
          isFavorited={isFavorited}
          isPinned={isPinned}
          processedStatus={processedStatus}
          onPress={() => onPressEntry(entryId)}
        />
      </ReanimatedSwipeable>
      <EntryDeleteConfirmSheet
        isOpen={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirmDelete={handleConfirmDelete}
      />
    </View>
  );
}

export const FeedListItem = memo(FeedListItemInner) as typeof FeedListItemInner;
