import { tv, type VariantProps } from "tailwind-variants";

export const sheetFormVariants = tv({
  slots: {
    header: "mb-5 gap-1",
    title: "text-foreground text-lg font-semibold",
    description: "text-muted text-sm",
    body: "gap-3",
    actions: "mt-6 gap-3",
  },
});

export type SheetFormVariants = VariantProps<typeof sheetFormVariants>;
