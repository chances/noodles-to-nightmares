/**
 * kill-tree.ts
 *
 * Stands in for the editor's Stop button under the editor's own permission flags: it starts a long-lived `deno`
 * process, ends it with `killTree`, and prints whether it is gone.
 *
 * Usage: deno run --allow-run=<the app's list> --allow-read kill-tree.ts
 */

import { killTree } from "../process-tree.ts";

const child = new Deno.Command("deno", {
  args: ["eval", "setTimeout(() => {}, 120000)"],
  stdout: "null",
  stderr: "null",
}).spawn();

killTree(child.pid);
const status = await Promise.race([
  child.status,
  new Promise<null>((resolve) => setTimeout(() => resolve(null), 10000)),
]);
console.log(status ? "gone" : "still running");
if (!status) child.kill();
