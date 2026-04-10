import { LAYOUT_SCROLL_FADE_SIZE_PX } from "@/theme/layout-imperative";
import { LinearGradient } from "expo-linear-gradient";
import {
  ScrollShadow,
  useThemeColor,
  type ScrollShadowProps,
} from "heroui-native";

export type ScrollEdgeFadeProps = Omit<
  ScrollShadowProps,
  "LinearGradientComponent"
>;

/**
 * HeroUI ScrollShadow with expo-linear-gradient. Wraps a single scroll child (FlatList, ScrollView).
 * @see https://heroui.com/docs/native/components/scroll-shadow
 */
export function ScrollEdgeFade({
  size = LAYOUT_SCROLL_FADE_SIZE_PX,
  color: colorProp,
  ...props
}: ScrollEdgeFadeProps) {
  return (
    <ScrollShadow
      LinearGradientComponent={LinearGradient}
      size={size}
      color={useThemeColor("background")}
      {...props}
    />
  );
}
