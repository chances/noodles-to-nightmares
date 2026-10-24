// Types for a mission state table (`missions/<stem>.states.ts`). `generate.ts` turns a table into Sanny source.

/** A Sanny condition. `pre` lines run before the `if`, `locals` names scratch locals the test reads. */
export interface Cond {
  pre?: string[];
  test: string;
  locals?: string[];
}

/** Sanny lines for one action; build them with `step` from `vocabulary.ts`. */
export type Step = string[];

/**
 * A scripted beat runs `do` once, then waits `wait` ms. An await beat sets `await` instead and spin-waits, running the
 * watchers each tick, until every condition in `await` holds, then the next beat starts. A beat whose `when` is false is
 * skipped, wait included.
 */
export interface Beat {
  notes?: string[];
  when?: Cond[];
  do?: Step[];
  wait?: number;
  await?: Cond[];
}

/** A rule that runs every tick in every state and fires its `once` steps the first time `when` holds. */
export interface Monitor {
  id: string;
  when: Cond[];
  once: Step[];
}

/** What a state is for. The editor offers default sections by kind; the generator reads only `cutscene`, which sets the cutscene flag and letterbox. */
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
  /** After the story beats, wait until all of these hold, then go to `next`. */
  until?: Cond[];
  /** After the story beats (and `until`), go to this state. */
  next?: S;
  /** After the story beats, the first rule whose `when` holds picks the next state; when none holds, `until` and `next` apply. */
  on?: { when: Cond[]; goto: S }[];
  /** After the story beats, finish the mission through `finishMission()`. */
  finish?: boolean;
  /**
   * Seconds the state may last. TIMERB restarts on entry, and once it passes this many seconds (1000 ms each) the
   * mission goes to `onFail`. Only a state with this set is timed.
   */
  timeLimit?: number;
  /** When true, a countdown timer on $hudTimer is shown on entry and cleared on exit. */
  showTimer?: boolean;
}

export type Const = number | [value: number, comment: string];

/** A mission-private CLEO local, e.g. `Char sal` or `float heading = 0.0`. Steps and conditions read and set it by `name`. */
export interface Local {
  name: string;
  /** A Sanny type: `int`, `float`, `Char`, and so on. */
  type: string;
  /** The initial value as written in Sanny; leave out for a handle that starts unset. */
  value?: string | number;
}

export interface Mission<S extends string = string> {
  /** Comment box lines at the top of the file. */
  header: string[];
  consts?: Record<string, Const>;
  /** Locals the mission's steps use besides the generated `state`, `beat`, latch, and scratch locals. */
  locals?: Local[];
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
