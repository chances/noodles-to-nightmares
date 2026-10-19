/**
 * build.ts
 *
 * Compiles Sanny Builder scripts and packages mod assets into dist/Drag-N-Drop.zip:
 * - modloader/Noodles/data/main.scm (Main script)
 * - modloader/Noodles/cleo/*.cm (Mission threads)
 * - modloader/Noodles/models/gta3.img/ (*.dff, *.txd, *.col models)
 * - modloader/Noodles/data/maps/ (Map placements and IDE/IPL)
 * - modloader/Noodles/noodles_custom.txt (Map manifest directives)
 * - modloader/Noodles/txd/ (UI, splash, and loading screens)
 * - modloader/Noodles/cleo/cleo_text/UL_TEXT.fxt (Text strings)
 *
 * Supports interactive bisection and step filtering via:
 * --bisect, -b, --step=<N>, --only=<name>, --skip=<name>
 */

import { basename, extname, join } from "@std/path";
import { copy } from "@std/fs/copy";
import { ensureDir } from "@std/fs/ensure-dir";
import { walk } from "@std/fs/walk";
import { capitalCase } from "change-case";

// Bisection / filtering arguments
const args = Deno.args;
const isBisect = args.includes("--bisect") || args.includes("-b");
const onlyArg = args.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");
const skipArg = args.find((a) => a.startsWith("--skip="))?.slice(7)?.split(",");
const stepArg = args.find((a) => a.startsWith("--step="))?.slice(7)?.split(",")
  .map(Number);

function shouldRun(stepNum: number, stepName: string): boolean {
  if (stepArg && !stepArg.includes(stepNum)) return false;
  if (onlyArg && !onlyArg.includes(stepName)) return false;
  if (skipArg && skipArg.includes(stepName)) return false;
  if (isBisect) {
    const res = prompt(`Build Step ${stepNum} (${stepName})? [Y/n]:`);
    return res === null || res.trim().toLowerCase() !== "n";
  }
  return true;
}

/** Compiles a script using the Sanny Builder CLI. */
async function compile(inputPath: string, outputPath: string) {
  const sannyExe = Deno.env.get("SANNY") || "sanny.exe";
  const command = new Deno.Command(sannyExe, {
    args: [
      "--no-splash",
      "--mode",
      "gta3_sbl",
      "--compile",
      inputPath,
      outputPath,
    ],
    stdout: "inherit",
  });
  const { success } = await command.output();
  if (!success) {
    console.error(`Failed to compile: ${inputPath}`);
    Deno.exit(1);
  }
}

function formatMissionName(name: string): string {
  name = capitalCase(name);
  return name.startsWith("Side")
    ? name.replace(/^Side/, "Side:")
    : name.replace(/^(\d+)/, "$1:");
}

const cwd = Deno.cwd();
const distDir = join(cwd, "dist");
const stagingDir = join(distDir, ".staging");
const noodlesStagingDir = join(stagingDir, "modloader", "Noodles");
const dragDropZip = join(distDir, "Drag-N-Drop.zip");

// Ensure clean staging directory
try {
  await Deno.remove(stagingDir, { recursive: true });
} catch {
  // Ignored if stagingDir does not exist
}
await ensureDir(stagingDir);

// 0. Preserve existing zip assets (modloader/.data, modloader.ini, movies/GTAtitles.mpg)
try {
  const stat = await Deno.stat(dragDropZip);
  if (stat.isFile) {
    console.log("Preserving existing zip assets from Drag-N-Drop.zip...");
    const cmd = new Deno.Command("tar", {
      args: ["-xf", dragDropZip, "-C", stagingDir],
    });
    await cmd.output();
    // Clear out old Noodles mod directory in staging so only selected steps are packaged
    try {
      await Deno.remove(noodlesStagingDir, { recursive: true });
    } catch {
      // Ignored
    }
    // Remove obsolete loose root models directory if present in zip
    try {
      await Deno.remove(join(stagingDir, "models"), { recursive: true });
    } catch {
      // Ignored
    }
  }
} catch {
  // Archive does not exist yet
}

await ensureDir(noodlesStagingDir);

// Step 1: Main Script
if (shouldRun(1, "main")) {
  console.log("Step 1 (main): Compiling main script...");
  const mainInput = join(cwd, "main.txt");
  const mainOutput = join(cwd, "main.scm");
  await compile(mainInput, mainOutput);

  const dataStagingDir = join(noodlesStagingDir, "data");
  await ensureDir(dataStagingDir);
  await Deno.copyFile(mainOutput, join(dataStagingDir, "main.scm"));
  console.log("  [+] Packaged modloader/Noodles/data/main.scm");
}

