/**
 * lint-scripts.ts
 *
 * Lints the Sanny Builder sources for variable slot problems before they compile:
 * - Every `Alloc($name, index)` in variables.txt and globals.txt has a unique name and index
 *   inside the global range (`$2` to `$3FFF`, Sanny error 0088).
 * - A mission uses only pinned `$globals`. An unpinned one takes a slot from that mission's own
 *   first-use order and can land on a cell main uses (see .agents/reports/bugs/mission-global-slot-mismatch.md).
 * - A mission declares at most 16 locals (`int x`, `Char sal`, or legacy `3@`) because GTA III
 *   allows 16 locals plus two timers per script. Locals inside a `function` body have their own
 *   scope (tested with scripts/test-sanny-locals.ts) and are not counted.
 */

import { basename, join } from "@std/path";

export const MAX_GLOBAL_INDEX = 0x3fff;
export const MIN_GLOBAL_INDEX = 2;
export const MAX_LOCALS = 16;

const LOCAL_TYPES =
  "int|float|string|longstring|Char|Car|Blip|Pickup|Player|Garage|Object|Group";

/** Removes comments, string literals, and `{...}` directives so names inside them never match. */
export function stripNonCode(source: string): string {
  // One left-to-right pass, so a quote inside a comment or a `//` inside a string never wins.
  return source.replace(
    /("(?:\\.|[^"\\\n])*")|('[^'\n]*')|(\/\/.*$)|(\/\*[\s\S]*?\*\/)|(\{[^}]*\})/gm,
    (_, dq, sq) => (dq ? '""' : sq ? "''" : ""),
  );
}

/** Pinned slots from the `Alloc` calls in the given sources. */
export function parseAllocs(
  sources: Record<string, string>,
): { name: string; index: number; file: string }[] {
  const allocs: { name: string; index: number; file: string }[] = [];
  for (const [file, source] of Object.entries(sources)) {
    for (
      const m of stripNonCode(source).matchAll(
        /Alloc\(\s*\$(\w+)\s*,\s*(\d+)\s*\)/gi,
      )
    ) {
      allocs.push({ name: m[1], index: Number(m[2]), file });
    }
  }
  return allocs;
}

/**
 * Source lines outside every `function ... end` body. Function locals have their own scope,
 * so they never count against the script's locals. Block depth follows the line-leading
 * `if`, `while`, `for`, `switch`, and `function` openers and their `end` lines.
 */
export function outsideFunctions(code: string): string {
  const kept: string[] = [];
  let depth = 0;
  let functionDepth = -1;
  for (const line of code.split("\n")) {
    const text = line.trim();
    if (/^end\b/i.test(text)) {
      depth--;
      if (depth === functionDepth) functionDepth = -1;
      continue;
    }
    if (/^(?:if|while|for|switch|function)\b/i.test(text)) {
      if (functionDepth < 0 && /^function\b/i.test(text)) functionDepth = depth;
      depth++;
      if (functionDepth >= 0) continue;
    }
    if (functionDepth < 0) kept.push(line);
  }
  return kept.join("\n");
}

/** Number of locals a mission script declares: typed declarations plus distinct legacy `N@` slots. */
export function countLocals(source: string): number {
  const code = outsideFunctions(stripNonCode(source));
  const declared = [
    ...code.matchAll(
      new RegExp(
        `^\\s*(?:${LOCAL_TYPES})\\s+[A-Za-z_]\\w*\\s*(?:=.*)?$`,
        "gim",
      ),
    ),
  ].length;
  const legacy = new Set(
    [...code.matchAll(/\b(\d+)@(?![sv])/gi)]
      .map((m) => Number(m[1]))
      .filter((n) => n < MAX_LOCALS),
  );
  return declared + legacy.size;
}

export interface LintInput {
  /** variables.txt and globals.txt, keyed by file name. */
  pins: Record<string, string>;
  /** Mission scripts, keyed by file name. */
  missions: Record<string, string>;
}

/** Returns one message per problem; an empty array means the sources pass. */
export function lintScripts({ pins, missions }: LintInput): string[] {
  const problems: string[] = [];
  const allocs = parseAllocs(pins);

  const byIndex = new Map<number, string>();
  const byName = new Map<string, number>();
  for (const { name, index, file } of allocs) {
    if (index < MIN_GLOBAL_INDEX || index > MAX_GLOBAL_INDEX) {
      problems.push(
        `${file}: $${name} is pinned to ${index}, outside $${MIN_GLOBAL_INDEX} to $${
          MAX_GLOBAL_INDEX.toString(16).toUpperCase()
        }`,
      );
    }
    const owner = byIndex.get(index);
    if (owner !== undefined && owner.toLowerCase() !== name.toLowerCase()) {
      problems.push(
        `${file}: slot ${index} is pinned to both $${owner} and $${name}`,
      );
    }
    byIndex.set(index, owner ?? name);
    const priorIndex = byName.get(name.toLowerCase());
    if (priorIndex !== undefined && priorIndex !== index) {
      problems.push(
        `${file}: $${name} is pinned to both ${priorIndex} and ${index}`,
      );
    }
    byName.set(name.toLowerCase(), index);
  }

  const pinned = new Set(allocs.map((a) => a.name.toLowerCase()));
  for (const [file, source] of Object.entries(missions)) {
    const code = stripNonCode(source);
    const unpinned = new Set<string>();
    for (const m of code.matchAll(/\$([A-Za-z_]\w*)/g)) {
      if (!pinned.has(m[1].toLowerCase())) unpinned.add(m[1]);
    }
    for (const name of unpinned) {
      problems.push(
        `${file}: $${name} has no Alloc pin; declare it as a local (\`int ${name}\`) or pin it in variables.txt`,
      );
    }
    const locals = countLocals(source);
    if (locals > MAX_LOCALS) {
      problems.push(
        `${file}: declares ${locals} locals; GTA III allows ${MAX_LOCALS} per script`,
      );
    }
  }
  return problems;
}

/** Reads the project sources under `root` and lints them. */
export async function lintProject(root: string): Promise<string[]> {
  const pins: Record<string, string> = {};
  for (const name of ["variables.txt", "globals.txt"]) {
    pins[name] = await Deno.readTextFile(join(root, name));
  }
  const missions: Record<string, string> = {};
  for await (const entry of Deno.readDir(join(root, "missions"))) {
    if (entry.isFile && entry.name.endsWith(".txt")) {
      missions[`missions/${entry.name}`] = await Deno.readTextFile(
        join(root, "missions", entry.name),
      );
    }
  }
  return lintScripts({ pins, missions });
}

/** Prints problems and exits 1 when any exist. */
export async function lintOrExit(root: string): Promise<void> {
  const problems = await lintProject(root);
  if (problems.length === 0) {
    console.log("  [=] Script lint: variable slots OK");
    return;
  }
  console.error("[-] Script lint failed:");
  for (const problem of problems) console.error(`      ${problem}`);
  Deno.exit(1);
}

if (import.meta.main) {
  await lintOrExit(Deno.cwd());
  console.log(`Linted ${basename(Deno.cwd())}`);
}
