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

/** Every `const NAME = value // comment` in `source`. */
export function parseConsts(
  source: string,
  from: string,
): Map<string, ConstInfo> {
  const found = new Map<string, ConstInfo>();
  for (
    const m of source.matchAll(
      /^\s*const\s+([A-Za-z_]\w*)\s*=\s*([^\s/]+)(?:\s*\/\/\s*(.*))?$/gm,
    )
  ) {
    found.set(m[1], {
      kind: kindOfLiteral(m[2]),
      value: m[2],
      comment: m[3]?.trim() || undefined,
      source: from,
    });
  }
  return found;
}

/** Every `$global` in `source`, with the type a `$name: Type` declaration gives it. */
export function parseGlobals(source: string): Map<string, GlobalInfo> {
  const found = new Map<string, GlobalInfo>();
  for (const m of source.matchAll(/\$[A-Za-z_]\w*/g)) {
    if (!found.has(m[0])) found.set(m[0], {});
  }
  for (const m of source.matchAll(/^\s*(\$[A-Za-z_]\w*)\s*:\s*(\w+)/gm)) {
    found.set(m[1], { ...found.get(m[1]), type: m[2] });
  }
  for (
    const m of source.matchAll(/Alloc\(\s*(\$[A-Za-z_]\w*)\s*,\s*(\d+)\s*\)/g)
  ) {
    found.set(m[1], { ...found.get(m[1]), slot: Number(m[2]) });
  }
  return found;
}

/** The names a typeahead offers: constants and globals as lists. Spot constants and the game's timers are left out. */
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
  for (const [label, text] of sources) {
    for (const [name, info] of parseConsts(text, label)) {
      known.constants.set(name, info);
    }
    for (const [name, info] of parseGlobals(text)) {
      known.globals.set(name, { ...known.globals.get(name), ...info });
    }
  }
  return known;
}
