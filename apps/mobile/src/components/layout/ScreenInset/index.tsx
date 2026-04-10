import type { ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import {
  useSafeAreaInsets,
  type Edge,
} from "react-native-safe-area-context";

export type ScreenInsetProps = ViewProps & {
  children: ReactNode;
  /** Which edges receive inset padding. Default: all. */
  edges?: readonly Edge[];
};

const ALL_EDGES: readonly Edge[] = ["top", "right", "bottom", "left"];

/**
 * Applies safe-area padding via `useSafeAreaInsets` on a plain `View`.
 * Expo Router already provides `SafeAreaProvider` (ExpoRoot); do not use RN SafeAreaView.
 */
export function ScreenInset({
  children,
  edges = ALL_EDGES,
  style,
  ...rest
}: ScreenInsetProps) {
  const insets = useSafeAreaInsets();
  const edgeSet = new Set(edges);

  const paddingStyle = {
    paddingTop: edgeSet.has("top") ? insets.top : 0,
    paddingRight: edgeSet.has("right") ? insets.right : 0,
    paddingBottom: edgeSet.has("bottom") ? insets.bottom : 0,
    paddingLeft: edgeSet.has("left") ? insets.left : 0,
  };

  return (
    <View style={[paddingStyle, style]} {...rest}>
      {children}
    </View>
  );
}
