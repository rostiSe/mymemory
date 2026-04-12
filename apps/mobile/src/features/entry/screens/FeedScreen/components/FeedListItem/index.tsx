import type { EntryRow } from "@/features/entry/types";
import { memo, useCallback, useRef } from "react";
import { View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import { useThemeColor } from "heroui-native";
import EntryCard from "../EntryCard";

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
  onArchiveEntry: (id: string) => void;
};

function FeedListItemInner({
  entryId,
  title,
  summary,
  summaryLoading,
  type,
  createdAt,
  metaHint,
  heroImageUri,
  isFavorited,
  isPinned,
  processedStatus,
  onPressEntry,
  onArchiveEntry,
}: FeedListItemProps) {
  const warningFg = useThemeColor("warning-foreground");
  const archivedRef = useRef(false);

  const displayDate = new Date(createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });

  const renderRightActions = useCallback(
    () => (
      <View className="justify-center self-stretch rounded-md bg-warning px-5">
        <MaterialIcons name="archive" size={24} color={warningFg} />
      </View>
    ),
    [warningFg],
  );

  const handleSwipeableOpen = useCallback(() => {
    if (archivedRef.current) return;
    archivedRef.current = true;
    onArchiveEntry(entryId);
  }, [entryId, onArchiveEntry]);

  const handleSwipeableClose = useCallback(() => {
    archivedRef.current = false;
  }, []);

  return (
    <View className="mb-4">
      <Swipeable
        renderRightActions={renderRightActions}
        onSwipeableOpen={handleSwipeableOpen}
        onSwipeableClose={handleSwipeableClose}
        overshootRight={false}
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
      </Swipeable>
    </View>
  );
}

export const FeedListItem = memo(FeedListItemInner);
