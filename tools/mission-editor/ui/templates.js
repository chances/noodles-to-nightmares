// Builds Sanny lines from a vocabulary descriptor and reads them back. A descriptor's `lines` hold `{field}`
// slots (see lib/fsm/descriptors.ts). Plain JavaScript because the browser loads it; the editor tests import it too.

const SLOT = /\{(\w+)\}/g;

// What each field type may hold. A `choice` takes its descriptor's options.
const PATTERNS = {
  text: '[^"\\n]*',
  number: "\\d+",
  expr: "-?\\d+(?:\\.\\d+)?|[A-Za-z_$][\\w$]*",
  handle: "\\$\\w+",
  name: "\\w+",
  latch: "[A-Z]\\w*",
};

const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The regular expression source a value of `field` must match entirely. */
export function fieldPattern(field) {
  return field.type === "choice"
    ? field.options.map(escape).join("|")
    : PATTERNS[field.type];
}

/** `go home` becomes `GO_HOME`: capitals, digits, and single underscores, starting with a letter. */
export function formatName(text) {
  return text.toUpperCase().replace(/[\s-]+/g, "_").replace(/[^A-Z0-9_]/g, "")
    .replace(/_{2,}/g, "_").replace(/^[^A-Z]+/, "");
}

/** A plain number: an optional leading minus, digits, and at most one dot. */
export function formatNumber(text) {
  const cleaned = text.replace(/[^\d.-]/g, "");
  const negative = cleaned.startsWith("-");
  const [whole, ...rest] = cleaned.replace(/-/g, "").split(".");
  return (negative ? "-" : "") + whole +
    (rest.length ? "." + rest.join("") : "");
}

