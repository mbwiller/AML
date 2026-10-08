/**
 * Popover placement geometry for the sticky-note controller
 * (src/components/shell/sticky-controller.ts). No imports: it ships to the
 * browser, so it must stay dependency-free.
 */

export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Placement {
  top: number;
  left: number;
  side: 'below' | 'above';
}

/**
 * Fixed-position placement of a card next to its trigger. Below by default;
 * above when it does not fit below and there is more room above. Clamped to
 * the viewport with `margin` on every side; the left edge aligns with the
 * trigger when it can.
 */
export function placePopover(
  trigger: Rect,
  card: Size,
  viewport: Size,
  gap = 8,
  margin = 8,
): Placement {
  const below = viewport.height - trigger.bottom - gap - margin;
  const above = trigger.top - gap - margin;
  const side: Placement['side'] = card.height <= below || below >= above ? 'below' : 'above';
  const rawTop = side === 'below' ? trigger.bottom + gap : trigger.top - gap - card.height;
  const maxTop = Math.max(margin, viewport.height - margin - card.height);
  const top = Math.min(Math.max(rawTop, margin), maxTop);
  const maxLeft = Math.max(margin, viewport.width - margin - card.width);
  const left = Math.min(Math.max(trigger.left, margin), maxLeft);
  return { top, left, side };
}
