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

Hex values are the current mirrors in `apps/mobile/src/theme/tokens.ts`; the canonical oklch definitions live in `apps/mobile/src/global.css`.

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | `#F9F9F9` | `#212529` | Page/screen background |
| `foreground` | `#1A1C1C` | `#F8F9FA` | Primary text |
| `muted` | `#73787B` | `#ADB5BD` | Secondary/hint text, icons |
| `surface` | `#FFFFFF` | `#495057` | Cards, elevated containers |
| `surface-secondary` | `#F3F3F3` | `#343A40` | Slightly tinted surface |
| `surface-tertiary` | `#EEEEEE` | `#6C757D` | More tinted surface |
| `accent` | `#334550` | `#9BA7AF` | Brand/interactive color |
| `accent-foreground` | `#FFFFFF` | `#212529` | Text on accent |
| `default` | `#E2E2E2` | `#343A40` | Neutral chips/badges |
| `default-foreground` | `#1A1C1C` | `#F8F9FA` | Text on default |
| `border` | `#C3C7CB` | `#6C757D` | Dividers, borders |
| `field-background` | `#FFFFFF` | `#343A40` | Input background |
| `field-foreground` | `#1A1C1C` | `#F8F9FA` | Input text |
| `field-placeholder` | `#73787B` | `#ADB5BD` | Input placeholder |
| `field-border` | `#C3C7CB` | `#495057` | Input border |
| `overlay` | `#FFFFFF` | `#343A40` | Dialog / popover background |
| `danger` | `#BA1A1A` | `#D43C2D` | Destructive actions |
| `danger-foreground` | `#FFFFFF` | `#F8F9FA` | Text on danger |
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

### Spacing scale

All values in pixels. Use via Uniwind utilities like `p-md`, `gap-lg`, `px-screen`, `pb-tab-clearance`.

| Token | Value | Uniwind examples | Usage |
|-------|-------|------------------|-------|
| `--spacing-xs` | `4px` | `p-xs`, `gap-xs` | Hairline gaps between related micro-content |
| `--spacing-sm` | `8px` | `p-sm`, `gap-sm` | Inline/chip gaps |
| `--spacing-md` | `16px` | `p-md`, `gap-md` | Default element padding |
| `--spacing-lg` | `24px` | `p-lg`, `gap-lg` | Section spacing |
| `--spacing-xl` | `32px` | `p-xl` | Large vertical rhythm |
| `--spacing-2xl` | `48px` | `p-2xl` | Screen-level breathing room |
| `--spacing-card` | `16px` | `p-card`, `px-card`, `py-card` | Card body padding |
| `--spacing-screen` | `16px` | `px-screen` | Horizontal screen content padding |
| `--spacing-screen-y` | `16px` | `py-screen-y` | Vertical screen content padding (reserved) |
| `--spacing-tab-clearance` | `100px` | `pb-tab-clearance` | Bottom scroll inset above the floating tab pill |
| `--spacing-compile-card-padding` | `16px` | `p-(--spacing-compile-card-padding)` | Wiki compile status card |
| `--spacing-wiki-toc-height` | `44px` | — (imperative via `WIKI_TOC_HEIGHT_PX`) | Wiki TOC header height |
| `--spacing-timeline-rail-width` | `2px` | — (imperative) | Wiki timeline rail |
| `--spacing-timeline-dot-size` | `12px` | — (imperative) | Wiki timeline dot |

### Layout scale (floating tab bar, scroll fades, icons)

These variables double as numeric constants in `theme/layout-imperative.ts` for StyleSheet-only APIs.

| Token | Value | Imperative mirror |
|-------|-------|-------------------|
| `--layout-floating-tab-bar-height` | `56px` | `LAYOUT_FLOATING_TAB_BAR_HEIGHT_PX` |
| `--layout-floating-tab-bottom-offset` | `24px` | `LAYOUT_FLOATING_TAB_BOTTOM_OFFSET_PX` |
| `--layout-floating-tab-horizontal-margin` | `20px` | `LAYOUT_FLOATING_TAB_HORIZONTAL_MARGIN_PX` |
| `--layout-scroll-fade-size` | `50px` | `LAYOUT_SCROLL_FADE_SIZE_PX` |
| `--icon-size-tab` | `24px` | `ICON_SIZE_TAB_PX` |

### Typography scale

Font sizes map to Uniwind `text-*` utilities. Line heights come from Tailwind's `leading-*` defaults.

| Token | Value | Uniwind |
|-------|-------|---------|
| `--font-size-xs` | `12px` | `text-xs` |
| `--font-size-sm` | `14px` | `text-sm` |
| `--font-size-md` | `16px` | `text-md` |
| `--font-size-lg` | `18px` | `text-lg` |
| `--font-size-xl` | `20px` | `text-xl` |
| `--font-size-2xl` | `24px` | `text-2xl` |
| `--font-size-3xl` | `30px` | `text-3xl` |

