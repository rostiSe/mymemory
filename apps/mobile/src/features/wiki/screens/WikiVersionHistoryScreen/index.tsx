import { ScreenInset } from "@/components/layout/ScreenInset";
import { Button } from "@/components/ui/Button/index";
import { useWikiPageById } from "@/features/wiki/hooks/useWikiPageById";
import { useWikiPageVersions } from "@/features/wiki/hooks/useWikiPages";
import { WikiPageTypeBody } from "@/features/wiki/screens/WikiPageScreen/components/WikiPageTypeBody";
import { countSectionsInContent, isUuid } from "@/features/wiki/types";
import type { WikiPageVersion } from "@/features/wiki/types";
import { useLocalSearchParams } from "expo-router";
import { Dialog } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatVersionTime(value: string | Date): string {
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

export default function WikiVersionHistoryScreen() {
  const { pageId } = useLocalSearchParams<{ pageId: string }>();
  const insets = useSafeAreaInsets();
  const { data: page } = useWikiPageById(pageId);
  const { data: versions = [], isPending, isError, error } = useWikiPageVersions(
    pageId,
    50,
  );

  const [selected, setSelected] = useState<WikiPageVersion | null>(null);

  const rows = useMemo(() => {
    return versions.map((v, index) => {
      const prev = versions[index + 1];
      const curCount = countSectionsInContent(page?.pageType ?? "synthesis", v.content);
      const prevCount = prev
        ? countSectionsInContent(page?.pageType ?? "synthesis", prev.content)
        : null;
      const delta =
        prevCount !== null && page?.pageType === "synthesis"
          ? curCount - prevCount
          : null;
      return { version: v, delta };
    });
  }, [versions, page?.pageType]);

  const renderItem = useCallback(
    ({ item }: { item: (typeof rows)[number] }) => {
      const { version, delta } = item;
      return (
        <Pressable
          onPress={() => setSelected(version)}
          className="border-b border-border py-4"
          accessibilityRole="button"
        >
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-foreground font-semibold" selectable>
              Version {version.version}
            </Text>
            {delta !== null ? (
              <Text className="text-muted text-xs" selectable>
                sections {delta >= 0 ? "+" : ""}
                {delta}
              </Text>
            ) : null}
          </View>
          <Text className="text-muted mt-1 text-xs" selectable>
            {formatVersionTime(version.createdAt)}
          </Text>
        </Pressable>
      );
    },
    [],
  );

  if (!pageId || !isUuid(pageId)) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <Text className="text-muted mt-4">Missing or invalid page id.</Text>
      </ScreenInset>
    );
  }

  if (isPending) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <Text className="text-muted mt-4">Loading versions…</Text>
      </ScreenInset>
    );
  }

  if (isError) {
    return (
      <ScreenInset className="flex-1 bg-background px-(--spacing-screen)">
        <Text className="text-muted mt-4" selectable>
          {error instanceof Error ? error.message : "Failed to load versions"}
        </Text>
      </ScreenInset>
    );
  }

  return (
    <View className="flex-1 bg-background" style={{ paddingBottom: insets.bottom }}>
      <FlatList
        data={rows}
        keyExtractor={(item) => item.version.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <Text className="text-muted py-6 text-sm" selectable>
            No saved versions yet. Versions are created when the wiki agent updates this
            page.
          </Text>
        }
      />

      <Dialog
        isOpen={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay />
          <Dialog.Content className="max-h-[85%]">
            <Dialog.Close variant="ghost" />
            <Dialog.Title>
              {page?.title ?? "Wiki page"} · Version {selected?.version}
            </Dialog.Title>
            <Dialog.Description>
              {selected ? formatVersionTime(selected.createdAt) : ""}
            </Dialog.Description>
            <ScrollView className="mt-2 max-h-[480px]" showsVerticalScrollIndicator>
              {selected && page ? (
                <WikiPageTypeBody pageType={page.pageType} content={selected.content} />
              ) : null}
            </ScrollView>
            <View className="mt-4">
              <Button tone="primary" fullWidth onPress={() => setSelected(null)}>
                Close
              </Button>
            </View>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
    </View>
  );
}
