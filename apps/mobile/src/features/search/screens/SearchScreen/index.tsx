import { ScreenInset } from "@/components/layout/ScreenInset";
import { Button } from "@/components/ui/Button/index";
import { EmptyState } from "@/components/ui/EmptyState/index";
import { EntryCard } from "@/components/ui/Card/variants/EntryCard/index";
import { useSemanticSearch } from "@/features/search/hooks/useSemanticSearch";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { LAYOUT_FLOATING_TAB_CLEARANCE_PX } from "@/theme/layout-imperative";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { InputGroup, TextField, useThemeColor } from "heroui-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function formatResultDate(createdAt: string | Date): string {
  return new Date(createdAt).toLocaleDateString("de-DE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const listContentBottomPad =
    insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;
  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");

  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebouncedValue(query, 400);
  const { data, isPending, isError, error, refetch } =
    useSemanticSearch(debouncedQuery);

  const debouncedTrimmed = debouncedQuery.trim();
  const showSearch = debouncedTrimmed.length >= 2;

  const onPressResult = useCallback((id: string) => {
    router.push({ pathname: "/entry/[id]", params: { id } });
  }, []);

  const listEmpty = showSearch ? (
    <EmptyState
      fill
      icon="search-off"
      title="No matches found."
      description="Try different wording or a shorter phrase."
    />
  ) : null;

  return (
    <ScreenInset edges={["top"]} className="flex-1 bg-background">
      <View className="px-screen pb-sm pt-(--spacing-md)">
        <TextField>
          <InputGroup className="w-full">
            <InputGroup.Prefix isDecorative>
              <MaterialIcons name="search" size={20} color={mutedColor} />
            </InputGroup.Prefix>
            <InputGroup.Input
              className="rounded-md border border-accent-soft shadow-lg"
              placeholder="Search your memories..."
              value={query}
              onChangeText={setQuery}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query.length > 0 ? (
              <InputGroup.Suffix>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={12}
                  onPress={() => setQuery("")}
                >
                  <MaterialIcons name="close" size={20} color={accentColor} />
                </Pressable>
              </InputGroup.Suffix>
            ) : null}
          </InputGroup>
        </TextField>
      </View>

      {!showSearch ? (
        <EmptyState
          fill
          icon="psychology"
          title="Search by meaning"
          description="Describe what you are looking for — we match by meaning, not exact keywords."
        />
      ) : isError ? (
        <View className="flex-1 px-screen pt-6">
          <View className="gap-3 rounded-lg border border-border bg-surface-secondary p-4">
            <Text className="font-semibold text-foreground">Search failed</Text>
            <Text className="text-sm text-muted">
              {error instanceof Error ? error.message : "Request failed"}
            </Text>
            <Button tone="secondary" onPress={() => void refetch()}>
              Retry
            </Button>
          </View>
        </View>
      ) : isPending && !data ? (
        <View className="flex-1 items-center justify-center pt-10">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          className="flex-1 px-screen"
          data={data?.items ?? []}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <View className="mb-3">
              <EntryCard
                item={{
                  id: item.id,
                  title: item.title ?? item.url ?? "Untitled",
                  summary: item.summary ?? "",
                  type: item.type,
                  similarity: item.similarity,
                  date: formatResultDate(item.createdAt),
                  isFavorited: item.isFavorited,
                  isPinned: item.isPinned,
                }}
                onPress={() => onPressResult(item.id)}
              />
            </View>
          )}
          ListEmptyComponent={listEmpty}
          contentContainerStyle={{
            paddingBottom: listContentBottomPad,
            flexGrow: 1,
          }}
        />
      )}
    </ScreenInset>
  );
}
