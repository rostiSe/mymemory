import { ScreenInset } from "@/components/layout/ScreenInset";
import {
  ScreenTopNavBackButton,
  ScreenTopNavChrome,
} from "@/components/layout/ScreenTopNavChrome";
import { ScreenHeader } from "@/components/ui/ScreenHeader/index";
import { EntryHeaderActions } from "@/features/entry/components/EntryHeaderActions";
import { ProcessingStatus } from "@/features/entry/components/ProcessingStatus";
import { useEntryById } from "@/features/entry/hooks/useEntries";
import { useEntryDetailInteractions } from "@/features/entry/hooks/useEntryDetailInteractions";
import { useEntryDetailScroll } from "@/features/entry/hooks/useEntryDetailScroll";
import { useEntryDetailTrackRead } from "@/features/entry/hooks/useEntryDetailTrackRead";
import {
  buildEntryMetaLine,
  buildEntryMetaSubtitle,
} from "@/features/entry/utils/buildEntryMetaLine";
import { resolveEntryHeroImageUri } from "@/features/entry/utils/resolveEntryHeroImageUri";
import { LAYOUT_FLOATING_TAB_CLEARANCE_PX } from "@/theme/layout-imperative";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EntryDetailHero } from "./components/EntryDetailHero";
import { EntryDetailSkeleton } from "./components/EntryDetailSkeleton";
import { EntryKeyPointsSection } from "./components/EntryKeyPointsSection";
import { EntryMarkdownBody } from "./components/EntryMarkdownBody";
import { EntryReviewedAction } from "./components/EntryReviewedAction";
import { EntrySourceDetailSection } from "./components/EntrySourceDetailSection";
import { EntrySpacesPlaceholder } from "./components/EntrySpacesPlaceholder";
import { EntrySummarySection } from "./components/EntrySummarySection";
import { EntryTagsSection } from "./components/EntryTagsSection";
import { EntryTopicsSection } from "./components/EntryTopicsSection";

const PLACEHOLDER_TITLE = "Untitled memory";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isPending, isError, error } = useEntryById(id);
  useEntryDetailTrackRead(entry?.id);
  const {
    handleToggleFavorite,
    handleTogglePin,
    handleSetReviewStatus,
    handleRetryIngest,
    handleConfirmDelete,
  } = useEntryDetailInteractions(entry ?? undefined);
  const insets = useSafeAreaInsets();
  const { scrollHandler, heroImageStyle, scrollY } = useEntryDetailScroll();
  const imageUri = useMemo(
    () => (entry ? resolveEntryHeroImageUri(entry) : undefined),
    [entry],
  );

  const headerProps = useMemo(() => {
    if (!entry) {
      return {
        title: PLACEHOLDER_TITLE,
        subtitle: "",
        metaLine: "",
      };
    }
    return {
      title: entry.title?.trim() || PLACEHOLDER_TITLE,
      subtitle: buildEntryMetaSubtitle(entry) ?? "",
      metaLine: buildEntryMetaLine(entry),
    };
  }, [entry]);

  const summaryText =
    entry?.summary?.trim() ||
    "No summary yet — a short TLDR will appear here once generated.";

  const showSummaryCard =
    entry &&
    (entry.processedStatus === "pending" ||
      entry.processedStatus === "processing" ||
      Boolean(entry.summary?.trim()));

  const bottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;

  if (isPending) {
    return <EntryDetailSkeleton />;
  }

  if (isError) {
    return (
      <ScreenInset className="flex-1 bg-background px-screen">
        <View className="mt-4 gap-2 rounded-lg border border-border bg-surface-secondary p-card">
          <Text className="text-foreground font-semibold">
            Could not load entry
          </Text>
          <Text className="text-sm text-muted">
            {error instanceof Error ? error.message : "Request failed"}
          </Text>
        </View>
      </ScreenInset>
    );
  }

  if (!entry) {
    return (
      <ScreenInset className="flex-1 bg-background px-screen">
        <Text className="text-muted mt-4">Entry not found.</Text>
      </ScreenInset>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Animated.ScrollView
        className="flex-1"
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        bounces
        contentContainerStyle={{
          paddingBottom: bottomPad,
        }}
      >
        <EntryDetailHero imageUri={imageUri} heroImageStyle={heroImageStyle} />
        <View className="-mt-6 rounded-t-lg bg-background px-screen ">
          <View className="pb-4">
            <ScreenHeader
              variant="large"
              horizontalPadding="none"
              title={headerProps.title}
              subtitle={headerProps.subtitle || undefined}
              metaLine={headerProps.metaLine}
              rowAlign="start"
              subtitleSize="base"
              titleNumberOfLines={3}
              subtitleNumberOfLines={2}
              metaLineNumberOfLines={2}
              withSafeArea={false}
            />
          </View>
          {entry.processedStatus !== "done" ? (
            <View className="mb-4">
              <ProcessingStatus
                status={entry.processedStatus}
                error={entry.error}
                onRetry={
                  entry.processedStatus === "failed"
                    ? handleRetryIngest
                    : undefined
                }
              />
            </View>
          ) : null}
          {showSummaryCard ? (
            <EntrySummarySection
              contentKey={entry.id}
              summaryText={summaryText}
              loading={
                entry.processedStatus === "pending" ||
                entry.processedStatus === "processing"
              }
            />
          ) : null}
          <EntryKeyPointsSection
            contentKey={entry.id}
            keyPoints={entry.keyPoints ?? []}
          />
          <EntrySourceDetailSection
            sourceApp={entry.sourceApp}
            metadata={entry.metadata}
          />
          <EntryTopicsSection topics={entry.topics} />
          <EntryTagsSection tags={entry.tags} />
          <EntryMarkdownBody markdown={entry.content} />
          {entry.processedStatus === "done" ? (
            <EntryReviewedAction
              reviewStatus={entry.reviewStatus}
              onSetStatus={handleSetReviewStatus}
            />
          ) : null}
          <EntrySpacesPlaceholder />
        </View>
      </Animated.ScrollView>

      <ScreenTopNavChrome
        topInset={insets.top}
        scrollY={scrollY}
        trailingExpanded
        leading={<ScreenTopNavBackButton />}
        trailing={
          <EntryHeaderActions
            isFavorited={entry.isFavorited ?? false}
            isPinned={entry.isPinned ?? false}
            processedStatus={entry.processedStatus}
            onToggleFavorite={handleToggleFavorite}
            onTogglePin={handleTogglePin}
            onConfirmDelete={handleConfirmDelete}
            showDelete
            surface="overlay"
          />
        }
      />
    </View>
  );
}
