import { basename, extname, join } from "@std/path";
import { capitalCase } from "change-case";

// See https://github.com/sannybuilder/dev/issues/399
// See https://github.com/sannybuilder/dev/issues/391

/** Compiles a script using the Sanny Builder CLI. */
async function compile(inputPath: string, outputPath: string) {
  const command = new Deno.Command("sanny.exe", {
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

const cwd = Deno.cwd();

// Compile the main script
console.log("Compiling main script...");
const mainInput = join(cwd, "main.txt");
const mainOutput = join(cwd, "main.scm");
await compile(mainInput, mainOutput);

// Aggregate mission entries
const missionsDir = join(cwd, "missions");
const missionEntries = await Array.fromAsync(Deno.readDir(missionsDir));
// Sort core missions first, then side missions
const missions = missionEntries.sort((a, b) => a.name.localeCompare(b.name));

// Compile the missions
console.log("Compiling missions...");
for await (const entry of missions) {
  const inputExt = extname(entry.name);
  if (!entry.isFile || inputExt !== ".txt") continue;

  // See https://regex101.com/?regex=%5E%28%5Cd%2B%29&testString=0+Tutorial%0A1+Shady+Job%0A2+Proving+Herself&flags=gm&flavor=pcre2&delimiter=%2F
  const entryName = formatMissionName(basename(entry.name, ".txt"));
  const inputPath = join(missionsDir, entry.name);
  const missionName = basename(entry.name, ".txt");
  const outputPath = join(missionsDir, `${missionName}.cm`);
  // TODO: Detect compilation errors and report them with this `outputName`
  const _outputName = `${missionName}.cm`;

  // TODO: Pad between colons and titles so that titles are aligned in the same column
  console.log(`Compiling ${entryName}`);
  await compile(inputPath, outputPath);
}

function formatMissionName(name: string): string {
  name = capitalCase(name);
  return name.startsWith("Side")
    ? name.replace(/^Side/, "Side:")
    : name.replace(/^(\d+)/, "$1:");
}
