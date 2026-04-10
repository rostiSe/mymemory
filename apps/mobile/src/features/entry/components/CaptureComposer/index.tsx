import { useCreateEntry } from "@/features/entry/hooks/useEntries";
import { useAppToast } from "@/hooks/useAppToast";
import { MaterialIcons } from "@expo/vector-icons";
import { Button, InputGroup, TextField, useThemeColor } from "heroui-native";
import { useCallback, useState } from "react";
import { View } from "react-native";

/**
 * Primary capture surface for adding resources to the user's memory (URLs in MVP;
 * this component is the main entry point for future resource types and flows).
 */
export function CaptureComposer() {
  const toast = useAppToast();
  const mutedColor = useThemeColor("muted");
  const { mutate: createEntryMutate, isPending: isCreatePending } =
    useCreateEntry();

  const [url, setUrl] = useState("");

  const submit = useCallback(() => {
    if (!url.trim()) return;
    createEntryMutate(
      { url, title: url, type: "url", content: "" },
      {
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
      },
    );
  }, [url, createEntryMutate, toast]);

  return (
    <View className="mb-4 w-full">
      <TextField isDisabled={isCreatePending}>
        <InputGroup isDisabled={isCreatePending} className="w-full">
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
              isDisabled={isCreatePending}
              className="rounded-lg"
            >
              {isCreatePending ? "Adding..." : "Add"}
            </Button>
          </InputGroup.Suffix>
        </InputGroup>
      </TextField>
    </View>
  );
}
