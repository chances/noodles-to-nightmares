import { html, render, useLayoutEffect, useRef } from "/vendor/preact.js";
import {
  autoUpdate,
  computePosition,
  flip,
  offset,
  shift,
  size,
} from "/vendor/floating-ui-dom.js";

const EDGE = 8;

/**
 * Renders `children` into a host appended to `<body>`, in the browser's top layer, so a menu, panel, list, or toast
 * is never clipped by a pane and always sits above everything else. The host is placed under the element that
 * contains the `<Overlay>` (its anchor) and may grow to the viewport's edges. `align="end"` lines up the right
 * edges, `fit` makes the host as wide as the anchor, and `free` skips placing it for an overlay that positions itself.
 * `anchorRef` anchors it to another element, and `placement` sets its side (default: below the anchor).
 * `hostRef` receives the host element, which holds the overlay's content for outside-click and focus checks.
 */
export function Overlay(
  {
    children,
    hostRef,
    align = "start",
    gap = 4,
    fit = false,
    free = false,
    anchorRef,
    placement = align === "end" ? "bottom-end" : "bottom-start",
  },
) {
  const marker = useRef(null);
  const host = useRef(null);
  if (!host.current) {
    host.current = document.createElement("div");
    host.current.className = "overlay";
    host.current.setAttribute("popover", "manual");
  }
  if (hostRef) hostRef.current = host.current;

  useLayoutEffect(() => {
    const el = host.current;
    document.body.append(el);
    if (!el.matches(":popover-open")) el.showPopover();
    return () => {
      render(null, el);
      el.remove();
    };
  }, []);

  // Rendered into the host on every render, so the content follows the caller's state.
  useLayoutEffect(() => {
    const el = host.current;
    render(children, el);
    if (free) return;
    const anchor = anchorRef?.current ?? marker.current?.parentElement;
    if (!anchor) return;
    const place = async () => {
      // Measure the content's natural width: a width left from an earlier placement would hide the room a flip needs.
      // The block size is left alone, since clearing it would clamp a scrolled list back to its top.
      el.style.maxInlineSize = "";
      const { x, y } = await computePosition(anchor, el, {
        strategy: "fixed",
        placement,
        middleware: [
          offset(gap),
          flip({ padding: EDGE }),
          shift({ padding: EDGE }),
          size({
            padding: EDGE,
            apply({ availableHeight, availableWidth, rects }) {
              el.style.maxBlockSize = `${Math.max(availableHeight, 0)}px`;
              el.style.maxInlineSize = `${Math.max(availableWidth, 0)}px`;
              el.style.setProperty(
                "--anchor-inline-size",
                `${rects.reference.width}px`,
              );
              if (fit) el.style.inlineSize = `${rects.reference.width}px`;
            },
          }),
        ],
      });
      el.style.insetInlineStart = `${x}px`;
      el.style.insetBlockStart = `${y}px`;
    };
    return autoUpdate(anchor, el, place);
  });

  return html`<span ref=${marker} hidden />`;
}
