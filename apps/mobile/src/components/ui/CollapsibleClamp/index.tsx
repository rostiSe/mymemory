import {
  COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX,
  COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX,
  MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
} from "@/theme/layout-imperative";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useThemeColor } from "heroui-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View, type ColorValue } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const DEFAULT_COLLAPSED_LINES = 3;
const EXPAND_MS = 280;
const FALLBACK_LINE_HEIGHT_PX = 24;
const FALLBACK_EXPANDED_MAX_PX = 8192;
const FALLBACK_FADE_HEIGHT_PX = 48;

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

export type CollapsibleClampProps = {
  children: ReactNode;
  collapsedLineCount?: number;
  lineHeightPx?: number;
  expandHint?: string;
  expandable?: boolean;
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
 */
export function CollapsibleClamp({
  children,
  collapsedLineCount = DEFAULT_COLLAPSED_LINES,
  lineHeightPx: lineHeightPxProp = MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
  expandHint = "",
  expandable,
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

  const needsExpand =
    expandable === true ||
    (expandable !== false &&
      estimateExceedsCollapsedLines(
        expandHint,
        collapsedLineCount,
        charsPerVisualLine,
      ));

  const [expanded, setExpanded] = useState(false);
  const maxHeightAnim = useSharedValue(needsExpand ? collapsedPx : expandedMaxPx);

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
    if (needsExpand) {
      maxHeightAnim.value = collapsedPx;
    }
  }, [contentKey, collapsedPx, needsExpand, maxHeightAnim]);

  useEffect(() => {
    if (!needsExpand) return;
    maxHeightAnim.value = withTiming(
      expanded ? expandedMaxPx : collapsedPx,
      { duration: EXPAND_MS },
    );
  }, [expanded, collapsedPx, expandedMaxPx, needsExpand, maxHeightAnim]);

  const animatedOuter = useAnimatedStyle(() => ({
    maxHeight: maxHeightAnim.value,
    overflow: "hidden" as const,
  }));

  const toggle = useCallback(() => {
    if (needsExpand) setExpanded((v) => !v);
  }, [needsExpand]);

  const showFade =
    Boolean(showFadeGradient) && needsExpand && !expanded;

  const dimmed = Boolean(dimWhenCollapsed) && needsExpand && !expanded;

  if (!needsExpand) {
    return <View className="w-full">{children}</View>;
  }

  return (
    <View className="w-full">
      <Animated.View style={animatedOuter} className="relative w-full">
        <View style={{ opacity: dimmed ? 0.55 : 1 }}>{children}</View>
        {showFade ? (
          <LinearGradient
            pointerEvents="none"
            colors={["transparent", fadeEndColor]}
            locations={[0, 1]}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              height: fadeHeightPx,
            }}
          />
        ) : null}
      </Animated.View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={expanded ? "Show less" : "Show more"}
        onPress={toggle}
        className="items-center justify-center py-2 active:opacity-70"
      >
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={mutedIcon}
        />
      </Pressable>
    </View>
  );
}
