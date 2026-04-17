import { tv, type VariantProps } from "tailwind-variants";

export const cardBodyVariants = tv({
  base: "gap-2",
  variants: {
    density: {
      compact: "px-card py-3",
      comfortable: "px-card py-card",
    },
  },
  defaultVariants: { density: "comfortable" },
});

export type CardBodyVariants = VariantProps<typeof cardBodyVariants>;
