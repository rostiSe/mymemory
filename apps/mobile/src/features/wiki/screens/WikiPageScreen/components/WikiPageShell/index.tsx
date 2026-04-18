import { ScreenTopNavChrome, ScreenTopNavBackButton } from "@/components/layout/ScreenTopNavChrome";
import { Badge } from "@/components/ui/Badge/index";
import { ScreenHeader } from "@/components/ui/ScreenHeader/index";
import { MaturityBadge } from "@/features/wiki/components/MaturityBadge";
import { PageTypeBadge } from "@/features/wiki/components/PageTypeBadge";
import type { MaturityLevel, WikiPageType } from "@/features/wiki/types";
import { WikiSectionLayoutContext } from "@/features/wiki/wiki-section-layout-context";
import {
  LAYOUT_FLOATING_TAB_CLEARANCE_PX,
  screenTopNavContentPaddingTop,
  WIKI_TOC_HEIGHT_PX,
} from "@/theme/layout-imperative";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Link } from "expo-router";

function formatUpdatedAt(value: Date | string): string {
  try {
    const d = typeof value === "string" ? new Date(value) : value;
    return d.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export type WikiPageShellProps = {
  title: string;
  pageType: WikiPageType;
  pageId: string;
  maturity?: MaturityLevel;
  updatedAt: Date | string;
  sourceEntryCount: number;
  propertyChips: Array<{ key: string; label: string }>;
  tocItems?: Array<{ id: string; title: string }>;
  compilationLastAt?: string | null;
  children: ReactNode;
};

export function WikiPageShell({
  title,
  pageType,
  pageId,
  maturity,
  updatedAt,
  sourceEntryCount,
  propertyChips,
  tocItems,
  compilationLastAt,
  children,
}: WikiPageShellProps) {
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<Animated.ScrollView | null>(null);
  const rendererBlockYRef = useRef(0);
  const sectionYRef = useRef<Record<string, number>>({});
  const [activeTocId, setActiveTocId] = useState<string | undefined>(
    tocItems?.[0]?.id,
  );

  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const registerSectionLayout = useCallback((sectionId: string, y: number) => {
    sectionYRef.current[sectionId] = y;
  }, []);

  const scrollToSection = useCallback((id: string) => {
    setActiveTocId(id);
    const y = sectionYRef.current[id];
    if (y == null) return;
    const top = rendererBlockYRef.current + y - 12;
    scrollRef.current?.scrollTo({ y: Math.max(0, top), animated: true });
  }, []);

  const bottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;
  const topContentPad = screenTopNavContentPaddingTop(insets.top);

  const entriesLine = `${sourceEntryCount} source ${sourceEntryCount === 1 ? "entry" : "entries"}`;
  const metaLine = [
    entriesLine,
    compilationLastAt ? `Wiki last compiled: ${compilationLastAt}` : null,
  ]
    .filter((s): s is string => s != null && s.length > 0)
    .join("\n");

  return (
    <WikiSectionLayoutContext.Provider value={registerSectionLayout}>
      <View className="flex-1 bg-background">
        <Animated.ScrollView
          ref={scrollRef}
          className="flex-1 bg-background"
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          contentContainerStyle={{
            paddingBottom: bottomPad,
            paddingTop: topContentPad,
          }}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          <View className="px-screen">
            <ScreenHeader
              variant="large"
              horizontalPadding="none"
              title={title}
              subtitle={`Updated ${formatUpdatedAt(updatedAt)}`}
              metaLine={metaLine}
              rowAlign="start"
              subtitleSize="sm"
              titleNumberOfLines={4}
              metaLineNumberOfLines={4}
              withSafeArea={false}
            />

            <View className="gap-4 pt-2">
              {tocItems && tocItems.length > 0 ? (
                <View>
                  <Text className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    On this page
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ maxHeight: WIKI_TOC_HEIGHT_PX + 8 }}
                  >
                    <View className="flex-row pb-1">
                      {tocItems.map((item) => {
                        const active = item.id === activeTocId;
                        return (
                          <Badge
                            key={item.id}
                            tone="nav"
                            selected={active}
                            size="sm"
                            className="mr-2"
                            onPress={() => scrollToSection(item.id)}
                            labelClassName="max-w-[140px]"
                            numberOfLines={1}
                          >
                            {item.title}
                          </Badge>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              ) : null}

              {propertyChips.length > 0 ? (
                <View>
                  <Text className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                    Properties
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {propertyChips.map((p) => (
                      <Badge
                        key={p.key}
                        tone="neutral"
                        size="sm"
                        labelClassName="max-w-[200px]"
                        numberOfLines={1}
                      >
                        {p.label}
                      </Badge>
                    ))}
                  </View>
                </View>
              ) : null}

              <View
                onLayout={(e) => {
                  rendererBlockYRef.current = e.nativeEvent.layout.y;
                }}
              >
                {children}
              </View>

              <View className="mt-6 border-t border-border pt-4">
                <Link
                  href={{ pathname: "/wiki/versions", params: { pageId } }}
                  asChild
                >
                  <Pressable className="py-2" accessibilityRole="link">
                    <Text className="text-accent text-sm font-semibold">
                      View version history
                    </Text>
                  </Pressable>
                </Link>
              </View>
            </View>
          </View>
        </Animated.ScrollView>

        <ScreenTopNavChrome
          topInset={insets.top}
          scrollY={scrollY}
          trailingExpanded
          leading={<ScreenTopNavBackButton />}
          trailing={
            <View className="max-w-[45%] flex-row flex-wrap items-center justify-end gap-2">
              <PageTypeBadge pageType={pageType} />
              {maturity ? <MaturityBadge maturity={maturity} /> : null}
            </View>
          }
        />
      </View>
    </WikiSectionLayoutContext.Provider>
  );
}
