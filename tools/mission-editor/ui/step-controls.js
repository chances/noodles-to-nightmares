// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { createContext, html, useContext, useEffect, useLayoutEffect, useRef, useState } from "/vendor/preact.js";
import { Overlay } from "./overlay.js";
import { buildCond, buildLines, buildWhen, closedCombo, constantOptions, defaults, enumOptions, filterOptions, flipMode, flipShown, formatField, functionOptions, globalOptions, isValid, numberProblem, pairOf, parseCond, parseLines, parseWhen, reformat, spotOptions } from "./templates.js";
import { CheckIcon, CopyIcon, GripIcon, SannyEditIcon } from "./icons.js";
import { clampY, dropIndex, inColumn, insertionTop, HOLD_MS, moveItem, movedMessage, RETURN_MS, SLOP_PX, wrapIndex } from "./reorder.js";

/** The vocabulary (`steps`, `conds`), the geography `spots`, and the open mission's monitor ids, which the latch fields offer. */
export const EditorContext = createContext({ steps: [], conds: [], spots: [], enums: {}, constants: [], globals: [], functions: [], monitorIds: [], sannyFiles: [] });

let comboCount = 0;

/**
 * A typeahead over `options` (`{ value, meta, search }`): typing filters the list, and picking one commits its
 * value. A strict combo (a spot) commits only a pick. A free one (a number or a variable) also commits what is
 * typed once `field` accepts it, so the list suggests and never limits. An empty `value` is an add field: it
 * flags nothing as unknown.
 */
