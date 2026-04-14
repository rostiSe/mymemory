import { tv, type VariantProps } from "tailwind-variants";

export const insightCardVariants = tv({
  base: "mb-3 rounded-lg border-l-[3px] bg-surface-secondary px-card py-3",
  variants: {
    tone: {
      insight: "border-l-accent",
      contradiction: "border-l-warning",
      question: "border-l-border",
    },
  },
  defaultVariants: { tone: "insight" },
});

export type InsightCardVariants = VariantProps<typeof insightCardVariants>;
