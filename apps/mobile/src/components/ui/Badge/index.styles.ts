import { tv, type VariantProps } from "tailwind-variants";
import type { BadgeTone } from "./index.types";

export const badgeLabelVariants = tv({
  base: "",
  variants: {
    size: {
      sm: "text-xs",
      md: "text-sm",
    },
  },
  defaultVariants: { size: "sm" },
});

export type BadgeLabelVariants = VariantProps<typeof badgeLabelVariants>;

type HeroChipVariant = "primary" | "secondary" | "tertiary" | "soft";
type HeroChipColor = "accent" | "default" | "success" | "warning" | "danger";

export function toneToHeroChip(
  tone: BadgeTone,
  selected: boolean | undefined,
): { variant: HeroChipVariant; color: HeroChipColor } {
  switch (tone) {
    case "tag":
    case "accent":
      return { variant: "soft", color: "accent" };
    case "topic":
      return { variant: "secondary", color: "default" };
    case "neutral":
      return { variant: "soft", color: "default" };
    case "nav":
      return selected
        ? { variant: "primary", color: "accent" }
        : { variant: "secondary", color: "accent" };
    case "warning":
      return { variant: "soft", color: "warning" };
  }
}
