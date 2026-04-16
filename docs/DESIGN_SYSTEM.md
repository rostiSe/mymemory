# MyMemory Design System

## Overview

The MyMemory design system is built on **HeroUI Native** + **Uniwind (Tailwind CSS for React Native)** with a custom Material Design 3-inspired color palette derived from the Stitch design reference.

**Stack:**
- **HeroUI Native** — component library (Card, Button, TextField, ListGroup, Toast, etc.)
- **Uniwind** — Tailwind CSS v4 runtime for React Native
- **Tailwind Variants** — component variant styling via `tv()`
- **Material Icons** — `@expo/vector-icons/MaterialIcons`

---

## Color System

Colors are defined as CSS variables in `src/global.css` using `@layer theme` with `@variant light` / `@variant dark` blocks. They override HeroUI Native's default theme.

### Semantic Color Tokens

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | `#F9F9F9` | `#121212` | Page/screen background |
| `foreground` | `#1A1C1C` | `#F3F3F3` | Primary text |
| `muted` | `#73787B` | `#9E9E9E` | Secondary/hint text, icons |
| `surface` | `#FFFFFF` | `#1E1E1E` | Cards, elevated containers |
| `surface-secondary` | `#F3F3F3` | `#1A1A1A` | Slightly tinted surface |
| `surface-tertiary` | `#EEEEEE` | `#252525` | More tinted surface |
| `accent` | `#334550` | `#90A4AE` | Brand/interactive color |
| `accent-foreground` | `#FFFFFF` | `#121212` | Text on accent |
| `default` | `#E2E2E2` | dark neutral | Neutral chips/badges |
| `border` | `#C3C7CB` | `#2E2E2E` | Dividers, borders |
| `danger` | `#BA1A1A` | `#CF6679` | Destructive actions |
| `success` | green | green | Success feedback |
| `warning` | amber | amber | Warning feedback |

### How to Use Colors

```tsx
// ✅ Correct — use semantic Tailwind classes
<View className="bg-background">
  <Text className="text-foreground">Primary text</Text>
  <Text className="text-muted">Secondary text</Text>
</View>

// ✅ Correct — surface for cards
<View className="bg-surface rounded-lg p-4">
  <Text className="text-foreground">Card content</Text>
</View>

// ❌ Wrong — never use raw colors
<Text style={{ color: '#1A1C1C' }}>Don't do this</Text>
<Text className="text-gray-800">Or this</Text>
```

### Programmatic Access

For **colors** when imperative APIs need a hex (StatusBar, charts, etc.):

```tsx
// Via HeroUI hook (reactive to theme changes)
import { useThemeColor } from "heroui-native";
const bgColor = useThemeColor("background");

// Via static color mirror (non-reactive; same values as global.css)
import { colors } from "@/theme/tokens";
const bgColor = colors.light.background;
```

Spacing, layout, and typography: use **`global.css`** and **`layout-imperative.ts`** (see the section *Spacing, typography, radii, and layout* below).

### Adding Custom Colors

In `src/global.css`:

```css
@layer theme {
  @variant light {
    --my-custom: oklch(0.5 0.1 200);
  }
  @variant dark {
    --my-custom: oklch(0.7 0.08 200);
  }
}

@theme inline {
  --color-my-custom: var(--my-custom);
}
```

Then use: `<View className="bg-my-custom" />`

---

## Spacing, typography, radii, and layout (source of truth: `global.css`)

**Spacing, typography, line heights, radii, and layout** (screen padding, floating tab clearance, scroll fade size, icon sizes) are defined in **`apps/mobile/src/global.css`** inside **`@theme inline`**. They are theme-agnostic pixel values shared by light and dark; **colors** stay in `@layer theme` with `@variant light` / `@variant dark`.

### Principles

- Prefer **`className`** with Uniwind (e.g. `p-md`, `gap-sm`, `px-[var(--spacing-screen)]`, `rounded-lg`).
- Avoid raw numbers in components; use **semantic CSS variables** or Tailwind utilities mapped from `@theme`.
- For **`StyleSheet` / `contentContainerStyle`** (FlatList, etc.) where `className` is not enough, use **`apps/mobile/src/theme/layout-imperative.ts`** — numeric mirrors **must stay in sync** with the matching variables in `global.css` (documented in that file).

