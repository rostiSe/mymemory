import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useCallback, useMemo, useState } from "react";
import { Button, TextField, Input } from "heroui-native";
import { useAuthStore } from "@/stores/providers/auth-provider";
import { useFeedEntries, useCreateEntry } from "@/hooks/use-entries";
import { EntryCard } from "@/components/entry/entry-card";
import { ProcessingStatus } from "@/components/entry/processing-status";
import { router } from "expo-router";
import { useAppToast } from "@/hooks/useAppToast";
import type { z } from "zod";
import { entrySchema } from "@mymemory/shared/contracts";

type Entry = z.infer<typeof entrySchema>;

export default function FeedScreen() {
  const email = useAuthStore((s) => s.session?.user?.email);
  const toast = useAppToast();
  const {
    data,
    isPending,
    isError,
    error,
    refetch,
    isRefetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useFeedEntries();
  const { mutate: createEntryMutate, isPending: isCreatePending } =
    useCreateEntry();

  const [url, setUrl] = useState("");

  const entries = useMemo(
    () => data?.pages.flatMap((page) => page.items) ?? [],
    [data],
  );

  const isInitialLoading = isPending && entries.length === 0;

  const handleAddUrl = useCallback(() => {
    if (!url.trim()) return;
    createEntryMutate(
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
  }, [url, createEntryMutate, toast]);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const renderItem = useCallback(
    ({ item: entry }: { item: Entry }) => (
      <View className="gap-2 mb-4">
        <ProcessingStatus status={entry.processedStatus} error={entry.error} />
        <EntryCard
          title={entry.title || entry.url || "Untitled"}
          summary={entry.summary || ""}
          type={entry.type}
          date={new Date(entry.createdAt).toLocaleDateString()}
          onPress={() =>
            router.push({ pathname: "/entry/[id]", params: { id: entry.id } })
          }
        />
      </View>
    ),
    [],
  );

  const listHeader = useMemo(
    () => (
      <>
        <View className="gap-2 mb-4">
          <Text className="text-2xl font-bold text-foreground">Feed</Text>
          {!!email && (
            <Text className="text-sm text-muted">Signed in as {email}</Text>
          )}
        </View>

        <View className="flex-row gap-2 items-center mb-4">
          <View className="flex-1">
            <TextField isDisabled={isCreatePending}>
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
            isDisabled={isCreatePending}
          >
            {isCreatePending ? "Adding..." : "Add"}
          </Button>
        </View>
      </>
    ),
    [email, url, isCreatePending, handleAddUrl],
  );

  const listFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" />
        </View>
      );
    }
    if (entries.length > 0 && hasNextPage === false) {
      return (
        <View className="items-center pt-6 pb-2">
          <View className="mb-3 h-px w-16 bg-border" />
          <Text className="text-xs text-muted">End of feed</Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, entries.length]);

  const listEmpty = useMemo(() => {
    if (isInitialLoading) {
      return (
        <View className="mt-10 items-center">
          <ActivityIndicator size="large" />
        </View>
      );
    }
    return (
      <View className="items-center mt-10">
        <Text className="text-muted">Your feed is empty.</Text>
        <Text className="mt-2 px-4 text-center text-xs text-muted">
          Add a URL above. Entries are stored for user scope used by the API
          (dev template).
        </Text>
      </View>
    );
  }, [isInitialLoading]);

  if (isError) {
    return (
      <View className="flex-1 bg-background p-4">
        <View className="gap-2 mb-4">
          <Text className="text-2xl font-bold text-foreground">Feed</Text>
          {!!email && (
            <Text className="text-sm text-muted">Signed in as {email}</Text>
          )}
        </View>
        <View className="gap-3 rounded-lg border border-border bg-surface-secondary p-4">
          <Text className="text-foreground font-semibold">
            Could not load feed
          </Text>
          <Text className="text-sm text-muted">
            {error instanceof Error ? error.message : "Request failed"}
          </Text>
          <Text className="text-xs text-muted">
            Use the same machine for Expo and the app; on web use `expo start`
            (server mode). Ensure Supabase has the Drizzle migrations applied.
          </Text>
          <Button variant="secondary" onPress={() => void refetch()}>
            Retry
          </Button>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      className="flex-1 bg-background"
      contentContainerStyle={{
        padding: 16,
        paddingBottom: 100,
        flexGrow: 1,
      }}
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      ListHeaderComponent={listHeader}
      ListFooterComponent={listFooter}
      ListEmptyComponent={listEmpty}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.35}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching && !isFetchingNextPage}
          onRefresh={() => void refetch()}
        />
      }
    />
  );
}
