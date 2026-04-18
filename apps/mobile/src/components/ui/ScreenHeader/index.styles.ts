import { tv, type VariantProps } from "tailwind-variants";

export const screenHeaderVariants = tv({
  slots: {
    root: "bg-background",
    row: "flex-row gap-2",
    leading: "shrink-0",
    titleColumn: "flex-1 min-w-0",
    title: "text-foreground",
    subtitle: "text-muted mt-0.5",
    metaLine: "text-muted text-sm mt-0.5",
    trailing: "shrink-0 flex-row items-center gap-2",
  },
  variants: {
    horizontalPadding: {
      screen: { root: "px-screen" },
      none: { root: "" },
    },
    rowAlign: {
      center: { row: "items-center" },
      start: { row: "items-start" },
    },
    subtitleSize: {
      sm: { subtitle: "text-xs" },
      md: { subtitle: "text-sm" },
      base: { subtitle: "text-base" },
    },
    variant: {
      default: {
        root: "py-3",
        title: "text-lg font-semibold",
      },
      large: {
        root: "pt-4 pb-3",
        title: "text-2xl font-bold",
      },
    },
    bordered: {
      true: { root: "border-b border-border" },
      false: {},
    },
  },
  defaultVariants: {
    variant: "default",
    bordered: false,
    rowAlign: "center",
    subtitleSize: "sm",
    horizontalPadding: "screen",
  },
});

export type ScreenHeaderVariants = VariantProps<typeof screenHeaderVariants>;
