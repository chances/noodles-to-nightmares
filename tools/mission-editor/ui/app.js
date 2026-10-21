// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, render, useEffect, useRef, useState } from "/vendor/preact.js";
import { GraphPane } from "./graph-pane.js";
import { ProjectMenu } from "./project-menu.js";
import { StatesPane } from "./states-pane.js";
import { Status } from "./status.js";

async function getJson(url) {
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? res.statusText);
  return body;
}

// The welcome page opens a project as `app.html?project=<folder>`; without one there is nothing to edit.
const project = new URLSearchParams(location.search).get("project");
if (!project) location.replace("/");
const projectName = project?.split(/[\\/]/).filter(Boolean).pop() ?? "";
const projectQuery = `project=${encodeURIComponent(project ?? "")}`;

/** Loads the mission list once, then the table of the chosen mission. `mission` is { loading } | { error } | { data }. */
function useMissions() {
  const [list, setList] = useState({ loading: true });
  const [stem, setStem] = useState(null);
  const [mission, setMission] = useState({ loading: true });

  useEffect(() => {
    getJson(`/api/missions?${projectQuery}`).then(
      (missions) => {
        setList({ data: missions });
        setStem(missions[0]?.stem ?? null);
        if (!missions.length) setMission({ data: null });
      },
      (error) => {
        setList({ error: error.message });
        setMission({ error: error.message });
      },
    );
  }, []);

  useEffect(() => {
    if (stem === null) return;
    let stale = false;
    setMission({ loading: true });
    getJson(`/api/missions/${encodeURIComponent(stem)}?${projectQuery}`).then(
      (data) => !stale && setMission({ data }),
      (error) => !stale && setMission({ error: error.message }),
    );
    return () => { stale = true; };
  }, [stem]);

  return { list, stem, setStem, mission };
}

/** Shows `ready(data)` once the mission has loaded, else the matching status message. */
function Loaded({ mission, empty, ready }) {
  if (mission.loading) return html`<${Status} loading heading="Loading Mission">Reading the mission table.<//>`;
  if (mission.error) return html`<${Status} heading="Mission Failed to Load">${mission.error}<//>`;
  if (!mission.data) return html`<${Status} heading="No Missions">${empty}<//>`;
  return ready(mission.data);
}

const STORAGE_KEY = "mission-editor.pane-sizes";
const MIN_CENTER = 240;
const MIN_GRAPH = 120;
const KEY_STEP = 16;
// `sign` is how far the pane grows per pixel the splitter moves along its axis.
const PANES = {
  left: { axis: "x", sign: 1, limits: [160, 420] },
  right: { axis: "x", sign: -1, limits: [200, 420] },
  timeline: { axis: "y", sign: -1, limits: [80, 640] },
};
const KEYS = { x: { ArrowLeft: -KEY_STEP, ArrowRight: KEY_STEP }, y: { ArrowUp: -KEY_STEP, ArrowDown: KEY_STEP } };
const size = (axis, el) => (axis === "x" ? el.offsetWidth : el.offsetHeight);

function loadSizes() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? {};
  } catch {
    return {};
  }
}

function saveSizes(sizes) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sizes));
  } catch { /* storage can be blocked; the sizes just reset next launch */ }
}

function Pane({ title, children, innerRef, class: className = "" }) {
  return html`
    <section class="pane ${className}" ref=${innerRef}>
      <hgroup><h2>${title}</h2></hgroup>
      ${children}
    </section>
  `;
}

function Splitter({ side, label, pane, value, onResize, onReset, measure }) {
  const [dragging, setDragging] = useState(false);
  const start = useRef(null);
  const { axis, limits: [min, max] } = PANES[side];
  // Horizontal movement flips in right-to-left; vertical movement does not.
  const sign = (el) => PANES[side].sign * (axis === "x" && getComputedStyle(el).direction === "rtl" ? -1 : 1);

  const down = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { from: axis === "x" ? e.clientX : e.clientY, size: size(axis, pane.current), sign: sign(e.currentTarget) };
    setDragging(true);
  };
  const move = (e) => {
    if (!start.current) return;
    const delta = (axis === "x" ? e.clientX : e.clientY) - start.current.from;
    onResize(measure(side, start.current.size + delta * start.current.sign));
  };
  const up = () => {
    start.current = null;
    setDragging(false);
  };
  const key = (e) => {
    const step = KEYS[axis][e.key];
    if (step !== undefined) onResize(measure(side, size(axis, pane.current) + step * sign(e.currentTarget)));
    else if (e.key === "Home") onResize(measure(side, min));
    else if (e.key === "End") onResize(measure(side, max));
    else if (e.key === "Enter") onReset(side);
    else return;
    e.preventDefault();
  };

  return html`
    <div
      class="splitter"
      data-side=${side}
      data-dragging=${dragging}
      role="separator"
      aria-orientation=${axis === "x" ? "vertical" : "horizontal"}
      aria-label=${label}
      aria-valuemin=${min}
      aria-valuemax=${max}
      aria-valuenow=${Math.round(value)}
      tabindex="0"
      title="Drag To Resize, Double-Click To Reset"
      onPointerDown=${down}
      onPointerMove=${move}
      onPointerUp=${up}
      onPointerCancel=${up}
      onDblClick=${() => onReset(side)}
      onKeyDown=${key}
    ></div>
  `;
}

