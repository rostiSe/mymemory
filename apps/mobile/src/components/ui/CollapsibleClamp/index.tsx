import {
  COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX,
  COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX,
  EXCERPT_CLAMP_DIM_OPACITY,
  MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
} from "@/theme/layout-imperative";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DEFAULT_COLLAPSED_LINES = 3;
/** Time-based progress 0→1 keeps dim/fade in sync with perceived motion (not a 8192px height scale). */
const EXPAND_MS = 240;
/** One curve for open + close so motion feels even (no “slow start” only on collapse). */
const FLOW_EASING = Easing.bezier(0.4, 0, 0.2, 1);
const FALLBACK_LINE_HEIGHT_PX = 24;
const FALLBACK_EXPANDED_MAX_PX = 8192;
const FALLBACK_FADE_HEIGHT_PX = 48;
/** Chevron sits in the fade band; keep tap target comfortable without dominating. */
const CHEVRON_ICON_SIZE = 17;
const CHEVRON_ROW_MIN_HEIGHT_PX = 40;
const CHEVRON_ICON_OPACITY = 0.38;

/** Rough chars per visual line at typical card width — heuristic only. */
const DEFAULT_CHARS_PER_VISUAL_LINE = 38;

export function estimateExceedsCollapsedLines(
  text: string,
  collapsedLines: number,
  charsPerVisualLine: number = DEFAULT_CHARS_PER_VISUAL_LINE,
): boolean {
  const t = text.trim();
  if (!t) return false;
  const sourceLines = t.split(/\n/).length;
  const charLines = Math.ceil(t.length / charsPerVisualLine);
  const roughLines = Math.max(sourceLines, charLines);
  return roughLines > collapsedLines;
}

export type CollapsibleClampCollapseMode = "expandable" | "fade-only";

export type CollapsibleClampProps = {
  children: ReactNode;
  collapsedLineCount?: number;
  lineHeightPx?: number;
  expandHint?: string;
  expandable?: boolean;
  /**
   * `expandable` — tap to expand/collapse (Reanimated). `fade-only` — fixed max-height,
   * bottom fade, no interaction (avoids extra state / layout work on long lists & web).
   */
  collapseMode?: CollapsibleClampCollapseMode;
  charsPerVisualLine?: number;
  showFadeGradient?: boolean;
  fadeGradientEndColor?: ColorValue;
  dimWhenCollapsed?: boolean;
  fadeHeightPx?: number;
  contentKey?: string | number;
};

/**
 * Collapsed region uses animated `maxHeight`. Requires numeric exports from
 * `layout-imperative.ts` (see file comment there).
 *
 * Opacity and fade follow a **time-based** `progress` (0 = collapsed, 1 = expanded)
 * so dimming does not track the huge maxHeight span (72→8192), which otherwise
 * keeps content gray until the very end of the animation.
 */
type FadeOnlyClampProps = {
  children: ReactNode;
  collapsedPx: number;
  fadeHeightPx: number;
  fadeEndColor: ColorValue;
  showFadeGradient: boolean;
  dimWhenCollapsed: boolean;
};

function FadeOnlyClamp({
  children,
  collapsedPx,
  fadeHeightPx,
  fadeEndColor,
  showFadeGradient,
  dimWhenCollapsed,
}: FadeOnlyClampProps) {
  return (
    <View
      className="relative w-full"
      style={{ maxHeight: collapsedPx, overflow: "hidden" }}
    >
      <View
        style={
          dimWhenCollapsed ? { opacity: EXCERPT_CLAMP_DIM_OPACITY } : undefined
        }
      >
        {children}
      </View>
      {showFadeGradient ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: fadeHeightPx,
          }}
        >
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", fadeEndColor]}
            locations={[0, 1]}
            style={{ flex: 1 }}
          />
        </View>
      ) : null}
    </View>
  );
}

