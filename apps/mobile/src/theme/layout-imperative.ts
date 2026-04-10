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

/** Entry detail hero: max height before scroll collapse (parallax + zoom range). */
export const ENTRY_DETAIL_HERO_MAX_HEIGHT_PX = 480;

/**
 * Max scale applied to hero image while scrolling (1 = no zoom).
 * Paired with `ENTRY_DETAIL_HERO_MAX_HEIGHT_PX` in `useEntryDetailScroll`.
 */
export const ENTRY_DETAIL_HERO_ZOOM_SCALE_MAX = 1.3;
