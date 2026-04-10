import {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import {
  ENTRY_DETAIL_HERO_MAX_HEIGHT_PX,
  ENTRY_DETAIL_HERO_PARALLAX_TRANSLATE_MAX_PX,
  ENTRY_DETAIL_HERO_ZOOM_SCALE_MAX,
} from "@/theme/layout-imperative";

/**
 * Scroll-linked hero image motion (transforms only — no layout/size changes).
 * Keeps ScrollView content size stable for smooth scrolling.
 */
export function useEntryDetailScroll() {
  const scrollY = useSharedValue(0);
  const heroMax = ENTRY_DETAIL_HERO_MAX_HEIGHT_PX;
  const zoomMax = ENTRY_DETAIL_HERO_ZOOM_SCALE_MAX;
  const parallaxMax = ENTRY_DETAIL_HERO_PARALLAX_TRANSLATE_MAX_PX;

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const heroImageStyle = useAnimatedStyle(() => {
    const translateY = interpolate(
      scrollY.value,
      [0, heroMax],
      [0, -parallaxMax],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollY.value,
      [0, heroMax],
      [1, zoomMax],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY }, { scale }],
    };
  });

  return {
    scrollHandler,
    heroImageStyle,
  };
}
