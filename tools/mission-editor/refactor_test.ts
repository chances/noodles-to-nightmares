import { assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { generate, loadKnown, loadMission, problems } from "@noodles/fsm";
import type { Mission } from "@noodles/fsm";
import {
  renameMonitor,
  renameState,
  renameStateRefs,
  swapWord,
} from "./ui/refactor.js";

const missions = fromFileUrl(new URL("../../missions", import.meta.url));
const ui = (file: string) =>
  Deno.readTextFileSync(fromFileUrl(new URL(`./ui/${file}`, import.meta.url)));

const tutorial = async () => {
  const doc = await loadMission(missions, "0_tutorial");
  return structuredClone(doc!.mission) as Mission;
};

// The editor imports a browser module that cannot import `@noodles/fsm`, so this keeps the two name rules equal.
Deno.test("renaming a monitor rewrites every line that reads or sets its latch", async () => {
  const mission = await tutorial();
  assertEquals(renameMonitor(mission, "isDriving", "drivingNow"), true);
  const names = await loadKnown(missions, mission);
  assertEquals(problems(mission, names), []);

  const source = generate(mission, "0_tutorial");
  assertStringIncludes(source, "latchDrivingNow");
  assertEquals(source.includes("latchIsDriving"), false);
});

Deno.test("a monitor rename that would merge two latches is refused whole", async () => {
  const mission = await tutorial();
  const before = structuredClone(mission);
  assertEquals(renameMonitor(mission, "isDriving", "dyingWarning"), false);
  assertEquals(mission, before);
});

Deno.test("renaming a state rewrites its STATE_ constant in lines of Sanny text", async () => {
  const mission = await tutorial();
  const draft = { mission, layout: {} as Record<string, unknown> };
  draft.mission.states.INTRO.onEnter = [[
    "if",
    "  state == STATE_GO_HOME",
    "then",
    `  Text.PrintHelpString("STATE_GO_HOME stays")`,
    "end",
  ]];
  renameState(draft, "GO_HOME", "WALK_HOME");
  assertEquals(draft.mission.states.INTRO.onEnter, [[
    "if",
    "  state == STATE_WALK_HOME",
    "then",
    `  Text.PrintHelpString("STATE_GO_HOME stays")`,
    "end",
  ]]);
  assertEquals(problems(draft.mission as Mission), []);
});

Deno.test("a rename changes whole words outside strings, and nothing longer", () => {
  assertEquals(
    swapWord("latchA == false", "latchA", "latchB"),
    "latchB == false",
  );
  assertEquals(
    swapWord("latchAB = latchA", "latchA", "latchB"),
    "latchAB = latchB",
  );
  assertEquals(
    swapWord(`"latchA" 'latchA' latchA`, "latchA", "latchB"),
    `"latchA" 'latchA' latchB`,
  );
  assertEquals(
    swapWord("STATE_A STATE_AB $STATE_A", "STATE_A", "STATE_C"),
    "STATE_C STATE_AB $STATE_A",
  );
});

Deno.test("renameStateRefs leaves other states' constants alone", async () => {
  const mission = await tutorial();
  mission.states.INTRO.onEnter = [["a = STATE_INTRO", "b = STATE_INTRO_TWO"]];
  renameStateRefs(mission, "INTRO", "OPENING");
  assertEquals(mission.states.INTRO.onEnter, [[
    "a = STATE_OPENING",
    "b = STATE_INTRO_TWO",
  ]]);
});

// The Inspector is Preact and cannot run here, so this holds the line that wires its Name field to the rename.
Deno.test("the Inspector's monitor Name field renames through renameMonitor", () => {
  const pane = ui("inspector-pane.js");
  assertStringIncludes(pane, `import { renameMonitor } from "./refactor.js"`);
  assertStringIncludes(pane, "renameMonitor(m, from, id)");
});