### Examples of variables (`@theme inline`)

| Variable | Role |
|----------|------|
| `--spacing-xs` … `--spacing-2xl` | Base spacing scale |
| `--spacing-screen`, `--spacing-screen-y` | Default horizontal / vertical padding for screen content |
| `--spacing-tab-clearance` | Extra scroll bottom padding above the floating tab bar + home indicator |
| `--layout-floating-tab-bar-height` | Target height for the floating pill |
| `--layout-floating-tab-bottom-offset` | Bottom layout reference |
| `--layout-floating-tab-horizontal-margin` | Side inset for the floating bar |
| `--layout-scroll-fade-size` | HeroUI `ScrollShadow` gradient height |
| `--font-size-xs` … `--font-size-3xl` | Typography scale |
| `--line-height-tight` / `normal` / `relaxed` | Line height multipliers |
| `--radius-sm` … `--radius-full` | Corner radii |
| `--radius-card` | Tight “square card” radius (~2px) for **Spaces** list rows, search field, and create modal surfaces (`rounded-card` / `rounded-t-card` in Uniwind) |
| `--icon-size-tab` | Tab bar icon size |

### Space list surfaces (T-015l)

**Spaces** uses a slightly **squarer** look than default cards: prefer **`rounded-card`** (backed by `--radius-card`) on space rows, the search field shell, and the create-space sheet so hierarchy reads through typography and dividers rather than large corner radii. **`rounded-full`** is reserved for small status dots (compile / origin), not row chrome. Other screens can adopt the same token over time for consistency.

### Runtime safe area

Device-specific insets (notch, home indicator) come from **`useSafeAreaInsets()`** (`react-native-safe-area-context`). **Expo Router** already wraps the app with **`SafeAreaProvider`** (`ExpoRoot`); do not add a second provider unless you bypass Expo’s root.

Use **`ScreenInset`** (`components/layout/ScreenInset`) for padding derived from insets, or apply inset padding on scroll views directly. **Do not** use React Native’s deprecated `SafeAreaView`; avoid the library’s `SafeAreaView` on animated scroll content (prefer insets + `View`).

**Tabs with `headerShown: true`:** the navigator header already respects the top safe area — do **not** add a second top inset to the main content. **Tabs with `headerShown: false`** (e.g. Feed): apply top (and usually left/right) insets to the scroll surface or wrap with `ScreenInset`.

### Scroll edge fade

**`ScrollEdgeFade`** (`components/layout/ScrollEdgeFade`) wraps HeroUI **`ScrollShadow`** with **`expo-linear-gradient`’s `LinearGradient`** (required by HeroUI). Use it around a **single** scroll child (`FlatList`, `ScrollView`). Keep it **separate** from `ScreenInset` (different concerns).

### Programmatic access (colors only in `tokens.ts`)

```tsx
// Colors — when CSS / useThemeColor is not enough (StatusBar, charts)
import { colors } from "@/theme/tokens";

// Layout numbers for StyleSheet-only APIs — must match global.css
import {
  LAYOUT_FLOATING_TAB_CLEARANCE_PX,
  SPACING_SCREEN_PX,
} from "@/theme/layout-imperative";
```

Do **not** add spacing or typography to `tokens.ts`; extend **`global.css`** instead.

---

## Theme Switching

### How It Works

1. **Uniwind** manages the active theme (`light` / `dark` / `system`)
2. **UI Store** persists the user's preference in MMKV
3. On app launch, `AppShell` in `_layout.tsx` reads the persisted preference and calls `Uniwind.setTheme()`
4. When the user changes theme in Settings, `setTheme()` in `ui.store.ts` calls both `Uniwind.setTheme()` and updates Zustand state

### API

```tsx
// Read current theme
import { useUIStore } from "@/stores/providers/ui-provider";
const theme = useUIStore((s) => s.theme); // "light" | "dark" | "system"

// Change theme
const setTheme = useUIStore((s) => s.setTheme);
setTheme("dark"); // also calls Uniwind.setTheme() internally

// Read Uniwind theme state directly
import { useUniwind } from "uniwind";
const { theme, hasAdaptiveThemes } = useUniwind();
```

