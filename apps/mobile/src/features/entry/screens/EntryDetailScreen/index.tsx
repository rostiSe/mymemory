import { ScreenInset } from "@/components/layout/ScreenInset";
import { useEntryById } from "@/features/entry/hooks/useEntries";
import { useEntryDetailScroll } from "@/features/entry/hooks/useEntryDetailScroll";
import { buildEntryMetaLine } from "@/features/entry/utils/buildEntryMetaLine";
import { resolveEntryHeroImageUri } from "@/features/entry/utils/resolveEntryHeroImageUri";
import { LAYOUT_FLOATING_TAB_CLEARANCE_PX } from "@/theme/layout-imperative";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { EntryDetailHeader } from "./components/EntryDetailHeader";
import { EntryDetailHero } from "./components/EntryDetailHero";
import { EntryMarkdownBody } from "./components/EntryMarkdownBody";
import { EntryReviewedAction } from "./components/EntryReviewedAction";
import { EntrySpacesPlaceholder } from "./components/EntrySpacesPlaceholder";
import { EntrySummaryCard } from "./components/EntrySummaryCard";
import { EntryTagsSection } from "./components/EntryTagsSection";
import { EntryTopicsSection } from "./components/EntryTopicsSection";

const PLACEHOLDER_TITLE = "Untitled memory";

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: entry, isPending, isError, error } = useEntryById(id);
  const insets = useSafeAreaInsets();
  const { scrollHandler, heroContainerStyle, heroImageStyle } =
    useEntryDetailScroll();

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
      subtitle: "",
      metaLine: buildEntryMetaLine(entry),
    };
  }, [entry]);

  const summaryText =
    entry?.summary?.trim() ||
    "No summary yet — a short TLDR will appear here once generated.";

  const bottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (isError) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <View className="mt-4 gap-2 rounded-lg border border-border bg-surface-secondary p-4">
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
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
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
        <EntryDetailHero
          imageUri={imageUri}
          heroContainerStyle={heroContainerStyle}
          heroImageStyle={heroImageStyle}
        />
        <View className="-mt-6 rounded-t-3xl bg-background px-(--spacing-screen) pt-6">
          <EntryDetailHeader
            title={headerProps.title}
            subtitle={headerProps.subtitle}
            metaLine={headerProps.metaLine}
          />
          <EntrySummaryCard summaryText={summaryText} />
          <EntryTopicsSection />
          <EntryTagsSection />
          <EntryMarkdownBody markdown={entry.content} />
          <EntryReviewedAction />
          <EntrySpacesPlaceholder />
        </View>
      </Animated.ScrollView>
    </View>
  );
}
