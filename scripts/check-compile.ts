// Compiles Sanny Builder scripts to a scratch folder and prints compile.log errors for each.
// The CLI exits 0 on a compile error, so the log is the only signal.
// Usage: deno run --allow-all --env-file=.env scripts/check-compile.ts <script.txt>...

import { basename, dirname, join, resolve } from "@std/path";
import { say } from "./log.ts";

const sanny = Deno.env.get("SANNY") || "sanny.exe";
const logPath = join(dirname(sanny), "compile.log");
const outDir = join(Deno.cwd(), "dist", ".lint", "out");
await Deno.mkdir(outDir, { recursive: true });

let failed = false;
for (const arg of Deno.args) {
  // sanny.exe resolves relative paths against its own folder, so pass absolute ones
  const input = resolve(arg);
  const stampOf = async () => {
    try {
      return (await Deno.stat(logPath)).mtime?.getTime();
    } catch {
      return undefined;
    }
  };
  const before = await stampOf();
  const output = join(outDir, basename(input).replace(/\.txt$/i, ".out"));
  await new Deno.Command(sanny, {
    args: ["--no-splash", "--mode", "gta3_sbl", "--compile", input, output],
  }).output();
  const log = (await stampOf()) !== before
    ? (await Deno.readTextFile(logPath)).trim()
    : "";
  const failedHere = log.toLowerCase().includes(basename(input).toLowerCase());
  failed ||= failedHere;
  if (failedHere) {
    say.error(`${basename(input)}: ${log}`);
  } else {
    say.pass(`${basename(input)} compiled`);
  }
}
Deno.exit(failed ? 1 : 0);
