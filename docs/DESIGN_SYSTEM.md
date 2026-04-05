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

For imperative use (StatusBar, native components):

```tsx
// Via HeroUI hook (reactive to theme changes)
import { useThemeColor } from "heroui-native";
const bgColor = useThemeColor("background");

// Via static tokens (for constants, non-reactive)
import { colors } from "@/theme/tokens";
const bgColor = colors.light.background; // "#F9F9F9"
```

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

#### `FloatingTabBar` (`src/components/floating-tab-bar.tsx`)

Custom floating pill-shaped tab bar passed to Expo Router's `<Tabs tabBar={...}>`.

```tsx
import { FloatingTabBar } from "@/components/floating-tab-bar";

<Tabs tabBar={(props) => <FloatingTabBar {...props} />}>
  <Tabs.Screen name="index" options={{ title: "Feed" }} />
</Tabs>
```

**Design:** Rounded-full, positioned above bottom edge, surface background with border. Active tab gets `bg-accent` with white icon.

To add a new tab, update `getIconName()` in the component to map the route name to a MaterialIcons name.

#### `ErrorBoundary` (`src/components/error-boundary.tsx`)

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
