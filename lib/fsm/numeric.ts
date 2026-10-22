// Number types of the arguments in a mission's Sanny lines. Sanny reads an int literal or constant in a float
// parameter as about zero (and a float in an int parameter as nonsense), so `problems` rejects a mismatch. The
// vocabulary's `numeric` fields say which parameters have a type.

import {
  condDescriptors,
  fieldPattern,
  stepDescriptors,
} from "./descriptors.ts";
import type { Descriptor, Field } from "./descriptors.ts";

export type NumberKind = "int" | "float";

/** Whether Sanny reads `value` as an int, a float, or neither (a name, an expression). */
export function kindOfLiteral(value: string): NumberKind | undefined {
  if (/^-?\d+$/.test(value)) return "int";
  if (/^-?\d+\.\d+$/.test(value)) return "float";
  return undefined;
}

/** `n` the way a Sanny `const` should print it when it is a float: always with a decimal point. */
export function floatLiteral(n: number): string {
  return Number.isInteger(n) ? n.toFixed(1) : String(n);
}

interface Template {
  regex: RegExp;
  /** The distinct fields this line has. */
  fields: Field[];
}

const SLOT = /\{(\w+)\}/g;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** One regex per descriptor line; a field used twice must repeat the same text. */
function compile(descriptor: Descriptor, line: string): Template {
  const seen = new Set<string>();
  const fields: Field[] = [];
  let source = "";
  let last = 0;
  for (const m of line.matchAll(SLOT)) {
    const field = descriptor.fields.find((f) => f.name === m[1])!;
    source += escape(line.slice(last, m.index));
    if (seen.has(field.name)) source += `\\k<${field.name}>`;
    else source += `(?<${field.name}>${fieldPattern(field)})`;
    if (!seen.has(field.name)) fields.push(field);
    seen.add(field.name);
    last = m.index + m[0].length;
  }
  source += escape(line.slice(last));
  return { regex: new RegExp(`^${source}$`), fields };
}

const templates: Template[] = [...stepDescriptors, ...condDescriptors]
  .flatMap((d) => d.lines.map((line) => compile(d, line)));

/** A vocabulary field and the value a line gives it. */
export interface FieldUse {
  field: Field;
  value: string;
}

/** The value of every vocabulary field the line fills in, when the line is one of the vocabulary's. */
export function fieldUses(line: string): FieldUse[] {
  const text = line.trim();
  const found: FieldUse[] = [];
  for (const { regex, fields } of templates) {
    const groups = regex.exec(text)?.groups;
    if (!groups) continue;
    for (const field of fields) {
      found.push({ field, value: groups[field.name] });
    }
  }
  return found;
}

export interface NumberMismatch {
  /** The parameter's label, e.g. `Radius`. */
  label: string;
  /** What the line wrote: a literal or a constant's name. */
  value: string;
  wanted: NumberKind;
  found: NumberKind;
  /** The value is a constant's name, not a literal. */
  isConst: boolean;
}

/**
 * Every typed number in `line` whose type is not the one its parameter needs. `kindOfName` gives a constant's
 * type, or undefined for a name it does not know (an undeclared name is reported elsewhere).
 */
export function numberMismatches(
  line: string,
  kindOfName: (name: string) => NumberKind | undefined,
): NumberMismatch[] {
  const found: NumberMismatch[] = [];
  for (const { field, value } of fieldUses(line)) {
    if (!field.numeric) continue;
    const literal = kindOfLiteral(value);
    const kind = literal ?? kindOfName(value);
    if (kind && kind !== field.numeric) {
      found.push({
        label: field.label,
        value,
        wanted: field.numeric,
        found: kind,
        isConst: literal === undefined,
      });
    }
  }
  return found;
}

/** The sentence that explains `mismatch`. */
export function describeMismatch(m: NumberMismatch): string {
  const what = m.isConst
    ? `${m.value} is ${m.found === "int" ? "an int" : "a float"} constant`
    : `${m.value} is ${m.found === "int" ? "an int" : "a float"}`;
  const fix = m.wanted === "float"
    ? m.isConst
      ? "Declare it with a decimal point, such as 20.0, or Sanny reads it as about zero."
      : `Write ${m.value}.0.`
    : "Use a whole number.";
  return `${m.label} needs ${
    m.wanted === "int" ? "an int" : "a float"
  }, but ${what}. ${fix}`;
}
