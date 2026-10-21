// deno-fmt-ignore-file
// The formatter indents htm templates by nesting depth and breaks the `<//>` closers, so this file is left as written.

import { createContext, html, useContext, useEffect, useRef, useState } from "/vendor/preact.js";
import { buildCond, buildLines, defaults, formatField, isValid, parseCond, parseLines, reformat } from "./templates.js";

/** The vocabulary (`steps`, `conds`) and the open mission's monitor ids, which the latch fields offer. */
export const EditorContext = createContext({ steps: [], conds: [], monitorIds: [] });

/** One typed field. Typing is rewritten into the field's format; an empty or unfinished value is not saved. */
export function FieldInput({ field, value, onCommit }) {
  const { monitorIds } = useContext(EditorContext);
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
  if (field.type === "choice" || field.type === "latch") {
    const options = field.type === "choice" ? field.options : [...new Set([...monitorIds, value])];
    return html`<select value=${value} onChange=${choose}>${options.map((o) => html`<option key=${o} value=${o}>${o}</option>`)}</select>`;
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
    ${!valid && html`<small class="error">Enter a value.</small>`}
  `;
}

/** A labelled number input for plain numbers outside the vocabulary, such as a beat's wait. */
export function NumberField({ label, value, onCommit }) {
  const field = { type: "number" };
  return html`<label class="mini"><span>${label}</span><${FieldInput} field=${field} value=${String(value ?? 0)} onCommit=${(text) => onCommit(Number(text))} /></label>`;
}

function Row({ item, kind, onChange, onRemove, onMove }) {
  const { steps, conds } = useContext(EditorContext);
  const [sanny, setSanny] = useState(false);
  const isCond = kind === "cond";
  const parsed = isCond ? parseCond(conds, item) : parseLines(steps, item);
  const raw = sanny || !parsed;

  const setValue = (name) => (text) => {
    const values = { ...parsed.values, [name]: text };
    onChange(isCond ? { ...item, ...buildCond(parsed.descriptor, values) } : buildLines(parsed.descriptor, values));
  };

  return html`
    <li class="item">
      <div class="item-head">
        <span class="item-label">${parsed ? parsed.descriptor.label : "Sanny Lines"}</span>
        <span class="item-tools">
          ${parsed && html`<button class="tool" aria-pressed=${sanny} title="Edit As Sanny" onClick=${() => setSanny(!sanny)}>Sanny</button>`}
          <button class="tool" aria-label="Move Up" title="Move Up" onClick=${() => onMove(-1)}>↑</button>
          <button class="tool" aria-label="Move Down" title="Move Down" onClick=${() => onMove(1)}>↓</button>
          <button class="tool danger" aria-label="Remove" title="Remove" onClick=${onRemove}>✕</button>
        </span>
      </div>
      ${raw
        ? isCond
          ? html`<input class="mono" value=${item.test} spellcheck=${false} aria-label="Sanny Condition" onInput=${(e) => onChange({ ...item, test: e.currentTarget.value })} />`
          : html`<textarea class="mono" rows=${Math.max(1, item.length)} spellcheck=${false} aria-label="Sanny Lines" value=${item.join("\n")} onInput=${(e) => onChange(e.currentTarget.value.split("\n"))}></textarea>`
        : parsed.descriptor.fields.length > 0 && html`
          <div class="fields">
            ${parsed.descriptor.fields.map((f) => html`
              <label class="mini" key=${f.name}><span>${f.label}</span><${FieldInput} field=${f} value=${parsed.values[f.name]} onCommit=${setValue(f.name)} /></label>
            `)}
          </div>`}
    </li>
  `;
}

function TypedList({ items, kind, onChange, addLabel, emptyText }) {
  const { steps, conds, monitorIds } = useContext(EditorContext);
  const descriptors = kind === "cond" ? conds : steps;
  // Rows keep a "Sanny" toggle of their own; a new generation remounts them after a removal or move.
  const [generation, setGeneration] = useState(0);
  const groups = [...new Set(descriptors.map((d) => d.group))];

  const add = (e) => {
    const name = e.currentTarget.value;
    e.currentTarget.value = "";
    if (!name) return;
    const descriptor = descriptors.find((d) => d.name === name);
    const blank = kind === "cond" ? { test: "" } : [""];
    const fresh = !descriptor ? blank : kind === "cond" ? buildCond(descriptor, defaults(descriptor, monitorIds)) : buildLines(descriptor, defaults(descriptor, monitorIds));
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
          ${items.map((item, i) => html`<${Row} key=${`${generation}-${i}`} item=${item} kind=${kind} onChange=${replace(i)} onRemove=${remove(i)} onMove=${move(i)} />`)}
        </ul>`}
      <select class="add" aria-label=${addLabel} value="" onChange=${add}>
        <option value="">${addLabel}</option>
        ${groups.map((group) => html`
          <optgroup key=${group} label=${group}>
            ${descriptors.filter((d) => d.group === group).map((d) => html`<option key=${d.name} value=${d.name}>${d.label}</option>`)}
          </optgroup>`)}
        <option value="__sanny">Sanny Lines</option>
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
