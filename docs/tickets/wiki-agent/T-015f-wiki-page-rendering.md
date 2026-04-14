# T-015f: Mobile — Wiki Page Rendering

**Status:** done
**Phase:** Mobile
**Type:** feature (mobile)
**Epic:** [T-015 Wiki Agent](./T-015-wiki-agent-epic.md)
**Depends on:** T-015e (working API + validated data)

---

## Goal

Build a beautiful, animated wiki page reading experience on mobile. Each page type (synthesis, comparison, timeline, glossary, index) gets its own renderer, composed from shared building blocks. Pages feel alive with staggered enter animations, smooth layout transitions, and delightful micro-interactions.

---

## Context

The API is wired (T-015d) and smoke-tested (T-015e). The server returns wiki pages with typed `content` JSONB per page type:

- **synthesis** — `tableOfContents`, `sections[]` with body, links, sourceEntryIds, plus page-level `insights`, `contradictions`, `openQuestions`
- **comparison** — `items[]`, `criteria[]`, `matrix` (item×criterion), `verdict`
- **timeline** — `events[]` (date, title, body, links)
- **glossary** — `terms[]` (term, definition, links)
- **index** — `spaces[]` summary, total counts

Types live in `apps/server/src/modules/ai/agents/wiki-agent.types.ts` and the oRPC contract in `packages/shared/src/contracts/wiki.contract.ts`.

### Existing patterns to follow

- **Feature slices** at `apps/mobile/src/features/<name>/` with `screens/`, `components/`, `hooks/`
- **Thin routes** in `src/app/` re-exporting feature screens
- **oRPC hooks** using `orpc.<domain>.<method>.queryOptions()` + TanStack Query
- **HeroUI Native** compound components (`Card`, `Chip`, `Accordion`, `Tabs`, `Skeleton`)
- **Reanimated** for entering/exiting/layout animations (see `EntryDetailScreen` scroll parallax)
- **Design tokens** in `global.css` consumed via Uniwind `className`; `layout-imperative.ts` for StyleSheet numerics
- **`tailwind-variants`** in `index.styles.ts` files for variant APIs
- **`MarkdownRenderer`** at `src/components/ui/MarkdownRenderer/` for rich text

---

## Architecture

### Composable rendering strategy

Instead of one monolithic wiki page screen, use a **composable architecture** with three layers:

```
WikiPageScreen (data loading + routing by pageType)
 └─ WikiPageShell (shared chrome: header, TOC, metadata, scroll container)
      └─ PageTypeRenderer (synthesis | comparison | timeline | glossary | index)
           └─ Shared building blocks (WikiSection, WikiLink, SourceChips, InsightCard, etc.)
```

### Animation wrappers

Create reusable animation primitives that can wrap any content:

- **`AnimatedStaggerItem`** — staggered `FadeInUp` entering + `FadeOut` exiting per list item
- **`AnimatedExpandSection`** — smooth height expansion for collapsible sections (Reanimated layout transition)
- **`AnimatedPressScale`** — subtle scale-down on press for tappable elements

These live in `features/wiki/components/animation/` and are used across all page type renderers.

---

## File structure

```
apps/mobile/src/
  app/
    wiki/
      [id].tsx                          # Route: re-export WikiPageScreen
      versions.tsx                      # Route: re-export WikiVersionHistoryScreen
  features/wiki/
    screens/
      WikiPageScreen/
        index.tsx                       # Data loading, pageType dispatch
        components/
          WikiPageShell/
            index.tsx                   # Shared scroll container, header, TOC rail
            index.styles.ts             # tv() variants for shell
          SynthesisRenderer/
            index.tsx                   # Sections + insights + contradictions
          ComparisonRenderer/
            index.tsx                   # Matrix/table view
          TimelineRenderer/
            index.tsx                   # Chronological event list
          GlossaryRenderer/
            index.tsx                   # Term/definition cards
          IndexRenderer/
            index.tsx                   # Space overview listing
          WikiPageSkeleton/
            index.tsx                   # Shimmer loading state
      WikiVersionHistoryScreen/
        index.tsx                       # Version list with diffs
    components/
      WikiSection/
        index.tsx                       # Single content section (title + body + sources + links)
        index.styles.ts                 # tv() for section variants (default, highlighted, compact)
      WikiLinkChip/
        index.tsx                       # Tappable page-to-page link chip
      SourceEntryChips/
        index.tsx                       # Row of source entry chips linking to entry detail
      InsightCard/
        index.tsx                       # Insight/contradiction/question bullet card
        index.styles.ts                 # tv() for insight types (insight, contradiction, question)
      PageTypeBadge/
        index.tsx                       # Small badge showing page type (synthesis, timeline, etc.)
      MaturityBadge/
        index.tsx                       # stub | draft | complete badge
      animation/
        AnimatedStaggerItem.tsx         # FadeInUp stagger wrapper
        AnimatedExpandSection.tsx       # Collapsible height animation
        AnimatedPressScale.tsx          # Press feedback scale
    hooks/
      useWikiPages.ts                   # TanStack Query hooks for wiki endpoints
      useWikiPageById.ts                # Single page query (by id or slug)
    types.ts                            # Re-export / narrow types from shared contract
```

