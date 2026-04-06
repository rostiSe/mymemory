/**
 * MyMemory Design Tokens
 *
 * Programmatic design tokens for use where Tailwind classes are insufficient
 * (e.g., StatusBar, programmatic styling, charts, native components).
 *
 * The CSS theme variables in global.css are the source of truth for colors.
 * These tokens mirror the Stitch reference palette for imperative usage.
 *
 * @see global.css for the CSS variable definitions
 * @see docs/DESIGN_SYSTEM.md for full documentation
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
} as const;

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 10,
  xl: 12,
  full: 9999,
} as const;

/** Tab bar constants for the custom floating tab bar */
export const tabBar = {
  height: 64,
  bottomOffset: 24,
  horizontalMargin: 20,
  borderRadius: 9999,
  iconSize: 24,
} as const;
