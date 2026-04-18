import { ScreenInset } from "@/components/layout/ScreenInset/index";
import type { ReactNode } from "react";
import { Text, View } from "react-native";
import {
  screenHeaderVariants,
  type ScreenHeaderVariants,
} from "./index.styles";

export type ScreenHeaderProps = ScreenHeaderVariants & {
  title: string;
  subtitle?: string;
  /** Third line — compact meta (e.g. entry detail `metaLine`). */
  metaLine?: string;
  /** Renders below the title, before subtitle (e.g. wiki badge row). */
  titleBelow?: ReactNode;
  /** Left slot — typically a back button or icon. */
  leading?: ReactNode;
  /** Right slot — actions (icons, ghost buttons). */
  trailing?: ReactNode;
  titleNumberOfLines?: number;
  subtitleNumberOfLines?: number;
  metaLineNumberOfLines?: number;
  /**
   * Apply top safe-area inset (default `true`). Disable when the header sits
   * inside a screen that already wraps content in `ScreenInset` with `top`.
   */
  withSafeArea?: boolean;
};

/**
 * Top-of-screen header — title + optional subtitle, leading and trailing slots.
 * Absorbs the bespoke header rows previously inlined in `FeedScreen`,
 * `EntryDetailScreen`, and `SpacesScreen`.
 */
export function ScreenHeader({
  title,
  subtitle,
  metaLine,
  titleBelow,
  leading,
  trailing,
  variant,
  bordered,
  rowAlign,
  subtitleSize,
  horizontalPadding,
  titleNumberOfLines = 1,
  subtitleNumberOfLines = 1,
  metaLineNumberOfLines = 2,
  withSafeArea = true,
}: ScreenHeaderProps) {
  const styles = screenHeaderVariants({
    variant,
    bordered,
    rowAlign,
    subtitleSize,
    horizontalPadding,
  });

  const inner = (
    <View className={styles.row()}>
      {leading != null ? (
        <View className={styles.leading()}>{leading}</View>
      ) : null}
      <View className={styles.titleColumn()}>
        <Text className={styles.title()} numberOfLines={titleNumberOfLines}>
          {title}
        </Text>
        {titleBelow != null ? <View className="mt-2">{titleBelow}</View> : null}
        {subtitle ? (
          <Text
            className={styles.subtitle()}
            numberOfLines={subtitleNumberOfLines}
          >
            {subtitle}
          </Text>
        ) : null}
        {metaLine ? (
          <Text
            className={styles.metaLine()}
            numberOfLines={metaLineNumberOfLines}
          >
            {metaLine}
          </Text>
        ) : null}
      </View>
      {trailing != null ? (
        <View className={styles.trailing()}>{trailing}</View>
      ) : null}
    </View>
  );

  if (withSafeArea) {
    return (
      <ScreenInset edges={["top"]} className={styles.root()}>
        {inner}
      </ScreenInset>
    );
  }

  return <View className={styles.root()}>{inner}</View>;
}
