import { assertEquals, assertRejects } from "@std/assert";
import { join } from "@std/path";
import {
  createProject,
  listProjects,
  openProject,
  readRecents,
} from "./projects.ts";
import type { ProjectDirs } from "./projects.ts";

/** A fake user profile: roaming data, plus Documents with a GTA 3 and a Vice City Projects folder. */
async function withProfile(
  run: (dirs: ProjectDirs, root: string) => Promise<void>,
) {
  const root = await Deno.makeTempDir();
  try {
    const dirs = {
      appData: join(root, "Roaming"),
      documents: join(root, "Documents"),
    };
    await run(dirs, root);
  } finally {
    await Deno.remove(root, { recursive: true });
  }
}

Deno.test("an empty profile lists nothing and offers the default locations", async () => {
  await withProfile(async (dirs) => {
    const listing = await listProjects(dirs);
    assertEquals(listing.recent, []);
    assertEquals(listing.found, []);
    assertEquals(
      listing.defaultLocations.vc,
      join(dirs.documents, "GTA Vice City", "Projects"),
    );
  });
});

Deno.test("creating a project makes missions/ and a marker, and remembers it", async () => {
  await withProfile(async (dirs) => {
    const parent = join(dirs.documents, "GTA Vice City", "Projects");
    const project = await createProject(dirs, {
      name: "Neon Nights",
      game: "vc",
      parent,
    });
    assertEquals(project.path, join(parent, "Neon Nights"));
    assertEquals(
      (await Deno.stat(join(project.path, "missions"))).isDirectory,
      true,
    );
    assertEquals(
      JSON.parse(
        await Deno.readTextFile(join(project.path, "mission-editor.json")),
      ),
      { game: "vc" },
    );
    const recents = await readRecents(dirs);
    assertEquals(recents.map((r) => [r.name, r.game]), [["Neon Nights", "vc"]]);
    assertEquals((await listProjects(dirs)).found, []);
  });
});

Deno.test("a bad or taken name is rejected before anything is written", async () => {
  await withProfile(async (dirs, root) => {
    const parent = join(root, "Projects");
    await createProject(dirs, { name: "Taken", game: "gta3", parent });
    await assertRejects(
      () => createProject(dirs, { name: "Taken", game: "gta3", parent }),
      Error,
      "already exists",
    );
    for (const name of ["", "a/b", ".hidden", "what?"]) {
      await assertRejects(() =>
        createProject(dirs, { name, game: "gta3", parent })
      );
    }
    assertEquals((await Array.fromAsync(Deno.readDir(parent))).length, 1);
  });
});

Deno.test("the scan finds project folders in both game Projects folders", async () => {
  await withProfile(async (dirs) => {
    const gta3 = join(dirs.documents, "GTA 3", "Projects");
    const vc = join(dirs.documents, "GTA Vice City", "Projects");
    await Deno.mkdir(join(gta3, "Has Missions", "missions"), {
      recursive: true,
    });
    await Deno.mkdir(join(gta3, "Scratch"), { recursive: true });
    await Deno.mkdir(join(vc, "Has Main"), { recursive: true });
    await Deno.writeTextFile(join(vc, "Has Main", "main.txt"), "");
    const { found } = await listProjects(dirs);
    assertEquals(found.map((p) => [p.name, p.game]), [
      ["Has Main", "vc"],
      ["Has Missions", "gta3"],
    ]);
  });
});

Deno.test("opening moves a project to the top, once, and drops folders that are gone", async () => {
  await withProfile(async (dirs, root) => {
    const parent = join(root, "Projects");
    const a = await createProject(dirs, { name: "A", game: "gta3", parent });
    const b = await createProject(dirs, { name: "B", game: "gta3", parent });
    await openProject(dirs, a.path);
    assertEquals((await readRecents(dirs)).map((r) => r.name), ["A", "B"]);
    await Deno.remove(b.path, { recursive: true });
    assertEquals((await readRecents(dirs)).map((r) => r.name), ["A"]);
    await assertRejects(() => openProject(dirs, b.path), Error, "not a folder");
  });
});
