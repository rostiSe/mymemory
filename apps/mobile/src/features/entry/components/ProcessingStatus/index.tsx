import type { EntryRow } from "@/features/entry/types";
import { MaterialIcons } from "@expo/vector-icons";
import type { ComponentProps } from "react";
import { Text, View } from "react-native";
import { Button, useThemeColor } from "heroui-native";

type ProcessingStatusProps = {
  status: EntryRow["processedStatus"];
  error?: string | null;
  /** Shown only when `status === "failed"`. */
  onRetry?: () => void;
};

type MaterialIconName = ComponentProps<typeof MaterialIcons>["name"];

const STATUS_CONFIG: Record<
  EntryRow["processedStatus"],
  {
    label: string;
    icon: MaterialIconName;
    iconColorKey: "warning" | "danger" | "accent" | "muted";
  }
> = {
  pending: {
    label: "Waiting to process…",
    icon: "schedule",
    iconColorKey: "muted",
  },
  processing: {
    label: "Processing entry…",
    icon: "autorenew",
    iconColorKey: "accent",
  },
  done: {
    label: "Ready",
    icon: "check-circle",
    iconColorKey: "accent",
  },
  failed: {
    label: "Processing failed",
    icon: "error-outline",
    iconColorKey: "danger",
  },
};

/**
 * Inline status for entry detail when AI / server work is still in flight or failed.
 */
export function ProcessingStatus({
  status,
  error,
  onRetry,
}: ProcessingStatusProps) {
  const config = STATUS_CONFIG[status];
  const iconColor = useThemeColor(config.iconColorKey);

  return (
    <View className="bg-surface-tertiary flex-row items-start gap-2 rounded-xl p-3">
      <MaterialIcons name={config.icon} size={20} color={iconColor} />
      <View className="min-w-0 flex-1 gap-1">
        <Text className="text-foreground text-sm font-medium">
          {config.label}
        </Text>
        {status === "failed" && error ? (
          <Text className="text-danger text-xs">{error}</Text>
        ) : null}
      </View>
      {status === "failed" && onRetry ? (
        <Button size="sm" variant="secondary" onPress={onRetry}>
          Retry
        </Button>
      ) : null}
    </View>
  );
}
