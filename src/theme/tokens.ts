export const colors = {
  primary: {
    50: "#E6F1FE",
    100: "#CCE3FD",
    200: "#99C7FB",
    300: "#66AAF9",
    400: "#338EF7",
    500: "#006FEE",
    600: "#005BC4",
    700: "#004493",
    800: "#002E62",
    900: "#001731",
  },
  neutral: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
  success: "#17C964",
  warning: "#F5A524",
  danger: "#F31260",
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
  lg: 12,
  xl: 16,
  full: 9999,
} as const;
