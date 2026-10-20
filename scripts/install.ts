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
  console.error(
    `Error: Drag-N-Drop archive not found at ${dragDropZip}. Run 'deno task build' first.`,
  );
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
  console.error(
    "[-] Failed to extract Drag-N-Drop.zip via tar:",
    new TextDecoder().decode(stderr),
  );
  Deno.exit(1);
}
console.log("  [+] Extracted Drag-N-Drop package assets into game directory");

/**
 * Lints for loose copies of packaged scripts in `[gta3]/CLEO`. CLEO loads that
 * folder directly, so a stale copy there can shadow the modloader one.
 */
async function findShadowingCleoFiles(
  packagedDir: string,
  looseDir: string,
): Promise<string[]> {
  const shadowing: string[] = [];
  let looseNames: Set<string>;
  try {
    looseNames = new Set<string>();
    for await (const entry of Deno.readDir(looseDir)) {
      if (entry.isFile) looseNames.add(entry.name.toLowerCase());
    }
  } catch {
    return shadowing; // No loose folder, nothing can shadow
  }
  try {
    for await (const entry of Deno.readDir(packagedDir)) {
      if (entry.isFile && looseNames.has(entry.name.toLowerCase())) {
        shadowing.push(join(looseDir, entry.name));
      }
    }
  } catch {
    // Nothing packaged in this folder
  }
  return shadowing;
}

const shadowedFiles = [
  ...await findShadowingCleoFiles(
    join(noodlesDestDir, "cleo"),
    join(gta3Base, "CLEO"),
  ),
  ...await findShadowingCleoFiles(
    join(noodlesDestDir, "cleo", "cleo_text"),
    join(gta3Base, "CLEO", "CLEO_TEXT"),
  ),
];
if (shadowedFiles.length > 0) {
  console.error(
    "[-] Conflict: these files in [gta3]/CLEO duplicate packaged modloader/Noodles files and may be stale:",
  );
  for (const file of shadowedFiles) console.error(`      ${file}`);
  console.error(
    "    Remove them so the modloader copies are the ones that run.",
  );
  Deno.exit(1);
}

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