---

## Scope

### 1. Routes + navigation

Add two new routes under `app/wiki/`:

**`app/wiki/[id].tsx`** — wiki page detail. Receives `id` param (UUID). Stack screen with transparent header (matches entry detail pattern).

**`app/wiki/versions.tsx`** — version history. Receives `pageId` via search params. Presented as a modal or push screen.

Register in root `_layout.tsx`:
```tsx
<Stack.Screen name="wiki/[id]" options={{ headerTransparent: true, headerTitle: "", animation: "slide_from_right" }} />
<Stack.Screen name="wiki/versions" options={{ title: "Version History", presentation: "modal" }} />
```

Update `space/[id]` route to render the enhanced `SpaceDetailScreen` with wiki page listing.

### 2. Data hooks (`features/wiki/hooks/`)

**`useWikiPages.ts`**

```typescript
function useWikiPages(spaceId?: string)
// → useQuery(orpc.wiki.listPages.queryOptions({ input: { spaceId } }))

function useWikiPageVersions(pageId: string, limit?: number)
// → useQuery(orpc.wiki.getPageVersions.queryOptions({ input: { pageId, limit } }))

function useCompilationStatus()
// → useQuery(orpc.wiki.status.queryOptions({ input: undefined }))
```

**`useWikiPageById.ts`**

```typescript
function useWikiPageById(id: string | undefined)
// → useQuery with orpc.wiki.getPage.queryOptions({ input: { id } })
// enabled only when id is valid UUID
```

Follow the pattern from `useEntries.ts` and `useSpaces.ts`.

### 3. WikiPageScreen (`screens/WikiPageScreen/index.tsx`)

Thin screen that:
1. Reads `id` from `useLocalSearchParams`
2. Calls `useWikiPageById(id)`
3. Shows `WikiPageSkeleton` while loading
4. Shows error/not-found states (follow `EntryDetailScreen` pattern)
5. Wraps content in `WikiPageShell`
6. Dispatches to the correct renderer based on `page.pageType`:
   - `synthesis` → `SynthesisRenderer`
   - `comparison` → `ComparisonRenderer`
   - `timeline` → `TimelineRenderer`
   - `glossary` → `GlossaryRenderer`
   - `index` → `IndexRenderer`

### 4. WikiPageShell — shared chrome

Wraps every page type with consistent layout:

- **`Animated.ScrollView`** with `scrollEventThrottle={16}`, bottom padding for floating tab bar
- **Page header**: `PageTypeBadge` + title (large, selectable) + `MaturityBadge` + last updated date
- **Table of contents** (synthesis only): sticky horizontal scroll rail of section anchors with `ScrollView horizontal` + `Chip` per section. Tapping scrolls to that section (`scrollTo` via ref). Highlighted chip tracks scroll position.
- **Properties row**: key properties shown as `Chip` items (maturity, confidence, primaryTopic)
- **Footer**: "View version history" link + source count + last compiled date

### 5. Page type renderers

#### 5.1 SynthesisRenderer

The primary and most common page type:

