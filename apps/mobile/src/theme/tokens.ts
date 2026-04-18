/**
 * Imperative color mirrors for APIs that cannot use CSS (StatusBar, charts, etc.).
 *
 * Values mirror the current `@layer theme` block in `global.css`.
 * When `global.css` changes, update these values too.
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
    accent: "#9BA7AF",
    accentForeground: "#212529",
    border: "#6C757D",
    danger: "#D43C2D",
  },
} as const;
