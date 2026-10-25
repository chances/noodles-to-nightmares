// Pure operations on a mission table and its graph layout. No DOM and no Preact, so the editor tests import it.

import { kindOf } from "./sections.js";

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
 * The cutscene regions, the same ones `lib/fsm/graph.ts` finds: each run of cutscene states (by `kindOf`) linked
 * by transitions in either direction, in table order.
 */
export function cutsceneRegions(mission) {
  const states = Object.entries(mission.states).map(([id, state]) => ({
    id,
    cutscene: kindOf(state) === "cutscene",
  }));
  const cutscene = new Set(states.filter((s) => s.cutscene).map((s) => s.id));
  const linked = new Map();
  for (const { from, to } of transitions(mission)) {
    if (!cutscene.has(from) || !cutscene.has(to)) continue;
    for (const [a, b] of [[from, to], [to, from]]) {
      const peers = linked.get(a) ?? new Set();
      peers.add(b);
      linked.set(a, peers);
    }
  }

  const regions = [];
  for (const { id } of states) {
    if (!cutscene.has(id) || regions.some((region) => region.includes(id))) {
      continue;
    }
    const members = new Set([id]);
    for (const member of members) {
      for (const peer of linked.get(member) ?? []) members.add(peer);
    }
    regions.push(states.map((s) => s.id).filter((name) => members.has(name)));
  }
  return regions;
}

/** The margin a cutscene region's hull keeps around its member boxes. Mirrors `REGION_PAD` in lib/fsm/graph.ts. */
export const REGION_PAD = 24;

/**
 * The convex hull of a cutscene region's node boxes, each grown by `pad` on every side. Monotone chain, as points
 * in counter-clockwise order from the leftmost point.
 */
export function regionHull(ids, layout, { width, height }, pad) {
  const points = ids.flatMap((id) => {
    const { x, y } = layout[id];
    return [
      [x - pad, y - pad],
      [x + width + pad, y - pad],
      [x + width + pad, y + height + pad],
      [x - pad, y + height + pad],
    ];
  });
  points.sort(([ax, ay], [bx, by]) => ax - bx || ay - by);
  const cross = ([ox, oy], [ax, ay], [bx, by]) =>
    (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
  const chain = (list) => {
    const hull = [];
    for (const p of list) {
      while (hull.length >= 2 && cross(hull.at(-2), hull.at(-1), p) <= 0) {
        hull.pop();
      }
      hull.push(p);
    }
    hull.pop();
    return hull;
  };
  return [...chain(points), ...chain([...points].reverse())];
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

  // A non-member inside a region's padded box would sit inside its hull, so it moves to its own row beneath the region
  for (const region of cutsceneRegions(mission)) {
    const members = region.map((id) => positions[id]);
    const left = Math.min(...members.map((p) => p.x)) - REGION_PAD;
    const top = Math.min(...members.map((p) => p.y)) - REGION_PAD;
    const right = Math.max(...members.map((p) => p.x)) + node.width +
      REGION_PAD;
    const bottom = Math.max(...members.map((p) => p.y)) + node.height +
      REGION_PAD;
    const rowBelow = Math.max(...members.map((p) => p.y)) + node.height +
      node.gapY;
    const inside = Object.keys(mission.states).filter((id) => {
      const p = positions[id];
      return !region.includes(id) && p.x < right && p.x + node.width > left &&
        p.y < bottom && p.y + node.height > top;
    });
    if (inside.length === 0) continue;
    // Rows at or below the new row step down, so the new row takes its place without overlap
    for (const id of Object.keys(mission.states)) {
      const p = positions[id];
      if (region.includes(id) || inside.includes(id) || p.y < rowBelow) {
        continue;
      }
      positions[id] = { x: p.x, y: p.y + node.height + node.gapY };
    }
    for (const id of inside) {
      positions[id] = { x: positions[id].x, y: rowBelow };
    }
  }
  return positions;
}

/**
 * Splits prose into `{ text }` runs and `{ state }` runs, so each state name can be drawn as a link. A name
 * counts only as a whole word.
 */
export function stateRefs(text, ids) {
  if (ids.length === 0) return [{ text }];
  const names = ids.map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const parts = text.split(new RegExp(`\\b(${names.join("|")})\\b`));
  return parts.flatMap((part, i) => {
    if (i % 2 === 1) return [{ state: part }];
    return part === "" ? [] : [{ text: part }];
  });
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
