// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, useEffect, useLayoutEffect, useRef, useState } from "/vendor/preact.js";
import { stateKindIcon } from "./icons.js";
import { kindOf } from "./sections.js";
import { roleKey, roles } from "./states-pane.js";

const PADDING = 24;
const ARCH = 48;

/**
 * The graph reads top to bottom: a forward edge leaves the bottom of a node and enters the top of the next.
 * An edge between nodes in one row runs along their facing sides, and a back edge arches out past the right sides.
 */
function edgePath(a, b, { width, height }) {
  if (b.y > a.y) {
    const x1 = a.x + width / 2, y1 = a.y + height, x2 = b.x + width / 2, y2 = b.y;
    const dy = (y2 - y1) / 2;
    return `M${x1},${y1} C${x1},${y1 + dy} ${x2},${y2 - dy} ${x2},${y2}`;
  }
  if (b.y === a.y) {
    const right = b.x > a.x;
    const y = a.y + height / 2, x1 = right ? a.x + width : a.x, x2 = right ? b.x : b.x + width;
    return `M${x1},${y} L${x2},${y}`;
  }
  const x1 = a.x + width, y1 = a.y + height / 2, x2 = b.x + width, y2 = b.y + height / 2;
  const out = Math.max(x1, x2) + ARCH;
  return `M${x1},${y1} C${out},${y1} ${out},${y2} ${x2},${y2}`;
}

function subtitle(doc, id) {
  const beats = doc.mission.states[id].beats?.length ?? 0;
  return [...roles(doc, id), beats && `${beats} ${beats === 1 ? "Beat" : "Beats"}`]
    .filter(Boolean)
    .join(" · ");
}

const LEFT = 0;
const MIDDLE = 1;
// Pointer travel, in pixels, beyond which a press on empty space is a pan and not a click.
const CLICK_SLOP = 4;
const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
const ZOOM_SPEED = 0.002;

/**
 * Handlers that scroll the enclosing pane while the middle mouse button is dragged anywhere on the canvas,
 * or the left button is dragged on empty space. A left press on a state card is left for selecting it
 * (and, later, dragging it).
 */
function usePan(onDeselect) {
  const start = useRef(null);
  const end = (e) => {
    // A left press on empty space that never moved is a click, which deselects.
    const click = e.type === "pointerup" && start.current?.click && !start.current.moved;
    start.current = null;
    delete e.currentTarget.dataset.panning;
    if (click) onDeselect();
  };
  return {
    // Middle-click would otherwise start the browser's autoscroll.
    onMouseDown: (e) => { if (e.button === MIDDLE) e.preventDefault(); },
    onAuxClick: (e) => { if (e.button === MIDDLE) e.preventDefault(); },
    onPointerDown: (e) => {
      const emptySpace = e.button === LEFT && !e.target.closest(".node");
      if (e.button !== MIDDLE && !emptySpace) return;
      const pane = e.currentTarget.closest(".pane-body");
      e.currentTarget.setPointerCapture(e.pointerId);
      e.currentTarget.dataset.panning = "";
      start.current = { x: e.clientX, y: e.clientY, left: pane.scrollLeft, top: pane.scrollTop, pane, click: emptySpace, moved: false };
    },
    onPointerMove: (e) => {
      const s = start.current;
      if (!s) return;
      if (Math.hypot(e.clientX - s.x, e.clientY - s.y) > CLICK_SLOP) s.moved = true;
      s.pane.scrollLeft = s.left - (e.clientX - s.x);
      s.pane.scrollTop = s.top - (e.clientY - s.y);
    },
    onPointerUp: end,
    onPointerCancel: end,
  };
}

