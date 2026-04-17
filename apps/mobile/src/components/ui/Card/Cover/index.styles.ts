import { tv, type VariantProps } from "tailwind-variants";

export const cardCoverVariants = tv({
  base: "relative w-full shrink-0 overflow-hidden bg-surface-tertiary",
  variants: {
    aspect: {
      /** Fixed-height slot: set height via `style` or `className` (e.g. entry card strip). Image fills with cover. */
      fill: "",
      "16/9": "aspect-[16/9]",
      "4/3": "aspect-[4/3]",
      "1/1": "aspect-square",
    },
  },
  defaultVariants: { aspect: "16/9" },
});

export type CardCoverVariants = VariantProps<typeof cardCoverVariants>;
