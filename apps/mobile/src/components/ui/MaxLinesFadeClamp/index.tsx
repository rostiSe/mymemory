import {
  COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX,
  EXCERPT_CLAMP_DIM_OPACITY,
  MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
} from "@/theme/layout-imperative";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { View, type ColorValue } from "react-native";

const DEFAULT_LINE_COUNT = 3;
const FALLBACK_LINE_HEIGHT_PX = 24;
const FALLBACK_FADE_HEIGHT_PX = 48;

export type MaxLinesFadeClampProps = {
  children: ReactNode;
  /** Visual line cap; height is `lineCount × lineHeightPx`. */
  lineCount?: number;
  lineHeightPx?: number;
  showFadeGradient?: boolean;
  dimContent?: boolean;
  fadeHeightPx?: number;
  fadeEndColor: ColorValue;
};

/**
 * Feed excerpt: fixed max height (N lines), optional dim + bottom fade — no expand/collapse or Reanimated.
 * Matches the former `CollapsibleClamp` `fade-only` look without list-time state or heuristics.
 */
export function MaxLinesFadeClamp({
  children,
  lineCount = DEFAULT_LINE_COUNT,
  lineHeightPx: lineHeightPxProp = MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX,
  showFadeGradient = true,
  dimContent = true,
  fadeHeightPx: fadeHeightPxProp = COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX,
  fadeEndColor,
}: MaxLinesFadeClampProps) {
  const lineHeightPx =
    typeof lineHeightPxProp === "number" &&
    Number.isFinite(lineHeightPxProp) &&
    lineHeightPxProp > 0
      ? lineHeightPxProp
      : FALLBACK_LINE_HEIGHT_PX;

  const fadeHeightPx =
    typeof fadeHeightPxProp === "number" &&
    Number.isFinite(fadeHeightPxProp) &&
    fadeHeightPxProp > 0
      ? fadeHeightPxProp
      : FALLBACK_FADE_HEIGHT_PX;

  const maxHeightPx = Math.max(8, lineCount * lineHeightPx);

  return (
    <View className="relative w-full" style={{ maxHeight: maxHeightPx, overflow: "hidden" }}>
      <View style={dimContent ? { opacity: EXCERPT_CLAMP_DIM_OPACITY } : undefined}>
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
