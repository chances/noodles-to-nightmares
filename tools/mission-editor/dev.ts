// Runs `deno desktop --hmr` and ends its whole process tree whenever this script ends (the window
// closing, Ctrl+C, a terminated task, or a crash), so a dev run never leaves a webview or runtime behind.

import { killTree } from "./process-tree.ts";

const child = new Deno.Command(Deno.execPath(), {
  args: [
    "desktop",
    "--hmr",
    "--allow-env",
    "--allow-read",
    "--allow-write",
    "--allow-net",
    "--allow-run=deno",
    "--include",
    "ui",
    "main.ts",
  ],
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
}).spawn();

let reaped = false;
function reap() {
  if (reaped) return;
  reaped = true;
  killTree(child.pid);
}

const signals: Deno.Signal[] = Deno.build.os === "windows"
  ? ["SIGINT", "SIGBREAK"]
  : ["SIGINT", "SIGTERM", "SIGHUP"];
for (const signal of signals) {
  Deno.addSignalListener(signal, () => {
    reap();
    Deno.exit(130);
  });
}
addEventListener("unload", reap);

const status = await child.status;
// The CLI can exit while the app it started is still running
reap();
Deno.exit(status.code);
