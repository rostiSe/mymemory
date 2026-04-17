import { tv, type VariantProps } from "tailwind-variants";

export const listRowVariants = tv({
  slots: {
    root: "flex-row items-center gap-3 px-screen py-3 bg-background",
    leading: "shrink-0",
    body: "flex-1 min-w-0",
    titleRow: "flex-row items-center gap-2",
    title: "text-foreground text-base font-medium flex-1 min-w-0",
    subtitle: "text-muted text-sm mt-0.5",
    meta: "text-muted text-xs ml-2 shrink-0",
    trailing: "shrink-0 flex-row items-center gap-2",
  },
  variants: {
    indent: {
      none: { root: "px-screen" },
      child: { root: "pl-8 pr-screen" },
    },
    density: {
      compact: { root: "py-2" },
      comfortable: { root: "py-3" },
    },
  },
  defaultVariants: { indent: "none", density: "comfortable" },
});

export type ListRowVariants = VariantProps<typeof listRowVariants>;