/** Ctrl+scroll (also a trackpad pinch) zooms the graph around the pointer; plain scroll still scrolls the pane. */
function useZoom(canvas) {
  const [zoom, setZoom] = useState(1);
  const current = useRef(1);
  const shift = useRef(null);

  useEffect(() => {
    const el = canvas.current;
    const onWheel = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const next = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, current.current * Math.exp(-e.deltaY * ZOOM_SPEED)));
      if (next === current.current) return;
      const box = el.querySelector("svg").getBoundingClientRect();
      // The graph point under the pointer stays put: scroll by how far that point moves when the size changes.
      const ratio = next / current.current;
      shift.current = { x: (e.clientX - box.left) * (ratio - 1), y: (e.clientY - box.top) * (ratio - 1) };
      current.current = next;
      setZoom(next);
    };
    // A non-passive listener, so the browser's own page zoom can be cancelled.
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // The pane can only scroll past its old size once the graph has grown, so apply the shift after rendering.
  useLayoutEffect(() => {
    if (!shift.current) return;
    const pane = canvas.current.closest(".pane-body");
    pane.scrollLeft += shift.current.x;
    pane.scrollTop += shift.current.y;
    shift.current = null;
  }, [zoom]);

  return zoom;
}

export function GraphPane({ doc, edges, node, selected, onSelect }) {
  const ids = Object.keys(doc.mission.states);
  const xs = ids.map((id) => doc.layout[id].x);
  const ys = ids.map((id) => doc.layout[id].y);
  const left = Math.min(...xs) - PADDING;
  // Only back edges arch out past the right side, so only they need the extra room.
  const arches = edges.some((e) => doc.layout[e.to].y < doc.layout[e.from].y);
  const top = Math.min(...ys) - PADDING;
  const width = Math.max(...xs) + node.width + PADDING + (arches ? ARCH : 0) - left;
  const height = Math.max(...ys) + node.height + PADDING - top;
  const touches = (edge) => selected && (edge.from === selected || edge.to === selected);
  const key = (e, id) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(id);
    }
  };

  const canvas = useRef(null);
  const pan = usePan(() => onSelect(null));
  const zoom = useZoom(canvas);

  return html`
    <div class="graph-canvas" ref=${canvas} ...${pan}>
    <svg
      class="graph-svg"
      width=${width * zoom}
      height=${height * zoom}
      viewBox=${`${left} ${top} ${width} ${height}`}
      role="group"
      aria-label="State graph"
    >
      <defs>
        <marker id="arrow" class="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" />
        </marker>
        <marker id="arrow-active" class="arrow active" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" />
        </marker>
      </defs>
      ${edges.map((edge) => html`
        <path
          key=${`${edge.from}>${edge.to}:${edge.kind}`}
          class=${`edge ${edge.kind} ${touches(edge) ? "active" : ""}`}
          d=${edgePath(doc.layout[edge.from], doc.layout[edge.to], node)}
          marker-end=${touches(edge) ? "url(#arrow-active)" : "url(#arrow)"}
        >
          <title>${edge.kind === "on" ? `${edge.from} goes to ${edge.to} when a rule holds` : `${edge.from} goes to ${edge.to}`}</title>
        </path>
      `)}
      ${ids.map((id) => {
        const state = doc.mission.states[id];
        const kind = kindOf(state);
        return html`
        <g
          key=${id}
          class="node"
          role="button"
          tabindex="0"
          aria-pressed=${selected === id}
          data-role=${roles(doc, id).map(roleKey)[0]}
          transform=${`translate(${doc.layout[id].x} ${doc.layout[id].y})`}
          onClick=${() => onSelect(id)}
          onKeyDown=${(e) => key(e, id)}
        >
          <title>${`Select ${id}`}</title>
          <rect class="box" width=${node.width} height=${node.height} rx="6" />
          <rect class="role-bar" width="4" height=${node.height - 12} x="0" y="6" />
          ${kind && stateKindIcon(kind, { x: 12, y: 13, size: 14, class: "node-icon" })}
          <text class="node-id" x=${kind ? 32 : 12} y="24">${id}</text>
          <text class="node-sub" x="12" y="42">${subtitle(doc, id)}</text>
        </g>
      `;
      })}
    </svg>
    </div>
  `;
}
