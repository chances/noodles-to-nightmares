/**
 * find-free-ids.ts
 *
 * Scans all *.ide files in the GTA3 installation (base path from the GTA3
 * environment variable) and reports which object IDs are used and where the
 * gaps are.
 *
 * Usage:
 *   GTA3="C:/path/to/GTA3" deno task find-free-ids
 */

import { walk } from "@std/fs/walk";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ObjectEntry {
  id: number;
  modelName: string;
  file: string;
}

interface Gap {
  start: number;
  end: number;
  size: number;
}

// ---------------------------------------------------------------------------
// IDE parsing
// ---------------------------------------------------------------------------

/**
 * Parses a single .ide file and returns every object entry found in the
 * `objs` and `tobj` sections. Both sections share the same first two columns:
 *   Id, ModelName, ...
 */
function parseIde(content: string, filePath: string): ObjectEntry[] {
  const entries: ObjectEntry[] = [];
  // Sections that contain object IDs we care about
  const objectSections = new Set(["objs", "tobj", "anim", "tanm", "peds", "cars", "weap"]);

  let inSection = false;

  for (const raw of content.split(/\r?\n/)) {
    // Strip inline comments and trim
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;

    const lower = line.toLowerCase();

    // Section start
    if (objectSections.has(lower)) {
      inSection = true;
      continue;
    }

    // Section end
    if (lower === "end") {
      inSection = false;
      continue;
    }

    if (!inSection) continue;

    // Data line: first token = ID (integer), second = model name
    const parts = line.split(/[\s,]+/);
    if (parts.length < 2) continue;

    const id = parseInt(parts[0], 10);
    if (isNaN(id)) continue;

    entries.push({ id, modelName: parts[1], file: filePath });
  }

  return entries;
}

// ---------------------------------------------------------------------------
// Gap analysis
// ---------------------------------------------------------------------------

function findGaps(sortedIds: number[]): Gap[] {
  const gaps: Gap[] = [];
  if (sortedIds.length === 0) return gaps;

  for (let i = 0; i < sortedIds.length - 1; i++) {
    const current = sortedIds[i];
    const next = sortedIds[i + 1];
    if (next - current > 1) {
      gaps.push({
        start: current + 1,
        end: next - 1,
        size: next - current - 1,
      });
    }
  }

  return gaps;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

const BOLD  = "\x1b[1m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const CYAN  = "\x1b[36m";
const YELLOW = "\x1b[33m";

function header(text: string) {
  console.log(`\n${BOLD}${CYAN}${text}${RESET}`);
}

/** OSC 8 terminal hyperlink: clickable text that opens a URL. */
function link(url: string, text: string): string {
  return `\x1b]8;;${url}\x1b\\${text}\x1b]8;;\x1b\\`;
}

function row(label: string, value: string | number) {
  console.log(`  ${label.padEnd(22)} ${value}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const gta3Base = Deno.env.get("GTA3");
if (!gta3Base) {
  console.error("Error: GTA3 environment variable is not set.");
  console.error("  Set it to your GTA3 installation directory, e.g.:");
  console.error('  GTA3="C:/Games/GTA3" deno task find-free-ids');
  Deno.exit(1);
}

console.log(`${BOLD}Searching:${RESET} ${gta3Base}`);

// Collect all *.ide files recursively under the base path
const ideFiles: string[] = [];
for await (const entry of walk(gta3Base, {
  exts: ["ide"],
  includeFiles: true,
  includeDirs: false,
})) {
  ideFiles.push(entry.path);
}

if (ideFiles.length === 0) {
  console.error(`No .ide files found under: ${gta3Base}`);
  Deno.exit(1);
}

// Parse every IDE file
const allEntries: ObjectEntry[] = [];
const parseErrors: string[] = [];

for (const file of ideFiles) {
  try {
    const content = await Deno.readTextFile(file);
    const entries = parseIde(content, file);
    allEntries.push(...entries);
  } catch (err) {
    parseErrors.push(`${file}: ${err}`);
  }
}

if (parseErrors.length > 0) {
  console.warn(`\nWarnings (${parseErrors.length} file(s) could not be read):`);
  for (const e of parseErrors) console.warn("  " + e);
}

// Detect duplicates
const idMap = new Map<number, ObjectEntry[]>();
for (const entry of allEntries) {
  const bucket = idMap.get(entry.id) ?? [];
  bucket.push(entry);
  idMap.set(entry.id, bucket);
}

const duplicates = [...idMap.entries()].filter(([, v]) => v.length > 1);

// Sort unique IDs
const sortedIds = [...idMap.keys()].sort((a, b) => a - b);
const minId = sortedIds[0];
const maxId = sortedIds[sortedIds.length - 1];
const gaps = findGaps(sortedIds);
const totalFreeInRange = gaps.reduce((s, g) => s + g.size, 0);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

header("=== Summary ===");
row("IDE files scanned:", ideFiles.length);
row("Total entries:", allEntries.length);
row("Unique IDs:", idMap.size);
row("Duplicates:", duplicates.length);
row("ID range:", `[${minId} : ${maxId}]`);
row("Gaps found:", gaps.length);
row("Free IDs in range:", totalFreeInRange);
row("Highest used ID:", maxId);
row("First free after max:", maxId + 1);

// Gaps report
header("=== Gaps (free ID ranges) ===");
if (gaps.length === 0) {
  console.log("  No gaps — IDs are contiguous.");
} else {
  // Sort largest gaps first for quick visibility
  const sorted = [...gaps].sort((a, b) => b.size - a.size);
  console.log(
    `  ${"Start".padEnd(8)} ${"End".padEnd(8)} ${"Size".padEnd(8)}`
  );
  console.log("  " + "-".repeat(26));
  for (const g of sorted) {
    const sizeLabel =
      g.size >= 100
        ? `${GREEN}${g.size}${RESET}`
        : g.size >= 10
        ? `${YELLOW}${g.size}${RESET}`
        : String(g.size);
    console.log(
      `  ${String(g.start).padEnd(8)} ${String(g.end).padEnd(8)} ${sizeLabel}`
    );
  }
}

// Duplicates report
if (duplicates.length > 0) {
  header("=== Duplicate IDs ===");
  for (const [id, entries] of duplicates) {
    console.log(`  ID ${BOLD}${id}${RESET} (${entries.length}x):`);
    for (const e of entries) {
      const rel = e.file.replace(gta3Base, "").replace(/^[\\/]/, "");
      console.log(`    ${e.modelName.padEnd(24)} ${rel}`);
    }
  }
}

// Recommended safe range
header("=== Recommendation ===");
const bestGap = gaps.filter((g) => g.size >= 10).sort((a, b) => b.size - a.size)[0];
if (bestGap) {
  console.log(
    `  Largest gap with ≥10 free slots: ${GREEN}${bestGap.start}–${bestGap.end}${RESET} (${bestGap.size} IDs)`
  );
}
console.log(
  `  Safe to append after max ID:      ${GREEN}${maxId + 1}+${RESET}`
);
// GTA3 default static limit is 5000 object model definitions (IDE OBJS lines).
// IDs at or above 5000 will be ignored by the game unless the limit adjuster is installed.
console.log(
  `\n  ${YELLOW}Note:${RESET} GTA3's default object model limit is ${BOLD}5000${RESET} entries (IDs are not capped,`
);
console.log(
  `        but only 5000 IDE lines total are loaded). Avoid using ID ≥ ${BOLD}5000${RESET} without`
);
console.log(
  `        the ${link("https://github.com/GTAmodding/III.VC.SA.LimitAdjuster", "GTA3 Limit Adjuster")}.`
);
console.log();
