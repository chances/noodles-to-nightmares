import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  cutsceneRegions as serverCutsceneRegions,
  layout as serverLayout,
  loadMission,
  NODE,
} from "@noodles/fsm";
import {
  addState,
  cutsceneRegions,
  FINISH,
  layout,
  regionHull,
  stateRefs,
} from "./ui/mission-ops.js";

const missions = fromFileUrl(new URL("../../missions", import.meta.url));

Deno.test("the editor's default layout matches the library's", async () => {
  const doc = await loadMission(missions, "0_tutorial");
  assertEquals(layout(doc!.mission, NODE), serverLayout(doc!.mission));
});

Deno.test("the editor's layout with cutscene regions matches the library's", async () => {
  const doc = await loadMission(missions, "1_shady_job");
  assertEquals(layout(doc!.mission, NODE), serverLayout(doc!.mission));
});

Deno.test("the column gap matches the row gap", () => {
  assertEquals(NODE.gapX, NODE.gapY);
});

Deno.test("a chain of states one after another sits one row apart", async () => {
  const doc = await loadMission(missions, "1_shady_job");
  const pos = layout(doc!.mission, NODE) as Record<
    string,
    { x: number; y: number }
  >;
  assertEquals(
    pos.FETCH_PACKAGE.y - pos.ANSWER_CALL.y,
    NODE.height + NODE.gapY,
  );
});

Deno.test("the editor's cutscene regions match the library's", async () => {
  const doc = await loadMission(missions, "1_shady_job");
  assertEquals(
    cutsceneRegions(doc!.mission),
    serverCutsceneRegions(doc!.mission),
  );
});

Deno.test("a region's hull is the convex outline of its padded node boxes", () => {
  const box = { width: 168, height: 56 };
  const side = regionHull(
    ["A", "B"],
    { A: { x: 0, y: 0 }, B: { x: 200, y: 0 } },
    box,
    10,
  );
  assertEquals(side.length, 4);
  // A diagonal pair keeps only the outer corners: the box corners (178, 66) and (190, 90) sit inside the outline
  const diagonal = regionHull(
    ["A", "B"],
    { A: { x: 0, y: 0 }, B: { x: 200, y: 100 } },
    box,
    10,
  );
  assertEquals(diagonal.length, 6);
});

// Counter-clockwise hull: a point is inside when it is on the left of, or on, every edge
type Point = [number, number];
const cross = ([ox, oy]: Point, [ax, ay]: Point, [bx, by]: Point) =>
  (ax - ox) * (by - oy) - (ay - oy) * (bx - ox);
const insideHull = (p: Point, hull: Point[]) =>
  hull.every((a, i) => cross(a, hull[(i + 1) % hull.length], p) >= 0);

// Seeded so a failure reproduces
const random = (seed: number) => () =>
  (seed = (seed * 16807) % 2147483647) / 2147483647;

Deno.test("a hull holds every padded corner, turns only left, and uses only corners", () => {
  const next = random(42);
  for (let trial = 0; trial < 200; trial++) {
    const ids = Array.from(
      { length: 1 + Math.floor(next() * 6) },
      (_, i) => `S${i}`,
    );
    const pos = Object.fromEntries(
      ids.map((
        id,
      ) => [id, { x: Math.round(next() * 800), y: Math.round(next() * 600) }]),
    );
    const box = { width: 168, height: 56 };
    const pad = 24;
    const hull = regionHull(ids, pos, box, pad);
    const corners: Point[] = ids.flatMap((id) => [
      [pos[id].x - pad, pos[id].y - pad],
      [pos[id].x + box.width + pad, pos[id].y - pad],
      [pos[id].x + box.width + pad, pos[id].y + box.height + pad],
      [pos[id].x - pad, pos[id].y + box.height + pad],
    ]);
    for (const c of corners) {
      assert(insideHull(c, hull), `corner ${c} outside ${hull}`);
    }
    hull.forEach((a, i) => {
      assert(
        cross(a, hull[(i + 1) % hull.length], hull[(i + 2) % hull.length]) > 0,
        `turn ${i} not convex`,
      );
      assert(
        corners.some(([x, y]) => x === a[0] && y === a[1]),
        `vertex ${a} is not a corner`,
      );
    });
  }
});

Deno.test("a non-member inside a region's box takes its own row beneath the region", async () => {
  const doc = await loadMission(missions, "1_shady_job");
  const pos = layout(doc!.mission, NODE) as Record<
    string,
    { x: number; y: number }
  >;
  assertEquals(pos.END_INTRO, {
    x: pos.INTRO.x,
    y: pos.SAL_CUTSCENE.y + NODE.height + NODE.gapY,
  });
});

Deno.test("a cutscene region's hull leaves out the states outside it", async () => {
  const doc = await loadMission(missions, "1_shady_job");
  const { mission } = doc!;
  const pos = layout(mission, NODE) as Record<string, { x: number; y: number }>;
  for (const region of cutsceneRegions(mission)) {
    const hull = regionHull(region, pos, NODE, 24);
    for (
      const id of Object.keys(mission.states).filter((s) => !region.includes(s))
    ) {
      const center: Point = [
        pos[id].x + NODE.width / 2,
        pos[id].y + NODE.height / 2,
      ];
      assert(
        !insideHull(center, hull),
        `${id} sits inside the hull of ${region}`,
      );
    }
  }
});

Deno.test("prose splits into text and whole state names, so each name can be drawn as a link", () => {
  assertEquals(
    stateRefs("INTRO, SAL_CUTSCENE, and END_INTRO are", [
      "INTRO",
      "SAL_CUTSCENE",
      "END_INTRO",
    ]),
    [
      { state: "INTRO" },
      { text: ", " },
      { state: "SAL_CUTSCENE" },
      { text: ", and " },
      { state: "END_INTRO" },
      { text: " are" },
    ],
  );
  // A name inside a longer word is not a reference
  assertEquals(stateRefs("END_INTRO_2 and ENDINTRO", ["END_INTRO"]), [
    { text: "END_INTRO_2 and ENDINTRO" },
  ]);
});

const draftOf = async () => {
  const doc = await loadMission(missions, "0_tutorial");
  return structuredClone({ mission: doc!.mission, layout: doc!.layout });
};

Deno.test("a new state goes between the state it comes after and that state's next", async () => {
  const draft = await draftOf();
  addState(
    draft,
    { name: "WALK", kind: "cutscene", after: "GO_HOME", leadsTo: "ARRIVE" },
    NODE,
  );
  assertEquals(draft.mission.states.GO_HOME.next, "WALK");
  assertEquals(draft.mission.states.WALK, { kind: "cutscene", next: "ARRIVE" });
  assertEquals(Object.keys(draft.layout).length, 7);
});

Deno.test("a new state can finish the mission or lead nowhere, and need not follow anything", async () => {
  const draft = await draftOf();
  addState(draft, {
    name: "END",
    kind: "ending",
    after: "",
    leadsTo: FINISH,
  }, NODE);
  addState(draft, {
    name: "LOOSE",
    kind: "choice",
    after: "",
    leadsTo: "",
  }, NODE);
  assertEquals(draft.mission.states.END, { kind: "ending", finish: true });
  assertEquals(draft.mission.states.LOOSE, { kind: "choice" });
  assertEquals(draft.mission.states.GO_HOME.next, "ARRIVE");
});
