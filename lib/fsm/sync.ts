// Regenerates `missions/<stem>.txt` from every `missions/<stem>.states.ts` state table.

import { join } from "@std/path";
import { listMissions, loadMission } from "./fsm-file.ts";
import { generate } from "./generate.ts";
import { generateGeographyTxt } from "./geography.ts";
import type { Mission } from "./types.ts";

export interface SyncResult {
  /** Generated files whose committed text differs from a fresh generation. */
  stale: string[];
  written: string[];
}

/** Compares each generated mission with its table; with `write`, overwrites the stale ones. */
export async function syncMissions(
  root: string,
  { write }: { write: boolean },
): Promise<SyncResult> {
  const result: SyncResult = { stale: [], written: [] };
  const missionsDir = join(root, "missions");
  for (const { stem, source } of await listMissions(missionsDir)) {
    const loaded = await loadMission(missionsDir, stem);
    if (!loaded) continue;
    const text = generate(loaded.mission, `missions/${stem}.${source}`);

    const output = join(missionsDir, `${stem}.txt`);
    let current = "";
    try {
      current = await Deno.readTextFile(output);
    } catch {
      // Not generated yet
    }
    if (current === text) continue;
    if (write) {
      await Deno.writeTextFile(output, text);
      result.written.push(`missions/${stem}.txt`);
    } else {
      result.stale.push(`missions/${stem}.txt`);
    }
  }
  // Sync utils/geography.txt from data/geography.json
  const geoOutput = join(root, "utils", "geography.txt");
  const geoText = generateGeographyTxt();
  let currentGeo = "";
  try {
    currentGeo = await Deno.readTextFile(geoOutput);
  } catch {
    // Not present
  }
  if (currentGeo !== geoText) {
    if (write) {
      await Deno.writeTextFile(geoOutput, geoText);
      result.written.push("utils/geography.txt");
    } else {
      result.stale.push("utils/geography.txt");
    }
  }

  return result;
}
