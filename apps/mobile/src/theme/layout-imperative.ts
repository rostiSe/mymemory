/**
 * Numeric mirrors of layout tokens in global.css (@theme inline).
 * Use only where StyleSheet / contentContainerStyle cannot use className.
 *
 * @see apps/mobile/src/global.css — source of truth
 * @see docs/DESIGN_SYSTEM.md
 */

/** Matches --spacing-tab-clearance */
export const LAYOUT_FLOATING_TAB_CLEARANCE_PX = 100;

/** Matches --layout-scroll-fade-size */
export const LAYOUT_SCROLL_FADE_SIZE_PX = 50;

/** Matches --layout-floating-tab-bar-height */
export const LAYOUT_FLOATING_TAB_BAR_HEIGHT_PX = 56;

/** Matches --layout-floating-tab-bottom-offset */
export const LAYOUT_FLOATING_TAB_BOTTOM_OFFSET_PX = 24;

/** Matches --layout-floating-tab-horizontal-margin */
export const LAYOUT_FLOATING_TAB_HORIZONTAL_MARGIN_PX = 20;

/** Matches --spacing-screen */
export const SPACING_SCREEN_PX = 16;

/**
 * When `insets.bottom` is 0, use at least this offset so the bar clears the home area.
 * Matches the `max(insets.bottom, …)` floor used with the floating tab bar.
 */
export const LAYOUT_FLOATING_TAB_MIN_BOTTOM_FALLBACK_PX = 12;

/** Gap between safe-area bottom and the pill (matches prior `+ 12` in FloatingTabBar). */
export const LAYOUT_FLOATING_TAB_ABOVE_PILL_GAP_PX = 12;

/** Matches --icon-size-tab */
export const ICON_SIZE_TAB_PX = 24;

/** Entry detail hero: fixed viewport height for the image region. */
export const ENTRY_DETAIL_HERO_MAX_HEIGHT_PX = 320;

/**
 * Feed `EntryCard` cover region: fixed height (full width). Image uses `contentFit="cover"` inside
 * this slot so row height stays stable while loading. Matches Uniwind `h-32` (~128px).
 */
export const FEED_ENTRY_CARD_COVER_HEIGHT_PX = 128;

/**
 * Feed row `Swipeable` + `FlashList`: if vertical movement exceeds ± this many points
 * before the pan activates, the swipe fails so scrolling wins.
 */
export const FEED_CARD_SWIPE_FAIL_OFFSET_Y_PX = 10;

/**
 * Feed row `Swipeable`: finger must move past ± this horizontal delta (points)
 * before the swipe pan activates (cuts accidental swipes while scrolling).
 */
export const FEED_CARD_SWIPE_ACTIVE_OFFSET_X_PX = 36;

/** Feed row `Swipeable` friction (`friction` prop); higher = less “sticky” to the finger. */
export const FEED_CARD_SWIPE_FRICTION = 3;

/**
 * Max upward translate (px) for hero image parallax while scrolling.
 * Used with `ENTRY_DETAIL_HERO_MAX_HEIGHT_PX` as the scroll input range in `useEntryDetailScroll`.
 */
export const ENTRY_DETAIL_HERO_PARALLAX_TRANSLATE_MAX_PX = -36;

/**
 * Max scale applied to hero image while scrolling (1 = no zoom).
 * Transform-only; hero container height stays fixed.
 */
export const ENTRY_DETAIL_HERO_ZOOM_SCALE_MAX = 1.1;

/**
 * Markdown + `CollapsibleClamp` — **keep these exports**: `CollapsibleClamp` imports them;
 * removing them breaks collapsed height (NaN → full content + dimmed overlay).
 */
export const MARKDOWN_PARAGRAPH_LINE_HEIGHT_PX = 24;
export const MARKDOWN_PARAGRAPH_MARGIN_BOTTOM_PX = 16;
export const MARKDOWN_IMAGE_MARGIN_TOP_PX = 12;
export const MARKDOWN_IMAGE_MARGIN_BOTTOM_PX = 16;
export const MARKDOWN_BLOCK_IMAGE_MAX_HEIGHT_PX = 240;

/**
 * **Inline** markdown images: square size cap (`markdownStyle.inlineImage.size` in `react-native-enriched-markdown`).
 * Use when `![alt](url)` appears **inside** a paragraph line so icons/logos stay small.
 * Block images (usually `![alt](url)` on their own line) still span **full content width** × {@link MARKDOWN_BLOCK_IMAGE_MAX_HEIGHT_PX} — the library exposes no width / `contentFit` for those.
 */
export const MARKDOWN_INLINE_IMAGE_SIZE_PX = 48;
export const COLLAPSIBLE_CLAMP_FADE_HEIGHT_PX = 48;
export const COLLAPSIBLE_CLAMP_EXPANDED_MAX_HEIGHT_PX = 8192;

/** Matches `CollapsibleClamp` dimmed collapsed opacity — feed `MaxLinesFadeClamp` uses the same value. */
export const EXCERPT_CLAMP_DIM_OPACITY = 0.55;

/**
 * Space suggestions `Dialog` + nested `FlatList`: max list height as a fraction of window height.
 * Dialog content needs a numeric cap so the list can scroll inside the overlay.
 */
export const SPACE_SUGGESTIONS_DIALOG_LIST_MAX_HEIGHT_WINDOW_FRACTION = 0.65;

/**
 * Space suggestions dialog panel width as a fraction of window width.
 * Avoids `%` / `max-w-*` Uniwind resolution issues where the panel collapses to a thin strip.
 */
export const SPACE_SUGGESTIONS_DIALOG_WIDTH_WINDOW_FRACTION = 0.92;

/** Matches --spacing-wiki-section-gap */
export const WIKI_SECTION_GAP_PX = 24;

/** Matches --spacing-wiki-toc-height */
export const WIKI_TOC_HEIGHT_PX = 44;

/** Matches --spacing-timeline-rail-width */
export const WIKI_TIMELINE_RAIL_WIDTH_PX = 2;

/** Matches --spacing-timeline-dot-size */
export const WIKI_TIMELINE_DOT_SIZE_PX = 12;

export const WIKI_STAGGER_DELAY_MS = 60;

export const WIKI_STAGGER_DURATION_MS = 400;

/** Press feedback for wiki tappables */
export const WIKI_PRESS_SCALE_MIN = 0.97;
