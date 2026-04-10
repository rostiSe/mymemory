/**
 * Imperative color mirrors for APIs that cannot use CSS (StatusBar, charts, etc.).
 *
 * Spacing, typography, radii, and layout live in `global.css` (@theme inline).
 * Numeric mirrors for StyleSheet-only APIs: `@/theme/layout-imperative`.
 *
 * @see global.css
 * @see docs/DESIGN_SYSTEM.md
 */

export const colors = {
  light: {
    background: "#F9F9F9",
    foreground: "#1A1C1C",
    muted: "#73787B",
    surface: "#FFFFFF",
    surfaceSecondary: "#F3F3F3",
    surfaceTertiary: "#EEEEEE",
    accent: "#334550",
    accentForeground: "#FFFFFF",
    border: "#C3C7CB",
    danger: "#BA1A1A",
  },
  dark: {
    background: "#121212",
    foreground: "#F3F3F3",
    muted: "#9E9E9E",
    surface: "#1E1E1E",
    surfaceSecondary: "#1A1A1A",
    surfaceTertiary: "#252525",
    accent: "#90A4AE",
    accentForeground: "#121212",
    border: "#2E2E2E",
    danger: "#CF6679",
  },
} as const;
