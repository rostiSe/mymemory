import { tv, type VariantProps } from "tailwind-variants";

export const cardHeaderVariants = tv({
  slots: {
    root: "flex-row items-start justify-between gap-3 px-card pt-card",
    titleColumn: "flex-1 min-w-0 gap-1",
    eyebrow:
      "text-muted text-xs font-semibold uppercase tracking-wide",
    title: "text-foreground text-base font-bold",
    sectionLabelOnly:
      "text-foreground text-xs font-semibold uppercase tracking-wide",
    trailing: "shrink-0",
  },
  variants: {
    density: {
      compact: { root: "px-card pt-3" },
      comfortable: { root: "px-card pt-card" },
    },
  },
  defaultVariants: { density: "comfortable" },
});

export type CardHeaderVariants = VariantProps<typeof cardHeaderVariants>;
