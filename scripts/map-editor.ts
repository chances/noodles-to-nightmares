/**
 * map-editor.ts
 *
 * Launches the Ariane map editor (ariane.exe) from the GTA III installation directory specified in .env.
 */

import { join } from "@std/path";

const gta3Base = Deno.env.get("GTA3");
if (!gta3Base) {
  console.error("Error: GTA3 environment variable is not set in .env.");
  Deno.exit(1);
}

const exePath = join(gta3Base, "ariane.exe");

try {
  const stat = await Deno.stat(exePath);
  if (!stat.isFile) {
    throw new Error("Not a file");
  }
} catch {
  console.error(`Error: Executable not found at ${exePath}`);
  Deno.exit(1);
}

console.log(`Launching Ariane map editor: ${exePath}`);

const command = new Deno.Command(exePath, {
  cwd: gta3Base,
});

const child = command.spawn();
await child.status;
