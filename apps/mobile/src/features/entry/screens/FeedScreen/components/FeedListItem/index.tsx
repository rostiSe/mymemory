import { memo } from "react";
import { View } from "react-native";
import EntryCard from "../EntryCard";

export type FeedListItemProps = {
  entryId: string;
  title: string;
  summary: string;
  summaryLoading: boolean;
  type: "url" | "note";
  createdAt: string | Date;
  metaHint?: string;
  onPressEntry: (id: string) => void;
};

function FeedListItemInner({
  entryId,
  title,
  summary,
  summaryLoading,
  type,
  createdAt,
  metaHint,
  onPressEntry,
}: FeedListItemProps) {
  const displayDate = new Date(createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });

  return (
    <View className="mb-4">
      <EntryCard
        title={title}
        summary={summary}
        summaryLoading={summaryLoading}
        type={type}
        date={displayDate}
        metaHint={metaHint}
        onPress={() => onPressEntry(entryId)}
      />
    </View>
  );
}

export const FeedListItem = memo(FeedListItemInner);
