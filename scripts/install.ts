/**
 * install.ts
 *
 * Installs the Noodles to Nightmares mod by extracting dist/Drag-N-Drop.zip
 * over into the GTA III game directory, and ensuring the unflagged runner
 * hardlink exists.
 */

import { join } from "@std/path";

const gta3Base = Deno.env.get("GTA3");
if (!gta3Base) {
  console.error("Error: GTA3 environment variable is not set in .env.");
  Deno.exit(1);
}

const cwd = Deno.cwd();
const dragDropZip = join(cwd, "dist", "Drag-N-Drop.zip");

try {
  const stat = await Deno.stat(dragDropZip);
  if (!stat.isFile) {
    throw new Error("Not a file");
  }
} catch {
  console.error(`Error: Drag-N-Drop archive not found at ${dragDropZip}. Run 'deno task build' first.`);
  Deno.exit(1);
}

console.log(`Installing mod from ${dragDropZip} into ${gta3Base}...`);

// Clean existing modloader/Noodles directory before extraction
const noodlesDestDir = join(gta3Base, "modloader", "Noodles");
try {
  await Deno.remove(noodlesDestDir, { recursive: true });
  console.log("  [+] Cleaned existing modloader/Noodles directory");
} catch {
  // Ignored if directory doesn't exist
}

const cmd = new Deno.Command("tar", {
  args: ["-xf", dragDropZip, "-C", gta3Base],
});
const { success, stderr } = await cmd.output();
if (!success) {
  console.error("[-] Failed to extract Drag-N-Drop.zip via tar:", new TextDecoder().decode(stderr));
  Deno.exit(1);
}
console.log("  [+] Extracted Drag-N-Drop package assets into game directory");

// Ensure unflagged runner hardlink exists (bypasses Windows UAC elevation)
const gtaExe = join(gta3Base, "gta3.exe");
const runnerExe = join(gta3Base, "gta3-game.exe");
try {
  await Deno.stat(runnerExe);
} catch {
  try {
    await Deno.link(gtaExe, runnerExe);
    console.log("  [+] Created runner link gta3-game.exe (bypasses UAC)");
  } catch {
    // Ignore if link unsupported
  }
}

console.log("Noodles to Nightmares mod installation complete!");
