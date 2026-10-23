// The state graph of a mission table: its transitions and a default node layout for the editor.

import type { Mission, State } from "./types.ts";

export interface Edge {
  from: string;
  to: string;
  /** `next` always follows the beats (after `until`); `on` is picked by a rule's condition. */
  kind: "next" | "on";
}

export interface Point {
  x: number;
  y: number;
}

/** Node box size and the gap between boxes in the default layout, in graph units. */
export const NODE = { width: 168, height: 56, gapX: 40, gapY: 40 };

/** The margin a cutscene region's hull keeps around its member boxes. Mirrors the editor's hull padding. */
export const REGION_PAD = 24;

export function transitions(mission: Mission): Edge[] {
  const edges: Edge[] = [];
  for (
    const [from, state] of Object.entries(mission.states) as [string, State][]
  ) {
    if (state.next) edges.push({ from, to: state.next, kind: "next" });
    for (const rule of state.on ?? []) {
      edges.push({ from, to: rule.goto, kind: "on" });
    }
  }
  return edges;
}

/**
 * The cutscene regions of a mission: each run of `cutscene` states linked by transitions in either direction,
 * in table order. A transition that enters a region sets the cutscene flag and letterbox; one that leaves it clears them.
 */
export function cutsceneRegions(mission: Mission): string[][] {
  const states = Object.entries(mission.states) as [string, State][];
  const cutscene = new Set(
    states.filter(([, state]) => state.kind === "cutscene").map(([id]) => id),
  );
  const linked = new Map<string, Set<string>>();
  for (const { from, to } of transitions(mission)) {
    if (!cutscene.has(from) || !cutscene.has(to)) continue;
    for (const [a, b] of [[from, to], [to, from]]) {
      const peers = linked.get(a) ?? new Set<string>();
      peers.add(b);
      linked.set(a, peers);
    }
  }

  const regions: string[][] = [];
  for (const [id] of states) {
    if (!cutscene.has(id) || regions.some((region) => region.includes(id))) {
      continue;
    }
    const members = new Set([id]);
    for (const member of members) {
      for (const peer of linked.get(member) ?? []) members.add(peer);
    }
    regions.push(
      states.map(([state]) => state).filter((state) => members.has(state)),
    );
  }
  return regions;
}

/**
 * Rows hold states by distance from `start`, so the graph reads top to bottom like a screenplay and
 * branches sit side by side in their row. States no transition reaches (such as the `onFail` state)
 * stack in a column to the right. Positions are the top-left corner of each node box.
 */
export function layout(mission: Mission): Record<string, Point> {
  const edges = transitions(mission);
  const depth = new Map<string, number>([[mission.start, 0]]);
  const queue = [mission.start];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of edges) {
      if (edge.from === queue[i] && !depth.has(edge.to)) {
        depth.set(edge.to, depth.get(queue[i])! + 1);
        queue.push(edge.to);
      }
    }
  }

  const columnX = (index: number) => index * (NODE.width + NODE.gapX);
  const rowY = (index: number) => index * (NODE.height + NODE.gapY);
  const statesInRow = new Map<number, number>();
  const positions: Record<string, Point> = {};
  for (const id of queue) {
    const row = depth.get(id)!;
    const column = statesInRow.get(row) ?? 0;
    statesInRow.set(row, column + 1);
    positions[id] = { x: columnX(column), y: rowY(row) };
  }

  const looseColumn = Math.max(0, ...statesInRow.values());
  let loose = 0;
  for (const id of Object.keys(mission.states)) {
    if (!depth.has(id)) {
      positions[id] = { x: columnX(looseColumn), y: rowY(loose++) };
    }
  }

  // A non-member inside a region's padded box would sit inside its hull, so it moves to its own row beneath the region
  for (const region of cutsceneRegions(mission)) {
    const members = region.map((id) => positions[id]);
    const left = Math.min(...members.map((p) => p.x)) - REGION_PAD;
    const top = Math.min(...members.map((p) => p.y)) - REGION_PAD;
    const right = Math.max(...members.map((p) => p.x)) + NODE.width +
      REGION_PAD;
    const bottom = Math.max(...members.map((p) => p.y)) + NODE.height +
      REGION_PAD;
    const rowBelow = Math.max(...members.map((p) => p.y)) + NODE.height +
      NODE.gapY;
    const inside = Object.keys(mission.states).filter((id) => {
      const p = positions[id];
      return !region.includes(id) && p.x < right && p.x + NODE.width > left &&
        p.y < bottom && p.y + NODE.height > top;
    });
    if (inside.length === 0) continue;
    // Rows at or below the new row step down, so the new row takes its place without overlap
    for (const id of Object.keys(mission.states)) {
      const p = positions[id];
      if (region.includes(id) || inside.includes(id) || p.y < rowBelow) {
        continue;
      }
      positions[id] = { x: p.x, y: p.y + NODE.height + NODE.gapY };
    }
    for (const id of inside) {
      positions[id] = { x: positions[id].x, y: rowBelow };
    }
  }
  return positions;
}
