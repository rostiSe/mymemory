import {
  SCREEN_TOP_NAV_FADE_HEIGHT_PX,
  SCREEN_TOP_NAV_ROW_HEIGHT_PX,
  SPACING_SCREEN_PX,
} from "@/theme/layout-imperative";
import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

export type ScreenTopNavChromeProps = {
  topInset: number;
  scrollY: SharedValue<number>;
  /** Typically a back control; rendered at the start of the row. */
  leading: ReactNode;
  /** Optional end-aligned region (e.g. wiki badges). Omit for back-only screens. */
  trailing?: ReactNode;
  /**
   * When true, inserts `flex-1` between `leading` and `trailing` so `trailing`
   * pins to the right (wiki). Entry detail keeps actions beside the back button.
   */
  trailingExpanded?: boolean;
};

/**
 * Pinned top navigation: solid bar + clamp-style fade band below the row (solid at the
 * top of the strip, transparent toward the content), matching `CollapsibleClamp`.
 * Uses explicit `position` so the bar stays flush to the window top (not offset by parents).
 */
export function ScreenTopNavChrome({
  topInset,
  scrollY,
  leading,
  trailing,
  trailingExpanded = false,
}: ScreenTopNavChromeProps) {
  const fadeEndColor = useThemeColor("background");
  const solidHeight = topInset + SCREEN_TOP_NAV_ROW_HEIGHT_PX;
  const fadeHeight = SCREEN_TOP_NAV_FADE_HEIGHT_PX;

  /** At scroll top the scrim is fully transparent so hero/content shows through; ramps up as user scrolls. */
  const backdropAnim = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, 56, 160],
      [0, 0.4, 0.94],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <View pointerEvents="box-none" style={styles.root}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdropColumn,
          { height: solidHeight + fadeHeight },
          backdropAnim,
        ]}
      >
        <View
          style={[
            styles.solid,
            { height: solidHeight, backgroundColor: fadeEndColor },
          ]}
        />
        <View style={{ height: fadeHeight }}>
          <LinearGradient
            pointerEvents="none"
            colors={[fadeEndColor, "transparent"]}
            locations={[0, 1]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[
          styles.navRow,
          {
            paddingTop: topInset,
            paddingHorizontal: SPACING_SCREEN_PX,
            minHeight: SCREEN_TOP_NAV_ROW_HEIGHT_PX + topInset,
          },
        ]}
      >
        {leading}
        {trailingExpanded ? <View style={styles.spacer} /> : null}
        {trailing ?? null}
      </View>
    </View>
  );
}

/** Standard circular back control (entry / wiki / space detail). */
export function ScreenTopNavBackButton({
  onPress = () => router.back(),
  accessibilityLabel = "Go back",
}: {
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const foregroundColor = useThemeColor("foreground");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      className="size-[38px] items-center justify-center rounded-full border border-border/50 bg-background/85 dark:bg-background/75"
    >
      <MaterialIcons name="arrow-back" size={24} color={foregroundColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 16,
  },
  backdropColumn: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  solid: {
    width: "100%",
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  spacer: {
    flex: 1,
  },
});
