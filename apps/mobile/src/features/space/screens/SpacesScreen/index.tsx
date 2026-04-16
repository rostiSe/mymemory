import { ScreenInset } from "@/components/layout/ScreenInset";
import { SpaceListRow } from "@/features/space/components/SpaceListRow";
import type { SpaceRow } from "@/features/space/components/SpaceListRow";
import { SpacesSearchField } from "@/features/space/components/SpacesSearchField";
import {
  SpaceSuggestionsInbox,
  type SpaceSuggestionsInboxProps,
} from "@/features/space/components/SpaceSuggestionsInbox";
import {
  useApproveSuggestion,
  useCreateSpace,
  useRejectSuggestion,
  useSpaceSuggestions,
  useSpaces,
} from "@/features/space/hooks/useSpaces";
import { useAppToast } from "@/hooks/useAppToast";
import { LAYOUT_FLOATING_TAB_CLEARANCE_PX } from "@/theme/layout-imperative";
import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Button, Input, Label, TextField, useThemeColor } from "heroui-native";
import { memo, useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CompileStatusCard } from "@/features/wiki/components/CompileStatusCard";

type ListEntry =
  | { kind: "header"; key: string; title: string }
  | {
      kind: "row";
      key: string;
      space: SpaceRow;
      rowVariant: "default" | "child";
    };

function filterSpacesByQuery(rows: SpaceRow[], q: string): SpaceRow[] {
  const n = q.trim().toLowerCase();
  if (!n) return rows;
  return rows.filter((s) => {
    const name = s.name.toLowerCase();
    const desc = (s.description ?? "").toLowerCase();
    return name.includes(n) || desc.includes(n);
  });
}

function buildListEntries(
  spaces: SpaceRow[],
  debouncedQuery: string,
): ListEntry[] {
  const matching = filterSpacesByQuery(spaces, debouncedQuery);
  const byId = new Map(spaces.map((s) => [s.id, s]));

  if (debouncedQuery.trim().length > 0) {
    return matching
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({
        kind: "row" as const,
        key: s.id,
        space: s,
        rowVariant: s.parentSpaceId ? "child" : "default",
      }));
  }

  const hasGroupedParents = spaces.some(
    (s) => (s.childSpaceIds?.length ?? 0) > 0,
  );
  if (!hasGroupedParents) {
    return matching
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((s) => ({
        kind: "row" as const,
        key: s.id,
        space: s,
        rowVariant: s.parentSpaceId ? "child" : "default",
      }));
  }

  const parentSpaces = spaces
    .filter((s) => (s.childSpaceIds?.length ?? 0) > 0)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const used = new Set<string>();
  const out: ListEntry[] = [];

  for (const p of parentSpaces) {
    const children = matching
      .filter((c) => c.parentSpaceId === p.id)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    const includeParent = matching.some((m) => m.id === p.id);
    if (children.length === 0 && !includeParent) continue;

    out.push({ kind: "header", key: `h-${p.id}`, title: p.name });
    if (includeParent) {
      const row = byId.get(p.id);
      if (row) {
        out.push({ kind: "row", key: p.id, space: row, rowVariant: "default" });
        used.add(p.id);
      }
    }
    for (const c of children) {
      if (!used.has(c.id)) {
        out.push({ kind: "row", key: c.id, space: c, rowVariant: "child" });
        used.add(c.id);
      }
    }
  }

  const standalone = matching
    .filter(
      (s) =>
        !s.parentSpaceId &&
        (s.childSpaceIds?.length ?? 0) === 0 &&
        !used.has(s.id),
    )
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  if (standalone.length > 0) {
    out.push({ kind: "header", key: "h-standalone", title: "Standalone" });
    for (const s of standalone) {
      out.push({ kind: "row", key: s.id, space: s, rowVariant: "default" });
    }
  }

  return out;
}

