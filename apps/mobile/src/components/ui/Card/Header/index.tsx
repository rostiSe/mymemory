import type { ReactNode } from "react";
import { Text, View } from "react-native";
import { cardHeaderVariants, type CardHeaderVariants } from "./index.styles";

export type CardHeaderProps = CardHeaderVariants & {
  /** Main heading; omit when using `sectionLabel` alone (e.g. “Summary” band). */
  title?: string;
  /** Small upper-case label rendered above the title. */
  eyebrow?: string;
  /**
   * Single-line section label (uppercase, xs) — matches legacy `EntrySummaryCard`
   * “Summary” row without a separate title.
   */
  sectionLabel?: string;
  /** Right-aligned slot — typically a `Chip`, action icon, or status dot. */
  trailing?: ReactNode;
  /** Cap title lines (default 2). */
  titleNumberOfLines?: number;
};

/**
 * Standard card header: optional eyebrow + title on the left, optional trailing
 * slot on the right. Use the compound API on `Card.Root` rather than this
 * component directly: `<Card.Header title="…" />`.
 */
export function CardHeader({
  title,
  eyebrow,
  sectionLabel,
  trailing,
  density,
  titleNumberOfLines = 2,
}: CardHeaderProps) {
  const styles = cardHeaderVariants({ density });

  if (sectionLabel != null && sectionLabel.length > 0 && !title && !eyebrow) {
    return (
      <View className={styles.root()}>
        <View className={styles.titleColumn()}>
          <Text className={styles.sectionLabelOnly()} numberOfLines={1}>
            {sectionLabel}
          </Text>
        </View>
        {trailing != null ? (
          <View className={styles.trailing()}>{trailing}</View>
        ) : null}
      </View>
    );
  }

  return (
    <View className={styles.root()}>
      <View className={styles.titleColumn()}>
        {eyebrow ? (
          <Text className={styles.eyebrow()} numberOfLines={1}>
            {eyebrow}
          </Text>
        ) : null}
        {title != null && title.length > 0 ? (
          <Text
            className={styles.title()}
            numberOfLines={titleNumberOfLines}
          >
            {title}
          </Text>
        ) : null}
      </View>
      {trailing != null ? (
        <View className={styles.trailing()}>{trailing}</View>
      ) : null}
    </View>
  );
}
