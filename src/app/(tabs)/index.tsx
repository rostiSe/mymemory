import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useState } from "react";
import { Button, TextField, Input } from "heroui-native";
import { useAuthStore } from "@/stores/providers/auth-provider";
import { useEntries, useCreateEntry } from "@/hooks/use-entries";
import { EntryCard } from "@/components/entry/entry-card";
import { ProcessingStatus } from "@/components/entry/processing-status";
import { router } from "expo-router";
import { useAppToast } from "@/hooks/useAppToast";

export default function FeedScreen() {
  const email = useAuthStore((s) => s.session?.user?.email);
  const toast = useAppToast();
  const {
    data: entries,
    isLoading,
    isError,
    error,
    refetch,
  } = useEntries();
  const createEntry = useCreateEntry();

  const [url, setUrl] = useState("");

  const handleAddUrl = () => {
    if (!url.trim()) return;
    createEntry.mutate(
      { url, title: url, type: "url", content: "" },
      {
        onSuccess: () => {
          setUrl("");
          toast.success("Saved", "Entry added to your feed.");
        },
        onError: (e) => {
          toast.error(
            "Could not save",
            e instanceof Error ? e.message : "Unknown error",
          );
        },
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 100 }}>
      <View className="gap-2 mb-4">
        <Text className="text-2xl font-bold text-foreground">Feed</Text>
        {!!email && <Text className="text-sm text-muted">Signed in as {email}</Text>}
      </View>

      {/* Input Bar */}
      <View className="flex-row gap-2 items-center mb-4">
        <View className="flex-1">
          <TextField isDisabled={createEntry.isPending}>
            <Input 
              placeholder="Save a URL..."
              value={url}
              onChangeText={setUrl}
            />
          </TextField>
        </View>
        <Button 
          variant="primary" 
          onPress={handleAddUrl}
          isDisabled={createEntry.isPending}
        >
          {createEntry.isPending ? "Adding..." : "Add"}
        </Button>
      </View>

      {/* Feed List */}
      {isError && (
        <View className="gap-3 rounded-lg border border-border bg-surface-secondary p-4">
          <Text className="text-foreground font-semibold">Could not load feed</Text>
          <Text className="text-sm text-muted">
            {error instanceof Error ? error.message : "Request failed"}
          </Text>
          <Text className="text-xs text-muted">
            Use the same machine for Expo and the app; on web use `expo start` (server mode).
            Ensure Supabase has the Drizzle migrations applied.
          </Text>
          <Button variant="secondary" onPress={() => refetch()}>
            Retry
          </Button>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator size="large" className="mt-10" />
      ) : !isError && (entries && entries.length > 0) ? (
        entries.map((entry) => (
          <View key={entry.id} className="gap-2 mb-4">
            <ProcessingStatus status={entry.processedStatus} error={entry.error} />
            <EntryCard
              title={entry.title || entry.url || "Untitled"}
              summary={entry.summary || ""}
              type={entry.type}
              date={new Date(entry.createdAt).toLocaleDateString()}
              onPress={() => router.push({ pathname: "/entry/[id]", params: { id: entry.id } })}
            />
          </View>
        ))
      ) : !isError ? (
        <View className="items-center mt-10">
          <Text className="text-muted">Your feed is empty.</Text>
          <Text className="mt-2 px-4 text-center text-xs text-muted">
            Add a URL above. Entries are stored for user scope used by the API (dev template).
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
