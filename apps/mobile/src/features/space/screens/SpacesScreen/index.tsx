import { ScreenInset } from "@/components/layout/ScreenInset";
import { SpaceSuggestionsInbox } from "@/features/space/components/SpaceSuggestionsInbox";
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
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  TextField,
  useThemeColor,
} from "heroui-native";
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

type SpaceRow = NonNullable<ReturnType<typeof useSpaces>["data"]>[number];

const SpaceListRow = memo(function SpaceListRow({
  item,
  onPressSpace,
  accentColor,
  mutedColor,
}: {
  item: SpaceRow;
  onPressSpace: (id: string) => void;
  accentColor: string;
  mutedColor: string;
}) {
  return (
    <Pressable
      onPress={() => onPressSpace(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open space ${item.name}`}
    >
      <Card className="mb-3 border border-border bg-surface-secondary">
        <Card.Body className="flex-row items-center gap-3 py-3">
          <View className="size-10 items-center justify-center rounded-full bg-accent/15">
            <MaterialIcons name="folder" size={22} color={accentColor} />
          </View>
          <View className="min-w-0 flex-1">
            <Text
              className="text-foreground text-base font-semibold"
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
              <Chip size="sm" variant="soft" color="default" className="self-start">
                <Chip.Label className="text-xs">
                  {item.entryCount === 1 ? "1 entry" : `${item.entryCount} entries`}
                </Chip.Label>
              </Chip>
              {item.description ? (
                <Text className="text-muted text-sm flex-1" numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={mutedColor} />
        </Card.Body>
      </Card>
    </Pressable>
  );
});

export default function SpacesScreen() {
  const insets = useSafeAreaInsets();
  const listBottomPad = insets.bottom + LAYOUT_FLOATING_TAB_CLEARANCE_PX;
  const toast = useAppToast();
  const mutedColor = useThemeColor("muted");
  const accentColor = useThemeColor("accent");

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
  /** Only true while the user is pulling to refresh — avoids spinner on tab focus / background refetch. */
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const suggestionList = useMemo(() => suggestions ?? [], [suggestions]);
  const pendingCount = suggestionList.length;

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
          const message = e instanceof Error ? e.message : "Could not create space.";
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
    (suggestionId: string, spaceName: string) => {
      setBusySuggestionId(suggestionId);
      approveSuggestion.mutate(
        { suggestionId, spaceName },
        {
          onSuccess: (space) => {
            toast.success("Space ready", space.name);
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

  const keyExtractor = useCallback((item: SpaceRow) => item.id, []);

  const renderItem = useCallback(
    ({ item }: { item: SpaceRow }) => (
      <SpaceListRow
        item={item}
        onPressSpace={onPressSpace}
        accentColor={accentColor}
        mutedColor={mutedColor}
      />
    ),
    [accentColor, mutedColor, onPressSpace],
  );

  const listEmpty = !spacesPending && (spaces?.length ?? 0) === 0;

  const refreshControl = useMemo(
    () => (
      <RefreshControl refreshing={pullRefreshing} onRefresh={onRefresh} />
    ),
    [onRefresh, pullRefreshing],
  );

  const listHeader = useMemo(
    () => (
      <View className="pb-2">
        <Text className="text-muted text-sm mb-3">
          Approve quick suggestions below or create a space manually.
        </Text>

        <Button
          variant="primary"
          className="mb-4"
          onPress={() => setCreateOpen(true)}
        >
          New space
        </Button>

        {spacesError ? (
          <Text className="text-danger text-sm mb-3">
            {spacesErr instanceof Error ? spacesErr.message : "Could not load spaces."}
          </Text>
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
              onApprove={handleApprove}
              onReject={handleReject}
            />
          )
        ) : null}

        {(spaces?.length ?? 0) > 0 ? (
          <Text className="text-foreground text-sm font-semibold mb-2 mt-2">
            Your spaces
          </Text>
        ) : null}
      </View>
    ),
    [
      busySuggestionId,
      handleApprove,
      handleReject,
      pendingCount,
      spaces?.length,
      spacesErr,
      spacesError,
      suggestionList,
      suggestionsPending,
    ],
  );

  return (
    <ScreenInset className="flex-1 bg-background" edges={["top", "left", "right"]}>
      <View className="flex-1 px-screen pt-3">
        <FlatList
          data={spaces ?? []}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          extraData={busySuggestionId}
          refreshControl={refreshControl}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: listBottomPad,
          }}
          initialNumToRender={8}
          windowSize={7}
          ListEmptyComponent={
            spacesPending ? (
              <ActivityIndicator className="py-8" />
            ) : listEmpty ? (
              <View className="py-8 px-2">
                <Text className="text-foreground text-center text-base font-medium">
                  No spaces yet
                </Text>
                <Text className="text-muted text-center text-sm mt-2">
                  Approve a suggestion above or tap New space.
                </Text>
              </View>
            ) : null
          }
        />
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
            className="rounded-t-2xl bg-surface px-screen pt-4 pb-8 border-t border-border"
            onPress={(e) => e.stopPropagation()}
          >
            <Text className="text-foreground text-lg font-semibold mb-3">New space</Text>
            <TextField className="mb-3">
              <Label>Name</Label>
              <Input
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Reading, Work"
                autoFocus
              />
            </TextField>
            <TextField className="mb-4">
              <Label>Description (optional)</Label>
              <Input
                value={newDescription}
                onChangeText={setNewDescription}
                placeholder="Short note"
              />
            </TextField>
            <View className="flex-row gap-2">
              <Button variant="ghost" className="flex-1" onPress={closeCreate}>
                Cancel
              </Button>
              <Button
                variant="primary"
                className="flex-1"
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