const ListHeader = memo(function ListHeader({
  spacesError,
  spacesErrMessage,
  suggestionsPending,
  pendingCount,
  suggestionList,
  busySuggestionId,
  onApprove,
  onReject,
  onQueryChange,
}: {
  spacesError: boolean;
  spacesErrMessage: string;
  suggestionsPending: boolean;
  pendingCount: number;
  suggestionList: SpaceSuggestionsInboxProps["suggestions"];
  busySuggestionId: string | null;
  onApprove: SpaceSuggestionsInboxProps["onApprove"];
  onReject: SpaceSuggestionsInboxProps["onReject"];
  onQueryChange: (q: string) => void;
}) {
  return (
    <View className="pb-2">
      <CompileStatusCard />

      <Text className="text-muted text-sm mb-3">
        Approve quick suggestions below or use the New space action.
      </Text>

      <SpacesSearchField
        onQueryChange={onQueryChange}
        className="mb-3"
      />

      {spacesError ? (
        <Text className="text-danger text-sm mb-3">{spacesErrMessage}</Text>
      ) : null}

      {!suggestionsPending && pendingCount === 0 ? (
        <Text className="text-muted text-sm mb-3">
          No pending suggestions. New saves may add some after ingest.
        </Text>
      ) : null}

      {pendingCount > 0 ? (
        suggestionsPending ? (
          <ActivityIndicator className="py-4 mb-2" />
        ) : (
          <SpaceSuggestionsInbox
            suggestions={suggestionList}
            busySuggestionId={busySuggestionId}
            onApprove={onApprove}
            onReject={onReject}
          />
        )
      ) : null}
    </View>
  );
});

