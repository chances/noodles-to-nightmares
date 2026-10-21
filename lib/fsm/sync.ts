// Regenerates `missions/<stem>.txt` from every `missions/<stem>.states.ts` state table.

import { basename, join, toFileUrl } from "@std/path";
import { generate } from "./generate.ts";
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
  for await (const entry of Deno.readDir(missionsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".states.ts")) continue;
    const stem = basename(entry.name, ".states.ts");
    const table = join(missionsDir, entry.name);
    const mission = (await import(toFileUrl(table).href)).default as Mission;
    const text = generate(mission, `missions/${entry.name}`);
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
  return result;
}
