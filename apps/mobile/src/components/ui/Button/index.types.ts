import type { ReactNode } from "react";

/** App-level button tone — maps to HeroUI's underlying `variant` prop. */
export type ButtonTone = "primary" | "secondary" | "danger" | "ghost";

export type ButtonSize = "sm" | "md" | "lg";

/**
 * Base prop surface for our Button wrapper.
 *
 * Intentionally omits HeroUI's full prop bag (`feedbackVariant`, `animation`,
 * `isIconOnly`, raw `className`) so the call site has a fixed, consistent API.
 * Specializations like `AnchorButton` extend this — they should not re-introduce
 * HeroUI primitives.
 */
export type BaseButtonProps = {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Icon node rendered before the label. */
  leading?: ReactNode;
  /** Icon node rendered after the label. */
  trailing?: ReactNode;
  /** Spinner replaces the label content; `onPress` is suppressed. */
  loading?: boolean;
  isDisabled?: boolean;
  /** Stretch to the parent's width (default `false` — content-sized). */
  fullWidth?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Use children for label content; strings render as a `Button.Label`. */
  children?: ReactNode;
};
