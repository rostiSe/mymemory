import { tv, type VariantProps } from "tailwind-variants";
import type { ButtonTone } from "./index.types";

export const buttonRootVariants = tv({
  base: "",
  variants: {
    fullWidth: {
      true: "self-stretch",
      false: "self-start",
    },
  },
  defaultVariants: { fullWidth: false },
});

export type ButtonRootVariants = VariantProps<typeof buttonRootVariants>;

/**
 * Map our `tone` to HeroUI's `variant`. Single source of truth so additions
 * (e.g. a `tertiary` tone) only touch this file.
 */
export const TONE_TO_HEROUI_VARIANT: Record<
  ButtonTone,
  "primary" | "secondary" | "danger" | "ghost"
> = {
  primary: "primary",
  secondary: "secondary",
  danger: "danger",
  ghost: "ghost",
};

/**
 * Spinner colour key per tone — fed into `useThemeColor()` so the spinner
 * matches the label colour HeroUI applies internally.
 */
export const TONE_TO_SPINNER_COLOR: Record<
  ButtonTone,
  "accent-foreground" | "default-foreground" | "danger-foreground" | "foreground"
> = {
  primary: "accent-foreground",
  secondary: "default-foreground",
  danger: "danger-foreground",
  ghost: "foreground",
};
