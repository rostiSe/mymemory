import { tv, type VariantProps } from "tailwind-variants";

export const spaceListRowVariants = tv({
  base: "rounded-card border border-border bg-surface px-3 py-3 mb-2",
  variants: {
    variant: {
      default: "",
      child:
        "ml-3 border-l-2 border-l-border/60",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

export type SpaceListRowVariantProps = VariantProps<typeof spaceListRowVariants>;
