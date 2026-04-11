import { ScreenInset } from "@/components/layout/ScreenInset";
import { ScrollEdgeFade } from "@/components/layout/ScrollEdgeFade";
import { SkeletonListItem } from "@/components/ui/SkeletonListItem";
import {
  useCreateEntry,
  useFeedEntries,
} from "@/features/entry/hooks/useEntries";
import { useFeedOptimisticCreate } from "@/features/entry/hooks/useFeedOptimisticCreate";
import {
  type FeedRow,
  isPendingFeedRow,
} from "@/features/entry/utils/feed-rows";
import { useRefetchOnScreenFocus } from "@/hooks/useRefetchOnScreenFocus";
import { LAYOUT_FLOATING_TAB_CLEARANCE_PX } from "@/theme/layout-imperative";
import { router } from "expo-router";
import { Button } from "heroui-native";
import { useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedHeader } from "./components/FeedHeader";
import { FeedListItem } from "./components/FeedListItem";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const listContentBottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;
  const createMutation = useCreateEntry();

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

  useRefetchOnScreenFocus(refetch);

  const { optimisticRows, isInitialLoading, captureComposerProps } =
    useFeedOptimisticCreate({
      infiniteData: data,
      createMutation,
      isPending,
    });

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onPressEntry = useCallback((id: string) => {
    router.push({ pathname: "/entry/[id]", params: { id } });
  }, []);

  const keyExtractor = useCallback((item: FeedRow) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: FeedRow }) => {
      if (isPendingFeedRow(item)) {
        return <SkeletonListItem layout="entry-card" />;
      }
      return (
        <FeedListItem
          entryId={item.id}
          title={item.title || item.url || "Untitled"}
          summary={item.summary ?? ""}
          type={item.type}
          processedStatus={item.processedStatus}
          error={item.error}
          createdAt={item.createdAt}
          onPressEntry={onPressEntry}
        />
      );
    },
    [onPressEntry],
  );

  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={isRefetching && !isFetchingNextPage}
        onRefresh={() => void refetch()}
      />
    ),
    [isRefetching, isFetchingNextPage, refetch],
  );

  const listFooter = useMemo(() => {
    if (isFetchingNextPage) {
      return (
        <View className="py-4 items-center">
          <ActivityIndicator size="small" />
        </View>
      );
    }
    if (optimisticRows.length > 0 && hasNextPage === false) {
      return (
        <View className="items-center pt-6 pb-2">
          <View className="mb-3 h-px w-16 bg-border" />
          <Text className="text-xs text-muted">End of feed</Text>
        </View>
      );
    }
    return null;
  }, [isFetchingNextPage, hasNextPage, optimisticRows.length]);

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
        <Text className="mt-2 px-(--spacing-screen) text-center text-xs text-muted">
          Add a URL above. Entries are stored for user scope used by the API
          (dev template).
        </Text>
      </View>
    );
  }, [isInitialLoading]);

  if (isError) {
    return (
      <ScreenInset className="flex-1 bg-background">
        <View className="flex-1 px-(--spacing-screen) pt-(--spacing-md)">
          <FeedHeader
            captureComposerProps={{
              mutation: createMutation,
            }}
          />
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
      </ScreenInset>
    );
  }

  return (
    <ScreenInset edges={["top"]} className="flex-1 bg-background">
      <FeedHeader captureComposerProps={captureComposerProps} />
      <ScrollEdgeFade className="flex-1 bg-background">
        <FlatList
          className="flex-1 bg-background px-screen"
          data={optimisticRows}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          refreshControl={refreshControl}
          contentContainerStyle={{ paddingBottom: listContentBottomPad }}
        />
      </ScrollEdgeFade>
    </ScreenInset>
  );
}
