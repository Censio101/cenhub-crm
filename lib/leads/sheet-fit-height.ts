/** Never shorter than this (px), so a short window still shows a usable sheet. */
export const SHEET_MIN_HEIGHT_PX = 384
/** Window height minus this (px) is the least height the sheet gets: top bar plus a little air. */
export const SHEET_FULL_WINDOW_INSET_PX = 96
/** Space kept below the sheet (px). */
export const SHEET_BOTTOM_GAP_PX = 24

/**
 * Height of the lead sheet card.
 * `pageTop` is where the sheet starts on the page (px from the top of the page, not the window).
 * The sheet fills the window below its start. When the cards above push it low, it still gets
 * almost a full window (the page scrolls to it) instead of a short strip.
 */
export function computeSheetHeightPx(windowHeight: number, pageTop: number): number {
  const fillBelow = windowHeight - pageTop - SHEET_BOTTOM_GAP_PX
  const nearlyFullWindow = windowHeight - SHEET_FULL_WINDOW_INSET_PX
  return Math.max(SHEET_MIN_HEIGHT_PX, Math.round(Math.max(fillBelow, nearlyFullWindow)))
}
