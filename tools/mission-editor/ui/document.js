// The open mission as an editable document. Every edit is a command (a function that changes a copy of the
// table) with the previous document kept as its memento, so undo and redo swap documents. Edits autosave.

import { useEffect, useRef, useState } from "/vendor/preact.js";

const SAVE_DELAY = 400;
// Edits to the same field within this window share one undo step.
const MERGE_WINDOW = 1000;

/** Edges of the graph: a state's `next`, then its `on` branches. */
export function transitions(mission) {
  const edges = [];
  for (const [from, state] of Object.entries(mission.states)) {
    if (state.next) edges.push({ from, to: state.next, kind: "next" });
    for (const rule of state.on ?? []) {
      edges.push({ from, to: rule.goto, kind: "on" });
    }
  }
  return edges;
}

/** Empty lists and false flags mean nothing to the generator, and an empty `until` would emit a broken `if`. */
function normalize(mission) {
  for (const state of Object.values(mission.states)) {
    for (const key of ["until", "on", "onEnter", "onExit", "beats", "notes"]) {
      if (state[key]?.length === 0) delete state[key];
    }
    for (const key of ["finish", "resetLatches"]) {
      if (state[key] === false) delete state[key];
    }
    for (const beat of state.beats ?? []) {
      for (const key of ["do", "when", "notes"]) {
        if (beat[key]?.length === 0) delete beat[key];
      }
    }
  }
  for (const key of ["monitors", "consts"]) {
    const value = mission[key];
    if (
      value &&
      (Array.isArray(value) ? value.length : Object.keys(value).length) === 0
    ) delete mission[key];
  }
}

/** The error to show under a state-name field, or "" when `name` can be used for `from`. */
export function nameError(name, mission, from) {
  if (!name) return "A state needs a name.";
  if (name !== from && name in mission.states) {
    return `A state named ${name} already exists.`;
  }
  return "";
}

/** Renames a state everywhere the table and the graph layout mention it. Changes `draft`. */
export function renameState(draft, from, to) {
  const { mission, layout } = draft;
  const swap = (id) => (id === from ? to : id);
  mission.states = Object.fromEntries(
    Object.entries(mission.states).map(([id, state]) => [swap(id), state]),
  );
  for (const state of Object.values(mission.states)) {
    if (state.next) state.next = swap(state.next);
    for (const rule of state.on ?? []) rule.goto = swap(rule.goto);
  }
  mission.start = swap(mission.start);
  mission.onFail = swap(mission.onFail);
  draft.layout = Object.fromEntries(
    Object.entries(layout).map(([id, point]) => [swap(id), point]),
  );
}

/** What points at `id`: `{ from, kind }` for each Next and branch, plus whether it is the start or the fail state. */
export function inboundTo(mission, id) {
  return {
    edges: transitions(mission).filter((e) => e.to === id),
    isStart: mission.start === id,
    isOnFail: mission.onFail === id,
  };
}

/** Deletes a state and every Next and branch that pointed at it. The start and fail states cannot be deleted. Changes `draft`. */
export function deleteState(draft, id) {
  const { mission } = draft;
  delete mission.states[id];
  delete draft.layout[id];
  for (const state of Object.values(mission.states)) {
    if (state.next === id) delete state.next;
    if (state.on) state.on = state.on.filter((rule) => rule.goto !== id);
  }
}

/**
 * Wraps a loaded mission (`{ stem, source, mission, layout, problems }`) with edit, undo, redo, and autosave.
 * `save` is `{ state: "idle" | "saving" | "saved" | "error", error? }`.
 */
export function useDocument(loaded, projectQuery) {
  const [doc, setDoc] = useState(loaded);
  const [problems, setProblems] = useState(loaded?.problems ?? []);
  const [save, setSave] = useState({ state: "idle" });
  const [, setHistoryVersion] = useState(0);
  const latest = useRef(loaded);
  const history = useRef({ past: [], future: [] });
  const timer = useRef(null);
  const queue = useRef(Promise.resolve());
  // The document the pending save is for, so a mission switch can flush it
  const dirty = useRef(false);

  const persist = (target) => {
    dirty.current = false;
    setSave({ state: "saving" });
    queue.current = queue.current.then(async () => {
      try {
        const res = await fetch(
          `/api/missions/${encodeURIComponent(target.stem)}?${projectQuery}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              mission: target.mission,
              layout: target.layout,
            }),
          },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? res.statusText);
        if (latest.current?.stem === target.stem) {
          setProblems(body.problems);
          if (latest.current.source !== body.source) {
            latest.current = { ...latest.current, source: body.source };
            setDoc(latest.current);
          }
          setSave({ state: dirty.current ? "saving" : "saved" });
        }
      } catch (error) {
        setSave({ state: "error", error: error.message });
      }
    });
  };

  const schedule = () => {
    dirty.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(latest.current), SAVE_DELAY);
  };

  // A different mission loads: send any unsaved edit of the old one first.
  useEffect(() => {
    latest.current = loaded;
    history.current = { past: [], future: [] };
    setDoc(loaded);
    setProblems(loaded?.problems ?? []);
    setSave({ state: "idle" });
    setHistoryVersion((n) => n + 1);
    return () => {
      if (!dirty.current) return;
      clearTimeout(timer.current);
      persist(latest.current);
    };
  }, [loaded]);

  const show = (next) => {
    latest.current = next;
    setDoc(next);
    setHistoryVersion((n) => n + 1);
    schedule();
  };

  /** Runs `change(draft)` on a copy of the table; `key` joins edits of one field into one undo step. */
  const edit = (label, change, { key } = {}) => {
    const current = latest.current;
    if (!current) return;
    const draft = structuredClone({
      mission: current.mission,
      layout: current.layout,
    });
    change(draft);
    normalize(draft.mission);
    const now = Date.now();
    const top = history.current.past.at(-1);
    if (key && top?.key === key && now - top.time < MERGE_WINDOW) {
      top.time = now;
    } else {history.current.past.push({
        memento: current,
        label,
        key,
        time: now,
      });}
    history.current.future = [];
    show({ ...current, ...draft });
  };

  const undo = () => {
    const step = history.current.past.pop();
    if (!step) return;
    history.current.future.push({ ...step, memento: latest.current });
    show(step.memento);
  };

  const redo = () => {
    const step = history.current.future.pop();
    if (!step) return;
    history.current.past.push({ ...step, memento: latest.current, time: 0 });
    show(step.memento);
  };

  return {
    doc,
    edit,
    undo,
    redo,
    canUndo: history.current.past.length > 0,
    canRedo: history.current.future.length > 0,
    problems,
    save,
  };
}
