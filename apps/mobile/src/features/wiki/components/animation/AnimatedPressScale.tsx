import {
  WIKI_PRESS_SCALE_DAMPING,
  WIKI_PRESS_SCALE_MIN,
  WIKI_PRESS_SCALE_STIFFNESS,
} from "@/theme/layout-imperative";
import type { ReactNode } from "react";
import { Pressable, type PressableProps } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AnimatedPressScaleProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  style?: PressableProps["style"];
};

export function AnimatedPressScale({
  children,
  onPressIn,
  onPressOut,
  style,
  ...rest
}: AnimatedPressScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      style={[animatedStyle, style]}
      onPressIn={(e) => {
        scale.value = withSpring(WIKI_PRESS_SCALE_MIN, {
          damping: WIKI_PRESS_SCALE_DAMPING,
          stiffness: WIKI_PRESS_SCALE_STIFFNESS,
        });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, {
          damping: WIKI_PRESS_SCALE_DAMPING,
          stiffness: WIKI_PRESS_SCALE_STIFFNESS,
        });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
