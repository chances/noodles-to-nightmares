import { assertEquals } from "@std/assert";
import { readUrlState, writeUrlState } from "./ui/url-state.js";

Deno.test("readUrlState reads the state name and beat index, and null when absent", () => {
  assertEquals(readUrlState("?project=x&state=Start&beat=2"), { state: "Start", beat: 2 });
  assertEquals(readUrlState("?project=x"), { state: null, beat: null });
  assertEquals(readUrlState(""), { state: null, beat: null });
});

Deno.test("readUrlState ignores a beat that is not a whole number", () => {
  assertEquals(readUrlState("?state=Start&beat=abc"), { state: "Start", beat: null });
  assertEquals(readUrlState("?state=Start&beat=-1"), { state: "Start", beat: null });
});

Deno.test("writeUrlState keeps other params and writes state and beat", () => {
  assertEquals(writeUrlState("?project=x", { state: "Start", beat: 0 }), "?project=x&state=Start&beat=0");
});

Deno.test("writeUrlState leaves out a null state or beat", () => {
  assertEquals(writeUrlState("?project=x&state=Start&beat=3", { state: null, beat: null }), "?project=x");
  assertEquals(writeUrlState("?project=x&beat=3", { state: "Start", beat: null }), "?project=x&state=Start");
  assertEquals(writeUrlState("", { state: null, beat: null }), "");
});
