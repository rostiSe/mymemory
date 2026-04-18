# T-016c: Mobile Renderer Foundation (renderer registry + base shells)

**Status:** pending
**Phase:** Foundation
**Type:** feature (mobile)
**Epic:** [T-016 Ingest Strengthening](./T-016-ingest-strengthening-epic.md)
**Depends on:** [T-016a](./T-016a-schema-foundation.md), [T-016b](./T-016b-server-pipeline-foundation.md)

---

## Goal

Mirror the server registry pattern on the mobile side so **every entry in the feed renders itself**. Adding a new content type to the UI is a strict two-step checklist:

1. Create a folder under `renderers/<resolved-type>/`
2. Register its `ContentTypeRenderer` bundle in `registry.ts`

The feed list reads each entry's `resolvedType` and looks up its four components (`FeedCard`, `DetailView`, `ProcessingCard`, `FailureCard`) from the registry. No per-type branching in the feed. No giant switch statements. No generic-looking cards.

This ticket ships the registry, the interface, the base shells (shared chrome every type reuses), and a **placeholder renderer** so the scaffold compiles before any real renderer lands (T-016e ships the first one).

---

## Context

Today the feed renders one card component (`EntryCard`) for every entry regardless of type. It looks the same whether the entry is a YouTube video or a plain text note. That uniformity is cheap now but blocks every richer content type — a YouTube video wants a 16:9 thumbnail and a duration pill; an image wants to *be* the image; a voice memo wants a waveform and a play button.

The answer is not `<EntryCard>` with 20 conditional branches. The answer is a registry.

---

## Scope

### 1. Module layout

```
apps/mobile/src/features/entry/
  constants.ts                          # card heights, aspects, animation ms, thresholds
  types.ts                              # ContentTypeRenderer + prop interfaces
  registry.ts                           # resolvedType → renderer bundle
  components/
    FeedCardShell/                      # shared chrome every FeedCard extends
      index.tsx
      index.styles.ts
    ProcessingCardShell/                # shimmer + step label
      index.tsx
      index.styles.ts
    FailureCardShell/                   # error + retry affordance
      index.tsx
      index.styles.ts
    SourceChip/                         # small, every card uses it
      index.tsx
      index.styles.ts
    ReviewSwipeAction/                  # swipe-to-keep / swipe-to-dismiss wrapper
      index.tsx
      index.styles.ts
  hooks/
    useEntryRenderer.ts                 # hook: entry → renderer bundle
  screens/
    FeedScreen/
      index.tsx                         # uses registry to pick cards
    EntryDetailScreen/
      index.tsx                         # uses registry to pick DetailView
  renderers/
    _placeholder/                       # no-op — deleted in T-016e
      FeedCard/index.tsx
      FeedCard/index.styles.ts
      DetailView/index.tsx
      DetailView/index.styles.ts
      ProcessingCard/index.tsx
      FailureCard/index.tsx
      renderer.ts
      constants.ts
```

### 2. Feature-level constants

File: `apps/mobile/src/features/entry/constants.ts`.

```ts
// Feed card layout — semantic values referenced by every renderer
export const FEED_CARD_GAP_PX = 12;
export const FEED_CARD_PADDING_X_PX = 16;
export const FEED_CARD_PADDING_Y_PX = 12;
export const FEED_CARD_MIN_HEIGHT_PX = 88;
export const FEED_CARD_COVER_ASPECT_RATIO = 16 / 9;

// Processing card
export const PROCESSING_SHIMMER_DURATION_MS = 1_400;
export const PROCESSING_STATUS_POLL_MS = 1_500;
export const PROCESSING_STALE_WARNING_MS = 30_000;

// Review / acceptance (T-016m will reuse)
export const REVIEW_SWIPE_THRESHOLD_PX = 80;
export const REVIEW_SWIPE_ANIMATION_MS = 220;

// Source chip
export const SOURCE_CHIP_ICON_SIZE_PX = 14;
export const SOURCE_CHIP_MAX_NAME_CHARS = 24;

// Detail screen
export const DETAIL_HEADER_MAX_HEIGHT_PX = 320;
export const DETAIL_BODY_PADDING_X_PX = 20;
```