export default function SpacesScreen() {
  const insets = useSafeAreaInsets();
  const listBottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX + 56;
  const toast = useAppToast();
  const mutedColor = useThemeColor("muted");
  const accentForeground = useThemeColor("accent-foreground");

  const {
    data: spaces,
    isPending: spacesPending,
    isError: spacesError,
    error: spacesErr,
    refetch: refetchSpaces,
  } = useSpaces();

  const {
    data: suggestions,
    isPending: suggestionsPending,
    refetch: refetchSuggestions,
  } = useSpaceSuggestions();

  const createSpace = useCreateSpace();
  const approveSuggestion = useApproveSuggestion();
  const rejectSuggestion = useRejectSuggestion();

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [busySuggestionId, setBusySuggestionId] = useState<string | null>(null);
  const [pullRefreshing, setPullRefreshing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const onQueryChange = useCallback((q: string) => {
    setDebouncedQuery(q);
  }, []);

  const suggestionList = useMemo(() => suggestions ?? [], [suggestions]);
  const pendingCount = suggestionList.length;

  const spaceRows = useMemo(() => spaces ?? [], [spaces]);

  const listData = useMemo(
    () => buildListEntries(spaceRows, debouncedQuery),
    [spaceRows, debouncedQuery],
  );

  const closeCreate = useCallback(() => {
    setCreateOpen(false);
    setNewName("");
    setNewDescription("");
  }, []);

  const handleCreateSpace = useCallback(() => {
    const name = newName.trim();
    if (!name) {
      toast.warning("Name required", "Enter a name for the space.");
      return;
    }
    const description = newDescription.trim();
    createSpace.mutate(
      {
        name,
        ...(description ? { description } : {}),
      },
      {
        onSuccess: () => {
          toast.success("Space created", name);
          closeCreate();
        },
        onError: (e) => {
          const message =
            e instanceof Error ? e.message : "Could not create space.";
          toast.error("Create failed", message);
        },
      },
    );
  }, [closeCreate, createSpace, newDescription, newName, toast]);

  const onPressSpace = useCallback((id: string) => {
    router.push({ pathname: "/space/[id]", params: { id } });
  }, []);

  const onRefresh = useCallback(() => {
    setPullRefreshing(true);
    void Promise.all([refetchSpaces(), refetchSuggestions()]).finally(() => {
      setPullRefreshing(false);
    });
  }, [refetchSpaces, refetchSuggestions]);

  const handleApprove = useCallback(
    (
      suggestionId: string,
      input: { spaceName?: string; spaceId?: string },
    ) => {
      setBusySuggestionId(suggestionId);
      approveSuggestion.mutate(
        { suggestionId, ...input },
        {
          onSuccess: (space) => {
            toast.success(
              input.spaceId ? "Entry assigned" : "Space ready",
              space.name,
            );
          },
          onError: (e) => {
            toast.error(
              "Approve failed",
              e instanceof Error ? e.message : "Unknown error",
            );
          },
          onSettled: () => {
            setBusySuggestionId(null);
          },
        },
      );
    },
    [approveSuggestion, toast],
  );

  const handleReject = useCallback(
    (suggestionId: string) => {
      setBusySuggestionId(suggestionId);
      rejectSuggestion.mutate(
        { suggestionId },
        {
          onSuccess: () => {
            toast.info("Suggestion dismissed", undefined);
          },
          onError: (e) => {
            toast.error(
              "Reject failed",
              e instanceof Error ? e.message : "Unknown error",
            );
          },
          onSettled: () => {
            setBusySuggestionId(null);
          },
        },
      );
    },
    [rejectSuggestion, toast],
  );

  const keyExtractor = useCallback((item: ListEntry) => item.key, []);

  const renderItem = useCallback(
    ({ item }: { item: ListEntry }) => {
      if (item.kind === "header") {
        return (
          <Text className="text-xs uppercase tracking-wide text-muted mt-4 mb-1 px-1">
            {item.title}
          </Text>
        );
      }
      return (
        <SpaceListRow
          item={item.space}
          rowVariant={item.rowVariant}
          onPressSpace={onPressSpace}
          mutedColor={mutedColor}
        />
      );
    },
    [mutedColor, onPressSpace],
  );

  const totalSpaces = spaceRows.length;
  const listEmptyNoSpaces = !spacesPending && totalSpaces === 0;
  const searchActive = debouncedQuery.trim().length > 0;
  const filterEmpty =
    !spacesPending &&
    totalSpaces > 0 &&
    listData.length === 0 &&
    searchActive;

  const refreshControl = useMemo(
    () => (
      <RefreshControl refreshing={pullRefreshing} onRefresh={onRefresh} />
    ),
    [onRefresh, pullRefreshing],
  );

  const spacesErrMessage =
    spacesErr instanceof Error ? spacesErr.message : "Could not load spaces.";

  const listHeader = useMemo(
    () => (
      <ListHeader
        spacesError={spacesError}
        spacesErrMessage={spacesErrMessage}
        suggestionsPending={suggestionsPending}
        pendingCount={pendingCount}
        suggestionList={suggestionList}
        busySuggestionId={busySuggestionId}
        onApprove={handleApprove}
        onReject={handleReject}
        onQueryChange={onQueryChange}
      />
    ),
    [
      busySuggestionId,
      handleApprove,
      handleReject,
      onQueryChange,
      pendingCount,
      spacesErrMessage,
      spacesError,
      suggestionList,
      suggestionsPending,
    ],
  );

  const emptyMessage = useMemo(() => {
    if (filterEmpty) {
      return `No spaces match "${debouncedQuery.trim()}"`;
    }
    return null;
  }, [debouncedQuery, filterEmpty]);

  const fabBottom = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX - 8;

  return (
    <ScreenInset className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-1 px-screen pt-3">
        <FlatList<ListEntry>
          data={listData}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          extraData={`${busySuggestionId}-${debouncedQuery}`}
          refreshControl={refreshControl}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: listBottomPad,
          }}
          initialNumToRender={8}
          windowSize={7}
          ListEmptyComponent={
            spacesPending ? (
              <ActivityIndicator className="py-8" />
            ) : listEmptyNoSpaces ? (
              <View className="py-8 px-2">
                <Text className="text-foreground text-center text-base font-medium">
                  No spaces yet
                </Text>
                <Text className="text-muted text-center text-sm mt-2">
                  Approve a suggestion above or tap New space.
                </Text>
              </View>
            ) : filterEmpty ? (
              <View className="py-8 px-2">
                <Text className="text-muted text-center text-sm">
                  {emptyMessage}
                </Text>
              </View>
            ) : null
          }
        />

        <Pressable
          onPress={() => setCreateOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="New space"
          className="absolute rounded-card bg-accent px-3 py-2.5 flex-row items-center gap-1.5 shadow-sm"
          style={{ right: 16, bottom: fabBottom }}
        >
          <MaterialIcons name="add" size={22} color={accentForeground} />
          <Text className="text-background text-sm font-semibold">New space</Text>
        </Pressable>
      </View>

      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={closeCreate}
      >
        <Pressable
          className="flex-1 justify-end bg-black/50"
          onPress={closeCreate}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <Pressable
            className="rounded-t-card bg-surface px-screen pt-4 pb-8 border-t border-border"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-foreground text-lg font-semibold mb-3">
              New space
            </Text>
            <TextField className="mb-3">
              <Label>Name</Label>
              <Input
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Reading, Work"
                autoFocus
                className="rounded-card"
              />
            </TextField>
            <TextField className="mb-4">
              <Label>Description (optional)</Label>
              <Input
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Short note"
                className="rounded-card"
              />
            </TextField>
            <View className="flex-row gap-2">
              <Button variant="ghost" className="flex-1" onPress={closeCreate}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1 rounded-card"
                onPress={handleCreateSpace}
                isDisabled={createSpace.isPending}
              >
                {createSpace.isPending ? "Creating…" : "Create"}
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScreenInset>
  );
}
