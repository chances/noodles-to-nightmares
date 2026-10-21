// Projects for the welcome page: the remembered list, a scan of the game Projects folders, and creating a project.
//
// A project is a folder whose `missions/` subfolder holds the mission tables. The remembered list lives in
// `<appData>/GTA/projects.json`. Imports use inline `jsr:` specifiers for the same reason as `server.ts`.

import { basename, dirname, join, resolve } from "@std/path";

export type Game = "gta3" | "vc";

export interface ProjectEntry {
  name: string;
  path: string;
  game: Game;
  /** ISO time; set on remembered projects. */
  lastOpened?: string;
}

export interface ProjectDirs {
  /** The per-user roaming data folder, such as `%APPDATA%`. */
  appData: string;
  /** The user's Documents folder, holding `GTA 3` and `GTA Vice City`. */
  documents: string;
}

export const GAMES: Record<Game, { label: string; folder: string }> = {
  gta3: { label: "GTA III", folder: "GTA 3" },
  vc: { label: "GTA Vice City", folder: "GTA Vice City" },
};

const MARKER = "mission-editor.json";
const MAX_RECENT = 10;
/** Characters Windows forbids in a folder name, plus a leading dot. */
const BAD_NAME = /[<>:"/\\|?*\x00-\x1f]|^\./;

export function projectsFolder(dirs: ProjectDirs, game: Game): string {
  return join(dirs.documents, GAMES[game].folder, "Projects");
}

const sameFolder = (a: string, b: string) =>
  Deno.build.os === "windows"
    ? resolve(a).toLowerCase() === resolve(b).toLowerCase()
    : resolve(a) === resolve(b);

async function isDirectory(path: string): Promise<boolean> {
  try {
    return (await Deno.stat(path)).isDirectory;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return false;
    throw error;
  }
}

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await Deno.readTextFile(path));
  } catch (error) {
    if (error instanceof Deno.errors.NotFound || error instanceof SyntaxError) {
      return undefined;
    }
    throw error;
  }
}

const isGame = (value: unknown): value is Game =>
  value === "gta3" || value === "vc";

const recentsPath = (dirs: ProjectDirs) =>
  join(dirs.appData, "GTA", "projects.json");

/** Remembered projects, newest first, without the ones whose folder is gone. */
export async function readRecents(dirs: ProjectDirs): Promise<ProjectEntry[]> {
  const file = await readJson(recentsPath(dirs)) as
    | { recent?: ProjectEntry[] }
    | undefined;
  const entries = (file?.recent ?? []).filter((e) =>
    typeof e?.path === "string" && typeof e.name === "string" &&
    isGame(e.game)
  );
  const present = await Promise.all(entries.map((e) => isDirectory(e.path)));
  return entries.filter((_, i) => present[i]);
}

async function writeRecents(dirs: ProjectDirs, recent: ProjectEntry[]) {
  const path = recentsPath(dirs);
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(
    path,
    JSON.stringify(
      { version: 1, recent: recent.slice(0, MAX_RECENT) },
      null,
      2,
    ),
  );
}

async function readGame(folder: string): Promise<Game | undefined> {
  const marker = await readJson(join(folder, MARKER)) as
    | { game?: unknown }
    | undefined;
  return isGame(marker?.game) ? marker.game : undefined;
}

/** Folders in the two game Projects folders that look like projects and are not remembered yet. */
export async function scanProjects(
  dirs: ProjectDirs,
  skip: ProjectEntry[] = [],
): Promise<ProjectEntry[]> {
  const found: ProjectEntry[] = [];
  for (const game of Object.keys(GAMES) as Game[]) {
    const root = projectsFolder(dirs, game);
    let entries: Deno.DirEntry[];
    try {
      entries = await Array.fromAsync(Deno.readDir(root));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) continue;
      throw error;
    }
    for (const entry of entries) {
      if (!entry.isDirectory) continue;
      const path = join(root, entry.name);
      if (skip.some((s) => sameFolder(s.path, path))) continue;
      const looksLikeProject = await isDirectory(join(path, "missions")) ||
        await Deno.stat(join(path, "main.txt")).then(() => true, () => false);
      if (looksLikeProject) {
        found.push({
          name: entry.name,
          path,
          game: await readGame(path) ?? game,
        });
      }
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

/** Everything the welcome page shows, plus where a new project goes by default for each game. */
export async function listProjects(dirs: ProjectDirs) {
  const recent = await readRecents(dirs);
  return {
    recent,
    found: await scanProjects(dirs, recent),
    defaultLocations: {
      gta3: projectsFolder(dirs, "gta3"),
      vc: projectsFolder(dirs, "vc"),
    } satisfies Record<Game, string>,
  };
}

async function remember(dirs: ProjectDirs, entry: ProjectEntry) {
  const entries = await readRecents(dirs);
  const stamped = { ...entry, lastOpened: new Date().toISOString() };
  await writeRecents(dirs, [
    stamped,
    ...entries.filter((e) => !sameFolder(e.path, entry.path)),
  ]);
  return stamped;
}

/** Throws when `path` is not a folder. Remembers the project at the top of the list. */
export async function openProject(
  dirs: ProjectDirs,
  path: string,
  game?: Game,
): Promise<ProjectEntry> {
  const folder = resolve(path);
  if (!await isDirectory(folder)) throw new Error(`${folder} is not a folder`);
  const known = (await readRecents(dirs)).find((e) =>
    sameFolder(e.path, folder)
  );
  return await remember(dirs, {
    name: basename(folder),
    path: folder,
    game: game ?? await readGame(folder) ?? known?.game ?? "gta3",
  });
}

/** Makes `<parent>/<name>/missions/` and the project marker, then remembers the project. */
export async function createProject(
  dirs: ProjectDirs,
  options: { name: string; game: Game; parent: string },
): Promise<ProjectEntry> {
  const name = options.name.trim();
  if (!name) throw new Error("Name the project");
  if (name.length > 64 || BAD_NAME.test(name)) {
    throw new Error(
      'The name cannot contain < > : " / \\ | ? * or start with a dot',
    );
  }
  if (!isGame(options.game)) throw new Error("Choose a game");
  const parent = resolve(options.parent);
  const folder = join(parent, name);
  if (await isDirectory(folder)) throw new Error(`${folder} already exists`);
  await Deno.mkdir(join(folder, "missions"), { recursive: true });
  await Deno.writeTextFile(
    join(folder, MARKER),
    JSON.stringify({ game: options.game }, null, 2) + "\n",
  );
  return await remember(dirs, { name, path: folder, game: options.game });
}
