import { assertEquals } from "@std/assert";
import { loadKnown, parseFunctions } from "./known.ts";
import type { Mission } from "./types.ts";

Deno.test("parseFunctions finds each function definition and the file it is in", () => {
  const source =
    "function ensureVanBlip()\n  x = 1\nend\n  function  finishMission ( )\nend\n";
  assertEquals([...parseFunctions(source, "../utils/missions.txt")], [
    ["ensureVanBlip", { source: "../utils/missions.txt" }],
    ["finishMission", { source: "../utils/missions.txt" }],
  ]);
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
