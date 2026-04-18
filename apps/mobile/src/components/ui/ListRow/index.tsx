import { PressableFeedback } from "heroui-native";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { listRowVariants, type ListRowVariants } from "./index.styles";

export type ListRowProps = ListRowVariants & {
  /** Left slot — icon, avatar, status dot. */
  leading?: ReactNode;
  title: string;
  subtitle?: string;
  /** Inline meta on the right of the title (e.g. "5h ago"). */
  meta?: string;
  /** Right slot — chevron, chip, action. */
  trailing?: ReactNode;
  /** When set, the whole row becomes interactive via `PressableFeedback`. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

/**
 * Generic list row: leading / title (+ subtitle / meta) / trailing. Separator
 * lives on the parent list (e.g. `ItemSeparatorComponent`), not on the row.
 */
export function ListRow({
  leading,
  title,
  subtitle,
  meta,
  trailing,
  indent,
  density,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const styles = listRowVariants({ indent, density });

  const inner = (
    <>
      {leading != null ? (
        <View className={styles.leading()}>{leading}</View>
      ) : null}
      <View className={styles.body()}>
        <View className={styles.titleRow()}>
          <Text className={styles.title()} numberOfLines={1}>
            {title}
          </Text>
          {meta ? <Text className={styles.meta()}>{meta}</Text> : null}
        </View>
        {subtitle ? (
          <Text className={styles.subtitle()} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing != null ? (
        <View className={styles.trailing()}>{trailing}</View>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <PressableFeedback
        className={styles.root()}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
      >
        {inner}
      </PressableFeedback>
    );
  }

  return <View className={styles.root()}>{inner}</View>;
}