- Map over `content.sections` → `WikiSection` per section
- Each section enters with `AnimatedStaggerItem` (index-based delay)
- Below sections, render page-level cards:
  - **Insights** → `InsightCard` with `type="insight"` (accent-tinted)
  - **Contradictions** → `InsightCard` with `type="contradiction"` (warning-tinted)
  - **Open Questions** → `InsightCard` with `type="question"` (muted-tinted)
- Each group uses `AnimatedExpandSection` so the list can be collapsed

#### 5.2 ComparisonRenderer

Table/matrix view:

- **Header row**: criteria labels as column headers
- **Body rows**: one per item, with cells from `matrix[itemName][criterion]`
- **Verdict section** below the table as a highlighted `Card`
- Horizontal `ScrollView` for the matrix if it overflows screen width
- Items enter with stagger animation

#### 5.3 TimelineRenderer

Chronological event list:

- Vertical timeline rail (thin accent-colored line on the left)
- Each event: circle dot on the rail + `Card` with date, title, body, links
- Events enter with `FadeInLeft` stagger
- `AnimatedExpandSection` on event body for long content

#### 5.4 GlossaryRenderer

Term/definition list:

- `Accordion` from HeroUI Native — each term is an accordion item
- Term as the trigger title, definition + links as the content
- Source chips per term
- Sorted alphabetically with section letter headers
- Items enter with `FadeInUp` stagger

#### 5.5 IndexRenderer

Space overview dashboard:

- Grid of `Card` components, one per space
- Each card: space name, summary (2-line clamp), page count badge, entry count badge
- Tapping a card navigates to `space/[spaceId]`
- Total pages + total entries summary at top
- Last compiled timestamp
- Cards enter with stagger from center outward

### 6. Shared building blocks

#### WikiSection

Renders one content section (used by synthesis, reused by others):

- Section title (Text, semibold, `text-lg`)
- Body text via `MarkdownRenderer` (variant `"body"`)
- **Source chips row**: `SourceEntryChips` — horizontal scroll of `Chip` items, each linking to `entry/[id]`
- **Page links row**: `WikiLinkChip` — horizontal scroll of accent `Chip` items, each navigating to `wiki/[pageId]`
- Wrapped in `AnimatedStaggerItem`
- Has `tv()` variants: `default`, `highlighted` (accent border), `compact` (less padding)

#### WikiLinkChip

