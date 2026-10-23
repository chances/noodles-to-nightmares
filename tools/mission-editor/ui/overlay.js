import { html, render, useLayoutEffect, useRef } from "/vendor/preact.js";

const EDGE = 8;

/**
 * Renders `children` into a host appended to `<body>`, in the browser's top layer, so a menu, panel, list, or toast
 * is never clipped by a pane and always sits above everything else. The host is placed under the element that
 * contains the `<Overlay>` (its anchor) and may grow to the viewport's edges. `align="end"` lines up the right
 * edges, `fit` makes the host as wide as the anchor, and `free` skips placing it for an overlay that positions itself.
 * `hostRef` receives the host element, which holds the overlay's content for outside-click and focus checks.
 */
export function Overlay(
  { children, hostRef, align = "start", gap = 4, fit = false, free = false },
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
    const anchor = marker.current?.parentElement;
    if (!anchor) return;
    const place = () => {
      const box = anchor.getBoundingClientRect();
      const view = document.documentElement;
      const top = box.bottom + gap;
      el.style.setProperty("inset-block-start", `${top}px`);
      el.style.setProperty("--anchor-inline-size", `${box.width}px`);
      el.style.setProperty(
        "max-block-size",
        `${Math.max(view.clientHeight - top - EDGE, 0)}px`,
      );
      el.style.setProperty(
        "max-inline-size",
        `${view.clientWidth - 2 * EDGE}px`,
      );
      if (align === "end") {
        el.style.setProperty("inset-inline-start", "auto");
        el.style.setProperty(
          "inset-inline-end",
          `${Math.max(view.clientWidth - box.right, EDGE)}px`,
        );
      } else {
        el.style.setProperty("inset-inline-end", "auto");
        el.style.setProperty(
          "inset-inline-start",
          `${Math.max(box.left, EDGE)}px`,
        );
      }
      if (fit) el.style.setProperty("inline-size", `${box.width}px`);
    };
    place();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => {
      removeEventListener("resize", place);
      removeEventListener("scroll", place, true);
    };
  });

  return html`<span ref=${marker} hidden />`;
}