Use `leading-tight` (1.25), `leading-normal` (1.5), or `leading-relaxed` (1.625) for vertical rhythm.

### Radii

| Token | Value | Uniwind | Usage |
|-------|-------|---------|-------|
| `--radius-card` | `2px` | `rounded-card`, `rounded-t-card` | Spaces list rows, search field, sheets (see T-015l) |
| `--radius-sm` | `4px` | `rounded-sm` | Small elements (badges) |
| `--radius-md` | `8px` | `rounded-md` | Default radius |
| `--radius-lg` | `12px` | `rounded-lg` | Cards, panels |
| `--radius-xl` | `16px` | `rounded-xl` | Large containers |
| `--radius-full` | `9999px` | `rounded-full` | Pills, dots, avatars |

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

## HeroUI Native theming layer

HeroUI Native is already theme-driven by the CSS variables in `global.css` — overriding `--accent`, `--surface`, `--radius-*`, etc. cascades into every HeroUI primitive (`<Button>`, `<Card>`, `<TextField>`, `<Chip>`, `<Input>`) without per-call `className` overrides.

The runtime slice of that layer lives in **`apps/mobile/src/theme/heroui.ts`** and is passed to `<HeroUINativeProvider config={heroUIConfig}>` in `src/app/_layout.tsx`:

| Export | Purpose |
|--------|---------|
| `heroUIConfig: HeroUINativeConfig` | Text-scaling cap (`maxFontSizeMultiplier: 1.3`) to keep HeroUI labels from overflowing on aggressive Dynamic Type, plus `devInfo.stylingPrinciples: false` to silence the HMR console banner. |
| `SEMANTIC_COLORS: readonly ThemeColor[]` | Typed allow-list of HeroUI colour keys we resolve imperatively via `useThemeColor()` — keeps typos compile-time checked and makes the token footprint greppable. |
| `SemanticColor` | Type alias of the allow-list entries. |

Light ↔ dark switching stays driven by the **Uniwind** theme setter in `AppShell` (`Uniwind.setTheme(theme)`) — no parallel mechanism. HeroUI's own palette follows because its variables are the same `--background` / `--surface` / `--accent` / etc. that our `@layer theme` block defines for each variant.

### Adding a new semantic colour to HeroUI

1. Define the variable in `global.css` under both `@variant light` and `@variant dark`.
2. If the colour needs to be reachable imperatively, add its HeroUI key to `SEMANTIC_COLORS` in `theme/heroui.ts`.
3. If the colour should also be usable from the StatusBar / native APIs, mirror its hex in `theme/tokens.ts`.

---

## Primitives

Primitives live in `apps/mobile/src/components/ui/<Name>/` and follow the `index.tsx` + `index.styles.ts` split from `CLAUDE.md`. The design-system epic (T-016) standardises the six primitives below; **T-016b** ships the implementations, **T-016c** migrates feature screens to consume them.

> Import paths are concrete (no barrels). Always import from the named module file: `@/components/ui/Card/index`, `@/components/ui/Card/variants/EntryCard/index`, etc.

### `Card`

Compound API exposed as a namespace. `Card.Root` is the entry; `Cover` / `Header` / `Body` / `Footer` are sub-parts attached as static properties.

#### `Card.Root` variants

| Prop | Values | Default | Purpose |
|------|--------|---------|---------|
| `tone` | `neutral` \| `accent-soft` \| `surface-secondary` | `neutral` | Background + border palette |
| `radius` | `sm` \| `md` \| `lg` | `lg` | Maps to `--radius-*` |
| `interactive` | `boolean` | `false` | Wraps in `PressableFeedback` and enables `onPress` |

#### `Card.Header` / `Card.Body` / `Card.Footer`

| Sub-part | Notable props | Notes |
|----------|---------------|-------|
| `Card.Header` | `title`, `eyebrow?`, `trailing?`, `density` (`compact` \| `comfortable`) | Eyebrow renders above title in muted small caps. |
| `Card.Body` | `density` (`compact` \| `comfortable`) | Default content slot (`gap-2`). |
| `Card.Footer` | `density`, `justify` (`start` \| `between` \| `end`) | Flex row, defaults to start-aligned. |
| `Card.Cover` | `source`, `aspect` (`16/9` \| `4/3` \| `1/1`), `fallback?` | Fixed aspect ratio so list rows don't reflow on image load. |

#### Pre-built variants

