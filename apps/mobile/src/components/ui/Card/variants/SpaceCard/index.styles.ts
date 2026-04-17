import { tv, type VariantProps } from "tailwind-variants";

export const spaceCardVariants = tv({
  slots: {
    headerRow: "flex-row items-center gap-2",
    statusDot: "size-1.5 rounded-card bg-accent shrink-0",
    title: "text-foreground text-base font-semibold flex-1 min-w-0",
    metaRow: "mt-1 flex-row items-center gap-2 flex-wrap",
    chipDot: "size-2 rounded-full",
    originUserDot: "size-2 rounded-full bg-accent",
    originAgentDot: "size-2 rounded-full border border-accent bg-transparent",
    metaText: "text-muted text-xs",
    description: "text-muted text-sm mt-1",
  },
});

export type SpaceCardVariants = VariantProps<typeof spaceCardVariants>;
