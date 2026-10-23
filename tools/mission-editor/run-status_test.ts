import { assertEquals } from "@std/assert";
import { runStatus } from "./ui/run-status.js";

Deno.test("the Game Run chip has a state and a label for every stage of a run", () => {
  const cases: [
    string,
    Parameters<typeof runStatus>,
    { state: string; label: string },
  ][] = [
    ["no run yet", [null, null], { state: "idle", label: "Not Started" }],
    ["building", [{ state: "building" }, null], {
      state: "building",
      label: "Building",
    }],
    ["running", [{ state: "running" }, null], {
      state: "running",
      label: "Running",
    }],
    ["a clean quit", [{ state: "done", code: 0 }, {
      known: true,
      crashed: false,
    }], { state: "exited", label: "Exited" }],
    ["a quit with no log", [{ state: "done", code: 0 }, {
      known: false,
      crashed: false,
    }], { state: "exited", label: "Exited" }],
    ["stopped from the editor", [
      { state: "done", stopped: true, code: 1 },
      null,
    ], { state: "exited", label: "Stopped" }],
    ["a crash", [{ state: "done", code: 0 }, { known: true, crashed: true }], {
      state: "error",
      label: "Crashed",
    }],
    ["a build that failed", [{ state: "done", code: 1 }, null], {
      state: "error",
      label: "Build Error",
    }],
    ["a run that could not start", [{
      state: "done",
      error: "Requires run access",
    }, null], { state: "error", label: "Build Error" }],
  ];
  for (const [name, args, expected] of cases) {
    assertEquals(runStatus(...args), expected, name);
  }
});
