import { assertEquals } from "@std/assert";
import { join } from "@std/path";
import { includeTree } from "./includes.ts";

/** A temp project from a map of relative path to text; `run` gets the root and removes it after. */
async function withProject(
  files: Record<string, string>,
  run: (root: string) => Promise<void>,
) {
  const root = await Deno.makeTempDir();
  try {
    for (const [name, text] of Object.entries(files)) {
      const path = join(root, name);
      await Deno.mkdir(join(path, ".."), { recursive: true });
      await Deno.writeTextFile(path, text);
    }
    await run(root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

/** The files of a tree as paths relative to `root`, with forward slashes. */
const names = (root: string, files: string[]) =>
  files.map((f) => f.slice(root.length + 1).replaceAll("\\", "/"));

Deno.test("a script's tree holds the script and its includes, nested ones too, each once", async () => {
  await withProject({
    "main.txt": "{$INCLUDE globals.txt}\n{$INCLUDE utils/a.txt}\n",
    "globals.txt": "{$INCLUDE constants.txt}\n",
    "constants.txt": "const A = 1\n",
    "utils/a.txt": "{$INCLUDE ../constants.txt}\n",
  }, async (root) => {
    const tree = await includeTree(join(root, "main.txt"));
    assertEquals(names(root, tree.files), [
      "main.txt",
      "globals.txt",
      "constants.txt",
      "utils/a.txt",
    ]);
    assertEquals(tree.missing, []);
  });
});

Deno.test("a file the script does not include is not in its tree", async () => {
  await withProject({
    "missions/mission.txt": "{$INCLUDE ../utils/missions.txt}\n",
    "utils/missions.txt": "// helpers\n",
    "utils/cars.txt": "// main only\n",
    "main.txt": "{$INCLUDE utils/cars.txt}\n",
  }, async (root) => {
    const tree = await includeTree(join(root, "missions", "mission.txt"));
    assertEquals(names(root, tree.files), [
      "missions/mission.txt",
      "utils/missions.txt",
    ]);
  });
});

Deno.test("an include loop ends", async () => {
  await withProject({
    "a.txt": "{$INCLUDE b.txt}\n",
    "b.txt": "{$INCLUDE a.txt}\n",
  }, async (root) => {
    const tree = await includeTree(join(root, "a.txt"));
    assertEquals(names(root, tree.files), ["a.txt", "b.txt"]);
  });
});

Deno.test("a missing include is reported, not thrown", async () => {
  await withProject({
    "a.txt": "{$INCLUDE nope.txt}\n",
  }, async (root) => {
    const tree = await includeTree(join(root, "a.txt"));
    assertEquals(names(root, tree.files), ["a.txt"]);
    assertEquals(names(root, tree.missing), ["nope.txt"]);
  });
});

Deno.test("an include in a comment is not a dependency", async () => {
  await withProject({
    "a.txt":
      "// {$INCLUDE line.txt}\n/* {$INCLUDE block.txt} */\n{$INCLUDE real.txt} // {$INCLUDE tail.txt}\n",
    "real.txt": "",
    "line.txt": "",
    "block.txt": "",
    "tail.txt": "",
  }, async (root) => {
    const tree = await includeTree(join(root, "a.txt"));
    assertEquals(names(root, tree.files), ["a.txt", "real.txt"]);
  });
});

Deno.test("the directive is matched in any case and with spacing", async () => {
  await withProject({
    "a.txt": "{$include   b.txt }\n",
    "b.txt": "",
  }, async (root) => {
    const tree = await includeTree(join(root, "a.txt"));
    assertEquals(names(root, tree.files), ["a.txt", "b.txt"]);
  });
});