export function CollapsibleClamp({
  children,
  collapsedLineCount = DEFAULT_COLLAPSED_LINES,
  lineHeightPx: lineHeightPxProp = MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
  expandHint = "",
  expandable,
  collapseMode = "expandable",
  charsPerVisualLine = DEFAULT_CHARS_PER_VISUAL_LINE,
  showFadeGradient = true,
  dimWhenCollapsed = true,
  fadeHeightPx: fadeHeightPxProp = COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX,
  fadeGradientEndColor,
  contentKey,
}: CollapsibleClampProps) {
  const lineHeightPx =
    typeof lineHeightPxProp === "number" &&
    Number.isFinite(lineHeightPxProp) &&
    lineHeightPxProp > 0
      ? lineHeightPxProp
      : FALLBACK_LINE_HEIGHT_PX;

  const expandedMaxPx =
    typeof COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX === "number" &&
    Number.isFinite(COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX) &&
    COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX > 100
      ? COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX
      : FALLBACK_EXPANDED_MAX_PX;

  const fadeHeightPx =
    typeof fadeHeightPxProp === "number" &&
    Number.isFinite(fadeHeightPxProp) &&
    fadeHeightPxProp > 0
      ? fadeHeightPxProp
      : FALLBACK_FADE_HEIGHT_PX;

  const collapsedPx = Math.max(8, collapsedLineCount * lineHeightPx);

  const surfaceFallback = useThemeColor("surface");
  const fadeEndColor = fadeGradientEndColor ?? surfaceFallback;
  const mutedIcon = useThemeColor("muted");

  const needsClamp = useMemo(() => {
    if (expandable === false) return false;
    if (expandable === true) return true;
    return estimateExceedsCollapsedLines(
      expandHint,
      collapsedLineCount,
      charsPerVisualLine,
    );
  }, [expandable, expandHint, collapsedLineCount, charsPerVisualLine]);

  const [expanded, setExpanded] = useState(false);
  /** 0 = collapsed, 1 = expanded — drives height, dim, and fade together. */
  const progress = useSharedValue(0);

  const isFirstEffect = useRef(true);
  const prevContentKey = useRef(contentKey);

  useEffect(() => {
    if (isFirstEffect.current) {
      isFirstEffect.current = false;
      prevContentKey.current = contentKey;
      return;
    }
    if (prevContentKey.current === contentKey) return;
    prevContentKey.current = contentKey;
    setExpanded(false);
    if (needsClamp && collapseMode === "expandable") {
      progress.value = 0;
    }
  }, [collapseMode, contentKey, needsClamp, progress]);

  useEffect(() => {
    if (!needsClamp || collapseMode !== "expandable") return;
    progress.value = withTiming(expanded ? 1 : 0, {
      duration: EXPAND_MS,
      easing: FLOW_EASING,
    });
  }, [collapseMode, expanded, needsClamp, progress]);

  const animatedOuter = useAnimatedStyle(() => {
    const h = interpolate(
      progress.value,
      [0, 1],
      [collapsedPx, expandedMaxPx],
      Extrapolation.CLAMP,
    );
    return {
      maxHeight: h,
      overflow: "hidden" as const,
    };
  }, [collapsedPx, expandedMaxPx]);

  const animatedContentOpacity = useAnimatedStyle(() => {
    if (!dimWhenCollapsed) {
      return { opacity: 1 };
    }
    return {
      opacity: interpolate(
        progress.value,
        [0, 1],
        [EXCERPT_CLAMP_DIM_OPACITY, 1],
        Extrapolation.CLAMP,
      ),
    };
  }, [dimWhenCollapsed]);

  const animatedFadeOverlayOpacity = useAnimatedStyle(() => {
    if (!showFadeGradient) {
      return { opacity: 0 };
    }
    return {
      opacity: interpolate(
        progress.value,
        [0, 1],
        [1, 0],
        Extrapolation.CLAMP,
      ),
    };
  }, [showFadeGradient]);

  const toggle = useCallback(() => {
    if (needsClamp && collapseMode === "expandable") {
      setExpanded((v) => !v);
    }
  }, [collapseMode, needsClamp]);

  if (!needsClamp) {
    return <View className="w-full">{children}</View>;
  }

  if (collapseMode === "fade-only") {
    return (
      <View className="w-full">
        <FadeOnlyClamp
          collapsedPx={collapsedPx}
          dimWhenCollapsed={dimWhenCollapsed}
          fadeEndColor={fadeEndColor}
          fadeHeightPx={fadeHeightPx}
          showFadeGradient={showFadeGradient}
        >
          {children}
        </FadeOnlyClamp>
      </View>
    );
  }

  return (
    <View className="w-full">
      <Animated.View style={animatedOuter} className="relative w-full">
        <Animated.View style={animatedContentOpacity}>{children}</Animated.View>
        {showFadeGradient ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: fadeHeightPx,
              },
              animatedFadeOverlayOpacity,
            ]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={["transparent", fadeEndColor]}
              locations={[0, 1]}
              style={{ flex: 1 }}
            />
          </Animated.View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? "Show less" : "Show more"}
          onPress={toggle}
          className="absolute left-0 right-0 bottom-0 items-center justify-end active:opacity-70"
          style={{
            minHeight: CHEVRON_ROW_MIN_HEIGHT_PX,
            paddingBottom: 2,
          }}
        >
          <View style={{ opacity: CHEVRON_ICON_OPACITY }}>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={CHEVRON_ICON_SIZE}
              color={mutedIcon}
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
}
