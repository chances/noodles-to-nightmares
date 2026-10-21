import { assertEquals } from "@std/assert";
import { missionLabel } from "./ui/mission-label.js";

Deno.test("mission file names read as labels", () => {
  assertEquals(missionLabel("0_tutorial"), "Tutorial");
  assertEquals(missionLabel("missions\\1_shady_job.txt"), "Shady Job");
  assertEquals(
    missionLabel("missions/2_proving_herself.md"),
    "Proving Herself",
  );
  assertEquals(missionLabel("0_tutorial.states.ts"), "Tutorial");
  assertEquals(missionLabel("side_supply_run"), "Side Supply Run");
});
