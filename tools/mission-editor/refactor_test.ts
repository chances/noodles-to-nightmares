import { assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { swapWord } from "./ui/refactor.js";
const ui = (file: string) =>
  Deno.readTextFileSync(fromFileUrl(new URL(`./ui/${file}`, import.meta.url)));

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

// The Inspector is Preact and cannot run here, so this holds the line that wires its Name field to the rename.
Deno.test("the Inspector's monitor Name field renames through renameMonitor", () => {
  const pane = ui("inspector-pane.js");
  assertStringIncludes(pane, `import { renameMonitor } from "./refactor.js"`);
  assertStringIncludes(pane, "renameMonitor(m, from, id)");
});