- HeroUI `Chip` with `variant="outline"` and accent color
- `onPress` navigates to `wiki/[pageId]` via `router.push`
- Handles broken links gracefully (if pageId doesn't resolve, show muted disabled chip)

#### SourceEntryChips

- Horizontal `ScrollView` of small `Chip` items
- Each chip shows a truncated entry title (max 30 chars)
- `onPress` navigates to `entry/[entryId]`
- Shows count badge if more than 5 sources: "... +3 more"

#### InsightCard

- `Card` with tinted left border (3px) indicating type
- `tv()` variants:
  - `insight`: accent tint, lightbulb-style icon
  - `contradiction`: warning tint, alert-style icon
  - `question`: muted tint, question-style icon
- Body text with `Text selectable`

#### PageTypeBadge

- Small `Chip` showing the page type label
- Color-coded per type: synthesis=accent, timeline=success, comparison=warning, glossary=default, index=muted

#### MaturityBadge

- `Chip` with semantic colors: stub=default, draft=warning, complete=success

### 7. Animation details

#### AnimatedStaggerItem

```tsx
// Wraps children with Reanimated entering animation
// Props: index (for stagger delay), duration?, enterDirection?
<Animated.View
  entering={FadeInUp.delay(index * 60).duration(400).springify()}
  exiting={FadeOut.duration(200)}
  layout={LinearTransition.springify()}
>
  {children}
</Animated.View>
```

#### AnimatedExpandSection

```tsx
// Collapsible section with smooth height animation
// Props: expanded, title?, children
// Uses Reanimated layout transitions for height changes
// Renders a toggle row (title + chevron) that controls expansion
```

#### AnimatedPressScale

```tsx
// Pressable wrapper that scales down to 0.97 on press
// Props: children, onPress, disabled?
// Uses useAnimatedStyle + withSpring for spring-based press feedback
```

### 8. WikiPageSkeleton

Shimmer loading state using HeroUI `SkeletonGroup`:

- Type badge skeleton + title skeleton (2 lines)
- 3 section skeletons (title line + 3 body lines + chip row)
- Insight card skeleton (2 items)
- Matches the synthesis layout by default

### 9. Space detail enhancement

Update `SpaceDetailScreen` (currently a placeholder) to show:

- Space name + description
- `compilationStatus` indicator if applicable
- List of wiki pages in this space (via `useWikiPages(spaceId)`)
- Each page as a `Card` with title, page type badge, maturity badge, section count
- Tapping navigates to `wiki/[pageId]`
- Empty state: "No wiki pages yet. Compile your wiki to generate pages."

### 10. Version history screen

`WikiVersionHistoryScreen`:

- `FlatList` of versions from `useWikiPageVersions(pageId)`
- Each row: version number, created date, summary of changes (section count delta, new sections listed)
- Tapping a version shows the full content in a read-only view (reuses the page type renderer)
- Most recent version at top

---

## Design tokens

Add to `global.css` `@theme inline`:

```css
/* Wiki page tokens */
--spacing-wiki-section-gap: 24px;
--spacing-wiki-toc-height: 44px;
--spacing-timeline-rail-width: 2px;
--spacing-timeline-dot-size: 12px;
--color-wiki-insight-border: var(--accent);
--color-wiki-contradiction-border: var(--warning);
--color-wiki-question-border: var(--muted);
```

Add to `layout-imperative.ts`:

```typescript
export const WIKI_SECTION_GAP_PX = 24;
export const WIKI_TOC_HEIGHT_PX = 44;
export const WIKI_TIMELINE_RAIL_WIDTH_PX = 2;
export const WIKI_TIMELINE_DOT_SIZE_PX = 12;
export const WIKI_STAGGER_DELAY_MS = 60;
export const WIKI_STAGGER_DURATION_MS = 400;
```

---

## Navigation map

```
(tabs)/spaces
  └─ space/[id]              ← enhanced: shows wiki pages list
       └─ wiki/[id]          ← wiki page detail (any type)
            └─ wiki/versions ← version history (modal)
            └─ wiki/[id]     ← linked page (push)
            └─ entry/[id]    ← source entry (push)
```

From any wiki page, users can:
- Tap a **page link chip** → push another `wiki/[id]`
- Tap a **source chip** → push `entry/[id]`
- Tap **"Version History"** → modal `wiki/versions?pageId=xxx`
- Press back → return to previous page or space detail

---

## DoD (Definition of Done)

- [x] `wiki/[id]` route exists and loads wiki page by ID
- [x] `WikiPageShell` renders header, properties, and scroll container for all page types
- [x] `SynthesisRenderer` renders sections with TOC, body (via MarkdownRenderer), source chips, page links, insights, contradictions, open questions
- [x] `ComparisonRenderer` renders matrix table with items and criteria
- [x] `TimelineRenderer` renders chronological event list with visual rail
- [x] `GlossaryRenderer` renders term/definition accordion list
- [x] `IndexRenderer` renders space overview cards with counts
- [x] `AnimatedStaggerItem` provides staggered FadeInUp entering on section/card lists
- [x] `AnimatedExpandSection` provides smooth collapsible sections
- [x] `AnimatedPressScale` provides spring-based press feedback on tappable elements
- [x] Source entry chips navigate to `entry/[id]`
- [x] Page-to-page link chips navigate to `wiki/[id]`
- [x] `SpaceDetailScreen` shows wiki pages list for the space (replaces placeholder)
- [x] `WikiPageSkeleton` shows shimmer loading state
- [x] Error and not-found states render gracefully
- [x] Version history screen lists previous versions
- [x] TanStack Query hooks use `orpc.wiki.*` with proper query keys
- [x] All new design tokens added to `global.css` and mirrored in `layout-imperative.ts`
- [x] No `any` types, `tv()` variants in `index.styles.ts`, no barrel re-exports
- [x] `pnpm typecheck` passes

---

## Out of scope (deferred)

- Wiki page editing by the user (agent-only for now)
- Properties editor (T-015h)
- Compile/lint trigger UI (T-015g)
- Search within wiki pages
- Offline caching of wiki content
- Page deletion or archival
