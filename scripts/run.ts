/**
 * run.ts
 *
 * Launches GTA III from the installation directory specified in .env.
 */

import { join } from "@std/path";
import { say } from "./log.ts";

const gta3Base = Deno.env.get("GTA3");
if (!gta3Base) {
  say.error("GTA3 environment variable is not set in .env");
  Deno.exit(1);
}

const exePath = join(gta3Base, "gta3.exe");

try {
  const stat = await Deno.stat(exePath);
  if (!stat.isFile) {
    throw new Error("Not a file");
  }
} catch {
  say.error(`Executable not found at ${exePath}`);
  Deno.exit(1);
}

// Prefer unflagged hardlink runner to bypass HKLM UAC elevation prompt
const runnerExe = join(gta3Base, "gta3-game.exe");
let targetExe = exePath;

try {
  const stat = await Deno.stat(runnerExe);
  if (stat.isFile) targetExe = runnerExe;
} catch {
  // Fall back to gta3.exe
}

say.info(`Launching Grand Theft Auto III: ${targetExe}`);

const command = new Deno.Command(targetExe, {
  cwd: gta3Base,
});

const child = command.spawn();
await child.status;
