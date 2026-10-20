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
 *
 * Model assets are bisected with --skip-asset=<asset|model|model:asset>[,...]
 * where <asset> is dff, txd, or col (e.g. --skip-asset=dinerind:col,dff), and a
 * bare <model> skips all of that model's assets (e.g. --skip-asset=dinerind).
 * A skipped COL is also commented out of the staged noodles_custom.txt. With
 * --bisect, each manifested model asset is prompted for instead.
 */

import { basename, dirname, extname, join } from "@std/path";
import { ensureDir } from "@std/fs/ensure-dir";
import { capitalCase } from "change-case";
import {
  blue,
  cyan,
  green,
  magenta,
  red,
  setColorEnabled,
  yellow,
} from "@std/fmt/colors";

// Color the `[+]` / `[=]` / `[*]` / `[~]` / `[-]` indicators when the stream is a TTY
const tagColors: Record<string, (s: string) => string> = {
  "+": green,
  "=": cyan,
  "*": blue,
  "~": magenta,
  "-": yellow,
};

/** Wraps a console method so line-leading `[x]` indicators are colored, only for terminals. */
function colorizeTags(
  method: "log" | "warn" | "error",
  stream: { isTerminal(): boolean },
) {
  if (!stream.isTerminal() || Deno.noColor) return;
  setColorEnabled(true);
  const original = console[method].bind(console);
  console[method] = (...data: unknown[]) => {
    original(
      ...data.map((d) =>
        typeof d === "string"
          ? d.replace(
            /^(\s*)\[([+=*~-])\]/gm,
            (_, indent: string, tag: string) =>
              `${indent}${
                (method === "error" ? red : tagColors[tag])(`[${tag}]`)
              }`,
          )
          : d
      ),
    );
  };
}
colorizeTags("log", Deno.stdout);
colorizeTags("warn", Deno.stderr);
colorizeTags("error", Deno.stderr);

// Bisection / filtering arguments
const args = Deno.args;
const isBisect = args.includes("--bisect") || args.includes("-b");
const onlyArg = args.find((a) => a.startsWith("--only="))?.slice(7)?.split(",");
const skipArg = args.find((a) => a.startsWith("--skip="))?.slice(7)?.split(",");
const stepArg = args.find((a) => a.startsWith("--step="))?.slice(7)?.split(",")
  .map(Number);

const skipAssetArg = args.find((a) => a.startsWith("--skip-asset="))?.slice(13)
  ?.split(",").map((s) => s.trim().toLowerCase());

type ModelAsset = "dff" | "txd" | "col";
const assetAnswers = new Map<string, boolean>();

/** Whether a manifested model's asset is packaged, per --skip-asset or the --bisect prompt. */
function shouldPackageAsset(modelName: string, asset: ModelAsset): boolean {
  const name = modelName.toLowerCase();
  if (
    skipAssetArg?.includes(asset) || skipAssetArg?.includes(name) ||
    skipAssetArg?.includes(`${name}:${asset}`)
  ) {
    return false;
  }
  if (!isBisect) return true;
  const key = `${name}:${asset}`;
  let answer = assetAnswers.get(key);
  if (answer === undefined) {
    const res = prompt(
      `Package ${asset.toUpperCase()} for ${modelName}? [Y/n]:`,
    );
    answer = res === null || res.trim().toLowerCase() !== "n";
    assetAnswers.set(key, answer);
  }
  return answer;
}

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

/** Hex SHA-256 of a string or bytes. */
async function sha256(data: string | Uint8Array<ArrayBuffer>): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    typeof data === "string" ? new TextEncoder().encode(data) : data,
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hashes a script together with every file it `{$INCLUDE}`s, recursively. */
async function hashScript(
  path: string,
  seen = new Set<string>(),
): Promise<string> {
  if (seen.has(path)) return "";
  seen.add(path);
  const text = await Deno.readTextFile(path);
  const parts = [text];
  for (const m of text.matchAll(/\{\$INCLUDE\s+([^}]+)\}/gi)) {
    const includePath = join(dirname(path), m[1].trim());
    try {
      parts.push(await hashScript(includePath, seen));
    } catch {
      parts.push(`missing:${includePath}`);
    }
  }
  return await sha256(parts.join("\n"));
}

const cachePath = join(Deno.cwd(), "dist", ".build-cache.json");
let hashCache: Record<string, string> = {};
try {
  hashCache = JSON.parse(await Deno.readTextFile(cachePath));
} catch {
  // No cache yet; everything compiles
}

async function allExist(paths: string[]): Promise<boolean> {
  for (const path of paths) {
    try {
      await Deno.stat(path);
    } catch {
      return false;
    }
  }
  return true;
}