// What a user types is rewritten into the field's format, so no rule needs printing under it.
const FORMATS = {
  text: (text) => text.replace(/["\n]/g, ""),
  number: (text) => text.replace(/\D/g, "").replace(/^0+(?=\d)/, ""),
  expr: (text) => text.replace(/[^A-Za-z0-9_$.-]/g, ""),
  handle: (text) => "$" + text.replace(/[^\w]/g, ""),
  name: (text) => text.replace(/\s+/g, "_").replace(/[^\w]/g, ""),
};

/** `text` rewritten into the format of `field`; selects and latches hold only their own options. */
export function formatField(field, text) {
  return FORMATS[field.type]?.(text) ?? text;
}

/**
 * Rewrites an input's text with `format` while keeping the caret after the same typed characters.
 * Returns the formatted text.
 */
export function reformat(input, format) {
  const text = input.value;
  const caret = input.selectionStart ?? text.length;
  const formatted = format(text);
  if (formatted !== text) {
    const kept = format(text.slice(0, caret)).length;
    input.value = formatted;
    input.setSelectionRange(kept, kept);
  }
  return formatted;
}

/** Whether `text` is a legal value for `field`. */
export function isValid(field, text) {
  return new RegExp(`^(?:${fieldPattern(field)})$`).test(text);
}

// Latch fields hold the monitor id (`driveHint`) and appear in Sanny as `latchDriveHint`.
const toSanny = (field, value) =>
  field.type === "latch"
    ? value.charAt(0).toUpperCase() + value.slice(1)
    : value;
const fromSanny = (field, value) =>
  field.type === "latch"
    ? value.charAt(0).toLowerCase() + value.slice(1)
    : value;

/** A descriptor's field values at their defaults. */
export function defaults(descriptor, monitorIds = []) {
  return Object.fromEntries(
    descriptor.fields.map((
      f,
    ) => [
      f.name,
      f.type === "latch" ? monitorIds[0] ?? "monitor" : f.default ?? "",
    ]),
  );
}

/** The descriptor's Sanny lines with `values` filled in. */
export function buildLines(descriptor, values) {
  const field = (name) => descriptor.fields.find((f) => f.name === name);
  return descriptor.lines.map((line) =>
    line.replace(SLOT, (_, name) => toSanny(field(name), values[name]))
  );
}

const compiled = new WeakMap();

function matcher(descriptor) {
  if (compiled.has(descriptor)) return compiled.get(descriptor);
  const seen = new Set();
  const source = descriptor.lines.map((line) => {
    let out = "";
    let last = 0;
    for (const m of line.matchAll(SLOT)) {
      out += escape(line.slice(last, m.index));
      const field = descriptor.fields.find((f) => f.name === m[1]);
      // A field used twice must repeat the same text.
      out += seen.has(m[1])
        ? `\\k<${m[1]}>`
        : `(?<${m[1]}>${fieldPattern(field)})`;
      seen.add(m[1]);
      last = m.index + m[0].length;
    }
    return out + escape(line.slice(last));
  }).join("\\n");
  const regex = new RegExp(`^${source}$`);
  compiled.set(descriptor, regex);
  return regex;
}

/** The first descriptor whose lines these are, as `{ descriptor, values }`, or null for lines it does not know. */
export function parseLines(descriptors, lines) {
  const text = lines.join("\n");
  for (const descriptor of descriptors) {
    const m = matcher(descriptor).exec(text);
    if (!m) continue;
    const values = Object.fromEntries(
      descriptor.fields.map((f) => [f.name, fromSanny(f, m.groups[f.name])]),
    );
    return { descriptor, values };
  }
  return null;
}

const INDENT = "  ";

/**
 * Splits flat Sanny lines back into steps. A known step (or a conditional, from its `if` to its `end`) is one
 * step; any other line is a step of its own. Joining the result gives the same lines.
 */
export function splitSteps(steps, conds, lines) {
  const longest = Math.max(1, ...steps.map((d) => d.lines.length));
  const out = [];
  let i = 0;
  while (i < lines.length) {
    // Nested blocks are indented, so the first unindented `end` closes this `if`.
    const end = /^if( and)?$/.test(lines[i]) ? lines.indexOf("end", i) : -1;
    const block = end === -1 ? null : lines.slice(i, end + 1);
    if (block && parseWhen(steps, conds, block)) {
      out.push(block);
      i = end + 1;
      continue;
    }
    let size = longest;
    while (
      size > 1 &&
      !(i + size <= lines.length && parseLines(steps, lines.slice(i, i + size)))
    ) size--;
    out.push(lines.slice(i, i + size));
    i += size;
  }
  return out;
}

/**
 * A conditional step as `{ conds, then, otherwise }`, or null for lines that are not one the editor wrote.
 * Condition `pre` lines come before the `if`, and the bodies are indented under `then` and `else`.
 */
export function parseWhen(steps, conds, lines) {
  if (lines.at(-1) !== "end") return null;
  const ifAt = lines.findIndex((l) => /^if( and)?$/.test(l));
  const thenAt = lines.indexOf("then");
  if (ifAt === -1 || thenAt < ifAt) return null;
  const elseAt = lines.indexOf("else", thenAt);
  const tests = lines.slice(ifAt + 1, thenAt);
  if ((lines[ifAt] === "if") !== (tests.length === 1)) return null;
  if (!tests.every((t) => t.startsWith(INDENT))) return null;

  const pre = lines.slice(0, ifAt);
  const parsed = [];
  let used = 0;
  for (const raw of tests) {
    const test = raw.slice(INDENT.length);
    const candidates = conds.filter((d) =>
      !d.pre || same(d.pre, pre.slice(used, used + d.pre.length))
    );
    const found = parseLines(candidates, [test]);
    if (found?.descriptor.pre) used += found.descriptor.pre.length;
    parsed.push(found ? buildCond(found.descriptor, found.values) : { test });
  }
  if (used !== pre.length) return null;

  const body = (from, to) => {
    const part = lines.slice(from, to);
    return part.every((l) => !l || l.startsWith(INDENT))
      ? splitSteps(steps, conds, part.map((l) => l.slice(INDENT.length)))
      : null;
  };
  const then = body(thenAt + 1, elseAt === -1 ? lines.length - 1 : elseAt);
  const otherwise = elseAt === -1 ? [] : body(elseAt + 1, lines.length - 1);
  return then && otherwise ? { conds: parsed, then, otherwise } : null;
}

/** The Sanny lines of a conditional step; the inverse of `parseWhen`. */
export function buildWhen({ conds, then, otherwise }) {
  const body = (list) => list.flat().map((l) => (l ? INDENT + l : l));
  return [
    ...conds.flatMap((c) => c.pre ?? []),
    conds.length === 1 ? "if" : "if and",
    ...conds.map((c) => INDENT + c.test),
    "then",
    ...body(then),
    ...(otherwise.length ? ["else", ...body(otherwise)] : []),
    "end",
  ];
}

const same = (a = [], b = []) =>
  a.length === b.length && a.every((line, i) => line === b[i]);

/** A condition (`{ pre?, test, locals? }`) built from a descriptor. */
export function buildCond(descriptor, values) {
  const cond = { test: buildLines(descriptor, values)[0] };
  if (descriptor.pre) cond.pre = [...descriptor.pre];
  if (descriptor.locals) cond.locals = [...descriptor.locals];
  return cond;
}

/** Like `parseLines`, for a condition; its `pre` lines and `locals` must be the descriptor's too. */
export function parseCond(descriptors, cond) {
  const found = parseLines(
    descriptors.filter((d) =>
      same(d.pre, cond.pre) && same(d.locals, cond.locals)
    ),
    [cond.test],
  );
  return found;
}
