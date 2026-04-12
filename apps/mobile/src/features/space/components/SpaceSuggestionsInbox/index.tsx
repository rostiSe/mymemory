import {
  SPACE_SUGGESTIONS_DIALOG_LIST_MAX_HEIGHT_WINDOW_FRACTION,
  SPACE_SUGGESTIONS_DIALOG_WIDTH_WINDOW_FRACTION,
} from "@/theme/layout-imperative";
import { MaterialIcons } from "@expo/vector-icons";
import type { appContract } from "@mymemory/shared";
import type { InferContractRouterOutputs } from "@orpc/contract";
import { Alert, Button, Chip, Dialog, useThemeColor } from "heroui-native";
import { memo, useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { suggestionStackVariants } from "./index.styles";

type SuggestionRow = InferContractRouterOutputs<
  typeof appContract
>["spaces"]["listSuggestions"][number];

export type SpaceSuggestionsInboxProps = {
  suggestions: SuggestionRow[];
  busySuggestionId: string | null;
  onApprove: (suggestionId: string, spaceName: string) => void;
  onReject: (suggestionId: string) => void;
};

function line2(s: SuggestionRow): string {
  const name = s.suggestedName.trim() || "New Space";
  const reason = s.reason?.trim();
  if (reason) {
    const short = reason.length > 80 ? `${reason.slice(0, 77)}…` : reason;
    return `Space: ${name} · ${short}`;
  }
  return `Space: ${name}`;
}

const SuggestionReviewCard = memo(function SuggestionReviewCard({
  suggestion,
  busy,
  onApprove,
  onReject,
}: {
  suggestion: SuggestionRow;
  busy: boolean;
  onApprove: (suggestionId: string, spaceName: string) => void;
  onReject: (suggestionId: string) => void;
}) {
  const approve = useCallback(() => {
    onApprove(suggestion.id, suggestion.suggestedName.trim() || "New Space");
  }, [onApprove, suggestion.id, suggestion.suggestedName]);

  const reject = useCallback(() => {
    onReject(suggestion.id);
  }, [onReject, suggestion.id]);

  return (
    <Alert status="accent" className="mb-3 items-stretch">
      <Alert.Indicator />
      <Alert.Content className="min-w-0 flex-1">
        <Alert.Title className="text-sm" numberOfLines={1}>
          {suggestion.entryTitle}
        </Alert.Title>
        <Alert.Description className="text-xs" numberOfLines={2}>
          {line2(suggestion)}
        </Alert.Description>
      </Alert.Content>
      <View className="flex-row gap-1 shrink-0 self-center pl-1">
        <Button size="sm" variant="ghost" onPress={reject} isDisabled={busy}>
          Skip
        </Button>
        <Button size="sm" variant="primary" onPress={approve} isDisabled={busy}>
          Add
        </Button>
      </View>
    </Alert>
  );
});

export function SpaceSuggestionsInbox({
  suggestions,
  busySuggestionId,
  onApprove,
  onReject,
}: SpaceSuggestionsInboxProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const dialogWidth = Math.round(
    windowWidth * SPACE_SUGGESTIONS_DIALOG_WIDTH_WINDOW_FRACTION,
  );
  const listMaxHeight = Math.round(
    windowHeight * SPACE_SUGGESTIONS_DIALOG_LIST_MAX_HEIGHT_WINDOW_FRACTION,
  );

  const accentColor = useThemeColor("accent");
  const mutedColor = useThemeColor("muted");
  const { root, layerBack, layerMid, front } = suggestionStackVariants();

  const count = suggestions.length;
  const top = suggestions[0];

  const renderItem = useCallback(
    ({ item }: { item: SuggestionRow }) => (
      <SuggestionReviewCard
        suggestion={item}
        busy={busySuggestionId === item.id}
        onApprove={onApprove}
        onReject={onReject}
      />
    ),
    [busySuggestionId, onApprove, onReject],
  );

  const keyExtractor = useCallback((item: SuggestionRow) => item.id, []);

  if (count === 0) return null;

  return (
    <Dialog isOpen={sheetOpen} onOpenChange={setSheetOpen}>
      <Dialog.Trigger asChild>
        <Pressable
          className="mb-4"
          accessibilityRole="button"
          accessibilityLabel={`${count} space suggestions. Open to review.`}
        >
          <View className={root()}>
            <View
              className={layerBack()}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View
              className={layerMid()}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
            />
            <View className={front()}>
              <View className="flex-row items-center gap-3 px-3 py-3">
                <View className="size-10 items-center justify-center rounded-full bg-accent/15">
                  <MaterialIcons name="layers" size={22} color={accentColor} />
                </View>
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      className="text-foreground text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {top?.entryTitle ?? "Suggestions"}
                    </Text>
                    <Chip
                      size="sm"
                      variant="soft"
                      color="accent"
                      className="shrink-0"
                    >
                      <Chip.Label className="text-xs font-semibold">
                        {count}
                      </Chip.Label>
                    </Chip>
                  </View>
                  <Text className="text-muted text-xs mt-0.5" numberOfLines={1}>
                    {count === 1
                      ? top
                        ? line2(top)
                        : "Tap to review"
                      : `${count} pending · tap to open`}
                  </Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={mutedColor}
                />
              </View>
            </View>
          </View>
        </Pressable>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay />
        <Dialog.Content
          className="gap-0 overflow-hidden px-4 pb-4 pt-2 self-center"
          style={{ width: dialogWidth }}
        >
          <Dialog.Close className="right-0" variant="outline" />
          <View className="mb-3 gap-1.5 pr-2">
            <Dialog.Title>Suggestions</Dialog.Title>
            <Dialog.Description>
              Approve a suggested space for each entry, or skip.
            </Dialog.Description>
          </View>
          <View className="w-full" style={{ maxHeight: listMaxHeight }}>
            <FlatList
              data={suggestions}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              contentContainerClassName="pb-2"
              initialNumToRender={6}
              maxToRenderPerBatch={8}
              windowSize={5}
              removeClippedSubviews
              keyboardShouldPersistTaps="handled"
              extraData={busySuggestionId}
              nestedScrollEnabled
            />
          </View>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  );
}
