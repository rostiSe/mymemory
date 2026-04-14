import {
  WIKI_STAGGER_DELAY_MS,
  WIKI_STAGGER_DURATION_MS,
} from "@/theme/layout-imperative";
import type { ReactNode } from "react";
import Animated, {
  FadeInLeft,
  FadeInUp,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

type EnterDirection = "up" | "left";

export type AnimatedStaggerItemProps = {
  index: number;
  children: ReactNode;
  enterDirection?: EnterDirection;
};

export function AnimatedStaggerItem({
  index,
  children,
  enterDirection = "up",
}: AnimatedStaggerItemProps) {
  const delay = index * WIKI_STAGGER_DELAY_MS;
  const entering =
    enterDirection === "left"
      ? FadeInLeft.delay(delay).duration(WIKI_STAGGER_DURATION_MS)
      : FadeInUp.delay(delay).duration(WIKI_STAGGER_DURATION_MS);

  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(200)}
      layout={LinearTransition.springify()}
    >
      {children}
    </Animated.View>
  );
}
