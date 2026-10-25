// The names a mission can use without declaring them in its table: constants and globals that the project's
// Sanny files declare. `problems` checks the table's references against them, and the editor offers them in
// typeaheads.

import { join, resolve } from "@std/path";
import { generateGeographyTxt } from "./geography.ts";
import { kindOfLiteral } from "./numeric.ts";
import type { ConstInfo, GlobalInfo, Known } from "./problems.ts";
import type { Mission } from "./types.ts";

// The game's timers, which no file declares.
const BUILT_IN = ["TIMERA", "TIMERB"];

const readOrEmpty = async (path: string) => {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return undefined;
  }
};

/**
 * Each line of `source` that `declaration` matches, with the `///` doc comment directly above it. A `//` line or a line
 * of code between the doc and the declaration leaves the declaration without a doc. Applies to every Sanny source.
 */
function declarations(
  source: string,
  declaration: RegExp,
): { line: string; match: RegExpMatchArray; doc?: string }[] {
  const found: { line: string; match: RegExpMatchArray; doc?: string }[] = [];
  let doc: string[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(declaration);
    if (match) {
      found.push({ line, match, doc: doc.length ? doc.join("\n") : undefined });
      doc = [];
      continue;
    }
    const comment = line.match(/^\s*\/\/\/ ?(.*)$/);
    if (comment) doc.push(comment[1].trimEnd());
    else if (line.trim() !== "") doc = [];
  }
  return found;
}

/** Every `const NAME = value` in `source`, with its `///` doc comment as its comment. */
export function parseConsts(
  source: string,
  from: string,
): Map<string, ConstInfo> {
  const found = new Map<string, ConstInfo>();
  for (
    const { match, doc } of declarations(
      source,
      /^\s*const\s+([A-Za-z_]\w*)\s*=\s*([^\s/]+)/,
    )
  ) {
    found.set(match[1], {
      kind: kindOfLiteral(match[2]),
      value: match[2],
      comment: doc,
      source: from,
    });
  }
  return found;
}

/** Every `$global` in `source`, with the type and `///` doc comment a `$name: Type` declaration gives it. */
export function parseGlobals(source: string): Map<string, GlobalInfo> {
  const found = new Map<string, GlobalInfo>();
  for (const m of source.matchAll(/\$[A-Za-z_]\w*/g)) {
    if (!found.has(m[0])) found.set(m[0], {});
  }
  for (
    const { match, doc } of declarations(
      source,
      /^\s*(\$[A-Za-z_]\w*)\s*:\s*(\w+)/,
    )
  ) {
    found.set(match[1], {
      ...found.get(match[1]),
      type: match[2],
      ...(doc === undefined ? {} : { doc }),
    });
  }
  for (
    const m of source.matchAll(/Alloc\(\s*(\$[A-Za-z_]\w*)\s*,\s*(\d+)\s*\)/g)
  ) {
    found.set(m[1], { ...found.get(m[1]), slot: Number(m[2]) });
  }
  return found;
}

/**
 * Every `function NAME(` definition in `source`, with its signature line and the `///` doc comment directly above it.
 * A plain `//` line or a line of code between the doc and the definition leaves the definition without a doc.
 */
export function parseFunctions(
  source: string,
  from: string,
): Map<string, { source: string; signature: string; doc?: string }> {
  const found = new Map<
    string,
    { source: string; signature: string; doc?: string }
  >();
  for (
    const { line, match, doc } of declarations(
      source,
      /^\s*function\s+([A-Za-z_]\w*)\s*\(/,
    )
  ) {
    const info = { source: from, signature: line.trim() };
    found.set(match[1], doc === undefined ? info : { ...info, doc });
  }
  return found;
}

/** The names a typeahead offers: constants, globals, and functions as lists. Spot constants and the game's timers are left out. */
export function listNames(known: Known | undefined) {
  const OMIT = new Set(["geography", "built in"]);
  return {
    constants: [...(known?.constants ?? [])]
      .filter(([, info]) => !OMIT.has(info.source))
      .map(([name, info]) => ({ name, ...info })),
    // A global with no Alloc pin has no slot, so a mission cannot use it.
    globals: [...(known?.globals ?? [])]
      .filter(([, info]) => info.slot !== undefined)
      .map(([name, info]) => ({ name, ...info })),
    functions: [...(known?.functions ?? [])]
      .map(([name, info]) => ({ name, ...info })),
  };
}

/**
 * What variables.txt, constants.txt, the geography constants, and the mission's includes declare, resolved the
 * way the generated `{$INCLUDE}` lines resolve: against `missionsDir`. Undefined when the project has no
 * variables.txt, because then nothing says which names are real.
 */
export async function loadKnown(
  missionsDir: string,
  mission: Mission,
): Promise<Known | undefined> {
  const variables = await readOrEmpty(
    resolve(join(missionsDir, "..", "variables.txt")),
  );
  if (variables === undefined) return undefined;

  const sources: [label: string, text: string][] = [
    ["variables.txt", variables],
    ["geography", generateGeographyTxt()],
  ];
  const constants = await readOrEmpty(
    resolve(join(missionsDir, "..", "constants.txt")),
  );
  if (constants !== undefined) sources.push(["constants.txt", constants]);
  for (const path of mission.includes ?? ["../utils/missions.txt"]) {
    const text = await readOrEmpty(resolve(join(missionsDir, path)));
    if (text !== undefined) sources.push([path, text]);
  }

  const known: Known = {
    constants: new Map(
      BUILT_IN.map((name) => [name, { kind: "int", source: "built in" }]),
    ),
    globals: new Map(),
  };
  const functions = new Map<
    string,
    { source: string; signature: string; doc?: string }
  >();
  for (const [label, text] of sources) {
    for (const [name, info] of parseConsts(text, label)) {
      known.constants.set(name, info);
    }
    for (const [name, info] of parseGlobals(text)) {
      known.globals.set(name, { ...known.globals.get(name), ...info });
    }
  }
  // Only the mission's includes are in scope, so a function in a file the mission does not include is not offered.
  for (const path of mission.includes ?? ["../utils/missions.txt"]) {
    const text = await readOrEmpty(resolve(join(missionsDir, path)));
    if (text === undefined) continue;
    for (const [name, info] of parseFunctions(text, path)) {
      functions.set(name, info);
    }
  }
  known.functions = functions;
  return known;
}
