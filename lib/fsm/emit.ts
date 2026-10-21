// Helpers that build Sanny lines for the FSM generator and the vocabulary.

import type { Cond } from "./types.ts";

export const INDENT = "  ";

export function indent(lines: string[], levels = 1): string[] {
  return lines.map((line) => line ? INDENT.repeat(levels) + line : line);
}

/** A comparison condition, e.g. `cmp("beat", "==", 2)`. */
export function cmp(left: string, op: string, right: string | number): Cond {
  return { test: `${left} ${op} ${right}` };
}

/** The local that latches a monitor, e.g. `driveHint` becomes `latchDriveHint`. */
export function latchLocal(id: string): string {
  return `latch${id[0].toUpperCase()}${id.slice(1)}`;
}

/** An `if` block. Several conditions combine with `mode`; an empty `then` emits nothing. */
export function ifBlock(
  conds: Cond[],
  then: string[],
  otherwise: string[] = [],
  mode: "and" | "or" = "and",
): string[] {
  if (then.length === 0 && otherwise.length === 0) return [];
  return [
    ...conds.flatMap((c) => c.pre ?? []),
    conds.length === 1 ? "if" : `if ${mode}`,
    ...indent(conds.map((c) => c.test)),
    "then",
    ...indent(then),
    ...(otherwise.length ? ["else", ...indent(otherwise)] : []),
    "end",
  ];
}