---

## Components

### HeroUI Native Components Used

| Component | Import | Usage |
|-----------|--------|-------|
| `Button` | `heroui-native` | Actions. Variants: `primary`, `secondary`, `tertiary`, `danger`, `ghost`, `outline` |
| `Card` | `heroui-native` | Content containers. Sub: `Card.Header`, `Card.Body`, `Card.Footer`, `Card.Title`, `Card.Description` |
| `TextField` | `heroui-native` | Form field wrapper. Props: `isInvalid`, `isDisabled`, `isRequired` |
| `Input` | `heroui-native` | Text input. Variants: `primary`, `secondary` |
| `Label` | `heroui-native` | Form labels |
| `FieldError` | `heroui-native` | Validation error display |
| `ListGroup` | `heroui-native` | Settings-style lists. Sub: `ListGroup.Item`, `.ItemContent`, `.ItemTitle`, `.ItemDescription`, `.ItemPrefix`, `.ItemSuffix` |
| `Switch` | `heroui-native` | Toggle switches |
| `Separator` | `heroui-native` | Visual dividers. Variants: `thin`, `thick` |
| `Alert` | `heroui-native` | Status messages. Sub: `Alert.Root`, `.Indicator`, `.Content`, `.Title`, `.Description` |
| `Toast` | via `useToast()` | Toast notifications (built into HeroUINativeProvider) |

### Custom Components

#### `FloatingTabBar` (`apps/mobile/src/components/layout/FloatingTabBar/index.tsx`)

Custom floating pill-shaped tab bar passed to Expo Router's `<Tabs tabBar={...}>`.

```tsx
import FloatingTabBar from "@/components/layout/FloatingTabBar";

<Tabs tabBar={(props) => <FloatingTabBar {...props} />}>
  <Tabs.Screen name="index" options={{ title: "Feed" }} />
</Tabs>
```

**Design:** Rounded-full, positioned above bottom edge using `useSafeAreaInsets()` and **`layout-imperative`** constants that mirror `global.css` (`--layout-floating-tab-*`, `--icon-size-tab`). Surface background with border. Active tab uses `bg-accent` and **`useThemeColor("accent-foreground")`** for the icon.

To add a new tab, update `getIconName()` in the component to map the route name to a MaterialIcons name.

#### `ScreenInset` (`apps/mobile/src/components/layout/ScreenInset/index.tsx`)

Applies **`useSafeAreaInsets()`** padding on a plain `View`. Props: `edges` (default all sides). No `SafeAreaView`.

#### `ScrollEdgeFade` (`apps/mobile/src/components/layout/ScrollEdgeFade/index.tsx`)

HeroUI **`ScrollShadow`** + **`LinearGradient`** from `expo-linear-gradient`. Wraps one scrollable child; optional `size` defaults to **`layout-imperative`** / `--layout-scroll-fade-size`.

#### `ErrorBoundary` (`apps/mobile/src/components/ErrorBoundary/index.tsx`)

React error boundary wrapping the app shell. Catches render errors and shows a fallback UI with retry button.

---

## Toast Notifications

HeroUI's `HeroUINativeProvider` includes `ToastProvider` automatically.

### Usage

```tsx
import { useAppToast } from "@/hooks/use-app-toast";

function MyComponent() {
  const toast = useAppToast();

  toast.success("Done!", "Operation completed");
  toast.error("Failed", "Something went wrong");
  toast.warning("Heads up", "Check your input");
  toast.info("Note", "Something happened");
}
```

### How It Works

`useAppToast` wraps HeroUI's `useToast()` hook with convenience methods that map to toast variants (`success`, `danger`, `warning`, `default`).

---

## State Management

### Architecture

```
Zustand (vanilla createStore) + React Context (Provider pattern)
├── auth.store.ts     → AuthStoreProvider / useAuthStore()
└── ui.store.ts       → UIStoreProvider / useUIStore()
```

### Store Files vs Provider Files