async function saveHash(key: string, hash: string) {
  hashCache[key] = hash;
  await ensureDir(dirname(cachePath));
  await Deno.writeTextFile(cachePath, JSON.stringify(hashCache, null, 2));
}

/**
 * Like make: compiles only when the source hash changed or the output is missing.
 * `dependsOn` scripts count toward the hash without being compiled themselves,
 * e.g. a mission reads main's global variable slots, so its output goes stale when they move.
 */
async function compileIfChanged(
  inputPath: string,
  outputPath: string,
  dependsOn: string[] = [],
) {
  const hash = await sha256(
    (await Promise.all([inputPath, ...dependsOn].map((p) => hashScript(p))))
      .join("\n"),
  );
  if (await allExist([outputPath]) && hashCache[inputPath] === hash) {
    console.log(`  [=] Up to date: ${basename(inputPath)}`);
    return;
  }

  await compile(inputPath, outputPath);
  await saveHash(inputPath, hash);
}

/** Recursively copies src to dest, following symlinks so staging holds real files. */
async function copyFollowingSymlinks(src: string, dest: string) {
  const stat = await Deno.stat(src);
  if (stat.isDirectory) {
    await ensureDir(dest);
    for await (const entry of Deno.readDir(src)) {
      await copyFollowingSymlinks(
        join(src, entry.name),
        join(dest, entry.name),
      );
    }
  } else {
    await Deno.copyFile(src, dest);
  }
}

/**
 * Writes each manifested model's `*.pos` coordinates into data/maps/noodles/custom.ipl.
 * A `*.pos` file in the model's folder wins; without one, the IPL line is left as is.
 * IDE lines carry no coordinates, so custom.ide is never touched.
 */