// Step 2: Missions
if (shouldRun(2, "missions")) {
  console.log("Step 2 (missions): Compiling missions...");
  const missionsDir = join(cwd, "missions");
  const cleoStagingDir = join(noodlesStagingDir, "cleo");
  await ensureDir(cleoStagingDir);

  const missionEntries = await Array.fromAsync(Deno.readDir(missionsDir));
  const missions = missionEntries.sort((a, b) => a.name.localeCompare(b.name));

  for await (const entry of missions) {
    const inputExt = extname(entry.name);
    if (!entry.isFile || inputExt !== ".txt") continue;

    const entryName = formatMissionName(basename(entry.name, ".txt"));
    const inputPath = join(missionsDir, entry.name);
    const missionName = basename(entry.name, ".txt");
    const outputPath = join(missionsDir, `${missionName}.cm`);

    console.log(`  [*] Compiling ${entryName}`);
    await compile(inputPath, outputPath);
    await Deno.copyFile(outputPath, join(cleoStagingDir, `${missionName}.cm`));
  }
  console.log("  [+] Packaged modloader/Noodles/cleo/*.cm");
}

// Step 3: Models (Compiles manifested models from Blender via export-blend-models.py and packages overrides)
if (shouldRun(3, "models")) {
  console.log(
    "Step 3 (models): Compiling and packaging manifested model overrides...",
  );
  const modelsDir = join(cwd, "models");
  const manifestPath = join(modelsDir, "manifest.csv");
  const exportScript = join(cwd, "scripts", "export-blend-models.py");
  const pythonExe = Deno.env.get("PYTHON") || "python";
  const imgStagingDir = join(noodlesStagingDir, "models", "gta3.img");
  const colStagingDir = join(
    noodlesStagingDir,
    "data",
    "maps",
    "noodles",
    "col",
  );
  await ensureDir(imgStagingDir);
  await ensureDir(colStagingDir);

  const manifestContent = await Deno.readTextFile(manifestPath);
  const lines = manifestContent.trim().split("\n");
  const header = lines[0].split(",").map((s) => s.trim());
  let count = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(",").map((s) => s.trim());
    if (row.length < header.length) continue;
    const entry: Record<string, string> = {};
    header.forEach((k, idx) => (entry[k] = row[idx]));

    if (entry.enabled?.toLowerCase() !== "true") continue;

    const folderPath = join(modelsDir, entry.folder);

    // 1. Compile models from Blender document if present
    try {
      for await (const dirEntry of Deno.readDir(folderPath)) {
        if (dirEntry.isFile && dirEntry.name.endsWith(".blend")) {
          const blendPath = join(folderPath, dirEntry.name);
          console.log(
            `  [*] Compiling model from Blender: ${dirEntry.name}...`,
          );
          const cmd = new Deno.Command(pythonExe, {
            args: [exportScript, blendPath, folderPath],
          });
          const { success, stderr } = await cmd.output();
          if (!success) {
            console.warn(
              `  [-] Warning: Blender export failed for ${dirEntry.name}:`,
              new TextDecoder().decode(stderr),
            );
          }
        }
      }
    } catch {
      // Ignored if directory cannot be read
    }

    // 2. Patch internal collision header if needed so header model name matches IDE
    if (entry.col && entry.name) {
      const colPath = join(folderPath, entry.col);
      try {
        const data = await Deno.readFile(colPath);
        if (new TextDecoder().decode(data.subarray(0, 4)) === "COLL") {
          const nameBytes = new Uint8Array(22);
          const encoded = new TextEncoder().encode(entry.name);
          nameBytes.set(encoded.subarray(0, 21));
          data.set(nameBytes, 8);
          await Deno.writeFile(colPath, data);
        }
      } catch {
        // Ignored
      }
    }

    if (entry.dff) {
      await Deno.copyFile(
        join(folderPath, entry.dff),
        join(imgStagingDir, entry.dff),
      );
      console.log(`  [+] Packaged DFF: ${entry.dff}`);
      count++;
    }
    if (entry.txd) {
      await Deno.copyFile(
        join(folderPath, entry.txd),
        join(imgStagingDir, entry.txd),
      );
      console.log(`  [+] Packaged TXD: ${entry.txd}`);
      count++;
    }
    if (entry.col) {
      const srcCol = join(folderPath, entry.col);
      try {
        await Deno.copyFile(srcCol, join(colStagingDir, entry.col));
        console.log(`  [+] Packaged COL: ${entry.col}`);
        count++;
      } catch {
        const dataCol = join(cwd, "data", "maps", "noodles", "col", entry.col);
        try {
          await Deno.copyFile(dataCol, join(colStagingDir, entry.col));
          console.log(`  [+] Packaged COL: ${entry.col} (from data/maps)`);
          count++;
        } catch {
          console.warn(`  [-] Warning: COL not found for ${entry.col}`);
        }
      }
    }
  }
  console.log(`  [+] Packaged ${count} manifested model assets`);
}

