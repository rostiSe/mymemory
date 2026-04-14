import { WIKI_PRESS_SCALE_MIN } from "@/theme/layout-imperative";
import type { ReactNode } from "react";
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type AnimatedPressScaleProps = Omit<PressableProps, "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
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
        scale.value = withSpring(WIKI_PRESS_SCALE_MIN, { damping: 15, stiffness: 400 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        onPressOut?.(e);
      }}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
