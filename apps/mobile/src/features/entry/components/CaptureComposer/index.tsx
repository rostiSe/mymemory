import { useCreateEntry } from "@/features/entry/hooks/useEntries";
import { useAppToast } from "@/hooks/useAppToast";
import { orpcClient } from "@/lib/orpc";
import { MaterialIcons } from "@expo/vector-icons";
import { Button, InputGroup, TextField, useThemeColor } from "heroui-native";
import { useCallback, useState } from "react";
import { View } from "react-native";

export type CreateEntryInput = Parameters<
  typeof orpcClient.entries.create
>[0];

export type CaptureComposerProps = {
  mutation: ReturnType<typeof useCreateEntry>;
  /**
   * When set, submit runs inside React `startTransition` with an optimistic feed row.
   * The list cache is updated via the mutation `onSuccess` (no full list refetch).
   */
  optimisticSubmit?: (
    input: CreateEntryInput,
    callbacks: { onSuccess: () => void; onError: (error: unknown) => void },
  ) => void;
  /** True while an optimistic create transition is in flight. */
  optimisticPending?: boolean;
};

/**
 * Primary capture surface for adding resources to the user's memory (URLs in MVP;
 * this component is the main entry point for future resource types and flows).
 */
export function CaptureComposer({
  mutation,
  optimisticSubmit,
  optimisticPending = false,
}: CaptureComposerProps) {
  const toast = useAppToast();
  const mutedColor = useThemeColor("muted");
  const [url, setUrl] = useState("");

  const isBusy = optimisticPending || mutation.isPending;

  const submit = useCallback(() => {
    if (!url.trim()) return;
    const input: CreateEntryInput = {
      url,
      title: url,
      type: "url",
      content: "",
    };

    if (optimisticSubmit) {
      optimisticSubmit(input, {
        onSuccess: () => {
          setUrl("");
          toast.success("Saved", "Entry added to your feed.");
        },
        onError: (e) => {
          toast.error(
            "Could not save",
            e instanceof Error ? e.message : "Unknown error",
          );
        },
      });
      return;
    }

    mutation.mutate(input, {
      onSuccess: () => {
        setUrl("");
        toast.success("Saved", "Entry added to your feed.");
      },
      onError: (e) => {
        toast.error(
          "Could not save",
          e instanceof Error ? e.message : "Unknown error",
        );
      },
    });
  }, [url, mutation, optimisticSubmit, toast]);

  return (
    <View className="mb-4 w-full">
      <TextField isDisabled={isBusy}>
        <InputGroup isDisabled={isBusy} className="w-full">
          <InputGroup.Prefix isDecorative>
            <MaterialIcons name="link" size={20} color={mutedColor} />
          </InputGroup.Prefix>
          <InputGroup.Input
            placeholder="Save a URL..."
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={() => submit()}
          />
          <InputGroup.Suffix>
            <Button
              size="sm"
              variant="primary"
              onPress={submit}
              isDisabled={isBusy}
              className="rounded-lg"
            >
              {isBusy ? "Adding..." : "Add"}
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </View>
  );
}