- **Store files** (`src/stores/*.store.ts`): Define state shape, actions, and middleware. Export the factory function + types.
- **Provider files** (`src/stores/providers/*.tsx`): Create React Context, Provider component, and `useXStore()` hook. Separate from stores to keep them clean.

### Auth Store (`auth.store.ts`)

| State | Type | Notes |
|-------|------|-------|
| `session` | `Session \| null` | Supabase session object |
| `isAuthenticated` | `boolean` | Derived from session |
| `isLoading` | `boolean` | True until initial session check completes |

| Action | Signature | Notes |
|--------|-----------|-------|
| `initialize()` | `() => void` | Call once on mount. Gets session + subscribes to auth changes |
| `signIn()` | `(email, password) => Promise` | Throws on error |
| `signUp()` | `(email, password) => Promise` | Throws on error |
| `signOut()` | `() => Promise` | Throws on error |

**No MMKV persistence** — Supabase manages tokens via expo-secure-store.

### UI Store (`ui.store.ts`)

| State | Type | Persisted |
|-------|------|-----------|
| `theme` | `"light" \| "dark" \| "system"` | ✅ |
| `searchFilters` | `SearchFilters` | ✅ |
| `activeTab` | `string` | ✅ |
| `feedScrollPosition` | `number` | ❌ |
| `draftNote` | `string` | ❌ |
| `shareIntentData` | `string \| null` | ❌ |

Persistence uses Zustand's `persist` middleware with MMKV via `createJSONStorage()`.

### Usage Pattern

```tsx
import { useAuthStore } from "@/stores/providers/auth-provider";
import { useUIStore } from "@/stores/providers/ui-provider";

// Always use selectors to prevent unnecessary re-renders
const email = useAuthStore((s) => s.session?.user?.email);
const theme = useUIStore((s) => s.theme);
const setTheme = useUIStore((s) => s.setTheme);
```

---

## Navigation Structure

```
src/app/
├── _layout.tsx          → Root: providers + AppShell (theme-aware Stack)
├── index.tsx            → Auth redirect (splash → tabs or login)
├── debug.tsx            → Debug screen (modal presentation)
├── (auth)/
│   ├── _layout.tsx      → Stack, headerShown: false
│   ├── login.tsx        → Login form
│   └── signup.tsx       → Signup form
└── (tabs)/
    ├── _layout.tsx      → Tabs with FloatingTabBar
    ├── index.tsx        → Feed (home)
    └── settings.tsx     → Settings
```

### Auth Flow

1. App launches → `_layout.tsx` prevents splash, initializes auth
2. `index.tsx` checks `isAuthenticated` → redirects to `/(tabs)` or `/(auth)/login`
3. Supabase's `onAuthStateChange` keeps state in sync
4. Token persistence via expo-secure-store survives app restart

---

## Lib Singletons

| File | Export | Purpose |
|------|--------|---------|
| `src/lib/supabase.ts` | `supabase` | Supabase client with SecureStore adapter |
| `src/lib/mmkv.ts` | `storage`, `zustandMMKVStorage` | MMKV instance + Zustand storage adapter |
| `src/lib/query-client.ts` | `queryClient` | TanStack Query client (staleTime: 60s, gcTime: 300s) |

---

## File Naming Conventions

- **No barrel files** — import directly by path, never via `index.ts` re-exports
- **Stores**: `*.store.ts` in `src/stores/`
- **Providers**: `*-provider.tsx` in `src/stores/providers/`
- **Hooks**: `use-*.ts` in `src/hooks/`
- **Components**: `PascalCase.tsx` or `kebab-case.tsx` in `src/components/`
- **Lib singletons**: `kebab-case.ts` in `src/lib/`

---

## Provider Nesting Order

```tsx
GestureHandlerRootView
  └── AuthStoreProvider
      └── UIStoreProvider
          └── QueryClientProvider
              └── HeroUINativeProvider (includes ToastProvider)
                  └── ErrorBoundary
                      └── AppShell (Stack navigator)
```

Order matters:
- Auth/UI providers must be outside HeroUI so stores are available everywhere
- HeroUI must be inside QueryClient (components may need query access)
- ErrorBoundary wraps the navigated content, not the providers
