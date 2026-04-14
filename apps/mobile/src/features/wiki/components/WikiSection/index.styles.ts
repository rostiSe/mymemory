import { tv, type VariantProps } from "tailwind-variants";

export const wikiSectionVariants = tv({
  base: "mb-6 rounded-lg border border-border bg-surface p-card",
  variants: {
    tone: {
      default: "",
      highlighted: "border-accent",
      compact: "p-3",
    },
  },
  defaultVariants: { tone: "default" },
});

export type WikiSectionVariants = VariantProps<typeof wikiSectionVariants>;