**Rule:** no numeric literal in `renderers/**` or `components/**` unless it comes from this file or a renderer-local `constants.ts`. Enforced by review + grep gate in DoD.

Corresponding CSS variables live in `apps/mobile/src/global.css` (`--feed-card-gap`, `--source-chip-icon-size`, etc.) so Uniwind classes can use them — constants and CSS vars must stay in sync. Both are exported, both have the same canonical name.

### 3. Renderer interface

File: `apps/mobile/src/features/entry/types.ts`.

```ts
import type { ComponentType } from 'react';
import type { Entry } from '@repo/db';
import type { MediaMetadata, ResolvedType } from '@repo/shared/types/media-metadata';

// Narrowed Entry type per renderer — TMedia discriminant
export type TypedEntry<TMedia extends MediaMetadata> = Omit<Entry, 'mediaMetadata'> & {
  mediaMetadata: TMedia;
};

export interface FeedCardProps<TMedia extends MediaMetadata> {
  entry: TypedEntry<TMedia>;
  onPress: () => void;
  onLongPress?: () => void;
}

export interface DetailViewProps<TMedia extends MediaMetadata> {
  entry: TypedEntry<TMedia>;
}

export interface ProcessingCardProps {
  entry: Entry;                     // not yet narrowed — still processing
  onCancel?: () => void;
}

export interface FailureCardProps {
  entry: Entry;
  onRetry: () => void;
  onDismiss: () => void;
}

export interface ContentTypeRenderer<TMedia extends MediaMetadata = MediaMetadata> {
  resolvedType: ResolvedType;
  FeedCard: ComponentType<FeedCardProps<TMedia>>;
  DetailView: ComponentType<DetailViewProps<TMedia>>;
  ProcessingCard: ComponentType<ProcessingCardProps>;
  FailureCard: ComponentType<FailureCardProps>;
}
```

### 4. Registry

File: `apps/mobile/src/features/entry/registry.ts`.

```ts
import { placeholderRenderer } from './renderers/_placeholder/renderer';

const renderers: Record<ResolvedType, ContentTypeRenderer> = {
  article: placeholderRenderer,
  video: placeholderRenderer,
  social: placeholderRenderer,
  product: placeholderRenderer,
  image: placeholderRenderer,
  audio: placeholderRenderer,
  quote: placeholderRenderer,
  snippet: placeholderRenderer,
  note: placeholderRenderer,
};

export function registerRenderer(renderer: ContentTypeRenderer): void {
  renderers[renderer.resolvedType] = renderer;
}

export function getRenderer(resolvedType: ResolvedType): ContentTypeRenderer {
  return renderers[resolvedType];
}
```

T-016e adds `registerRenderer(youtubeRenderer)` in its module init.

### 5. Hook

File: `apps/mobile/src/features/entry/hooks/useEntryRenderer.ts`.

```ts
export function useEntryRenderer(entry: Entry): ContentTypeRenderer {
  // processedStatus drives which component we'd return; resolvedType picks which renderer.
  // Fallback to 'article' renderer if resolvedType null (legacy entries pre-T-016a backfill).
  return getRenderer(entry.resolvedType ?? 'article');
}
```

### 6. Base shells

Every real renderer's `FeedCard` wraps `<FeedCardShell>`. The shell owns:
- Surface (background, border, radius via `rounded-card` from T-015l)
- Horizontal + vertical padding (`FEED_CARD_PADDING_X_PX` / `_Y_PX` via CSS vars)
- Long-press menu affordance
- `SourceChip` placement slot (top-right)
- Review swipe wrapper (gesture handler)
- Menu trigger (three-dot for dev mode telemetry, delete, etc.)

`FeedCardShell` props:
```ts
interface FeedCardShellProps {
  onPress: () => void;
  onLongPress?: () => void;
  source?: Source | null;
  reviewStatus: ReviewStatus;
  onReviewChange?: (next: ReviewStatus) => void;   // wired by T-016m
  children: ReactNode;                             // the type-specific content
}
```

