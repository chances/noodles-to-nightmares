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
  // A POI id; its `_X`, `_Y`, and `_Z` follow in the line, so this must give them back when it backtracks.
  spot: "[A-Z][A-Z0-9_]*",
  toggle: "true|false",
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
  spot: (text) => text.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
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

/**
 * The typeahead options for a field: `{ value, meta, search }`, where `search` is the text a typed query is
 * matched against. Spots match on id, group, category, district, and tags.
 */
export function spotOptions(spots) {
  return spots.map((s) => ({
    value: s.id,
    meta: [s.group, s.category].filter(Boolean).join(" · "),
    search: [s.id, s.group, s.category, s.district, ...(s.tags ?? [])]
      .filter(Boolean).join(" "),
  }));
}

/**
 * The values a card with a "Shown" checkbox takes when the box is flipped: its partner descriptor, with the
 * fields both share carried over. `remembered` holds every value the card has had, so flipping back restores
 * what the other form could not hold (a removed blip has no spot). Returns `{ descriptor, values, remembered }`.
 */
export function flipShown(steps, descriptor, values, remembered, context) {
  const partner = steps.find((d) => d.name === descriptor.shown.partner);
  const kept = { ...remembered, ...values };
  const fresh = defaults(
    partner,
    context.monitorIds,
    context.spotIds,
    context.globals,
  );
  return {
    descriptor: partner,
    values: Object.fromEntries(
      partner.fields.map((f) => [f.name, kept[f.name] ?? fresh[f.name]]),
    ),
    remembered: kept,
  };
}

/** The members of a Sanny enum as options, with each member's numeric id as its meta. */
export function enumOptions(members) {
  return members.map((m) => ({
    value: m.name,
    meta: `id ${m.id}`,
    search: `${m.name} ${m.id}`,
  }));
}

/** The constants a field with this `numeric` type can take: only those written as that type. */
export function constantOptions(constants, numeric) {
  return constants
    .filter((c) => !numeric || c.kind === numeric)
    .map((c) => ({
      value: c.name,
      meta: [c.kind ?? "expression", c.value, c.comment, c.source].filter(
        Boolean,
      ).join(" · "),
      search: [c.name, c.value, c.comment, c.source].filter(Boolean).join(" "),
    }));
}

/** The global variables a field can take, only those declared as `varType` when the field names one. */
export function globalOptions(globals, varType) {
  return globals
    .filter((g) => !varType || g.type === varType)
    .map((g) => ({
      value: g.name,
      meta: g.type ?? "",
      search: [g.name, g.type].filter(Boolean).join(" "),
    }));
}

/**
 * What a typeahead shows once it loses focus or is dismissed: the list closed, the typed query gone, and the field
 * back on the value last committed, so an unfinished or rejected entry never lingers.
 */
export function closedCombo(committed) {
  return { open: false, typed: null, draft: committed };
}

/** The options whose `search` text holds every word of `query`, in their given order. */
export function filterOptions(options, query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  return options.filter((o) =>
    words.every((w) => (o.search ?? o.value).toLowerCase().includes(w))
  );
}

/**
 * What is wrong with a number typed into a `numeric` field, or "": an int where a float belongs and the other
 * way round. A name is looked up in `constants`. Mirrors `numberMismatches` in lib/fsm/numeric.ts.
 */
export function numberProblem(field, text, constants = []) {
  if (!field.numeric) return "";
  const literal = /^-?\d+$/.test(text)
    ? "int"
    : /^-?\d+\.\d+$/.test(text)
    ? "float"
    : undefined;
  const found = literal ?? constants.find((c) => c.name === text)?.kind;
  if (!found || found === field.numeric) return "";
  const noun = found === "int" ? "an int" : "a float";
  if (field.numeric === "int") return `${text} is ${noun}; use a whole number.`;
  return literal
    ? `${text} is ${noun}; write ${text}.0.`
    : `${text} is ${noun} constant; declare it with a decimal point.`;
}

/**
 * A descriptor's field values at their defaults. A latch field starts on the first monitor and a spot field on its
 * default spot when the catalog has it, else on the catalog's first spot.
 */
export function defaults(
  descriptor,
  monitorIds = [],
  spotIds = [],
  globals = [],
) {
  const initial = (f) => {
    if (f.type === "latch") return monitorIds[0] ?? "monitor";
    // A variable field starts on a variable the project declares, since a made-up name has no slot.
    if (f.varType) {
      const declared = globals.find((g) => g.type === f.varType);
      if (declared) return declared.name;
    }
    if (f.type === "spot" && spotIds.length > 0) {
      return spotIds.includes(f.default) ? f.default : spotIds[0];
    }
    return f.default ?? "";
  };
  return Object.fromEntries(descriptor.fields.map((f) => [f.name, initial(f)]));
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
    let found = null;
    for (const d of conds) {
      const own = d.pre?.length ?? 0;
      const hit = parseLines([whole(d)], [
        ...pre.slice(used, used + own),
        test,
      ]);
      if (hit) {
        found = { descriptor: d, values: hit.values };
        used += own;
        break;
      }
    }
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

const wholes = new WeakMap();

/** The descriptor with its `pre` lines in front of its test, so `pre` slots are parsed and built like the rest. */
function whole(descriptor) {
  if (!descriptor.pre) return descriptor;
  if (!wholes.has(descriptor)) {
    wholes.set(descriptor, {
      ...descriptor,
      lines: [...descriptor.pre, ...descriptor.lines],
    });
  }
  return wholes.get(descriptor);
}

/** A condition (`{ pre?, test, locals? }`) built from a descriptor. */
export function buildCond(descriptor, values) {
  const lines = buildLines(whole(descriptor), values);
  const cond = { test: lines.at(-1) };
  if (descriptor.pre) cond.pre = lines.slice(0, -1);
  if (descriptor.locals) cond.locals = [...descriptor.locals];
  return cond;
}

/** Like `parseLines`, for a condition; its `pre` lines (slots filled) and `locals` must be the descriptor's too. */
export function parseCond(descriptors, cond) {
  const candidates = descriptors.filter((d) => same(d.locals, cond.locals));
  const found = parseLines(candidates.map(whole), [
    ...(cond.pre ?? []),
    cond.test,
  ]);
  return found && {
    ...found,
    descriptor: candidates.find((d) => whole(d) === found.descriptor),
  };
}
