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

/** The constant the generator declares for a state, e.g. `GO_HOME` becomes `STATE_GO_HOME`. */
export function stateConst(id: string): string {
  return `STATE_${id}`;
}

const pascal = (id: string) =>
  id.toLowerCase().split("_").map((word) =>
    word ? word[0].toUpperCase() + word.slice(1) : ""
  ).join("");

/** The label of a state's routine, e.g. `GO_HOME` becomes `stateGoHome`. */
export function stateLabel(id: string): string {
  return `state${pascal(id)}`;
}

/** The label of the routine that runs a state's `onExit` steps, e.g. `leaveGoHome`. */
export function leaveLabel(id: string): string {
  return `leave${pascal(id)}`;
}

/** A `while` loop. Its body must contain a `wait`. */
export function whileBlock(test: string, body: string[]): string[] {
  return [`while ${test}`, ...indent(body), "end"];
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
