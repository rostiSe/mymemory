import { tv, type VariantProps } from "tailwind-variants";

export const cardFooterVariants = tv({
  base: "flex-row items-center gap-2 px-card pb-card",
  variants: {
    density: {
      compact: "pb-3",
      comfortable: "pb-card",
    },
    justify: {
      start: "justify-start",
      between: "justify-between",
      end: "justify-end",
    },
  },
  defaultVariants: { density: "comfortable", justify: "start" },
});

export type CardFooterVariants = VariantProps<typeof cardFooterVariants>;
