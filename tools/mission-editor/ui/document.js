// The open mission as an editable document. Every edit is a command (a function that changes a copy of the
// table) with the previous document kept as its memento, so undo and redo swap documents. Edits autosave.

import { useEffect, useRef, useState } from "/vendor/preact.js";
import { transitions } from "./mission-ops.js";

const SAVE_DELAY = 400;
// Edits to the same field within this window share one undo step.
const MERGE_WINDOW = 1000;

export { transitions };

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

// The pure state operations live in refactor.js so tests can import them without Preact.
export { deleteState, inboundTo, nameError, renameState } from "./refactor.js";

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
