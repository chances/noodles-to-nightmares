import { assertEquals } from "@std/assert";
import { formatStem, nextMissionIndex, slugify } from "./ui/mission-ops.js";

Deno.test("nextMissionIndex computes next free integer from stems", () => {
  assertEquals(
    nextMissionIndex([
      { stem: "0_tutorial" },
      { stem: "1_shady_job" },
      { stem: "side_supply_run" },
    ]),
    2,
  );
  assertEquals(nextMissionIndex([]), 0);
  assertEquals(nextMissionIndex([{ stem: "side_supply_run" }]), 0);
  assertEquals(
    nextMissionIndex([
      { stem: "0_tutorial" },
      { stem: "2_proving_herself" },
    ]),
    3,
  );
});

Deno.test("slugify produces safe stems", () => {
  assertEquals(slugify("Bank Heist!"), "bank_heist");
  assertEquals(slugify("  Rosa's   Payday   "), "rosa_s_payday");
  assertEquals(slugify(""), "");
});

Deno.test("formatStem formats typed stem characters cleanly", () => {
  assertEquals(formatStem("0_Tutorial-Mission!"), "0_tutorial-mission");
  assertEquals(formatStem("Bad@Input#Chars$"), "badinputchars");
  assertEquals(formatStem(""), "");
});