// Step 4: Maps
if (shouldRun(4, "maps")) {
  console.log("Step 4 (maps): Packaging custom map files...");
  const mapsSrc = join(cwd, "data", "maps");
  const mapsDest = join(noodlesStagingDir, "data", "maps");
  try {
    const stat = await Deno.stat(mapsSrc);
    if (stat.isDirectory) {
      await ensureDir(mapsDest);
      await copy(mapsSrc, mapsDest, { overwrite: true });
      console.log("  [+] Packaged modloader/Noodles/data/maps/");
    }
  } catch {
    // Optional
  }

  // Synchronize data/noodles_custom.txt with models/manifest.csv
  const manifestCsvPath = join(cwd, "models", "manifest.csv");
  const manifestSrc = join(cwd, "data", "noodles_custom.txt");
  const manifestDest = join(noodlesStagingDir, "noodles_custom.txt");

  try {
    const csvContent = await Deno.readTextFile(manifestCsvPath);
    const customTxtContent = await Deno.readTextFile(manifestSrc);

    const csvLines = csvContent.trim().split("\n");
    const header = csvLines[0].split(",").map((s) => s.trim());
    const enabledCols = new Map<string, boolean>();

    for (let i = 1; i < csvLines.length; i++) {
      const row = csvLines[i].split(",").map((s) => s.trim());
      if (row.length < header.length) continue;
      const entry: Record<string, string> = {};
      header.forEach((k, idx) => (entry[k] = row[idx]));
      if (entry.col) {
        enabledCols.set(
          entry.col.toLowerCase(),
          entry.enabled?.toLowerCase() === "true",
        );
      }
    }

    const updatedTxtLines = customTxtContent.split(/\r?\n/).map((line) => {
      for (const [colFile, isEnabled] of enabledCols) {
        if (line.toLowerCase().includes(colFile)) {
          const clean = line.replace(/^#\s*/, "").trim();
          return isEnabled ? clean : `# ${clean}`;
        }
      }
      return line;
    });

    const newTxtContent = updatedTxtLines.join("\n");
    await Deno.writeTextFile(manifestSrc, newTxtContent);
    await Deno.copyFile(manifestSrc, manifestDest);
    console.log(
      "  [+] Synchronized and packaged modloader/Noodles/noodles_custom.txt",
    );
  } catch {
    // Fallback if manifest files not present
    await Deno.writeTextFile(
      manifestDest,
      "COLFILE 0 data/maps/noodles/col/rosa_apartment.col\nIDE data/maps/noodles/custom.ide\nIPL data/maps/noodles/custom.ipl\n",
    );
    console.log("  [+] Created modloader/Noodles/noodles_custom.txt");
  }
}

// Step 5: TXD UI/Splash Overrides
if (shouldRun(5, "txd")) {
  console.log(
    "Step 5 (txd): Packaging TXD overrides into modloader/Noodles/txd/...",
  );
  const txdDir = join(cwd, "data", "txd");
  const txdStagingDir = join(noodlesStagingDir, "txd");
  await ensureDir(txdStagingDir);

  let txdCount = 0;
  for await (const entry of Deno.readDir(txdDir)) {
    if (entry.isFile && entry.name.toLowerCase().endsWith(".txd")) {
      await Deno.copyFile(
        join(txdDir, entry.name),
        join(txdStagingDir, entry.name),
      );
      txdCount++;
    }
  }
  console.log(`  [+] Packaged ${txdCount} TXDs to modloader/Noodles/txd/`);
}

// Step 6: Text Strings
if (shouldRun(6, "text")) {
  const fxtSrc = join(cwd, "UL_TEXT.fxt");
  try {
    const stat = await Deno.stat(fxtSrc);
    if (stat.isFile) {
      console.log("Step 6 (text): Packaging text strings (UL_TEXT.fxt)...");
      const cleoTextDir = join(noodlesStagingDir, "cleo", "cleo_text");
      await ensureDir(cleoTextDir);
      await Deno.copyFile(fxtSrc, join(cleoTextDir, "UL_TEXT.fxt"));
      console.log(
        "  [+] Packaged modloader/Noodles/cleo/cleo_text/UL_TEXT.fxt",
      );
    }
  } catch {
    // Optional
  }
}

// Packaging archive into dist/Drag-N-Drop.zip
console.log("Packaging dist/Drag-N-Drop.zip...");
await ensureDir(distDir);
const topLevelEntries: string[] = [];
for await (const entry of Deno.readDir(stagingDir)) {
  topLevelEntries.push(entry.name);
}

if (topLevelEntries.length === 0) {
  console.error("[-] No assets in staging directory to package.");
  Deno.exit(1);
}

const tarCmd = new Deno.Command("tar", {
  args: ["-a", "-cf", dragDropZip, "-C", stagingDir, ...topLevelEntries],
});
const { success: tarSuccess, stderr: tarStderr } = await tarCmd.output();
if (!tarSuccess) {
  console.error(
    "[-] Failed to create Drag-N-Drop.zip:",
    new TextDecoder().decode(tarStderr),
  );
  Deno.exit(1);
}

// Clean up staging directory
try {
  await Deno.remove(stagingDir, { recursive: true });
} catch {
  // Ignored
}

console.log("  [+] dist/Drag-N-Drop.zip successfully built!");
