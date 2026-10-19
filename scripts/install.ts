/**
 * install.ts
 *
 * Installs compiled scripts, missions, and textures into the local GTA III installation.
 * Uses the GTA3 path configured in .env.
 */

import { join } from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";

const gta3Base = Deno.env.get("GTA3");
if (!gta3Base) {
  console.error("Error: GTA3 environment variable is not set in .env.");
  Deno.exit(1);
}

const cwd = Deno.cwd();

console.log(`Installing project assets to GTA3: ${gta3Base}`);

// 1. Install splash3.txd to txd/
const splashSrc = join(cwd, "assets", "splash3.txd");
const splashDestDir = join(gta3Base, "txd");
await ensureDir(splashDestDir);
try {
  await Deno.copyFile(splashSrc, join(splashDestDir, "splash3.txd"));
  console.log("  [+] Installed txd/splash3.txd");
} catch (e) {
  console.warn("  [-] splash3.txd not found or could not be copied:", e);
}

// 2. Install main.scm to data/
const mainScm = join(cwd, "main.scm");
const dataDir = join(gta3Base, "data");
await ensureDir(dataDir);
try {
  await Deno.copyFile(mainScm, join(dataDir, "main.scm"));
  console.log("  [+] Installed data/main.scm");
} catch {
  // main.scm may not be built yet
}

// 3. Install compiled missions to cleo/
const missionsSrcDir = join(cwd, "missions");
const cleoDestDir = join(gta3Base, "cleo");
await ensureDir(cleoDestDir);

for await (const entry of Deno.readDir(missionsSrcDir)) {
  if (entry.isFile && entry.name.endsWith(".cm")) {
    await Deno.copyFile(
      join(missionsSrcDir, entry.name),
      join(cleoDestDir, entry.name),
    );
    console.log(`  [+] Installed cleo/${entry.name}`);
  }
}

// 4. Install text strings (UL_TEXT.fxt) if present
const fxtSrc = join(cwd, "UL_TEXT.fxt");
const cleoTextDir = join(cleoDestDir, "cleo_text");
await ensureDir(cleoTextDir);
try {
  await Deno.copyFile(fxtSrc, join(cleoTextDir, "UL_TEXT.fxt"));
  console.log("  [+] Installed cleo/cleo_text/UL_TEXT.fxt");
} catch {
  // Optional
}

console.log("Installation complete!");
