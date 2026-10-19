/**
 * install.ts
 *
 * Installs the entire Noodles to Nightmares mod into the GTA III installation:
 * - Drag-N-Drop package (models/gta3.img, movies/GTAtitles.mpg, TXDs)
 * - Custom map placements (data/maps/industne/INDUSTNE.ipl)
 * - UI and splash screen textures (assets/*.txd -> txd/)
 * - Compiled scripts and missions (main.scm, cleo/*.cm, cleo_text/UL_TEXT.fxt)
 * - Game runner hardlink (gta3-game.exe)
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";
import { copy } from "@std/fs/copy";

const gta3Base = Deno.env.get("GTA3");
if (!gta3Base) {
  console.error("Error: GTA3 environment variable is not set in .env.");
  Deno.exit(1);
}

const cwd = Deno.cwd();

console.log(`Installing mod: ${gta3Base}`);

async function sha256(filePath: string): Promise<string> {
  const bytes = await Deno.readFile(filePath);
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function installAndVerifyFile(src: string, dest: string, label: string): Promise<void> {
  await Deno.copyFile(src, dest);
  const srcHash = await sha256(src);
  const destHash = await sha256(dest);
  if (srcHash !== destHash) {
    throw new Error(`Hash mismatch for ${label}! Source: ${srcHash}, Dest: ${destHash}`);
  }
  console.log(`  [+] Installed & verified ${label} [sha256: ${srcHash.slice(0, 8)}...]`);
}

// 1. Extract dist/Drag-N-Drop.zip (gta3.img, movies, etc.)
const dragDropZip = join(cwd, "dist", "Drag-N-Drop.zip");
try {
  const stat = await Deno.stat(dragDropZip);
  if (stat.isFile) {
    console.log("  [+] Extracting dist/Drag-N-Drop.zip package...");
    const cmd = new Deno.Command("tar", {
      args: ["-xf", dragDropZip, "-C", gta3Base],
    });
    const { success } = await cmd.output();
    if (success) {
      console.log("  [+] Installed models/gta3.img and package assets");
    } else {
      console.warn("  [-] Failed to extract Drag-N-Drop.zip via tar");
    }
  }
} catch (e) {
  console.warn("  [-] Drag-N-Drop.zip not found:", e);
}

// 2. Install map placement files (data/maps/)
const mapsSrc = join(cwd, "data", "maps");
const mapsDest = join(gta3Base, "data", "maps");
try {
  const stat = await Deno.stat(mapsSrc);
  if (stat.isDirectory) {
    await ensureDir(mapsDest);
    await copy(mapsSrc, mapsDest, { overwrite: true });
    console.log("  [+] Installed data/maps/ placements (INDUSTNE.ipl)");
  }
} catch {
  // Optional
}

// 3. Install TXD files from assets/ to txd/ (LOADSC0.TXD, splash3.txd, etc.)
const assetsDir = join(cwd, "assets");
const txdDestDir = join(gta3Base, "txd");
await ensureDir(txdDestDir);

for await (const entry of Deno.readDir(assetsDir)) {
  if (entry.isFile && entry.name.toLowerCase().endsWith(".txd")) {
    await installAndVerifyFile(
      join(assetsDir, entry.name),
      join(txdDestDir, entry.name),
      `txd/${entry.name}`,
    );
  }
}

// 4. Install main.scm to data/
const mainScm = join(cwd, "main.scm");
const dataDir = join(gta3Base, "data");
await ensureDir(dataDir);
try {
  await installAndVerifyFile(mainScm, join(dataDir, "main.scm"), "data/main.scm");
} catch {
  // main.scm may not be built yet
}

// 5. Install compiled missions to cleo/
const missionsSrcDir = join(cwd, "missions");
const cleoDestDir = join(gta3Base, "cleo");
await ensureDir(cleoDestDir);

for await (const entry of Deno.readDir(missionsSrcDir)) {
  if (entry.isFile && entry.name.endsWith(".cm")) {
    await installAndVerifyFile(
      join(missionsSrcDir, entry.name),
      join(cleoDestDir, entry.name),
      `cleo/${entry.name}`,
    );
  }
}

// 6. Install text strings (UL_TEXT.fxt) if present
const fxtSrc = join(cwd, "UL_TEXT.fxt");
const cleoTextDir = join(cleoDestDir, "cleo_text");
await ensureDir(cleoTextDir);
try {
  await installAndVerifyFile(fxtSrc, join(cleoTextDir, "UL_TEXT.fxt"), "cleo/cleo_text/UL_TEXT.fxt");
} catch {
  // Optional
}

// 7. Ensure unflagged runner hardlink exists (bypasses Windows UAC elevation)
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
