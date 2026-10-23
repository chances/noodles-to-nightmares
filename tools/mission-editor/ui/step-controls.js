// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { createContext, html, useContext, useEffect, useRef, useState } from "/vendor/preact.js";
import { Overlay } from "./overlay.js";
import { SplitButton } from "./split-button.js";
import { buildCond, buildLines, buildWhen, closedCombo, constantOptions, defaults, enumOptions, filterOptions, flipShown, formatField, globalOptions, isValid, numberProblem, parseCond, parseLines, parseWhen, reformat, spotOptions } from "./templates.js";

/** The vocabulary (`steps`, `conds`), the geography `spots`, and the open mission's monitor ids, which the latch fields offer. */
export const EditorContext = createContext({ steps: [], conds: [], spots: [], enums: {}, constants: [], globals: [], monitorIds: [], sannyFiles: [] });

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
};

/** One typed field. Typing is rewritten into the field's format; an empty or unfinished value is not saved. */
export function FieldInput({ field, value, onCommit }) {
  const { monitorIds, spots, constants, globals, enums } = useContext(EditorContext);
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
  // A Sanny enum member (a map icon) is picked from the enum's list.
  if (field.enum) return html`<${Combo} field=${field} value=${value} options=${enumOptions(enums[field.enum] ?? [])} label=${field.label} missing=${`is not a ${field.enum} member`} onCommit=${onCommit} />`;
  if (field.type === "spot") return html`<${Combo} field=${field} value=${value} options=${spotOptions(spots)} label="Spot" onCommit=${onCommit} />`;
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

function Row({ item, kind, n, onChange, onRemove, onMove }) {
  const { steps, conds, monitorIds, spots, globals } = useContext(EditorContext);
  const [sanny, setSanny] = useState(false);
  const isCond = kind === "cond";
  const noun = isCond ? "condition" : "step";
  const parsed = isCond ? parseCond(conds, item) : parseLines(steps, item);
  const when = isCond || parsed ? null : parseWhen(steps, conds, item);
  const raw = sanny || (!parsed && !when);
  const setWhen = (patch) => onChange(buildWhen({ ...when, ...patch }));

  const setValue = (name) => (text) => {
    const values = { ...parsed.values, [name]: text };
    onChange(isCond ? { ...item, ...buildCond(parsed.descriptor, values) } : buildLines(parsed.descriptor, values));
  };
  // A card with a "Shown" checkbox becomes its partner card (Add Blip <-> Remove Blip) when it is flipped.
  const remembered = useRef({});
  const flip = () => {
    const next = flipShown(steps, parsed.descriptor, parsed.values, remembered.current, { monitorIds, spotIds: spots.map((s) => s.id), globals });
    remembered.current = next.remembered;
    onChange(buildLines(next.descriptor, next.values));
  };

  return html`
    <li class="item">
      <div class="item-head">
        <span class="item-label">${parsed ? parsed.descriptor.label : when ? "Conditional Steps" : "Custom Sanny"}</span>
        <span class="item-tools">
          ${(parsed || when) && html`<button class="tool" title=${sanny ? "Show Typed Controls" : "Edit As Sanny"} onClick=${() => setSanny(!sanny)}>${sanny ? "Show Controls" : "Edit As Sanny"}</button>`}
          <button class="tool" aria-label=${`Move ${noun} ${n} up`} title="Move Up" onClick=${() => onMove(-1)}>↑</button>
          <button class="tool" aria-label=${`Move ${noun} ${n} down`} title="Move Down" onClick=${() => onMove(1)}>↓</button>
          <button class="tool danger" aria-label=${`Remove ${noun} ${n}`} title=${`Remove ${isCond ? "Condition" : "Step"}`} onClick=${onRemove}>✕</button>
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
              <label class="mini"><span>Shown</span><input type="checkbox" class="toggle" checked=${parsed.descriptor.shown.on} onChange=${flip} /></label>`}
            ${parsed.descriptor.fields.map((f) => html`
              <label class="mini" key=${f.name}><span>${f.label}</span><${FieldInput} field=${f} value=${parsed.values[f.name]} onCommit=${setValue(f.name)} /></label>
            `)}
          </div>`}
    </li>
  `;
}

function TypedList({ items, kind, onChange, addLabel, emptyText }) {
  const { steps, conds, monitorIds, spots, globals } = useContext(EditorContext);
  const spotIds = spots.map((s) => s.id);
  const descriptors = kind === "cond" ? conds : steps;
  // Rows keep a "Sanny" toggle of their own; a new generation remounts them after a removal or move.
  const [generation, setGeneration] = useState(0);
  const groups = [...new Set(descriptors.map((d) => d.group))];

  const add = (name) => {
    if (!name) return;
    const descriptor = descriptors.find((d) => d.name === name);
    const blank = kind === "cond" ? { test: "" } : [""];
    const first = conds[0];
    const when = buildWhen({ conds: first ? [buildCond(first, defaults(first, monitorIds, spotIds, globals))] : [], then: [], otherwise: [] });
    const fresh = name === "__when" ? when : !descriptor ? blank : kind === "cond" ? buildCond(descriptor, defaults(descriptor, monitorIds, spotIds, globals)) : buildLines(descriptor, defaults(descriptor, monitorIds, spotIds, globals));
    onChange([...items, fresh]);
  };
  const replace = (i) => (next) => onChange(items.map((item, j) => (j === i ? next : item)));
  const remove = (i) => () => {
    setGeneration(generation + 1);
    onChange(items.filter((_, j) => j !== i));
  };
  const move = (i) => (by) => {
    const to = i + by;
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    [next[i], next[to]] = [next[to], next[i]];
    setGeneration(generation + 1);
    onChange(next);
  };

  return html`
    <div class="typed-list">
      ${items.length === 0 && html`<p class="hint">${emptyText}</p>`}
      ${items.length > 0 && html`
        <ul class="items">
          ${items.map((item, i) => html`<${Row} key=${`${generation}-${i}`} item=${item} kind=${kind} n=${i + 1} onChange=${replace(i)} onRemove=${remove(i)} onMove=${move(i)} />`)}
        </ul>`}
      ${kind === "step"
        // Most steps are an if/then/else, so the button adds one and the menu holds everything else.
        ? html`<${SplitButton} label="Add Condition" title="Add Condition" ariaLabel="Add a conditional step to this list" onMain=${() => add("__when")}
            menuTitle="More Steps" menuAriaLabel="Choose a step to add" onPick=${add}
            groups=${[
              ...groups.map((group) => ({ heading: group, items: descriptors.filter((d) => d.group === group && d.shown?.on !== false).map((d) => ({ value: d.name, label: d.label })) })),
              // TODO: Add a "JavaScript/TypeScript" item for CLEO JS scripts beside Sanny Builder.
              { heading: "Custom", items: [{ value: "__sanny", label: "Sanny Builder" }] },
            ]} />`
        : html`
          <select class="add" aria-label=${addLabel} value="" onChange=${(e) => { const name = e.currentTarget.value; e.currentTarget.value = ""; add(name); }}>
            <option value="">${addLabel}</option>
            ${groups.map((group) => html`
              <optgroup key=${group} label=${group}>
                ${descriptors.filter((d) => d.group === group && d.shown?.on !== false).map((d) => html`<option key=${d.name} value=${d.name}>${d.label}</option>`)}
              </optgroup>`)}
            <option value="__sanny">Custom Sanny</option>
          </select>`}
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
