import { tv, type VariantProps } from "tailwind-variants";

export const emptyStateVariants = tv({
  slots: {
    root: "items-center justify-center px-screen py-8 gap-3",
    iconWrap:
      "size-14 items-center justify-center rounded-full bg-surface-secondary",
    title: "text-foreground text-base font-semibold text-center",
    description: "text-muted text-sm text-center",
    actionRow: "mt-2",
  },
  variants: {
    fill: {
      true: { root: "flex-1" },
      false: { root: "" },
    },
  },
  defaultVariants: { fill: true },
});

export type EmptyStateVariants = VariantProps<typeof emptyStateVariants>;
