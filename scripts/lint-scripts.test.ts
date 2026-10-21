import { assertEquals, assertStringIncludes } from "@std/assert";
import {
  countLocals,
  lintProject,
  lintScripts,
  MAX_LOCALS,
  stripNonCode,
} from "./lint-scripts.ts";

const pins = (text: string) => ({ "variables.txt": text });

Deno.test("clean sources pass", () => {
  const problems = lintScripts({
    pins: pins("Alloc($player, 4402)\nAlloc($onMission, 4409)\n"),
    missions: {
      "missions/a.txt": "{$CLEO .cm}\nint x = 0\n$onMission = true\nx = 1\n",
    },
  });
  assertEquals(problems, []);
});

Deno.test("two names on one slot are reported", () => {
  const problems = lintScripts({
    pins: pins("Alloc($sal, 4404)\nAlloc($VanBlip, 4404)\n"),
    missions: {},
  });
  assertEquals(problems.length, 1);
  assertStringIncludes(problems[0], "slot 4404");
});

Deno.test("one name on two slots is reported", () => {
  const problems = lintScripts({
    pins: pins("Alloc($player, 4402)\nAlloc($player, 4403)\n"),
    missions: {},
  });
  assertEquals(problems.length, 1);
  assertStringIncludes(problems[0], "$player is pinned to both");
});

Deno.test("out-of-range slots are reported", () => {
  const problems = lintScripts({
    pins: pins("Alloc($low, 1)\nAlloc($high, 16384)\n"),
    missions: {},
  });
  assertEquals(problems.length, 2);
});

Deno.test("an unpinned global in a mission is reported", () => {
  const problems = lintScripts({
    pins: pins("Alloc($player, 4402)\n"),
    missions: { "missions/a.txt": "$player = 1\n$thief = 2\n" },
  });
  assertEquals(problems.length, 1);
  assertStringIncludes(problems[0], "$thief");
});

Deno.test("names in strings, comments, and directives are ignored", () => {
  const problems = lintScripts({
    pins: pins("Alloc($player, 4402)\n"),
    missions: {
      "missions/a.txt":
        '{$CLEO .cm}\n// $ghost\nText.PrintString("$100 and $ghost", 3500)\n/* $ghost */\n$player = 1\n',
    },
  });
  assertEquals(problems, []);
});

Deno.test("16 locals pass and 17 fail", () => {
  const decls = (n: number) =>
    Array.from({ length: n }, (_, i) => `int loc${i} = 0`).join("\n");
  assertEquals(countLocals(decls(MAX_LOCALS)), MAX_LOCALS);
  const problems = lintScripts({
    pins: pins(""),
    missions: {
      "missions/ok.txt": decls(MAX_LOCALS),
      "missions/bad.txt": decls(MAX_LOCALS + 1),
    },
  });
  assertEquals(problems.length, 1);
  assertStringIncludes(problems[0], "missions/bad.txt: declares 17 locals");
});

Deno.test("class-typed and legacy locals count", () => {
  assertEquals(countLocals("Char sal\nint a\n0@ = 1\n0@ = 2\n3@ = 4\n"), 4);
});

Deno.test("locals inside a function body are not counted", () => {
  const source = [
    "int outer = 0",
    "function f(h: float): float",
    "  float inner = h",
    "  if inner >= 360.0",
    "  then",
    "    inner -= 360.0",
    "  end",
    "  cleo_return 1 inner",
    "end",
    "int after = 0",
  ].join("\n");
  assertEquals(countLocals(source), 2);
});

Deno.test("stripNonCode removes comments, strings, and braces", () => {
  assertEquals(
    stripNonCode('a // $x\n"$y" {$CLEO}\n/* $z */\nb').replace(/\s+/g, " ")
      .trim(),
    'a "" b',
  );
});

Deno.test("the project sources pass the lint", async () => {
  assertEquals(await lintProject(Deno.cwd()), []);
});