export function Combo({ field, value, options, free, label, note, missing = "is not in the geography", onCommit }) {
  const [draft, setDraft] = useState(value);
  const [typed, setTyped] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef(null);
  const last = useRef(value);
  const [listId] = useState(() => `combo-${++comboCount}`);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setDraft(value);
    }
  }, [value]);

  const matches = open ? filterOptions(options, typed ?? "") : [];
  // An emptied field with a placeholder takes the placeholder's value, e.g. the default radius.
  const resolve = (text) => (text === "" && field.placeholder ? field.placeholder : text);
  const valid = !free || isValid(field, resolve(draft));
  const unknown = !free && value !== "" && options.length > 0 && !options.some((o) => o.value === value);

  const close = () => {
    const closed = closedCombo(last.current);
    setOpen(closed.open);
    setTyped(closed.typed);
    setDraft(closed.draft);
  };
  const show = () => { setOpen(true); setActive(0); };
  const pick = (option) => {
    close();
    if (!option) return;
    last.current = option.value;
    setDraft(option.value);
    if (option.value !== value) onCommit(option.value);
  };
  const input = (e) => {
    const text = free ? reformat(e.currentTarget, (t) => formatField(field, t)) : e.currentTarget.value;
    setTyped(text);
    show();
    if (!free) return;
    setDraft(text);
    const effective = resolve(text);
    if (isValid(field, effective)) {
      last.current = effective;
      onCommit(effective);
    }
  };
  const keys = (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) { show(); return; }
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((a) => (matches.length ? (a + step + matches.length) % matches.length : 0));
    } else if (e.key === "Enter" && open && matches[active]) {
      e.preventDefault();
      pick(matches[active]);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation();
      close();
    }
  };

  return html`
    <div class="combo" ref=${root} onfocusout=${(e) => { if (!root.current.contains(e.relatedTarget)) close(); }}>
      <input role="combobox" aria-expanded=${open} aria-controls=${listId} aria-autocomplete="list" aria-label=${label}
        aria-activedescendant=${open && matches[active] ? `${listId}-${active}` : undefined}
        autocomplete="off" spellcheck=${false} class=${free ? "" : "mono"} aria-invalid=${!valid || unknown}
        value=${free ? draft : open ? typed ?? "" : value} placeholder=${free ? field.placeholder ?? "" : open ? value : ""}
        onFocus=${show} onInput=${input} onKeyDown=${keys} />
      ${open && matches.length > 0 && html`
        <${Overlay} fit gap=${2}>
        <ul class="combo-list" role="listbox" id=${listId}>
          ${matches.map((o, i) => html`
            <li key=${o.value} id=${`${listId}-${i}`} role="option" aria-selected=${o.value === value} data-active=${i === active}
              onMouseDown=${(e) => { e.preventDefault(); pick(o); }} onMouseEnter=${() => setActive(i)}>
              <span class="combo-id">${o.value}</span>
              <span class="combo-meta">${o.meta}</span>
            </li>`)}
        </ul>
        <//>`}
      ${open && matches.length === 0 && !free && html`<${Overlay} fit gap=${2}><ul class="combo-list" id=${listId}><li class="combo-empty">Nothing matches</li></ul><//>`}
      ${!valid && html`<small class="error">${EMPTY[field.type]}</small>`}
      ${unknown && html`<small class="error">${value} ${missing}.</small>`}
      ${note && html`<small class="error">${note}</small>`}
    </div>
  `;
}

// What an empty or unfinished field asks for; formatting has already removed everything else that could be wrong.
const EMPTY = {
  text: "Enter some text.",
  number: "Enter a number.",
  expr: "Enter a number or a name.",
  handle: "Enter a variable name.",
  name: "Enter a name.",
  function: "Choose a function from the mission's includes.",
};

/** One typed field. Typing is rewritten into the field's format; an empty or unfinished value is not saved. */
export function FieldInput({ field, value, onCommit }) {
  const { monitorIds, spots, constants, globals, functions, enums } = useContext(EditorContext);
  const [draft, setDraft] = useState(value);
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setDraft(value);
    }
  }, [value]);

  const choose = (e) => {
    last.current = e.currentTarget.value;
    onCommit(last.current);
  };
  if (field.type === "toggle") {
    // The row's own label wraps this input, so the checkbox needs none of its own.
    return html`<input type="checkbox" class="toggle" checked=${value === "true"} onChange=${(e) => { last.current = String(e.currentTarget.checked); onCommit(last.current); }} />`;
  }
  // A Sanny enum member is picked from the enum's list: a select, or a typeahead for a long list such as the map icons.
  if (field.enum && field.typeahead) return html`<${Combo} field=${field} value=${value} options=${enumOptions(enums[field.enum] ?? [])} label=${field.label} missing=${`is not a ${field.enum} member`} onCommit=${onCommit} />`;
  if (field.enum) {
    const members = enumOptions(enums[field.enum] ?? []).map((o) => o.value);
    const options = members.includes(value) ? members : [value, ...members];
    return html`<select value=${value} onChange=${choose}>${options.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}</select>`;
  }
  if (field.type === "spot") return html`<${Combo} field=${field} value=${value} options=${spotOptions(spots)} label="Spot" onCommit=${onCommit} />`;
  // A Call Function card names a function from the mission's includes, so only those are offered.
  if (field.type === "function") return html`<${Combo} field=${field} value=${value} options=${functionOptions(functions)} label=${field.label} missing="is not defined in this mission's includes" onCommit=${onCommit} />`;
  // A number or variable is typed freely; the list offers the project's constants (of the field's number type) or variables (of its type).
  if (field.type === "expr" || field.type === "handle") {
    const options = field.type === "handle" || !field.numeric ? globalOptions(globals, field.varType) : constantOptions(constants, field.numeric);
    return html`<${Combo} field=${field} value=${value} options=${options} free label=${field.label} note=${numberProblem(field, value, constants)} onCommit=${onCommit} />`;
  }
  if (field.type === "choice" || field.type === "latch") {
    const options = field.type === "choice" ? field.options : [...new Set([...monitorIds, value])];
    return html`<select value=${value} onChange=${choose}>${options.map((o) => html`<option key=${o} value=${o}>${field.labels?.[o] ?? o}</option>`)}</select>`;
  }

  // A bounded number is a number input, so the browser enforces `min` and `max` and offers the spinner.
  if (field.type === "number" && (field.min !== undefined || field.max !== undefined)) {
    const n = Number(draft);
    const inRange = isValid(field, draft) && (field.min === undefined || n >= field.min) && (field.max === undefined || n <= field.max);
    const bounded = (e) => {
      const text = e.currentTarget.value;
      const m = Number(text);
      setDraft(text);
      if (isValid(field, text) && (field.min === undefined || m >= field.min) && (field.max === undefined || m <= field.max)) {
        last.current = text;
        onCommit(text);
      }
    };
    const ask = field.min !== undefined && field.max !== undefined
      ? `from ${field.min} to ${field.max}`
      : field.min !== undefined ? `of ${field.min} or more` : `of ${field.max} or less`;
    return html`
      <input type="number" min=${field.min} max=${field.max} step="1" value=${draft} aria-invalid=${!inRange} onInput=${bounded} />
      ${!inRange && html`<small class="error">Enter a whole number ${ask}.</small>`}
    `;
  }

  const valid = isValid(field, draft);
  const input = (e) => {
    const text = reformat(e.currentTarget, (t) => formatField(field, t));
    setDraft(text);
    if (isValid(field, text)) {
      last.current = text;
      onCommit(text);
    }
  };
  return html`
    <input value=${draft} aria-invalid=${!valid} spellcheck=${field.type === "text"} onInput=${input} />
    ${!valid && html`<small class="error">${EMPTY[field.type]}</small>`}
  `;
}

/** A labelled number input for plain numbers outside the vocabulary, such as a beat's wait. */
export function NumberField({ label, value, onCommit }) {
  const field = { type: "number" };
  return html`<label class="mini"><span>${label}</span><${FieldInput} field=${field} value=${String(value ?? 0)} onCommit=${(text) => onCommit(Number(text))} /></label>`;
}

const CONTROL = "button, input, select, textarea, a, [role=combobox], [role=listbox], [role=option]";

/**
 * Drag to reorder one list of cards. A mouse or pen press on a card's title starts a drag at once. A touch lifts the
 * card after HOLD_MS, and a move of more than SLOP_PX before that leaves the touch to scroll the page. Escape, a
 * cancelled pointer, a tap elsewhere while a touch is held, or a drop outside the list's columns returns the card to
 * its slot. Alt+Up and Alt+Down move the focused card one place, wrapping at the ends. `items` is the list, and
 * `onChange` receives the reordered list.
 *
 * @remarks The other cards are measured once, at the press, and never again during the drag. A redraw after a reorder
 * can move the `.pane-body` scroll position, so `commit` restores it in a layout effect until the next frame, and a
 * keyboard move focuses its card with `preventScroll`. The drop line is centred in the gap, so a drop beside the
 * dragged card's own slot draws no line.
 */
export function useReorder({ items, onChange }) {
  const list = useRef(null);
  const session = useRef(null);
  const lifting = useRef(null);
  const timers = useRef({});
  const focusAt = useRef(null);
  const keep = useRef(null);
  const [shown, setShown] = useState(null);
  const [message, setMessage] = useState("");

  const show = (next) => {
    lifting.current = next;
    setShown(next);
  };
  const cancel = () => {
    clearTimeout(timers.current.hold);
    session.current = null;
    if (!lifting.current) return;
    show({ ...lifting.current, to: lifting.current.from, dy: 0, returning: true });
    clearTimeout(timers.current.settle);
    timers.current.settle = setTimeout(() => show(null), RETURN_MS);
  };

  // A reorder redraws the rows, which can move the pane's scroll position. The pane keeps the position it had when
  // the card moved, through every redraw until the next frame.
  const scroller = () => list.current?.closest(".pane-body") ?? null;
  const commit = (next) => {
    keep.current = scroller()?.scrollTop ?? null;
    requestAnimationFrame(() => { keep.current = null; });
    onChange(next);
  };
  useLayoutEffect(() => {
    if (keep.current === null) return;
    const pane = scroller();
    if (pane) pane.scrollTop = keep.current;
  });

  const press = (index) => (e) => {
    if (e.button !== 0 || e.target.closest(CONTROL)) return;
    const touch = e.pointerType === "touch";
    const box = list.current.getBoundingClientRect();
    const others = [...list.current.querySelectorAll(":scope > [data-index]")]
      .filter((card) => Number(card.dataset.index) !== index)
      .map((card) => {
        const { top, bottom } = card.getBoundingClientRect();
        return { top, bottom, mid: (top + bottom) / 2 };
      });
    const gap = parseFloat(getComputedStyle(list.current).rowGap) || 0;
    session.current = { pointerId: e.pointerId, from: index, startX: e.clientX, startY: e.clientY, touch, box, others, gap, handle: e.currentTarget };
    e.currentTarget.setPointerCapture(e.pointerId);
    clearTimeout(timers.current.settle);
    const resting = { from: index, to: index, dy: 0, inside: true, line: null };
    if (touch) timers.current.hold = setTimeout(() => show(resting), HOLD_MS);
    else show(resting);
  };

  const track = (e) => {
    const s = session.current;
    if (!s || e.pointerId !== s.pointerId) return;
    if (!lifting.current) {
      // A touch that moves before its hold ends is scrolling the page, not dragging a card.
      if (Math.hypot(e.clientX - s.startX, e.clientY - s.startY) > SLOP_PX) {
        clearTimeout(timers.current.hold);
        session.current = null;
      }
      return;
    }
    const y = clampY(e.clientY, s.box.top, s.box.bottom);
    const to = dropIndex(s.others.map((o) => o.mid), y);
    const inside = inColumn(e.clientX, s.box.left, s.box.right);
    const top = insertionTop(s.others, to, s.gap);
    show({ ...lifting.current, to, dy: y - s.startY, inside, line: inside && to !== s.from && top !== null ? top - s.box.top : null });
  };

  const release = (e) => {
    const s = session.current;
    if (!s || e.pointerId !== s.pointerId) return;
    clearTimeout(timers.current.hold);
    session.current = null;
    const at = lifting.current;
    if (!at) return;
    if (at.inside && at.to !== at.from) {
      show(null);
      setMessage(movedMessage(at.to + 1, items.length));
      commit(moveItem(items, at.from, at.to));
      return;
    }
    cancel();
  };

  const keys = (index) => (e) => {
    if (e.target !== e.currentTarget || !e.altKey || (e.key !== "ArrowUp" && e.key !== "ArrowDown")) return;
    e.preventDefault();
    const to = wrapIndex(index, e.key === "ArrowUp" ? -1 : 1, items.length);
    if (to === index) return;
    focusAt.current = to;
    setMessage(movedMessage(to + 1, items.length));
    commit(moveItem(items, index, to));
  };

  // The card that moved keeps the keyboard focus, even though its row is drawn again in its new place.
  useEffect(() => {
    if (focusAt.current === null) return;
    list.current?.querySelector(`[data-index="${focusAt.current}"]`)?.focus({ preventScroll: true });
    focusAt.current = null;
  });

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && session.current) cancel();
    };
    const onTap = (e) => {
      const s = session.current;
      if (s?.touch && !s.handle.contains(e.target)) cancel();
    };
    globalThis.addEventListener("keydown", onKey);
    globalThis.addEventListener("pointerdown", onTap, true);
    return () => {
      globalThis.removeEventListener("keydown", onKey);
      globalThis.removeEventListener("pointerdown", onTap, true);
      clearTimeout(timers.current.hold);
      clearTimeout(timers.current.settle);
    };
  }, []);

  return {
    list,
    message,
    line: shown?.line ?? null,
    lift: (index) => (shown?.from === index ? shown : null),
    item: (index) => ({
      card: { "data-index": index, tabIndex: 0, onKeyDown: keys(index) },
      grip: {
        onPointerDown: press(index),
        onPointerMove: track,
        onPointerUp: release,
        onPointerCancel: cancel,
        // A lifted card holds the page still while it is dragged.
        onTouchMove: (e) => {
          if (lifting.current) e.preventDefault();
        },
      },
    }),
  };
}

/** A card's title: the six-dots grip when the card can be dragged, then its name. */
export function CardTitle({ label, grip = null }) {
  return html`
    <hgroup class=${grip ? "item-title draggable" : "item-title"} onPointerDown=${grip?.onPointerDown} onPointerMove=${grip?.onPointerMove}
      onPointerUp=${grip?.onPointerUp} onPointerCancel=${grip?.onPointerCancel} onTouchMove=${grip?.onTouchMove}>
      ${grip && html`<span class="grip" aria-hidden="true"><${GripIcon} /></span>`}
      <h4 class="item-label">${label}</h4>
    </hgroup>
  `;
}

function Row({ item, kind, n, onChange, onRemove, reorder, lift }) {
  const { steps, conds, monitorIds, spots, globals } = useContext(EditorContext);
  const [sanny, setSanny] = useState(false);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  const isCond = kind === "cond";
  const noun = isCond ? "condition" : "step";
  const parsed = isCond ? parseCond(conds, item) : parseLines(steps, item);
  const when = isCond || parsed ? null : parseWhen(steps, conds, item);
  const raw = sanny || (!parsed && !when);
  const setWhen = (patch) => onChange(buildWhen({ ...when, ...patch }));
  const hasSanny = !isCond && item.some((line) => line.trim() !== "");
  const card = reorder?.card ?? {};
  const grip = reorder?.grip ?? null;

  useEffect(() => () => clearTimeout(copyTimer.current), []);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(item.join("\n"));
    } catch {
      return;
    }
    setCopied(true);
    clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 3000);
  };

  const setValue = (name) => (text) => {
    const values = { ...parsed.values, [name]: text };
    onChange(isCond ? buildCond(parsed.descriptor, values, item.hidden) : buildLines(parsed.descriptor, values));
  };
  // A paired card (2D or 3D) keeps the values its other mode cannot hold, so switching back restores them.
  const switchMode = (mode) => {
    if (parsed.descriptor.mode === mode) return;
    const next = flipMode(conds, parsed.descriptor, parsed.values, item.hidden ?? {}, { monitorIds, spotIds: spots.map((s) => s.id), globals });
    onChange(buildCond(next.descriptor, next.values, next.hidden));
  };
  // A card with a "Shown" checkbox becomes its partner card (Add Blip <-> Remove Blip) when it is flipped.
  const remembered = useRef({});
  const flip = () => {
    const next = flipShown(steps, parsed.descriptor, parsed.values, remembered.current, { monitorIds, spotIds: spots.map((s) => s.id), globals });
    remembered.current = next.remembered;
    onChange(buildLines(next.descriptor, next.values));
  };

  const copyTitle = !hasSanny ? "No Sanny to copy" : copied ? "Copied to clipboard" : "Copy as Sanny Builder";
  const paired = isCond && parsed && pairOf(conds, parsed.descriptor) && !raw;
  const rowClass = ["item", lift && !lift.returning && "lifted", lift?.returning && "returning"].filter(Boolean).join(" ");

  return html`
    <li class=${rowClass} style=${lift ? { transform: `translateY(${lift.dy}px)` } : undefined} data-index=${card["data-index"]} tabIndex=${card.tabIndex} onKeyDown=${card.onKeyDown}>
      <div class="item-head">
        <${CardTitle} label=${parsed ? parsed.descriptor.label : when ? "Conditional Steps" : "Custom Sanny"} grip=${grip} />
        <span class="item-tools">
          ${paired && html`
            <div class="mode-switch" data-variant="compact" role="group" aria-label="Card Mode">
              ${["2D", "3D"].map((mode) => html`<button class=${parsed.descriptor.mode === mode ? "mode-btn active" : "mode-btn"} key=${mode} aria-pressed=${parsed.descriptor.mode === mode} onClick=${() => switchMode(mode)}>${mode}</button>`)}
            </div>`}
          ${(parsed || when) && html`<button class="tool icon-only" title=${sanny ? "Show Typed Controls" : "Edit As Sanny"} aria-label=${sanny ? "Show Typed Controls" : `Edit this ${noun} as Sanny Builder`} onClick=${() => setSanny(!sanny)}><${SannyEditIcon} /></button>`}
          ${!isCond && html`
            <button class=${copied ? "tool icon-only copied" : "tool icon-only"} aria-label="Copy Step Sanny" title=${copyTitle} disabled=${!hasSanny} onClick=${copy}>
              ${copied ? html`<${CheckIcon} />` : html`<${CopyIcon} />`}
            </button>`}
          <button class="tool danger icon-only" aria-label=${`Remove ${noun} ${n}`} title=${`Remove ${isCond ? "Condition" : "Step"}`} onClick=${onRemove}>✕</button>
        </span>
      </div>
      ${raw
        ? isCond
          ? html`<input class="mono" value=${item.test} spellcheck=${false} aria-label="Sanny Condition" onInput=${(e) => onChange({ ...item, test: e.currentTarget.value })} />`
          : html`<textarea class="mono" rows=${Math.max(1, item.length)} spellcheck=${false} aria-label="Sanny Lines" value=${item.join("\n")} onInput=${(e) => onChange(e.currentTarget.value.split("\n"))}></textarea>`
        : when ? html`
          <div class="typed-list">
            <p class="hint">When all of these hold:</p>
            <${CondList} conds=${when.conds} emptyText="Add a condition, or the steps below never run." onChange=${(c) => setWhen({ conds: c })} />
            <p class="hint">Then</p>
            <${StepList} steps=${when.then} emptyText="Nothing runs yet." onChange=${(list) => setWhen({ then: list })} />
            <p class="hint">Otherwise</p>
            <${StepList} steps=${when.otherwise} emptyText="Nothing runs otherwise." onChange=${(list) => setWhen({ otherwise: list })} />
          </div>`
        : (parsed.descriptor.fields.length > 0 || parsed.descriptor.shown) && html`
          <div class="fields">
            ${parsed.descriptor.shown && html`
              <label class="mini"><span>${parsed.descriptor.shown.label ?? "Shown"}</span><input type="checkbox" class="toggle" checked=${parsed.descriptor.shown.on} onChange=${flip} /></label>`}
            ${parsed.descriptor.fields.map((f) => html`
              <label class="mini" key=${f.name}><span>${f.label}</span><${FieldInput} field=${f} value=${parsed.values[f.name]} onCommit=${setValue(f.name)} /></label>
            `)}
          </div>`}
    </li>
  `;
}

function TypedList({ items, kind, onChange, addLabel, emptyText }) {
  const { steps, conds, monitorIds, spots, globals, functions } = useContext(EditorContext);
  const spotIds = spots.map((s) => s.id);
  const descriptors = kind === "cond" ? conds : steps;
  // Rows keep a "Sanny" toggle of their own; a new generation remounts them after a removal or move.
  const [generation, setGeneration] = useState(0);
  const groups = [...new Set(descriptors.map((d) => d.group))].sort((a, b) => a.localeCompare(b));
  const reorder = useReorder({ items, onChange: (next) => { setGeneration(generation + 1); onChange(next); } });

  const add = (name) => {
    if (!name) return;
    const descriptor = descriptors.find((d) => d.name === name);
    const blank = kind === "cond" ? { test: "" } : [""];
    const first = conds[0];
    const when = buildWhen({ conds: first ? [buildCond(first, defaults(first, monitorIds, spotIds, globals, functions))] : [], then: [], otherwise: [] });
    const fresh = name === "__when" ? when : !descriptor ? blank : kind === "cond" ? buildCond(descriptor, defaults(descriptor, monitorIds, spotIds, globals, functions)) : buildLines(descriptor, defaults(descriptor, monitorIds, spotIds, globals, functions));
    onChange([...items, fresh]);
  };
  const replace = (i) => (next) => onChange(items.map((item, j) => (j === i ? next : item)));
  const remove = (i) => () => {
    setGeneration(generation + 1);
    onChange(items.filter((_, j) => j !== i));
  };
  // TODO: Add a "JavaScript/TypeScript" item for CLEO JS scripts beside Sanny Builder.
  return html`
    <div class="typed-list">
      ${items.length === 0 && html`<p class="hint">${emptyText}</p>`}
      ${items.length > 0 && html`
        <ul class="items reorder" ref=${reorder.list} aria-label=${kind === "cond" ? "Conditions" : "Steps"}>
          ${items.map((item, i) => html`<${Row} key=${`${generation}-${i}`} item=${item} kind=${kind} n=${i + 1} onChange=${replace(i)} onRemove=${remove(i)} reorder=${reorder.item(i)} lift=${reorder.lift(i)} />`)}
          ${reorder.line !== null && html`<li class="drop-line" role="presentation" aria-hidden="true" style=${{ top: `${reorder.line}px` }}></li>`}
        </ul>
        <p class="sr-only" role="status" aria-live="polite">${reorder.message}</p>`}
      <select class="add" aria-label=${addLabel} value="" onChange=${(e) => { const name = e.currentTarget.value; e.currentTarget.value = ""; add(name); }}>
        <option value="">${addLabel}</option>
        ${kind === "step" && html`<option value="__when">If / Then / Else</option>`}
        ${groups.map((group) => html`
          <optgroup key=${group} label=${group}>
            ${descriptors.filter((d) => d.group === group && d.shown?.on !== false && d.mode !== "2D").map((d) => html`<option key=${d.name} value=${d.name}>${d.label}</option>`)}
          </optgroup>`)}
        <option value="__sanny">Custom Sanny</option>
      </select>
    </div>
  `;
}

/** A list of steps, each a typed control when the vocabulary knows it and Sanny lines when not. */
export function StepList({ steps, onChange, emptyText = "No steps." }) {
  return html`<${TypedList} items=${steps} kind="step" onChange=${onChange} addLabel="Add Step" emptyText=${emptyText} />`;
}

/** A list of conditions, all of which must hold. */
export function CondList({ conds, onChange, emptyText = "No conditions." }) {
  return html`<${TypedList} items=${conds} kind="cond" onChange=${onChange} addLabel="Add Condition" emptyText=${emptyText} />`;
}