| Variant | Replaces | Data shape |
|---------|----------|------------|
| `EntryCard` | `FeedListItem` → feed rows; `SearchScreen` result rows; optional `similarity` for semantic search score. | `EntryCardData` (includes `similarity?` for search layout). |
| `SpaceCard` | `RelatedSpacesStrip` horizontal list; `SpaceListRow` remains feature-local until a wider list migration. | `SpaceCardData` + optional `sharedPageCount`. |
| `StatusCard` | `CompileStatusCard` (wiki compile panel on Spaces). | `tone`, optional `title`, `description` (`string` or rich `ReactNode`), `action`, `meta`. |

#### Example

```tsx
import { Card } from "@/components/ui/Card/index";
import { EntryCard } from "@/components/ui/Card/variants/EntryCard/index";

// Compound — uncommon layouts
<Card.Root tone="accent-soft" radius="md" interactive onPress={open}>
  <Card.Cover source={uri} aspect="16/9" />
  <Card.Header title="Hello" eyebrow="NOTE" trailing={<Chip>Tag</Chip>} />
  <Card.Body>{children}</Card.Body>
  <Card.Footer justify="between"><Text>Meta</Text></Card.Footer>
</Card.Root>

// Variant — the default for any list of entries
<EntryCard item={entry} onPress={() => router.push(`/entry/${entry.id}`)} />
```

### `Button`

App wrapper around HeroUI `Button`. Locks the prop surface — no `className` escape hatch at the call site. Extend `index.styles.ts` if a new shape is needed; raw HeroUI `Button` imports outside `components/ui/Button` will be flagged during T-016c migration.

| Prop | Values | Default | Notes |
|------|--------|---------|-------|
| `tone` | `primary` \| `secondary` \| `danger` \| `ghost` | `primary` | Maps to HeroUI `variant`. |
| `size` | `sm` \| `md` \| `lg` | `md` | |
| `leading` / `trailing` | `ReactNode` | – | Icon slots; rendered around the label. |
| `loading` | `boolean` | `false` | Replaces label with a `Spinner`; suppresses `onPress`. |
| `isDisabled` | `boolean` | `false` | Forwarded to HeroUI. |
| `fullWidth` | `boolean` | `false` | `self-stretch` vs `self-start`. |
| `onPress` | `() => void` | – | |
| `accessibilityLabel` | `string` | – | |
| `children` | `string \| ReactNode` | – | Strings auto-wrap in `Button.Label`. |

`BaseButtonProps` lives in `index.types.ts` so future specializations (e.g. `AnchorButton` over `expo-router` `<Link>`) can extend it without re-introducing HeroUI primitives.

```tsx
import { Button } from "@/components/ui/Button/index";

<Button tone="primary" onPress={save}>Save</Button>
<Button tone="danger" loading={mutation.isPending} onPress={remove}>Delete</Button>
<Button tone="ghost" leading={<MaterialIcons name="add" size={18} />}>New</Button>
```

### `EmptyState`

Centered zero-state for screens. Single source for Feed, Search, and Spaces empty UI (migrated in T-016c).

| Prop | Values | Default | Notes |
|------|--------|---------|-------|
| `icon` | `MaterialIcons` name | – | Required; rendered inside a `bg-surface-secondary` chip. |
| `title` | `string` | – | |
| `description` | `string` | – | Optional supporting line. |
| `action` | `{ label, onPress }` | – | Renders a `Button tone="secondary" size="sm"`. |
| `fill` | `boolean` | `true` | When true, the root takes `flex-1` (use inside list `ListEmptyComponent`). Set `false` for inline contexts. |

```tsx
<EmptyState
  icon="search-off"
  title="No memories yet"
  description="Save a link or write a note to get started."
  action={{ label: "Add memory", onPress: openComposer }}
/>
```

### `ScreenHeader`

Top-of-screen header with optional safe-area inset. Absorbs the bespoke header rows previously inlined across Feed, EntryDetail, and Spaces.

| Prop | Values | Default | Notes |
|------|--------|---------|-------|
| `title` | `string` | – | |
| `subtitle` | `string` | – | Optional second line. |
| `leading` | `ReactNode` | – | Typically a back button. |
| `trailing` | `ReactNode` | – | Right-side actions (icons, ghost buttons). |
| `variant` | `default` \| `large` | `default` | `large` is the title-prominent home variant. |
| `bordered` | `boolean` | `false` | Adds a `border-b` separator. |
| `withSafeArea` | `boolean` | `true` | Wraps in `ScreenInset edges=["top"]`. Disable when the parent already insets. |

```tsx
<ScreenHeader
  title="Feed"
  variant="large"
  trailing={<Pressable onPress={openSearch}><MaterialIcons name="search" /></Pressable>}
/>
```

### `ListRow`

Generic list row — `leading` / `title` (+ `subtitle` / `meta`) / `trailing`. Separator handled by the parent list.

