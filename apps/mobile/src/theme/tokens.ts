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
    background: "#212529",
    foreground: "#F8F9FA",
    muted: "#ADB5BD",
    surface: "#495057",
    surfaceSecondary: "#343A40",
    surfaceTertiary: "#6C757D",
    accent: "#90A4AE",
    accentForeground: "#212529",
    border: "#6C757D",
    danger: "#CF6679",
  },
} as const;
