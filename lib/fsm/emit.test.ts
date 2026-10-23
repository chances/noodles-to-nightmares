import { assertEquals } from "@std/assert";
import { ifBlock, leaveLabel, stateLabel, whileBlock } from "./emit.ts";

Deno.test("state and leave labels camel-case the state id", () => {
  assertEquals(stateLabel("A"), "stateA");
  assertEquals(stateLabel("GO_HOME"), "stateGoHome");
  assertEquals(leaveLabel("GO_HOME"), "leaveGoHome");
});

Deno.test("a negated single condition stays on the if line", () => {
  assertEquals(
    ifBlock([{ test: "not Pickup.HasBeenCollected($p)" }], ["foo()"]),
    ["if not Pickup.HasBeenCollected($p)", "then", "  foo()", "end"],
  );
  assertEquals(ifBlock([{ test: "Player.IsDead($player)" }], ["foo()"]), [
    "if",
    "  Player.IsDead($player)",
    "then",
    "  foo()",
    "end",
  ]);
});

Deno.test("whileBlock indents its body", () => {
  assertEquals(whileBlock("TIMERA < 500", ["wait 0", "foo()"]), [
    "while TIMERA < 500",
    "  wait 0",
    "  foo()",
    "end",
  ]);
});
