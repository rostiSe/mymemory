import type { EntryDetailRow } from "@/features/entry/types";
import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useThemeColor } from "heroui-native";

export type EntryReviewedActionProps = {
  reviewStatus: EntryDetailRow["reviewStatus"];
  onSetStatus: (status: EntryDetailRow["reviewStatus"]) => void;
};

type PillKey = "kept" | "remind" | "dismissed";

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const PILLS: { key: PillKey; label: string; icon: MaterialIconName }[] =
  [
    { key: "kept", label: "Keep", icon: "check" },
    { key: "remind", label: "Remind", icon: "alarm" },
    { key: "dismissed", label: "Dismiss", icon: "close" },
  ];

/**
 * Review triage: Keep / Remind / Dismiss. Tapping the active pill resets to unreviewed.
 */
export function EntryReviewedAction({
  reviewStatus,
  onSetStatus,
}: EntryReviewedActionProps) {
  const mutedColor = useThemeColor("muted");
  const accentFg = useThemeColor("accent-foreground");
  const accentColor = useThemeColor("accent");
  const borderColor = useThemeColor("border");

  return (
    <View className="mb-6 w-full gap-2">
      <Text className="text-foreground text-sm font-semibold">Review</Text>
      <View className="flex-row flex-wrap gap-2">
        {PILLS.map(({ key, label, icon }) => {
          const active = reviewStatus === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label}${active ? ", selected" : ""}`}
              onPress={() => onSetStatus(key)}
              className="flex-row items-center gap-1.5 rounded-full border px-3 py-2"
              style={{
                borderColor: active ? accentColor : borderColor,
                backgroundColor: active ? accentColor : "transparent",
              }}
            >
              <MaterialIcons
                name={icon}
                size={18}
                color={active ? accentFg : mutedColor}
              />
              <Text
                className="text-sm font-medium"
                style={{ color: active ? accentFg : mutedColor }}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
