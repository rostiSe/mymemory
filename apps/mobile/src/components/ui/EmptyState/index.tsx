import { Button } from "@/components/ui/Button/index";
import { MaterialIcons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";
import { Text, View } from "react-native";
import { emptyStateVariants, type EmptyStateVariants } from "./index.styles";

type MaterialIconName = React.ComponentProps<typeof MaterialIcons>["name"];

export type EmptyStateProps = EmptyStateVariants & {
  icon: MaterialIconName;
  title: string;
  description?: string;
  /** Optional CTA — `label` becomes a `<Button tone="secondary" size="sm">`. */
  action?: { label: string; onPress: () => void };
};

/**
 * Centered empty/zero-state for screens (Feed, Search, Spaces). Uses
 * `--spacing-screen` for horizontal padding via `px-screen` so it visually
 * aligns with screen content.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  fill,
}: EmptyStateProps) {
  const styles = emptyStateVariants({ fill });
  const mutedColor = useThemeColor("muted");

  return (
    <View className={styles.root()}>
      <View className={styles.iconWrap()}>
        <MaterialIcons name={icon} size={28} color={mutedColor} />
      </View>
      <Text className={styles.title()}>{title}</Text>
      {description ? (
        <Text className={styles.description()}>{description}</Text>
      ) : null}
      {action ? (
        <View className={styles.actionRow()}>
          <Button tone="secondary" size="sm" onPress={action.onPress}>
            {action.label}
          </Button>
        </View>
      ) : null}
    </View>
  );
}
