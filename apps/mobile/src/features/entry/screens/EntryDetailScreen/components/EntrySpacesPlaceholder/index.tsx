import { Text, View } from "react-native";

/**
 * TODO: fetch spaces linked to this entry when API exists.
 */
export function EntrySpacesPlaceholder() {
  return (
    <View className="gap-3">
      <Text className="text-foreground text-sm font-semibold">Spaces</Text>
      <View className="gap-2 rounded-lg border border-border bg-surface-secondary p-3">
        <Text className="text-muted text-sm">Personal · Inbox</Text>
        <Text className="text-muted text-xs">
          Placeholder — replace with space list from API.
        </Text>
      </View>
    </View>
  );
}
