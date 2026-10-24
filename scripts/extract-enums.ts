// Writes the Sanny GTA III enums the mission editor's select fields draw from, as `{ name, id }` members.
// Usage: deno run -A scripts/extract-enums.ts <path to sannybuilder library gta3/enums.json>

import { say } from "./log.ts";

const ENUMS = ["PedType", "PedStat", "AnimGroup", "KeyCode", "ScriptSound"];
const OUT = "data/gta3-enums.json";

const [source] = Deno.args;
if (!source) {
  say.error("Pass the path to the library's gta3/enums.json.");
  Deno.exit(1);
}

// The library gives a member a number only where it knows one. A member with no number keeps `id: null`, since the
// name is still a valid Sanny constant.
const library: Record<string, Record<string, number | null>> = JSON.parse(
  Deno.readTextFileSync(source),
);
const out: Record<string, { name: string; id: number | null }[]> = {};
for (const enumName of ENUMS) {
  const members = library[enumName];
  if (!members) throw new Error(`enum ${enumName} is missing from ${source}`);
  out[enumName] = Object.entries(members).map(([name, id]) => ({ name, id }));
}
Deno.writeTextFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
say.text(`Wrote ${ENUMS.length} enums to ${OUT}`);
