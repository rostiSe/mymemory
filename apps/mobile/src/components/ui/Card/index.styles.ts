import { tv, type VariantProps } from "tailwind-variants";

export const cardRootVariants = tv({
  base: "overflow-hidden border",
  variants: {
    tone: {
      neutral: "bg-surface border-border",
      "accent-soft": "bg-surface-secondary border-accent/35",
      "surface-secondary": "bg-surface-secondary border-border",
    },
    radius: {
      sm: "rounded-sm",
      md: "rounded-md",
      lg: "rounded-lg",
    },
    interactive: {
      true: "",
      false: "",
    },
  },
  defaultVariants: {
    tone: "neutral",
    radius: "lg",
    interactive: false,
  },
});

export type CardRootVariants = VariantProps<typeof cardRootVariants>;
