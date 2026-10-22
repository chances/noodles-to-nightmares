// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { html, render, useEffect, useRef, useState } from "/vendor/preact.js";
import { AddStateDialog, Plus } from "./add-state.js";
import { AssetsPane } from "./assets-pane.js";
import { DebuggerPane } from "./debugger-pane.js";
import { activeBeat, BeatAdd, BeatBar, BeatPane } from "./beat-pane.js";
import { transitions, useDocument } from "./document.js";
import { addState } from "./mission-ops.js";
import { GraphPane } from "./graph-pane.js";
import { InspectorCrumb, InspectorPane, InspectorTitle } from "./inspector-pane.js";
import { missionLabel } from "./mission-label.js";
import { loadNodeSelection, saveNodeSelection } from "./node-selection.js";
import { ProblemsList, ProblemsPanel, ProblemsPill } from "./problems.js";
import { ProjectMenu } from "./project-menu.js";
import { KIND_SECTIONS, openOnShow } from "./sections.js";
import { StatesPane } from "./states-pane.js";
import { EditorContext } from "./step-controls.js";
import { TimelinePane, TimelineSummary } from "./timeline-pane.js";
import { Status } from "./status.js";
import { CaptureToast, TelemetryPill, useTelemetry } from "./telemetry.js";

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
function useMissions(preferredStem = null) {
  const [list, setList] = useState({ loading: true });
  const [stem, setStem] = useState(preferredStem);
  const [mission, setMission] = useState({ loading: true });

  useEffect(() => {
    getJson(`/api/missions?${projectQuery}`).then(
      (missions) => {
        setList({ data: missions });
        setStem((current) => missions.some((m) => m.stem === current) ? current : missions[0]?.stem ?? null);
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

/**
 * The heading and the optional `bar` (the selected state's name, say) stay outside the scrolling body.
 * `hideTitle` keeps the heading for screen readers only.
 */
function Pane({ title, hideTitle = false, trail = null, bar = null, children, innerRef, class: className = "" }) {
  return html`
    <section class="pane ${className}" ref=${innerRef}>
      ${hideTitle ? html`<h2 class="sr-only">${title}</h2>` : html`<hgroup><h2>${title}</h2>${trail}</hgroup>`}
      ${bar && html`<div class="pane-bar">${bar}</div>`}
      <div class="pane-body">${children}</div>
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

/** Lists every problem. Errors block the export itself, which arrives with the generated Sanny. */
function ExportDialog({ problems, onSelect, onClose }) {
  const dialog = useRef(null);
  const open = (el) => {
    dialog.current = el;
    if (el && !el.open) el.showModal();
  };
  const errors = problems.filter((p) => p.severity === "error").length;
  return html`
    <dialog ref=${open} onClose=${onClose}>
      <h2>Export</h2>
      ${errors > 0 && html`<p class="error" role="alert">Export is blocked until the errors are fixed.</p>`}
      <${ProblemsList} problems=${problems} onSelect=${(id) => { dialog.current.close(); onSelect(id); }} />
      ${errors === 0 && html`<p class="hint">The generated Sanny, the compile check, and the local count appear here.</p>`}
      <form method="dialog"><button autofocus>Close</button></form>
    </dialog>
  `;
}

const SAVE_TEXT = { saving: "Saving", saved: "Saved" };

/** Gives the step and condition controls inside it the vocabulary and the mission's monitors. */
function Vocabulary({ vocabulary, mission, names, children }) {
  // The mission's own constants come first and follow its edits; the project's files add the rest.
  const own = Object.entries(mission.consts ?? {}).map(([name, v]) => {
    const value = Array.isArray(v) ? v[0] : v;
    return { name, kind: Number.isInteger(value) ? "int" : "float", value: String(value), comment: Array.isArray(v) ? v[1] : undefined, source: "This mission" };
  });
  const constants = [...own, ...(names?.constants ?? []).filter((c) => !(c.name in (mission.consts ?? {})))];
  return html`<${EditorContext.Provider} value=${{ ...vocabulary, constants, globals: names?.globals ?? [], monitorIds: (mission.monitors ?? []).map((x) => x.id) }}>${children}<//>`;
}

function App() {

  const [showProblems, setShowProblems] = useState(false);
  const [adding, setAdding] = useState(false);
  const [savedSelection] = useState(() => loadNodeSelection(localStorage, project));
  const { list, stem, setStem, mission: loadedMission } = useMissions(savedSelection?.stem ?? null);
  const { doc, edit, undo, redo, canUndo, canRedo, problems: found, save } = useDocument(loadedMission.data ?? null, projectQuery);
  // A failed save is listed first, with its reason, beside the mission's own problems.
  const problems = save.state === "error" ? [{ severity: "error", message: `Save failed: ${save.error}` }, ...found] : found;
  const hasErrors = problems.some((p) => p.severity === "error" || p.level === "error");
  // The document follows the loaded mission one render late; until it catches up the mission is still loading.
  const current = loadedMission.data && doc?.stem === loadedMission.data.stem ? doc : null;
  const mission = loadedMission.data && !current
    ? { loading: true }
    : current
      ? { data: { ...current, edges: transitions(current.mission), node: loadedMission.data.node } }
      : loadedMission;
  const [picked, setSelected] = useState(savedSelection?.node ?? null);
  const previousStem = useRef(stem);
  useEffect(() => {
    if (previousStem.current === stem) return;
    previousStem.current = stem;
    setSelected(null);
  }, [stem]);
  // Undo or a delete can remove the picked state; the panes must never see it while the pick catches up.
  const selected = current && picked && !current.mission.states[picked] ? null : picked;
  useEffect(() => {
    if (picked && !selected) setSelected(null);
  }, [picked, selected]);
  useEffect(() => {
    if (current && current.stem === stem) {
      saveNodeSelection(localStorage, project, { stem, node: selected });
    }
  }, [current, stem, selected]);
  // The beat the Beat pane edits; a click on the timeline picks it, and a new state starts at its first beat.
  const [beatPick, setBeatPick] = useState(0);
  useEffect(() => setBeatPick(0), [selected]);
  const beat = current && selected ? activeBeat(current, selected, beatPick) : -1;
  const [vocabulary, setVocabulary] = useState(null);
  useEffect(() => { getJson("/api/vocabulary").then(setVocabulary, () => setVocabulary({ steps: [], conds: [], spots: [], enums: {} })); }, []);
  const [mode, setMode] = useState("edit");
  const { connected, telemetry, capture, captures, setCapture, runInGame, running } = useTelemetry(projectQuery);
  useEffect(() => {
    if (connected) {
      setMode("debug");
    }
  }, [connected]);

  useEffect(() => {
    const keys = (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) undo();
      else if (key === "y" || (key === "z" && e.shiftKey)) redo();
      else return;
      e.preventDefault();
    };
    document.addEventListener("keydown", keys);
    return () => document.removeEventListener("keydown", keys);
  });
  const [custom, setCustom] = useState(loadSizes);
  const [measured, setMeasured] = useState({ left: 0, right: 0, timeline: 0 });
  const main = useRef(null);
  const panes = { left: useRef(null), right: useRef(null), timeline: useRef(null) };

  // Clamp a requested size so the center keeps its minimum width, the graph keeps its minimum height, and the other sidebar keeps its width.
  const measure = (side, px) => {
    const { axis, limits: [min, max] } = PANES[side];
    const room = axis === "x"
      ? main.current.clientWidth - MIN_CENTER - panes[side === "left" ? "right" : "left"].current.offsetWidth
      : main.current.clientHeight - MIN_GRAPH;
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
    for (const pane of Object.values(panes)) observer.observe(pane.current);
    return () => observer.disconnect();
  }, [custom]);

  const style = Object.entries(custom).map(([side, px]) => `--${side}: ${px}px`).join(";");

  return html`
    <header>
      <${ProjectMenu} name=${projectName} path=${project} />
      <label class="field">
        <span class="sr-only">Mission</span>
        <select value=${stem ?? ""} disabled=${!list.data?.length} onChange=${(e) => setStem(e.currentTarget.value)}>
          ${(list.data ?? []).map((m) => html`<option key=${m.stem} value=${m.stem}>${missionLabel(m.stem)}</option>`)}
        </select>
      </label>
      <div class="toolbar">
        <span class="save-status" role="status" data-state=${save.state}>
          ${save.state === "error" ? "Save failed" : SAVE_TEXT[save.state] ?? ""}
        </span>
        <button disabled=${!canUndo} onClick=${undo} title="Undo (Ctrl+Z)">Undo</button>
        <button disabled=${!canRedo} onClick=${redo} title="Redo (Ctrl+Y)">Redo</button>
        <div class="menu-anchor">
          <${ProblemsPill} problems=${problems} open=${showProblems} onToggle=${() => setShowProblems(!showProblems)} />
          ${showProblems && html`<${ProblemsPanel} problems=${problems} onSelect=${setSelected} onClose=${() => setShowProblems(false)} />`}
        </div>
        <button class="primary run-in-game" disabled=${running || hasErrors} onClick=${runInGame} title=${hasErrors ? "Cannot run: fix blocking problems first" : "Run in Game"}>${running ? "Running..." : "▶ Run"}</button>
        <div class="mode-switch">
          <button class="mode-btn ${mode === 'edit' ? 'active' : ''}" onClick=${() => setMode('edit')}>Edit</button>
          <button class="mode-btn ${mode === 'debug' ? 'active' : ''}" onClick=${() => setMode('debug')}>Debug</button>
        </div>
        ${mode === "debug" && html`<${TelemetryPill} connected=${connected} telemetry=${telemetry} />`}
      </div>
    </header>
    <main ref=${main} style=${style}>
      <div class="workspace">
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
        label="Resize the Script and Beat sidebars"
        value=${measured.right}
        measure=${measure}
        onResize=${resize("right")}
        onReset=${reset}
      />
      <aside class="left" ref=${panes.left}>
        <${Pane} title="States"
          trail=${html`<button class="icon" aria-label="Add a state to this mission" title="Add State" disabled=${!mission.data} onClick=${() => setAdding(true)}><${Plus} /></button>`}>
          <${Loaded} mission=${mission} empty="Add a .states.ts or .fsm.json beside a mission to list its states."
            ready=${(m) => html`<${StatesPane} doc=${m} selected=${selected} onSelect=${setSelected} />`} />
        <//>
        <${Pane} title="Assets"><${AssetsPane} telemetry=${telemetry} /><//>
      </aside>
      <div class="center">
        <${Pane} title="Graph" hideTitle class="graph">
          <${Loaded} mission=${mission} empty="Add a .states.ts or .fsm.json beside a mission to draw its graph."
            ready=${(m) => html`<${GraphPane} doc=${m} edges=${m.edges} node=${m.node} selected=${selected} onSelect=${setSelected} />`} />
        <//>
      </div>
      <aside class="right" ref=${panes.right}>
        <${Pane} title=${mode === "debug" ? "Debugger" : "Script"}

          trail=${mode === "edit" && mission.data && selected && html`<${InspectorCrumb} doc=${mission.data} onSelect=${setSelected} />`}
          bar=${mode === "edit" && mission.data && html`<${InspectorTitle} doc=${mission.data} selected=${selected} edit=${edit} onSelect=${setSelected} />`}>
          ${mode === "debug" ? html`<${DebuggerPane} connected=${connected} telemetry=${telemetry} captures=${captures} />` : html`<${Loaded} mission=${vocabulary ? mission : { loading: true }} empty="Add a .states.ts or .fsm.json beside a mission to script its states."
            ready=${(m) => html`
              <${Vocabulary} vocabulary=${vocabulary} mission=${m.mission} names=${m.names}>
                <${InspectorPane} doc=${m} edges=${m.edges} problems=${problems} selected=${selected} onSelect=${setSelected} edit=${edit} />
              <//>`} />`}

        <//>
      </aside>
      </div>
      <div class="lower">
        <${Pane} title="Timeline" hideTitle class="timeline" innerRef=${panes.timeline}
          bar=${mission.data && selected && html`<${TimelineSummary} doc=${mission.data} selected=${selected} />`}>
          <${Loaded} mission=${mission} empty="Add a .states.ts or .fsm.json beside a mission to see its beats."
            ready=${(m) => html`<${TimelinePane} doc=${m} selected=${selected} beat=${beat} onSelectBeat=${setBeatPick} />`} />
        <//>
        <aside class="beat">
          <${Pane} title="Beat"
            trail=${mission.data && html`<${BeatAdd} selected=${selected} index=${beat} edit=${edit} onPick=${setBeatPick} />`}
            bar=${mission.data && selected && html`<${BeatBar} doc=${mission.data} selected=${selected} index=${beat} edit=${edit} onPick=${setBeatPick} />`}>
            <${Loaded} mission=${vocabulary ? mission : { loading: true }} empty="Add a .states.ts or .fsm.json beside a mission to edit its beats."
              ready=${(m) => html`<${Vocabulary} vocabulary=${vocabulary} mission=${m.mission} names=${m.names}><${BeatPane} doc=${m} selected=${selected} index=${beat} edit=${edit} /><//>`} />
          <//>
        </aside>
      </div>
      <${Splitter}
        side="timeline"
        pane=${panes.timeline}
        label="Resize the Timeline height"
        value=${measured.timeline}
        measure=${measure}
        onResize=${resize("timeline")}
        onReset=${reset}
      />
    </main>
    ${adding && mission.data && html`
      <${AddStateDialog} mission=${mission.data.mission} selected=${selected} onClose=${() => setAdding(false)}
        onCreate=${(values) => {
          edit("Add State", (d) => addState(d, values, mission.data.node));
          openOnShow(values.name, KIND_SECTIONS[values.kind]);
          setSelected(values.name);
        }} />`}

    <${CaptureToast} capture=${capture} onDismiss=${() => setCapture(null)} />
  `;
}

render(html`<${App} />`, document.getElementById("app"));
