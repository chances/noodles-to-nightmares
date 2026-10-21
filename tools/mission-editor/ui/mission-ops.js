// Pure operations on a mission table and its graph layout. No DOM and no Preact, so the editor tests import it.

/** Edges of the graph: a state's `next`, then its `on` branches. */
export function transitions(mission) {
  const edges = [];
  for (const [from, state] of Object.entries(mission.states)) {
    if (state.next) edges.push({ from, to: state.next, kind: "next" });
    for (const rule of state.on ?? []) {
      edges.push({ from, to: rule.goto, kind: "on" });
    }
  }
  return edges;
}

/**
 * The default node layout, the same one `lib/fsm/graph.ts` computes: rows by distance from `start`, branches
 * side by side, and states no transition reaches in a column to the right. `node` is the box size from the server.
 */
export function layout(mission, node) {
  const edges = transitions(mission);
  const depth = new Map([[mission.start, 0]]);
  const queue = [mission.start];
  for (let i = 0; i < queue.length; i++) {
    for (const edge of edges) {
      if (edge.from === queue[i] && !depth.has(edge.to)) {
        depth.set(edge.to, depth.get(queue[i]) + 1);
        queue.push(edge.to);
      }
    }
  }

  const columnX = (index) => index * (node.width + node.gapX);
  const rowY = (index) => index * (node.height + node.gapY);
  const statesInRow = new Map();
  const positions = {};
  for (const id of queue) {
    const row = depth.get(id);
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

/** The `leadsTo` value that makes a new state finish the mission. */
export const FINISH = "__finish";

/**
 * Adds a state named `name` of `kind`. It leads to `leadsTo` (a state, FINISH, or "" for nowhere yet) and
 * `after` (a state or "") now goes to it. The graph is laid out again. Changes `draft`.
 */
export function addState(draft, { name, kind, after, leadsTo }, node) {
  const { mission } = draft;
  const state = { kind };
  if (leadsTo === FINISH) state.finish = true;
  else if (leadsTo) state.next = leadsTo;
  mission.states[name] = state;
  if (after) mission.states[after].next = name;
  draft.layout = layout(mission, node);
}
