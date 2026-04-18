import { tv, type VariantProps } from "tailwind-variants";

export const entryHeaderActionsVariants = tv({
  slots: {
    root: "flex-row items-center gap-2",
    hit: "items-center justify-center active:opacity-80",
  },
  variants: {
    density: {
      default: {
        hit: "size-[38px] rounded-full",
      },
      compact: {
        hit: "size-8 rounded-full",
      },
    },
    surface: {
      inline: {},
      overlay: {
        hit: "border border-border/50 bg-background/85 dark:bg-background/75",
      },
    },
  },
  defaultVariants: {
    density: "default",
    surface: "inline",
  },
});

export type EntryHeaderActionsVariants = VariantProps<
  typeof entryHeaderActionsVariants
>;
