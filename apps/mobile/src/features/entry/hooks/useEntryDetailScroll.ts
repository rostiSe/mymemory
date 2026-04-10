import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  ENTRY_DETAIL_HERO_MAX_HEIGHT_PX,
  ENTRY_DETAIL_HERO_ZOOM_SCALE_MAX,
} from "@/theme/layout-imperative";

/**
 * Scroll-linked hero collapse + image zoom for entry detail.
 */
export function useEntryDetailScroll() {
  const scrollY = useSharedValue(0);
  const heroMax = ENTRY_DETAIL_HERO_MAX_HEIGHT_PX;
  const zoomMax = ENTRY_DETAIL_HERO_ZOOM_SCALE_MAX;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const heroContainerStyle = useAnimatedStyle(() => ({
    height: interpolate(
      scrollY.value,
      [0, heroMax],
      [heroMax, 0],
      Extrapolation.CLAMP,
    ),
    overflow: "hidden" as const,
  }));

  const heroImageStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scale: interpolate(
          scrollY.value,
          [0, heroMax],
          [1, zoomMax],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return {
    scrollHandler,
    scrollY,
    heroContainerStyle,
    heroImageStyle,
    heroMax,
  };
}
