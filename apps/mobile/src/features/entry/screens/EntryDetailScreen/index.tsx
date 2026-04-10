import { useEntryById } from "@/features/entry/hooks/useEntries";
import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isPending, isError, error } = useEntryById(id);
  return (
    <ScrollView className="flex-1 bg-background overflow-y-auto p-4">
      <Text className="text-foreground text-xl font-bold">Memory Detail</Text>
      <Text className="text-muted mt-2">ID: {id}</Text>
      {isPending && (
        <View className="mt-4 items-center">
          <ActivityIndicator />
        </View>
      )}
      {isError && (
        <View className="mt-4 gap-2 rounded-lg border border-border bg-surface-secondary p-4 overflow-y-auto">
          <Text className="text-foreground font-semibold">
            Could not load entry
          </Text>
          <Text className="text-sm text-muted">
            {error instanceof Error ? error.message : "Request failed"}
          </Text>
        </View>
      )}
      {!isPending && !isError && (
        <View>
          <Text className="text-muted mt-2">
            Summary: {entry?.summary || "No summary available."}
          </Text>
          <Text className="text-muted mt-2">
            Content: {entry?.content || "No content available."}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
