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
export const NODE = { width: 168, height: 56, gapX: 64, gapY: 40 };

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
  return positions;
}