| Prop | Values | Default | Notes |
|------|--------|---------|-------|
| `leading` / `trailing` | `ReactNode` | – | Optional slots. |
| `title` | `string` | – | Required, `numberOfLines={1}`. |
| `subtitle` | `string` | – | |
| `meta` | `string` | – | Inline right-aligned meta on the title row (e.g. "5h ago"). |
| `indent` | `none` \| `child` | `none` | `child` indents the row for hierarchy (matches the previous `SpaceListRow` `child` variant). |
| `density` | `compact` \| `comfortable` | `comfortable` | |
| `onPress` | `() => void` | – | When set, the whole row becomes `PressableFeedback`. |
| `accessibilityLabel` | `string` | `title` | |

```tsx
<ListRow
  leading={<Avatar name={space.name} />}
  title={space.name}
  subtitle={`${space.entryCount} entries`}
  trailing={<MaterialIcons name="chevron-right" size={20} />}
  onPress={() => router.push(`/space/${space.id}`)}
/>
```

### `Sheet`

`Sheet` is a namespace — currently only `Sheet.Form` ships. The icon-headed confirmation sheet (`components/ui/BottomSheet`) stays separate; both compose HeroUI's `BottomSheet` and co-exist by design.

#### `Sheet.Form`

Bottom sheet shaped like a form: header (`title` + `description`), arbitrary form `children`, and one or two action buttons.

| Prop | Type | Notes |
|------|------|-------|
| `isOpen` | `boolean` | Controlled. |
| `onOpenChange` | `(open) => void` | Always wired so swipe-to-dismiss / overlay press fire. |
| `title` | `string` | |
| `description` | `string?` | |
| `children` | `ReactNode?` | Form body. |
| `primaryAction` | `{ label, onPress, tone?, loading?, isDisabled? }` | Required; defaults to `tone="primary"`. |
| `secondaryAction` | same shape | Optional; defaults to `tone="ghost"`. Always closes the sheet on press. |
| `trigger` | `ReactNode?` | Wraps in `BottomSheet.Trigger` for uncontrolled open. |

```tsx
<Sheet.Form
  isOpen={open}
  onOpenChange={setOpen}
  title="Rename space"
  description="Choose a new display name for this space."
  primaryAction={{ label: "Save", onPress: save, loading: rename.isPending }}
  secondaryAction={{ label: "Cancel", onPress: () => {} }}
>
  <TextInput value={name} onChangeText={setName} placeholder="Space name" />
</Sheet.Form>
```

---

## Do / Don't

Derived from the hard rules in `CLAUDE.md`.

### Do

- Define colours in `global.css` under `@layer theme` (`@variant light` / `@variant dark`); keep light/dark pairs side by side.
- Define spacing, typography, radii, and layout in `global.css` under `@theme inline`.
- Consume tokens through `className` + Uniwind utilities (`bg-surface`, `text-foreground`, `p-md`, `rounded-lg`).
- For StyleSheet-only APIs, import numeric mirrors from `@/theme/layout-imperative`.
- For StatusBar / charts / other native APIs that need a static hex, import `colors` from `@/theme/tokens` **or** resolve reactively via `useThemeColor(key)` from `heroui-native`.
- Put all `tv(...)` definitions in `index.styles.ts`.
- Extend HeroUI primitives through our `components/ui/<Name>` wrappers — `Button`, `Card`, `EmptyState`, `ScreenHeader`, `ListRow`, `Sheet`.
- Reach for a pre-built `Card` variant (`EntryCard`, `SpaceCard`, `StatusCard`) before assembling `Card.Root` + sub-parts; only drop to the compound API for genuinely uncommon layouts.
- Compose `Sheet.Form` (form shape) and the existing `BottomSheet` (icon + 2 buttons confirmation shape) — both are intentionally separate.

### Don't

- Don't write raw hex or rgb literals (`#1A1C1C`, `rgba(0,0,0,.5)`) in components.
- Don't use arbitrary pixel utilities (`p-[13px]`, `rounded-[7px]`) — add a token or re-use the existing scale.
- Don't define `tv()` variants inside `index.tsx` — always in the sibling `index.styles.ts`.
- Don't create barrel `index.ts` files that only re-export siblings. Compound namespaces (`Card.*`, `Sheet.*`) are an explicit exception — they ship from a single module that owns the root component.
- Don't duplicate a component for styling-only variation — extend its `tv()` instead.
- Don't bypass `<HeroUINativeProvider>` by instantiating a second one anywhere — it's mounted once in `_layout.tsx`.
- Don't add spacing or typography entries to `theme/tokens.ts`; that file is **colours only**.
- Don't change token *values* without a corresponding PRD / ticket note — renames are cheaper and safer.
- Don't import HeroUI `Button` outside `components/ui/Button` — go through the wrapper so `tone` / `size` defaults stay consistent.
- Don't pass `className` through our primitives' public surface — extend variants in `index.styles.ts` instead.

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
