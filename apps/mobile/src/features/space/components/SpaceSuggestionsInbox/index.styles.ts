import { tv } from "tailwind-variants";

/** Stacked peek cards behind the tappable summary (no per-suggestion views in collapsed state). */
export const suggestionStackVariants = tv({
  slots: {
    root: "relative w-full h-28",
    layerBack:
      "absolute left-4 right-4 top-1 h-14 rounded-xl border border-border bg-surface-secondary opacity-45",
    layerMid:
      "absolute left-2 right-2 top-3 h-16 rounded-xl border border-border bg-surface-secondary opacity-70",
    front:
      "relative z-10 mt-5 rounded-xl border border-border bg-surface-secondary overflow-hidden",
  },
});
