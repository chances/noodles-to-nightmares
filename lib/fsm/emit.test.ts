import { assertEquals } from "@std/assert";
import { leaveLabel, stateLabel, whileBlock } from "./emit.ts";

Deno.test("state and leave labels camel-case the state id", () => {
  assertEquals(stateLabel("A"), "stateA");
  assertEquals(stateLabel("GO_HOME"), "stateGoHome");
  assertEquals(leaveLabel("GO_HOME"), "leaveGoHome");
});

Deno.test("whileBlock indents its body", () => {
  assertEquals(whileBlock("TIMERA < 500", ["wait 0", "foo()"]), [
    "while TIMERA < 500",
    "  wait 0",
    "  foo()",
    "end",
  ]);
});