async function syncPositions() {
  const iplPath = join(cwd, "data", "maps", "noodles", "custom.ipl");
  const manifestText = await Deno.readTextFile(
    join(cwd, "models", "manifest.csv"),
  );
  const iplText = await Deno.readTextFile(iplPath);
  const eol = iplText.includes("\r\n") ? "\r\n" : "\n";
  const iplLines = iplText.split(/\r?\n/);

  const rows = manifestText.trim().split(/\r?\n/);
  const header = rows[0].split(",").map((s) => s.trim());
  for (const rowText of rows.slice(1)) {
    const cells = rowText.split(",").map((s) => s.trim());
    if (cells.length < header.length) continue;
    const entry: Record<string, string> = {};
    header.forEach((k, idx) => (entry[k] = cells[idx]));
    if (!entry.dff) continue;

    const folderPath = join(cwd, "models", entry.folder);
    let posFile: string | undefined;
    try {
      for await (const f of Deno.readDir(folderPath)) {
        if (f.isFile && f.name.toLowerCase().endsWith(".pos")) {
          posFile = f.name;
          break;
        }
      }
    } catch {
      continue;
    }
    if (!posFile) continue;

    const coords = (await Deno.readTextFile(join(folderPath, posFile)))
      .trim().split(/[\s,]+/).map(Number);
    if (coords.length < 3 || coords.slice(0, 3).some(Number.isNaN)) {
      console.warn(`  [-] Warning: ${posFile} is not "x y z"; skipped`);
      continue;
    }
    const [x, y, z] = coords.map((n) => n.toFixed(6));

    const modelName = basename(entry.dff, extname(entry.dff)).toLowerCase();
    const instLine =
      /^(\s*#?\s*\d+\s*,\s*(\S+?)\s*,\s*)[-+\d.eE]+(\s*,\s*)[-+\d.eE]+(\s*,\s*)[-+\d.eE]+(.*)$/;
    for (let i = 0; i < iplLines.length; i++) {
      const m = iplLines[i].match(instLine);
      if (!m || m[2].toLowerCase() !== modelName) continue;
      const synced = `${m[1]}${x}${m[3]}${y}${m[4]}${z}${m[5]}`;
      if (synced !== iplLines[i]) {
        iplLines[i] = synced;
        console.log(`  [~] custom.ipl ${modelName} <- ${posFile}`);
      }
    }
  }

  const synced = iplLines.join(eol);
  if (synced !== iplText) await Deno.writeTextFile(iplPath, synced);
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
  await compileIfChanged(mainInput, mainOutput);

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

    console.log(`  [*] ${entryName}`);
    await compileIfChanged(inputPath, outputPath, [join(cwd, "main.txt")]);
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
          const blendHash = await sha256(await Deno.readFile(blendPath));
          const outputs = [entry.dff, entry.col]
            .filter(Boolean)
            .map((f) => join(folderPath, f));
          if (
            hashCache[blendPath] === blendHash && await allExist(outputs)
          ) {
            console.log(`  [=] Up to date: ${dirEntry.name}`);
            continue;
          }
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
          } else {
            await saveHash(blendPath, blendHash);
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

    if (entry.dff && !shouldPackageAsset(entry.name, "dff")) {
      console.log(`  [-] Skipped DFF: ${entry.dff} (${entry.name})`);
    } else if (entry.dff) {
      // Staged under the IDE model name so it overrides the stock gta3.img entry
      const stagedDff = `${entry.name}.dff`;
      await Deno.copyFile(
        join(folderPath, entry.dff),
        join(imgStagingDir, stagedDff),
      );
      console.log(`  [+] Packaged DFF: ${entry.dff} as ${stagedDff}`);
      count++;
    }
    if (entry.txd && !shouldPackageAsset(entry.name, "txd")) {
      console.log(`  [-] Skipped TXD: ${entry.txd} (${entry.name})`);
    } else if (entry.txd) {
      await Deno.copyFile(
        join(folderPath, entry.txd),
        join(imgStagingDir, entry.txd),
      );
      console.log(`  [+] Packaged TXD: ${entry.txd}`);
      count++;
    }
    if (entry.col && !shouldPackageAsset(entry.name, "col")) {
      console.log(`  [-] Skipped COL: ${entry.col} (${entry.name})`);
    } else if (entry.col) {
      // Staged under the IDE model name, matching data/maps/noodles/col/<name>.col
      const stagedCol = `${entry.name}.col`;
      const srcCol = join(folderPath, entry.col);
      try {
        await Deno.copyFile(srcCol, join(colStagingDir, stagedCol));
        console.log(`  [+] Packaged COL: ${entry.col} as ${stagedCol}`);
        count++;
      } catch {
        const dataCol = join(cwd, "data", "maps", "noodles", "col", stagedCol);
        try {
          await Deno.copyFile(dataCol, join(colStagingDir, stagedCol));
          console.log(`  [+] Packaged COL: ${stagedCol} (from data/maps)`);
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
  await syncPositions();
  const mapsSrc = join(cwd, "data", "maps");
  const mapsDest = join(noodlesStagingDir, "data", "maps");
  try {
    const stat = await Deno.stat(mapsSrc);
    if (stat.isDirectory) {
      await ensureDir(mapsDest);
      await copyFollowingSymlinks(mapsSrc, mapsDest);
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
    const enabledCols = new Map<
      string,
      { enabled: boolean; level?: string }
    >();
    // Bisected-out COLs: dropped from the staged maps and commented in the staged manifest only
    const skippedCols = new Set<string>();

    for (let i = 1; i < csvLines.length; i++) {
      const row = csvLines[i].split(",").map((s) => s.trim());
      if (row.length < header.length) continue;
      const entry: Record<string, string> = {};
      header.forEach((k, idx) => (entry[k] = row[idx]));
      if (entry.col) {
        const isEnabled = entry.enabled?.toLowerCase() === "true";
        const colFile = `${entry.name}.col`.toLowerCase();
        enabledCols.set(colFile, {
          enabled: isEnabled,
          level: /^\d+$/.test(entry.col_level ?? "")
            ? entry.col_level
            : undefined,
        });
        if (isEnabled && !shouldPackageAsset(entry.name, "col")) {
          skippedCols.add(colFile);
          try {
            await Deno.remove(
              join(mapsDest, "noodles", "col", `${entry.name}.col`),
            );
          } catch {
            // Not staged
          }
        }
      }
    }

    const updatedTxtLines = customTxtContent.split(/\r?\n/).map((line) => {
      for (const [colFile, { enabled, level }] of enabledCols) {
        if (line.toLowerCase().includes(colFile)) {
          let clean = line.replace(/^#\s*/, "").trim();
          if (level !== undefined) {
            clean = clean.replace(/^COLFILE\s+\d+/i, `COLFILE ${level}`);
          }
          return enabled ? clean : `# ${clean}`;
        }
      }
      return line;
    });

    const newTxtContent = updatedTxtLines.join("\n");
    await Deno.writeTextFile(manifestSrc, newTxtContent);
    const stagedTxtContent = updatedTxtLines.map((line) => {
      const lower = line.toLowerCase();
      const skipped = [...skippedCols].some((colFile) =>
        lower.includes(colFile)
      );
      return skipped && !line.startsWith("#") ? `# ${line}` : line;
    }).join("\n");
    await Deno.writeTextFile(manifestDest, stagedTxtContent);
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
