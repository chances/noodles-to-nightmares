// Scroll-into-view for the editor. An element is revealed with the least scroll that shows it, clear of the layout's
// gap, the scroller's padding, and any sticky element pinned to an edge.

/**
 * The scroll offset that shows `start` to `start + size` in a scroller. `before` and `after` are the clear space kept
 * on each side, in the same units. An element already in view with that space keeps the scroll position.
 */
export function revealOffset({ start, size, scroll, view, content, before = 0, after = 0 }) {
  const max = Math.max(0, content - view);
  // The scroll range where the start clears the near edge, and where the end clears the far edge.
  const upper = start - before;
  const lower = start + size + after - view;
  // An element too big for the clear space shows its start, so the start stays readable.
  const target = lower > upper ? upper : Math.min(Math.max(scroll, lower), upper);
  return Math.min(max, Math.max(0, target));
}

/**
 * Whether a sticky element is pinned to an edge along `block` or the inline axis, from its computed inset. An element
 * pinned only on the other axis spans the scroller and never covers its edges.
 */
export function pinnedAlong(style, block) {
  const sides = block ? [style.top, style.bottom] : [style.left, style.right];
  return style.position === "sticky" && sides.some((side) => side !== "auto");
}

/**
 * The clear space a pinned sticky element takes at each edge of a `view`-pixel view. A pinned element takes its own size
 * at its edge, and it counts only when it sits close enough to that edge to be pinned there now.
 */
export function coverOf({ at, size, view, startPinned, endPinned }) {
  return {
    before: startPinned && at < size ? size : 0,
    after: endPinned && view - (at + size) < size ? size : 0,
  };
}

/** The sticky clear space at each visible edge of `node` along `axis`, measured from its current layout. */
function stickyCover(node, axis) {
  const block = axis === "block";
  const frame = node.getBoundingClientRect();
  const lo = block ? frame.top + node.clientTop : frame.left + node.clientLeft;
  const view = block ? node.clientHeight : node.clientWidth;
  const cover = { before: 0, after: 0 };
  for (const el of node.querySelectorAll("*")) {
    const style = getComputedStyle(el);
    if (!pinnedAlong(style, block)) continue;
    const box = el.getBoundingClientRect();
    const part = coverOf({
      at: block ? box.top - lo : box.left - lo,
      size: block ? box.height : box.width,
      view,
      startPinned: block ? style.top !== "auto" : style.left !== "auto",
      endPinned: block ? style.bottom !== "auto" : style.right !== "auto",
    });
    cover.before = Math.max(cover.before, part.before);
    cover.after = Math.max(cover.after, part.after);
  }
  return cover;
}

function scrolls(node, axis) {
  const style = getComputedStyle(node);
  return axis === "block"
    ? /(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight
    : /(auto|scroll)/.test(style.overflowX) && node.scrollWidth > node.clientWidth;
}

/**
 * Reveals `el` along `axis` ("block" or "inline") in every scroller that holds it, innermost first. `gap` is the layout's
 * clear space on each side of the element, in pixels. A scroller's own padding is kept as well.
 */
export function revealElement(el, axis, gap = 0) {
  const block = axis === "block";
  for (let node = el.parentElement; node; node = node.parentElement) {
    if (!scrolls(node, axis)) continue;
    const style = getComputedStyle(node);
    const padBefore = parseFloat(block ? style.paddingTop : style.paddingLeft);
    const padAfter = parseFloat(block ? style.paddingBottom : style.paddingRight);
    const frame = node.getBoundingClientRect();
    const box = el.getBoundingClientRect();
    const scroll = block ? node.scrollTop : node.scrollLeft;
    const start = block
      ? box.top - frame.top - node.clientTop + scroll
      : box.left - frame.left - node.clientLeft + scroll;
    const cover = stickyCover(node, axis);
    const next = revealOffset({
      start,
      size: block ? box.height : box.width,
      scroll,
      view: block ? node.clientHeight : node.clientWidth,
      content: block ? node.scrollHeight : node.scrollWidth,
      // The sticky cover is inside the scroller's padding, so the larger of the two is the clear space, not their sum.
      before: Math.max(gap, padBefore, cover.before + gap),
      after: Math.max(gap, padAfter, cover.after + gap),
    });
    if (block) node.scrollTop = next;
    else node.scrollLeft = next;
  }
}
