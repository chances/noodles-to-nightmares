// Types for a mission state table (`missions/<stem>.states.ts`). `generate.ts` turns a table into Sanny source.

/** A Sanny condition. `pre` lines run before the `if`, `locals` names scratch locals the test reads. */
export interface Cond {
  pre?: string[];
  test: string;
  locals?: string[];
}

/** Sanny lines for one action; build them with `step` from `vocabulary.ts`. */
export type Step = string[];

/** One cutscene beat: run `do` once, then wait `wait` ms. A beat whose `when` is false is skipped, wait included. */
export interface Beat {
  notes?: string[];
  when?: Cond[];
  do?: Step[];
  wait?: number;
}

/** A rule that runs every tick in every state and fires its `once` steps the first time `when` holds. */
export interface Monitor {
  id: string;
  when: Cond[];
  once: Step[];
}

/** What a state is for. The editor offers default sections by kind; the generator ignores it. */
export const STATE_KINDS = [
  "cutscene",
  "tutorial",
  "objective",
  "interaction",
  "encounter",
  "choice",
  "ending",
] as const;
export type StateKind = typeof STATE_KINDS[number];

export interface State<S extends string = string> {
  /** Set the first time the editor's kind select changes; the editor infers it from the sections present until then. */
  kind?: StateKind;
  /** Comments copied into the generated source, e.g. TODO and QUESTION lines. */
  notes?: string[];
  /** The mission-level `fail` list applies in this state. Default true. */
  fail?: boolean;
  onEnter?: Step[];
  onExit?: Step[];
  /** Clear every monitor latch on entry. */
  resetLatches?: boolean;
  beats?: Beat[];
  /** After the beats, wait until all of these hold, then go to `next`. */
  until?: Cond[];
  /** After the beats (and `until`), go to this state. */
  next?: S;
  /** After the beats, the first rule whose `when` holds picks the next state. */
  on?: { when: Cond[]; goto: S }[];
  /** After the beats, finish the mission through `finishMission()`. */
  finish?: boolean;
}

export type Const = number | [value: number, comment: string];

export interface Mission<S extends string = string> {
  /** Comment box lines at the top of the file. */
  header: string[];
  consts?: Record<string, Const>;
  /** `{$INCLUDE}` paths after the generated code. Default: `../utils/missions.txt`. */
  includes?: string[];
  start: S;
  /** The state the mission enters when a `fail` condition holds in a state that allows it. */
  onFail: S;
  fail: Cond[];
  monitors?: Monitor[];
  states: Record<S, State<S>>;
}

/** Identity helper that infers the state ids from `states`, so a bad `next`, `goto`, or `start` fails to type-check. */
export function defineMission<const S extends string>(
  mission: Mission<S>,
): Mission<S> {
  return mission;
}