Same pattern for `ProcessingCardShell` (shimmer + dismissible chrome) and `FailureCardShell` (error icon, message, retry/dismiss buttons).

**Why shells:** a new renderer writes *only* the type-specific body. Chrome comes free, consistent, centrally themed.

### 7. Source chip + review swipe

`SourceChip` — small chip: favicon (if `iconUrl`) + source name truncated to `SOURCE_CHIP_MAX_NAME_CHARS`. Tap opens a filtered feed for that source (route stubbed in this ticket — actual filter lands in T-016f).

`ReviewSwipeAction` — wraps a row. Swipe right past `REVIEW_SWIPE_THRESHOLD_PX` → `onReviewChange('kept')`. Swipe left → `onReviewChange('dismissed')`. Animation `REVIEW_SWIPE_ANIMATION_MS`. Visual labels: "Keep" (success colour) / "Dismiss" (muted). No mutation in this ticket — just the primitive. T-016m wires the mutation.

### 8. Feed + Detail screen integration

`apps/mobile/src/features/entry/screens/FeedScreen/index.tsx`:
```tsx
function renderItem({ item }: { item: Entry }) {
  if (item.processedStatus === 'pending' || item.processedStatus === 'processing') {
    const renderer = getRenderer(item.resolvedType ?? 'article');
    return <renderer.ProcessingCard entry={item} />;
  }
  if (item.processedStatus === 'failed') {
    const renderer = getRenderer(item.resolvedType ?? 'article');
    return <renderer.FailureCard entry={item} onRetry={...} onDismiss={...} />;
  }
  const renderer = getRenderer(item.resolvedType ?? 'article');
  return <renderer.FeedCard entry={item as TypedEntry<MediaMetadata>} onPress={...} />;
}
```

`apps/mobile/src/features/entry/screens/EntryDetailScreen/index.tsx`:
```tsx
const renderer = useEntryRenderer(entry);
return <renderer.DetailView entry={entry as TypedEntry<MediaMetadata>} />;
```

Legacy `EntryCard` + legacy detail body are **kept intact** but only mounted under a feature flag (`RENDERER_REGISTRY_ENABLED`, default off). T-016e flips the flag when the first real renderer ships. Old code deleted in T-016g (article refactor).

### 9. Placeholder renderer

File: `apps/mobile/src/features/entry/renderers/_placeholder/renderer.ts`.

Renders a skeleton with the entry title + a "coming soon" subline. Useful for testing the registry integration before real renderers exist. Deleted in T-016e.

---

## Files

| File | Action |
|------|--------|
| `apps/mobile/src/features/entry/constants.ts` | **Create** |
| `apps/mobile/src/features/entry/types.ts` | **Create** |
| `apps/mobile/src/features/entry/registry.ts` | **Create** |
| `apps/mobile/src/features/entry/hooks/useEntryRenderer.ts` | **Create** |
| `apps/mobile/src/features/entry/components/FeedCardShell/index.tsx` | **Create** |
| `apps/mobile/src/features/entry/components/FeedCardShell/index.styles.ts` | **Create** |
| `apps/mobile/src/features/entry/components/ProcessingCardShell/index.tsx` | **Create** |
| `apps/mobile/src/features/entry/components/ProcessingCardShell/index.styles.ts` | **Create** |
| `apps/mobile/src/features/entry/components/FailureCardShell/index.tsx` | **Create** |
| `apps/mobile/src/features/entry/components/FailureCardShell/index.styles.ts` | **Create** |
| `apps/mobile/src/features/entry/components/SourceChip/index.tsx` | **Create** |
| `apps/mobile/src/features/entry/components/SourceChip/index.styles.ts` | **Create** |
| `apps/mobile/src/features/entry/components/ReviewSwipeAction/index.tsx` | **Create** |
| `apps/mobile/src/features/entry/components/ReviewSwipeAction/index.styles.ts` | **Create** |
| `apps/mobile/src/features/entry/renderers/_placeholder/**` | **Create** — six files |
| `apps/mobile/src/features/entry/screens/FeedScreen/index.tsx` | **Modify** — dispatch via registry, feature-flagged |
| `apps/mobile/src/features/entry/screens/EntryDetailScreen/index.tsx` | **Modify** — dispatch via registry, feature-flagged |
| `apps/mobile/src/global.css` | **Modify** — add `--feed-card-*`, `--source-chip-*`, `--review-swipe-*` vars |
| `docs/DESIGN_SYSTEM.md` | **Modify** — document the new tokens + renderer pattern |