function ExportDialog({ onClose }) {
  const dialog = useRef(null);
  const open = (el) => {
    dialog.current = el;
    if (el && !el.open) el.showModal();
  };
  return html`
    <dialog ref=${open} onClose=${onClose}>
      <h2>Export</h2>
      <p class="hint">The generated Sanny, the compile check, and the local count appear here.</p>
      <form method="dialog"><button autofocus>Close</button></form>
    </dialog>
  `;
}

function App() {
  const [exporting, setExporting] = useState(false);
  const { list, stem, setStem, mission } = useMissions();
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [stem]);
  const [custom, setCustom] = useState(loadSizes);
  const [measured, setMeasured] = useState({ left: 0, right: 0, timeline: 0 });
  const main = useRef(null);
  const center = useRef(null);
  const panes = { left: useRef(null), right: useRef(null), timeline: useRef(null) };

  // Clamp a requested size so the center keeps its minimum width, the graph keeps its minimum height, and the other sidebar keeps its width.
  const measure = (side, px) => {
    const { axis, limits: [min, max] } = PANES[side];
    const room = axis === "x"
      ? main.current.clientWidth - MIN_CENTER - panes[side === "left" ? "right" : "left"].current.offsetWidth
      : center.current.clientHeight - MIN_GRAPH;
    return Math.round(Math.max(min, Math.min(px, max, room)));
  };
  const resize = (side) => (px) => {
    const next = { ...custom, [side]: px };
    setCustom(next);
    saveSizes(next);
  };
  const reset = (side) => {
    const { [side]: _, ...rest } = custom;
    setCustom(rest);
    saveSizes(rest);
  };

  useEffect(() => {
    const sync = () => {
      setMeasured(Object.fromEntries(Object.entries(PANES).map(([side, { axis }]) => [side, size(axis, panes[side].current)])));
    };
    sync();
    const observer = new ResizeObserver(() => {
      sync();
      // A shrinking window pulls an oversized custom size back in.
      for (const side of Object.keys(PANES)) {
        if (custom[side] !== undefined && measure(side, custom[side]) < custom[side]) {
          setCustom((c) => ({ ...c, [side]: measure(side, c[side]) }));
        }
      }
    });
    observer.observe(main.current);
    observer.observe(center.current);
    for (const pane of Object.values(panes)) observer.observe(pane.current);
    return () => observer.disconnect();
  }, [custom]);

  const style = Object.entries(custom).map(([side, px]) => `--${side}: ${px}px`).join(";");

  return html`
    <header>
      <${ProjectMenu} name=${projectName} path=${project} />
      <div class="toolbar">
        <label class="field">
          <span>Mission</span>
          <select value=${stem ?? ""} disabled=${!list.data?.length} onChange=${(e) => setStem(e.currentTarget.value)}>
            ${(list.data ?? []).map((m) => html`<option key=${m.stem} value=${m.stem}>${m.stem}</option>`)}
          </select>
        </label>
        <button class="primary" onClick=${() => setExporting(true)}>Export</button>
      </div>
    </header>
    <main ref=${main} style=${style}>
      <${Splitter}
        side="left"
        pane=${panes.left}
        label="Resize the States and Assets sidebar"
        value=${measured.left}
        measure=${measure}
        onResize=${resize("left")}
        onReset=${reset}
      />
      <${Splitter}
        side="right"
        pane=${panes.right}
        label="Resize the Inspector sidebar"
        value=${measured.right}
        measure=${measure}
        onResize=${resize("right")}
        onReset=${reset}
      />
      <aside class="left" ref=${panes.left}>
        <${Pane} title="States">
          <${Loaded} mission=${mission} empty="Add a .states.ts or .fsm.json beside a mission to list its states."
            ready=${(m) => html`<${StatesPane} doc=${m} selected=${selected} onSelect=${setSelected} />`} />
        <//>
        <${Pane} title="Assets"><p class="hint">Spots, models, characters, and sprites appear here.</p><//>
      </aside>
      <div class="center" ref=${center}>
        <${Pane} title="Graph" class="graph">
          <${Loaded} mission=${mission} empty="Add a .states.ts or .fsm.json beside a mission to draw its graph."
            ready=${(m) => html`<${GraphPane} doc=${m} edges=${m.edges} node=${m.node} selected=${selected} onSelect=${setSelected} />`} />
        <//>
        <${Pane} title="Timeline" class="timeline" innerRef=${panes.timeline}><p class="hint">The beat timeline appears here.</p><//>
        <${Splitter}
          side="timeline"
          pane=${panes.timeline}
          label="Resize the Timeline height"
          value=${measured.timeline}
          measure=${measure}
          onResize=${resize("timeline")}
          onReset=${reset}
        />
      </div>
      <aside class="right" ref=${panes.right}>
        <${Pane} title="Inspector"><p class="hint">Select a state to edit it.</p><//>
      </aside>
    </main>
    ${exporting && html`<${ExportDialog} onClose=${() => setExporting(false)} />`}
  `;
}

render(html`<${App} />`, document.getElementById("app"));
