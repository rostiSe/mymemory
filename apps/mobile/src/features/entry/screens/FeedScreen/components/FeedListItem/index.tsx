import { memo } from "react";
import { View } from "react-native";
import EntryCard from "../EntryCard";
import ProcessingStatus from "../ProcessingStatus";

export type FeedListItemProps = {
  entryId: string;
  title: string;
  summary: string;
  type: "url" | "note";
  processedStatus: "pending" | "processing" | "done" | "failed";
  error?: string | null;
  createdAt: string | Date;
  onPressEntry: (id: string) => void;
};

function FeedListItemInner({
  entryId,
  title,
  summary,
  type,
  processedStatus,
  error,
  createdAt,
  onPressEntry,
}: FeedListItemProps) {
  const displayDate = new Date(createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
  });

  return (
    <View className="gap-2 mb-4">
      <ProcessingStatus status={processedStatus} error={error} />
      <EntryCard
        title={title}
        summary={summary}
        type={type}
        date={displayDate}
        onPress={() => onPressEntry(entryId)}
      />
    </View>
  );
}

export const FeedListItem = memo(FeedListItemInner);
