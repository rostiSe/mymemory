# Design Token Examples by Visual Direction

Use these as starting points based on Phase 3 discovery answers. Always adjust to the specific brand/personality described.

---

## Direction: Calm and Minimal (neutral base, one accent)

**Personality:** "calm", "minimal", "clean", "focused"
**Accent:** Indigo or slate-blue

```typescript
colors: {
  background:   { light: '#ffffff', dark: '#0c0c0c' },
  surface:      { light: '#f5f5f5', dark: '#161616' },
  surfaceRaised:{ light: '#ebebeb', dark: '#1e1e1e' },
  border:       { light: '#d4d4d4', dark: '#2a2a2a' },
  borderSubtle: { light: '#e8e8e8', dark: '#1f1f1f' },
  textPrimary:  { light: '#0f0f0f', dark: '#f0f0f0' },
  textSecondary:{ light: '#6b6b6b', dark: '#8a8a8a' },
  textDisabled: { light: '#b0b0b0', dark: '#404040' },
  accent:       { light: '#6366f1', dark: '#818cf8' },
  accentHover:  { light: '#4f46e5', dark: '#6366f1' },
  accentForeground: { light: '#ffffff', dark: '#ffffff' },
}
radius: { sm: 6, md: 10, lg: 16, full: 9999 }
fontSize.base: 15
```

---

## Direction: Bold and Energetic

**Personality:** "bold", "energetic", "sport", "action"
**Accent:** Vivid orange, electric blue, or neon green

```typescript
colors: {
  background:   { light: '#f8f8f8', dark: '#080808' },
  surface:      { light: '#ffffff', dark: '#111111' },
  surfaceRaised:{ light: '#f0f0f0', dark: '#1a1a1a' },
  border:       { light: '#e0e0e0', dark: '#222222' },
  borderSubtle: { light: '#eeeeee', dark: '#161616' },
  textPrimary:  { light: '#111111', dark: '#f5f5f5' },
  textSecondary:{ light: '#555555', dark: '#999999' },
  textDisabled: { light: '#aaaaaa', dark: '#444444' },
  accent:       { light: '#f97316', dark: '#fb923c' },
  accentHover:  { light: '#ea580c', dark: '#f97316' },
  accentForeground: { light: '#ffffff', dark: '#000000' },
}
radius: { sm: 4, md: 8, lg: 12, full: 9999 }
fontSize.base: 15
```

---

## Direction: Warm and Personal

**Personality:** "warm", "personal", "journal", "cozy", "human"
**Accent:** Amber, terracotta, or dusty rose

```typescript
colors: {
  background:   { light: '#fdf8f3', dark: '#12100e' },
  surface:      { light: '#f5ede3', dark: '#1c1814' },
  surfaceRaised:{ light: '#ede1d3', dark: '#231f1a' },
  border:       { light: '#d6c4b0', dark: '#2e2820' },
  borderSubtle: { light: '#e8ddd0', dark: '#221e19' },
  textPrimary:  { light: '#1a1209', dark: '#f2e8db' },
  textSecondary:{ light: '#7a6452', dark: '#9e8872' },
  textDisabled: { light: '#b8a898', dark: '#483e35' },
  accent:       { light: '#d97706', dark: '#f59e0b' },
  accentHover:  { light: '#b45309', dark: '#d97706' },
  accentForeground: { light: '#ffffff', dark: '#000000' },
}
radius: { sm: 8, md: 14, lg: 20, full: 9999 }
fontSize.base: 16
```

---

## Direction: Sharp and Professional

**Personality:** "professional", "business", "data", "productivity"
**Accent:** Teal, steel blue, or charcoal

```typescript
colors: {
  background:   { light: '#f9fafb', dark: '#0f1117' },
  surface:      { light: '#ffffff', dark: '#161b27' },
  surfaceRaised:{ light: '#f3f4f6', dark: '#1c2333' },
  border:       { light: '#e5e7eb', dark: '#252d3d' },
  borderSubtle: { light: '#f1f2f4', dark: '#1a2030' },
  textPrimary:  { light: '#111827', dark: '#f9fafb' },
  textSecondary:{ light: '#6b7280', dark: '#9ca3af' },
  textDisabled: { light: '#d1d5db', dark: '#374151' },
  accent:       { light: '#0d9488', dark: '#2dd4bf' },
  accentHover:  { light: '#0f766e', dark: '#14b8a6' },
  accentForeground: { light: '#ffffff', dark: '#000000' },
}
radius: { sm: 4, md: 6, lg: 10, full: 9999 }
fontSize.base: 14
```

---

## Direction: Dark-first Premium

**Personality:** "premium", "dark", "sophisticated", "music", "night"
**Accent:** Purple, gold, or electric violet

```typescript
colors: {
  background:   { light: '#1a1a2e', dark: '#0a0a0f' },
  surface:      { light: '#16213e', dark: '#0f0f1a' },
  surfaceRaised:{ light: '#1f3460', dark: '#141428' },
  border:       { light: '#2d3561', dark: '#1e1e35' },
  borderSubtle: { light: '#232345', dark: '#141425' },
  textPrimary:  { light: '#e8e8ff', dark: '#f0f0ff' },
  textSecondary:{ light: '#9999cc', dark: '#7777aa' },
  textDisabled: { light: '#444466', dark: '#333355' },
  accent:       { light: '#a855f7', dark: '#c084fc' },
  accentHover:  { light: '#9333ea', dark: '#a855f7' },
  accentForeground: { light: '#ffffff', dark: '#000000' },
}
radius: { sm: 8, md: 14, lg: 22, full: 9999 }
fontSize.base: 15
```

---

## Semantic tokens (consistent across all directions)

```typescript
destructive: { light: '#ef4444', dark: '#f87171' },
destructiveForeground: { light: '#ffffff', dark: '#ffffff' },
success: { light: '#22c55e', dark: '#4ade80' },
successForeground: { light: '#ffffff', dark: '#000000' },
warning: { light: '#f59e0b', dark: '#fbbf24' },
warningForeground: { light: '#000000', dark: '#000000' },
info: { light: '#3b82f6', dark: '#60a5fa' },
infoForeground: { light: '#ffffff', dark: '#ffffff' },
```

---

## Typography scales by feel

### Compact (data-dense, small UI)
```typescript
xs: 11, sm: 12, base: 13, lg: 15, xl: 17, '2xl': 20, '3xl': 24
```

### Comfortable (standard mobile)
```typescript
xs: 12, sm: 13, base: 15, lg: 17, xl: 20, '2xl': 24, '3xl': 30
```

### Generous (accessibility-first, content-heavy)
```typescript
xs: 13, sm: 15, base: 17, lg: 20, xl: 24, '2xl': 28, '3xl': 36
```