---

## Edge cases

- **Entry with `resolvedType = null`** (legacy pre-backfill) → `useEntryRenderer` falls back to `'article'` renderer; no crash.
- **Registry hit for a renderer that hasn't registered yet** (module load order) → registry initialises with placeholders, real renderers overwrite on import; importing the feed screen must transitively import every renderer so registration runs. Use an explicit `apps/mobile/src/features/entry/renderers/register.ts` that imports each renderer for its side effect; feed screen imports this module once.
- **Swipe gesture conflict with parent `FlatList`** → `ReviewSwipeAction` uses `react-native-gesture-handler` with `activeOffsetX` set to let vertical scroll win until horizontal intent is clear.
- **`SourceChip` with very long name** → truncated to `SOURCE_CHIP_MAX_NAME_CHARS` with ellipsis; full name in `accessibilityLabel`.
- **`ProcessingCard` stuck > `PROCESSING_STALE_WARNING_MS`** → append "Taking longer than usual…" line; no action, just reassurance.
- **Dark/light mode** → shells use `bg-surface` / `border-border` / `text-foreground` tokens only; no per-mode overrides.

---

## Definition of done

- [ ] Module layout matches spec exactly; no barrel files.
- [ ] All magic numbers/strings in `constants.ts` (feature-level) or renderer-local `constants.ts`. Grep gate: `rg '\b[0-9]{3,}\b' apps/mobile/src/features/entry --glob '!*.test.*' --glob '!*constants*'` returns no hits.
- [ ] `ContentTypeRenderer<TMedia>` generic, type-safe narrowing via `resolvedType`.
- [ ] Registry seeded with placeholder renderer for every `ResolvedType`; `registerRenderer` overwrites.
- [ ] `register.ts` exists and imports every renderer for side-effect registration. Feed screen imports it once.
- [ ] `FeedCardShell`, `ProcessingCardShell`, `FailureCardShell` ship with `tv` styles in `index.styles.ts` — not inline.
- [ ] `SourceChip` + `ReviewSwipeAction` work standalone (Storybook-style manual harness if configured; otherwise verified in the placeholder renderer preview).
- [ ] Feature flag `RENDERER_REGISTRY_ENABLED` (MMKV-persisted dev flag) toggles new vs legacy path cleanly. Default off.
- [ ] With flag off: feed + detail unchanged.
- [ ] With flag on: all entries render via placeholder renderer (title + "coming soon"); no crashes, swipes + taps work.
- [ ] `pnpm -w run typecheck` clean.
- [ ] `DESIGN_SYSTEM.md` documents the two new patterns (registry + shells) with folder snapshot.
- [ ] Epic `T-016` links this ticket.

---

## Verification

1. Flag off → feed + detail work identically to before. Baseline preserved.
2. Flag on → feed renders placeholder cards; tap → placeholder detail view.
3. Swipe right on a placeholder card past threshold → callback fires with `'kept'` (logged, no mutation yet).
4. Insert an entry with `processedStatus='pending'` → placeholder `ProcessingCard` renders with shimmer.
5. Insert an entry with `processedStatus='failed'` → placeholder `FailureCard` renders with retry button (no-op here).
6. Add a throwaway renderer under `renderers/_test/`, register it, set a test entry's `resolvedType` to match → feed picks up the new renderer without any other code change. This is the extensibility verification.

---

## Ticket sequence

Unblocks T-016d (composer uses the renderer registry for previews), T-016e (first real renderer replaces the placeholder for `'video'`), and every subsequent type ticket.
