import { tv, type VariantProps } from "tailwind-variants";

export const entryCardVariants = tv({
  slots: {
    titleRow: "flex-row gap-0.5 items-start justify-between",
    titleGroup: "flex-row items-center gap-1.5 flex-1 min-w-0",
    title: "text-foreground font-bold text-base flex-1 min-w-0",
    date: "text-muted text-xs shrink-0",
    similarity:
      "shrink-0 text-xs font-medium text-accent",
    metaHint: "text-muted text-xs",
    summary: "text-foreground text-xs",
    chipRow: "self-start",
  },
});

export type EntryCardVariants = VariantProps<typeof entryCardVariants>;
