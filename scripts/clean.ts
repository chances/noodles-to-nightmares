// Deletes generated files: everything in dist/, the TXDs that build.ts compiles into data/txd/,
// and old probe results in tests/results/.
// Usage: deno task clean [--dry-run]

import { join } from "@std/path";
import { say } from "./log.ts";

const dryRun = Deno.args.includes("--dry-run");

const targets: {
  label: string;
  dir: string;
  match: (name: string) => boolean;
}[] = [
  { label: "dist", dir: "dist", match: () => true },
  {
    label: "compiled TXDs",
    dir: join("data", "txd"),
    match: (name) => /\.txd$/i.test(name),
  },
  { label: "probe results", dir: join("tests", "results"), match: () => true },
];

let removed = 0;
for (const { label, dir, match } of targets) {
  let count = 0;
  try {
    for await (const entry of Deno.readDir(dir)) {
      if (!match(entry.name)) continue;
      if (!dryRun) {
        await Deno.remove(join(dir, entry.name), { recursive: true });
      }
      count++;
    }
  } catch (error) {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  removed += count;
  (count ? say.info : say.skip)(
    `${dryRun ? "Would remove" : "Removed"} ${count} from ${label} (${dir})`,
  );
}
say.pass(
  `${dryRun ? "Dry run: " : ""}${removed} entries ${
    dryRun ? "would be " : ""
  }deleted`,
);
