import { tv, type VariantProps } from "tailwind-variants";

export const statusCardVariants = tv({
  slots: {
    root: "mb-4 rounded-lg border p-(--spacing-compile-card-padding)",
    eyebrow: "text-muted text-xs font-semibold uppercase tracking-wide",
    title: "text-foreground text-base font-bold",
    description: "text-muted text-sm",
    actionRow: "mt-3 flex-row items-center gap-2",
    metaRow: "mt-2 flex-row items-center gap-2 flex-wrap",
  },
  variants: {
    tone: {
      neutral: { root: "border-border bg-surface-secondary" },
      success: { root: "border-success/40 bg-success/10" },
      accent: { root: "border-accent/35 bg-accent/10" },
      danger: { root: "border-danger/45 bg-danger/10" },
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type StatusCardVariants = VariantProps<typeof statusCardVariants>;
