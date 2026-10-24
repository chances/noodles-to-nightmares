// The pure parts of reordering a list of cards: where a drop lands, how a keyboard move wraps, and what a screen
// reader hears. `useReorder` in step-controls.js drives them from pointer and key events. Plain JavaScript because
// the browser loads it; the editor tests import it too.

/**
 * How long a touch rests on a card before the card lifts, in milliseconds.
 *
 * @remarks Mouse and pen presses start a drag at once. Only touch waits this long, and a touch that moves beyond
 * SLOP_PX first belongs to a page scroll.
 */
export const HOLD_MS = 500;

/** How far a touch may move before its hold ends, in pixels. Past that the page scrolls instead of dragging. */
export const SLOP_PX = 8;

/** How long a card that did not land takes to slide back to its slot, in milliseconds. */
export const RETURN_MS = 180;

/** The index `index` reaches by moving `by` places, wrapping past either end of a list of `count` cards. */
export function wrapIndex(index, by, count) {
  return ((index + by) % count + count) % count;
}

/** The items with the one at `from` taken out and put back at `to`, the index it has in the new list. */
export function moveItem(items, from, to) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** The index a dropped card lands at, given the midpoints of the other cards in order and the pointer's y. */
export function dropIndex(midpoints, y) {
  return midpoints.filter((mid) => mid < y).length;
}

/** `y` held inside `[top, bottom]`, so a dragged card never leaves its list vertically. */
export function clampY(y, top, bottom) {
  return Math.min(Math.max(y, top), bottom);
}

/** Whether `x` lies inside a list's columns. A drop outside them returns the card to its slot. */
export function inColumn(x, left, right) {
  return x >= left && x <= right;
}

/**
 * The y of the drop line for a drop at `to`: centred in the gap between the two cards it falls between, or half a
 * gap beyond the first or last card. `others` holds `{ top, bottom }` for the cards that stay put, and `gap` is the
 * space the list leaves between cards.
 */
export function insertionTop(others, to, gap) {
  if (others.length === 0) return null;
  if (to === 0) return others[0].top - gap / 2;
  if (to === others.length) return others.at(-1).bottom + gap / 2;
  return (others[to - 1].bottom + others[to].top) / 2;
}

/** What a screen reader announces after a card moves to `position` of `count`. */
export function movedMessage(position, count) {
  return `Moved to position ${position} of ${count}`;
}
