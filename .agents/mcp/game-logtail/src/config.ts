import { dirname, fromFileUrl, join } from "@std/path";

const SRC_DIR = dirname(fromFileUrl(import.meta.url));

export const PACKAGE_DIR = join(SRC_DIR, "..");
export const REPO_ROOT = join(PACKAGE_DIR, "..", "..", "..");
export const RULES_PATH = join(PACKAGE_DIR, "rules.json");
export const ALERTS_PATH = join(REPO_ROOT, "dist", "game-alerts.jsonl");
export const STATE_PATH = join(REPO_ROOT, "dist", "game-alerts-state.json");

/** Process image names that count as a running game. `gta3-game.exe` is the hardlink runner. */
export const GAME_PROCESSES = ["gta3.exe", "gta3-game.exe"];

/**
 * - `append`: grows while the game runs; new complete lines are scanned.
 * - `snapshot`: small file rewritten in place; scanned whole when it changes.
 * - `exit-only`: too large or chatty to scan live; scanned whole when the game exits.
 */
export type LogMode = "append" | "snapshot" | "exit-only";

export interface LogSource {
  id: string;
  /** Path relative to the game folder. */
  path: string;
  mode: LogMode;
}

export const LOG_SOURCES: LogSource[] = [
  { id: "cleo", path: "cleo.log", mode: "append" },
  { id: "cleo_redux", path: "cleo_redux.log", mode: "append" },
  { id: "modloader", path: "modloader/modloader.log", mode: "append" },
  { id: "scrlog", path: "scrlog.log", mode: "exit-only" },
  { id: "debug_ini", path: "CLEO/debug.ini", mode: "snapshot" },
  { id: "d3d8", path: "d3d8.log", mode: "append" },
];

export function gameDir(): string {
  const dir = Deno.env.get("GTA3");
  if (!dir) {
    throw new Error(
      "GTA3 is not set. Add GTA3=<game install folder> to the project .env file.",
    );
  }
  return dir;
}
