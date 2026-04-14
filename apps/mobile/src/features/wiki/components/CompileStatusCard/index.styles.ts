import { tv, type VariantProps } from "tailwind-variants";

export const compileStatusCardVariants = tv({
  base: "mb-4 rounded-lg border p-(--spacing-compile-card-padding)",
  variants: {
    tone: {
      neutral: "border-border bg-surface-secondary",
      success: "border-success/40 bg-success/10",
      accent: "border-accent/35 bg-accent/10",
      danger: "border-danger/45 bg-danger/10",
    },
  },
  defaultVariants: { tone: "neutral" },
});

export type CompileStatusCardVariants = VariantProps<
  typeof compileStatusCardVariants
>;
