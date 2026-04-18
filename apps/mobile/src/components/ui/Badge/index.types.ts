import type { ReactNode } from "react";
import type { PressableProps } from "react-native";

export type BadgeTone =
  /** User tags, wiki links, entry-count highlights — soft fill on accent */
  | "tag"
  /** Topic pills — neutral secondary surface */
  | "topic"
  /** Properties, source refs, counts — soft neutral */
  | "neutral"
  /** Same visual as `tag`; use for link-style metadata when reads better than “tag” */
  | "accent"
  /** TOC / segmented control: `selected` toggles primary vs secondary accent */
  | "nav"
  /** Compile / caution metadata — soft warning */
  | "warning";

export type BadgeSize = "sm" | "md";

export type BadgeProps = {
  tone?: BadgeTone;
  /** Meaningful when `tone="nav"` (active segment). */
  selected?: boolean;
  size?: BadgeSize;
  children: ReactNode;
  disabled?: boolean;
  /** Merged onto HeroUI `Chip` (e.g. `mr-2` in horizontal lists). */
  className?: string;
  /** Extra classes for `Chip.Label` (e.g. `max-w-[160px]`). */
  labelClassName?: string;
  numberOfLines?: number;
  accessibilityLabel?: string;
  onPress?: PressableProps["onPress"];
  accessibilityRole?: PressableProps["accessibilityRole"];
};
