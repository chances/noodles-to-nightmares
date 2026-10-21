import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { layout as serverLayout, loadMission, NODE } from "@noodles/fsm";
import { addState, FINISH, layout } from "./ui/mission-ops.js";

const missions = fromFileUrl(new URL("../../missions", import.meta.url));

Deno.test("the editor's default layout matches the library's", async () => {
  const doc = await loadMission(missions, "0_tutorial");
  assertEquals(layout(doc!.mission, NODE), serverLayout(doc!.mission));
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
