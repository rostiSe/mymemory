import { ScreenInset } from "@/components/layout/ScreenInset";
import { SkeletonListItem } from "@/components/ui/SkeletonListItem";
import { EntryDeleteConfirmSheet } from "@/features/entry/components/EntryDeleteConfirmSheet";
import { FeedFilterBar } from "@/features/entry/components/FeedFilterBar";
import {
  useCreateEntry,
  useFeedEntries,
} from "@/features/entry/hooks/useEntries";
import { useDeleteEntry } from "@/features/entry/hooks/useEntryMutations";
import { useFeedFavoriteToggle } from "@/features/entry/hooks/useFeedFavoriteToggle";
import { useFeedOptimisticCreate } from "@/features/entry/hooks/useFeedOptimisticCreate";
import { buildFeedCardMetaHint } from "@/features/entry/utils/buildEntryMetaLine";
import {
  type FeedRow,
  isPendingFeedRow,
} from "@/features/entry/utils/feed-rows";
import { resolveEntryHeroImageUri } from "@/features/entry/utils/resolveEntryHeroImageUri";
import {
  LAYOUT_FLOATING_TAB_CLEARANCE_PX,
  SPACING_SCREEN_PX,
} from "@/theme/layout-imperative";
import type { EntryListFilter } from "@mymemory/shared/contracts";
import { useFocusEffect } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { Button } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FeedHeader } from "./components/FeedHeader";
import { FeedListItem } from "./components/FeedListItem";

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const listContentBottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;
  const createMutation = useCreateEntry();
  const [feedFilter, setFeedFilter] = useState<EntryListFilter>("all");
  const [pendingDeleteEntryId, setPendingDeleteEntryId] = useState<
    string | null
  >(null);
  const deleteEntry = useDeleteEntry();
  const onToggleFavorite = useFeedFavoriteToggle();

  const onDeleteEntry = useCallback(
    (id: string) => {
      deleteEntry.mutate({ id });
    },
    [deleteEntry],
  );

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
  } = useFeedEntries(feedFilter);

  const { optimisticRows, isInitialLoading, captureComposerProps } =
    useFeedOptimisticCreate({
      infiniteData: data,
      createMutation,
      isPending,
    });

  const listExtraData = useMemo(
    () =>
      `${feedFilter}:${optimisticRows.length}:${isRefetching ? 1 : 0}:${isFetchingNextPage ? 1 : 0}`,
    [feedFilter, optimisticRows.length, isRefetching, isFetchingNextPage],
  );

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPendingDeleteEntryId(null);
      };
    }, []),
  );

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onPressEntry = useCallback((id: string) => {
    router.push({ pathname: "/entry/[id]", params: { id } });
  }, []);

  const onRequestDelete = useCallback((id: string) => {
    setPendingDeleteEntryId(id);
  }, []);

  const keyExtractor = useCallback((item: FeedRow) => item.id, []);

  const getItemType = useCallback(
    (item: FeedRow) => (isPendingFeedRow(item) ? "pending" : "entry"),
    [],
  );

  const listContentContainerStyle = useMemo(
    () => ({
      paddingHorizontal: SPACING_SCREEN_PX,
      paddingBottom: listContentBottomPad,
      flexGrow: 1,
    }),
    [listContentBottomPad],
  );

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
          summaryLoading={
            item.processedStatus === "pending" ||
            item.processedStatus === "processing"
          }
          type={item.type}
          createdAt={item.createdAt}
          metaHint={buildFeedCardMetaHint(item)}
          heroImageUri={resolveEntryHeroImageUri({
            content: item.content,
            url: item.url,
            coverImageUrl: item.coverImageUrl,
          })}
          isFavorited={item.isFavorited}
          isPinned={item.isPinned}
          processedStatus={item.processedStatus}
          onPressEntry={onPressEntry}
          onToggleFavorite={onToggleFavorite}
          onRequestDelete={onRequestDelete}
        />
      );
    },
    [onPressEntry, onRequestDelete, onToggleFavorite],
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

  const handleDeleteSheetOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingDeleteEntryId(null);
  }, []);

  const handleConfirmPendingDelete = useCallback(() => {
    if (pendingDeleteEntryId != null) {
      onDeleteEntry(pendingDeleteEntryId);
    }
    setPendingDeleteEntryId(null);
  }, [onDeleteEntry, pendingDeleteEntryId]);

  if (isError) {
    return (
      <ScreenInset className="flex-1 bg-background">
        <View className="flex-1 px-(--spacing-screen) pt-(--spacing-md)">
          <FeedHeader
            captureComposerProps={{
              mutation: createMutation,
            }}
          />
          <FeedFilterBar active={feedFilter} onChange={setFeedFilter} />
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
      <FeedFilterBar active={feedFilter} onChange={setFeedFilter} />
      {/*
        Plain View: ScrollShadow + FlashList stressed native layout on some devices
        when switching tabs / rapid refresh (see T-013).
      */}
      <View className="flex-1 bg-background">
        <FlashList<FeedRow>
          data={optimisticRows}
          extraData={listExtraData}
          keyExtractor={keyExtractor}
          getItemType={getItemType}
          renderItem={renderItem}
          ListFooterComponent={listFooter}
          ListEmptyComponent={listEmpty}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.35}
          refreshControl={refreshControl}
          contentContainerStyle={listContentContainerStyle}
          drawDistance={200}
          maintainVisibleContentPosition={{ disabled: true }}
          style={{ flex: 1 }}
        />
      </View>
      <EntryDeleteConfirmSheet
        isOpen={pendingDeleteEntryId != null}
        onOpenChange={handleDeleteSheetOpenChange}
        onConfirmDelete={handleConfirmPendingDelete}
      />
    </ScreenInset>
  );
}
