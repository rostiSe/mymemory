/**
 * HeroUI Native theming layer.
 *
 * HeroUI Native reads its palette, radii, and font sizes directly from CSS
 * variables in `apps/mobile/src/global.css`. There is no JS-side colour theme
 * object — overriding `--accent`, `--surface`, `--radius-*`, etc. is enough
 * for every HeroUI primitive (`<Button>`, `<Card>`, `<TextField>`…) to pick
 * up our Material Design 3 palette without `className` overrides.
 *
 * This file owns the **runtime-only** slice of the HeroUI theming layer:
 *
 *  - {@link heroUIConfig} — `HeroUINativeConfig` passed to
 *    `<HeroUINativeProvider config={…}>` in `src/app/_layout.tsx`.
 *    Controls text scaling, toast position, and dev-info console noise.
 *  - {@link SEMANTIC_COLORS} — typed list of HeroUI colour keys the app uses
 *    imperatively via `useThemeColor(…)`. Importing from here keeps the
 *    allowed list visible and greppable.
 *
 * @see apps/mobile/src/global.css                         — colour + radius + font-size tokens
 * @see node_modules/heroui-native/lib/.../theme.css       — HeroUI's calculated variables
 * @see docs/DESIGN_SYSTEM.md                              — token reference + consumption rules
 */

import type { HeroUINativeConfig } from "heroui-native";
import type { ThemeColor } from "heroui-native";

/**
 * Default config for `<HeroUINativeProvider>`.
 *
 * - `textProps.maxFontSizeMultiplier: 1.3` — cap accessibility scaling so
 *   long HeroUI labels (Card titles, Button labels, TextField placeholders)
 *   don't break layout on aggressive Dynamic Type / Large Font settings.
 *   Our own screen text still scales freely — the cap only applies to HeroUI
 *   primitives, which is where overflow currently surfaces.
 * - `toast.position: "top"` — matches the existing toast call sites
 *   (`useAppToast` in `src/hooks/use-app-toast.ts`) and avoids colliding
 *   with the floating tab bar at the bottom.
 * - `devInfo.stylingPrinciples: false` — silences the dev-only console
 *   banner during HMR; tokens are already documented in `DESIGN_SYSTEM.md`.
 */
export const heroUIConfig: HeroUINativeConfig = {
  textProps: {
    allowFontScaling: true,
    maxFontSizeMultiplier: 1.3,
  },
  devInfo: {
    stylingPrinciples: false,
  },
};

/**
 * Semantic HeroUI colour names the app resolves imperatively through
 * `useThemeColor(name)`. Keep this list in sync with the call sites; it is
 * the allow-list of tokens that **must** stay present in `global.css` so
 * `useThemeColor` doesn't return an empty string.
 *
 * Typed as `readonly ThemeColor[]` so a typo produces a compile error
 * instead of a silent runtime fallback.
 */
export const SEMANTIC_COLORS = [
  "background",
  "foreground",
  "muted",
  "surface",
  "surface-foreground",
  "surface-secondary",
  "surface-tertiary",
  "accent",
  "accent-foreground",
  "default",
  "default-foreground",
  "border",
  "success",
  "warning",
  "danger",
  "danger-foreground",
] as const satisfies readonly ThemeColor[];

export type SemanticColor = (typeof SEMANTIC_COLORS)[number];
