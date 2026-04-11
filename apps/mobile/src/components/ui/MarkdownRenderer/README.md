# MarkdownRenderer

Single place to render **markdown** in the mobile app (entry body, summaries, tooltips, etc.). It wraps `react-native-enriched-markdown` with app theme tokens and safe link handling.

## When you change something

| Change | Where to edit |
|--------|----------------|
| Font sizes, colors, blockquote, code blocks, lists | `useMarkdownThemeStyle.ts` (and underlying HeroUI / `global.css` tokens) |
| Empty state copy default | `index.tsx` → `emptyFallback` default |
| Link behavior (open external only, in-app routes, etc.) | `index.tsx` → `onLinkPress` / `isHttpUrl` |
| Parser behavior (GFM, math, underline) | Pass `flavor`, `md4cFlags` to `MarkdownRenderer`, or extend defaults here |
| Block image size / vertical spacing (overlap with text) | `layout-imperative.ts` → `MARKDOWN_BLOCK_IMAGE_MAX_HEIGHT_PX`, `MARKDOWN_IMAGE_MARGIN_*`; wired in `useMarkdownThemeStyle` → `image` |
| New call sites | Import `MarkdownRenderer` from `@/components/ui/MarkdownRenderer` |

## Usage

```tsx
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";

<MarkdownRenderer markdown={text} emptyFallback="_Nothing here._" className="mb-2" />
```

## Dependencies

- `react-native-enriched-markdown`
- `heroui-native` → `useThemeColor`

## Changelog

_Add a short note here when you change behavior, tokens, or props so the next editor knows what shifted._

- _Initial extraction from `EntryMarkdownBody`._
- **Inline `code` / highlights:** `react-native-enriched-markdown` merges your styles with defaults; a partial `code: { color }` kept the default **light pink** background, which broke contrast in dark mode. We now set `backgroundColor` (`surface-tertiary`), `borderColor` (`border`), plus themed `blockquote`, `strong`, `em`, and `math` so defaults do not leak light-theme surfaces.
- **Block images:** Setting `image.marginTop` / `marginBottom` to `0` removed the library’s vertical spacing and could make images sit flush or overlap the next block. Spacing and max height now live in `layout-imperative.ts` (`MARKDOWN_IMAGE_MARGIN_*`, `MARKDOWN_BLOCK_IMAGE_MAX_HEIGHT_PX`).
