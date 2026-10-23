// The editor's data file, `missions/<stem>.fsm.json`: a mission table plus the graph layout.
//
// Steps are stored as raw Sanny lines. A mission with both a `.states.ts` and a `.fsm.json` uses the
// `.fsm.json`: the editor writes one beside a `.states.ts` the first time that mission is edited.

import * as v from "@valibot/valibot";
import { join, resolve, toFileUrl } from "@std/path";
import { layout } from "./graph.ts";
import type { Point } from "./graph.ts";
import { STATE_KINDS } from "./types.ts";
import type { Mission } from "./types.ts";

const lines = v.array(v.string());
const cond = v.object({
  pre: v.optional(lines),
  test: v.string(),
  locals: v.optional(lines),
});
const conds = v.array(cond);
const steps = v.array(lines);
const beat = v.object({
  notes: v.optional(lines),
  when: v.optional(conds),
  do: v.optional(steps),
  wait: v.optional(v.number()),
});
const state = v.object({
  kind: v.optional(v.picklist(STATE_KINDS)),
  notes: v.optional(lines),
  fail: v.optional(v.boolean()),
  onEnter: v.optional(steps),
  onExit: v.optional(steps),
  resetLatches: v.optional(v.boolean()),
  beats: v.optional(v.array(beat)),
  until: v.optional(conds),
  next: v.optional(v.string()),
  on: v.optional(v.array(v.object({ when: conds, goto: v.string() }))),
  finish: v.optional(v.boolean()),
  timeLimit: v.optional(v.number()),
});
const mission = v.object({
  header: lines,
  consts: v.optional(
    v.record(
      v.string(),
      v.union([v.number(), v.tuple([v.number(), v.string()])]),
    ),
  ),
  locals: v.optional(v.array(v.object({
    name: v.string(),
    type: v.string(),
    value: v.optional(v.union([v.string(), v.number()])),
  }))),
  includes: v.optional(lines),
  start: v.string(),
  onFail: v.string(),
  fail: conds,
  monitors: v.optional(
    v.array(v.object({ id: v.string(), when: conds, once: steps })),
  ),
  states: v.record(v.string(), state),
});
const point = v.object({ x: v.number(), y: v.number() });
const fsmFile = v.object({
  version: v.literal(1),
  mission,
  layout: v.optional(v.record(v.string(), point)),
});

export interface FsmDoc {
  version: 1;
  mission: Mission;
  /** Top-left corner of every state's node; complete after `parseFsmDoc` and `docFromMission`. */
  layout: Record<string, Point>;
}

export interface MissionSource {
  stem: string;
  /** Which file holds the table. */
  source: "states.ts" | "fsm.json";
}

/** Throws when a transition, `start`, or `onFail` names a state the table does not have. */
export function assertReferences(mission: Mission): void {
  const known = new Set(Object.keys(mission.states));
  const check = (id: string, where: string) => {
    if (!known.has(id)) throw new Error(`${where} names unknown state ${id}`);
  };
  check(mission.start, "start");
  check(mission.onFail, "onFail");
  for (const [id, s] of Object.entries(mission.states)) {
    if (s.next) check(s.next, `${id}.next`);
    for (const rule of s.on ?? []) check(rule.goto, `${id}.on`);
  }
}

export function docFromMission(table: Mission): FsmDoc {
  assertReferences(table);
  return { version: 1, mission: table, layout: layout(table) };
}

/** Validates parsed JSON. States the file gives no position get the default layout. */
export function parseFsmDoc(json: unknown): FsmDoc {
  const result = v.safeParse(fsmFile, json);
  if (!result.success) {
    const issue = result.issues[0];
    const path = issue.path?.map((p) => p.key).join(".") ?? "";
    throw new Error(
      `invalid .fsm.json at ${path || "the top level"}: ${issue.message}`,
    );
  }
  const table = result.output.mission as Mission;
  assertReferences(table);
  return {
    version: 1,
    mission: table,
    layout: { ...layout(table), ...result.output.layout },
  };
}

const STEM = /^[A-Za-z0-9_-]+$/;

async function exists(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isFile;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

/** Missions that have a table: every `<stem>.states.ts` and `<stem>.fsm.json`, the `.fsm.json` winning. */
export async function listMissions(dir: string): Promise<MissionSource[]> {
  const found = new Map<string, MissionSource["source"]>();
  let entries: Deno.DirEntry[];
  try {
    entries = await Array.fromAsync(Deno.readDir(dir));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
  for (const entry of entries) {
    if (!entry.isFile) continue;
    const ts = entry.name.match(/^(.+)\.states\.ts$/);
    const json = entry.name.match(/^(.+)\.fsm\.json$/);
    if (ts && !found.has(ts[1])) found.set(ts[1], "states.ts");
    else if (json) found.set(json[1], "fsm.json");
  }
  return [...found]
    .map(([stem, source]) => ({ stem, source }))
    .sort((a, b) => a.stem.localeCompare(b.stem, undefined, { numeric: true }));
}

/** Returns undefined when `stem` has no table. A `.states.ts` is imported fresh, so edits show on reload. */
export async function loadMission(
  dir: string,
  stem: string,
): Promise<(FsmDoc & MissionSource) | undefined> {
  if (!STEM.test(stem)) return undefined;
  const jsonPath = join(dir, `${stem}.fsm.json`);
  if (await exists(jsonPath)) {
    const doc = parseFsmDoc(JSON.parse(await Deno.readTextFile(jsonPath)));
    return { stem, source: "fsm.json", ...doc };
  }
  const tsPath = join(dir, `${stem}.states.ts`);
  if (await exists(tsPath)) {
    const { mtime } = await Deno.stat(tsPath);
    const url = toFileUrl(resolve(tsPath));
    url.searchParams.set("v", String(mtime?.getTime() ?? 0));
    const module = await import(url.href);
    return { stem, source: "states.ts", ...docFromMission(module.default) };
  }
  return undefined;
}

/**
 * Validates `json` as a `.fsm.json` document and writes it to `<stem>.fsm.json`, creating the file the
 * first time a `.states.ts` mission is edited. Throws, and writes nothing, when the document is invalid.
 */
export async function saveMission(
  dir: string,
  stem: string,
  json: unknown,
): Promise<FsmDoc & MissionSource> {
  if (!STEM.test(stem)) throw new Error(`invalid mission name ${stem}`);
  const doc = parseFsmDoc(json);
  await Deno.mkdir(dir, { recursive: true });
  const path = join(dir, `${stem}.fsm.json`);
  const temp = `${path}.tmp`;
  await Deno.writeTextFile(temp, JSON.stringify(doc, null, 2) + "\n");
  await Deno.rename(temp, path);
  return { stem, source: "fsm.json", ...doc };
}
