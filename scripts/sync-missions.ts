// Regenerates `missions/<stem>.txt` from every `missions/<stem>.states.ts` state table.
// Usage: deno run --allow-read --allow-write scripts/sync-missions.ts [--check]

import { syncMissions } from "@noodles/fsm";
import { say } from "./log.ts";

const check = Deno.args.includes("--check");
const { stale, written } = await syncMissions(Deno.cwd(), { write: !check });
for (const file of written) say.done(`Generated ${file}`);
for (const file of stale) say.fail(`Stale generated file: ${file}`);
if (stale.length) Deno.exit(1);
if (!written.length) say.skip("Generated missions are up to date");
