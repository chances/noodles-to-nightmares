import { assertEquals } from "@std/assert";
import { loadKnown, parseFunctions, parseGlobals } from "./known.ts";
import type { Mission } from "./types.ts";

Deno.test("parseFunctions finds each function definition and the file it is in", () => {
  const source =
    "function ensureVanBlip()\n  x = 1\nend\n  function  finishMission ( )\nend\n";
  assertEquals([...parseFunctions(source, "../utils/missions.txt")], [
    [
      "ensureVanBlip",
      {
        source: "../utils/missions.txt",
        signature: "function ensureVanBlip()",
      },
    ],
    [
      "finishMission",
      {
        source: "../utils/missions.txt",
        signature: "function  finishMission ( )",
      },
    ],
  ]);
});

Deno.test("parseFunctions keeps each function's /// doc comment, and leaves out a doc a plain // comment does not make", () => {
  const source = [
    "/// Ends a mission as passed.",
    "/// Advances the story.",
    "function finishMission()",
    "end",
    "",
    "// Not a doc comment.",
    "function clearUI()",
    "end",
    "",
  ].join("\n");
  assertEquals([...parseFunctions(source, "../utils/missions.txt")], [
    [
      "finishMission",
      {
        source: "../utils/missions.txt",
        signature: "function finishMission()",
        doc: "Ends a mission as passed.\nAdvances the story.",
      },
    ],
    [
      "clearUI",
      { source: "../utils/missions.txt", signature: "function clearUI()" },
    ],
  ]);
});

Deno.test("a global's /// doc comment is its doc, from any Sanny source, and a // comment is not", () => {
  const globals = parseGlobals(
    "// Not a doc.\n/// The safehouse blip.\n$SafeBlip: Blip\n$Plain: int\n",
  );
  assertEquals(globals.get("$SafeBlip")?.doc, "The safehouse blip.");
  assertEquals(globals.get("$SafeBlip")?.type, "Blip");
  assertEquals(globals.get("$Plain")?.doc, undefined);
});

Deno.test("a mission's known functions are only those its includes define", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${dir}/missions`);
    await Deno.mkdir(`${dir}/utils`);
    await Deno.writeTextFile(`${dir}/variables.txt`, "");
    await Deno.writeTextFile(
      `${dir}/utils/missions.txt`,
      "function ensureVanBlip()\nend\n",
    );
    await Deno.writeTextFile(
      `${dir}/utils/other.txt`,
      "function notIncluded()\nend\n",
    );
    const mission = {
      includes: ["../utils/missions.txt"],
    } as unknown as Mission;
    const known = await loadKnown(`${dir}/missions`, mission);
    assertEquals([...(known?.functions?.keys() ?? [])], ["ensureVanBlip"]);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
