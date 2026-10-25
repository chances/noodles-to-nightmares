import { assertEquals } from "@std/assert";
import { welcomeState } from "./ui/mission-ops.js";

Deno.test("welcomeState presents zero-missions welcome when empty", () => {
  const empty = welcomeState([]);
  assertEquals(empty.hasMissions, false);
  assertEquals(empty.showPicker, false);
  assertEquals(empty.heading, "Welcome to Mission Editor");

  const none = welcomeState(null);
  assertEquals(none.hasMissions, false);
  assertEquals(none.showPicker, false);
  assertEquals(none.heading, "Welcome to Mission Editor");
});

Deno.test("welcomeState presents picker when missions exist but none is open", () => {
  const state = welcomeState([
    { stem: "0_tutorial" },
    { stem: "1_shady_job" },
  ]);
  assertEquals(state.hasMissions, true);
  assertEquals(state.showPicker, true);
  assertEquals(state.heading, "Select or Create a Mission");
});
