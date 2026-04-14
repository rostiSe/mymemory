import { MaturityBadge } from "@/features/wiki/components/MaturityBadge";
import { PageTypeBadge } from "@/features/wiki/components/PageTypeBadge";
import type { MaturityLevel, WikiPageType } from "@/features/wiki/types";
import { WikiSectionLayoutContext } from "@/features/wiki/wiki-section-layout-context";
import {
  LAYOUT_FLOATING_TAB_CLEARANCE_PX,
  WIKI_TOC_HEIGHT_PX,
} from "@/theme/layout-imperative";
import { Link } from "expo-router";
import { Chip } from "heroui-native";
import { useCallback, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const scrollRef = useRef<ScrollView>(null);
  const rendererBlockYRef = useRef(0);
  const sectionYRef = useRef<Record<string, number>>({});
  const [activeTocId, setActiveTocId] = useState<string | undefined>(
    tocItems?.[0]?.id,
  );

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

  return (
    <WikiSectionLayoutContext.Provider value={registerSectionLayout}>
      <ScrollView
        ref={scrollRef}
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: bottomPad }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View className="px-(--spacing-screen) pt-4">
          <View className="mb-3 flex-row flex-wrap items-center gap-2">
            <PageTypeBadge pageType={pageType} />
            {maturity ? <MaturityBadge maturity={maturity} /> : null}
          </View>

          <Text
            className="text-foreground mb-2 text-2xl font-bold leading-tight"
            selectable
          >
            {title}
          </Text>

          <Text className="text-muted mb-1 text-xs" selectable>
            Updated {formatUpdatedAt(updatedAt)}
          </Text>
          <Text className="text-muted mb-4 text-xs" selectable>
            {sourceEntryCount} source {sourceEntryCount === 1 ? "entry" : "entries"}
          </Text>

          {compilationLastAt ? (
            <Text className="text-muted mb-3 text-xs" selectable>
              Wiki last compiled: {compilationLastAt}
            </Text>
          ) : null}

          {tocItems && tocItems.length > 0 ? (
            <View className="mb-4">
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
                      <Chip
                        key={item.id}
                        variant={active ? "primary" : "secondary"}
                        size="sm"
                        color="accent"
                        className="mr-2"
                        onPress={() => scrollToSection(item.id)}
                      >
                        <Chip.Label className="max-w-[140px] text-xs" numberOfLines={1}>
                          {item.title}
                        </Chip.Label>
                      </Chip>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          ) : null}

          {propertyChips.length > 0 ? (
            <View className="mb-4">
              <Text className="text-muted mb-2 text-xs font-semibold uppercase tracking-wide">
                Properties
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {propertyChips.map((p) => (
                  <Chip key={p.key} variant="soft" size="sm" color="default">
                    <Chip.Label className="max-w-[200px] text-xs" numberOfLines={1}>
                      {p.label}
                    </Chip.Label>
                  </Chip>
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
            <Link href={{ pathname: "/wiki/versions", params: { pageId } }} asChild>
              <Pressable className="py-2" accessibilityRole="link">
                <Text className="text-accent text-sm font-semibold">
                  View version history
                </Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </WikiSectionLayoutContext.Provider>
  );
}
