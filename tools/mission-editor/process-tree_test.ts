import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { killTree } from "./process-tree.ts";

function isRunning(pid: number): boolean {
  if (Deno.build.os === "windows") {
    const out = new Deno.Command("tasklist", {
      args: ["/FI", `PID eq ${pid}`, "/NH"],
      stdout: "piped",
    }).outputSync();
    return new TextDecoder().decode(out.stdout).includes(String(pid));
  }
  return new Deno.Command("kill", { args: ["-0", String(pid)], stderr: "null" })
    .outputSync().success;
}

Deno.test("killTree works under the permissions the editor is started with", async () => {
  // Stop ends the game through killTree, so every tool it runs must be in the `--allow-run` list of each way the
  // editor starts (the tests themselves run with `--allow-run`, which hides a missing entry)
  const config = JSON.parse(
    await Deno.readTextFile(new URL("./deno.json", import.meta.url)),
  );
  const flags = [
    config.tasks.serve,
    config.tasks.build,
    await Deno.readTextFile(new URL("./dev.ts", import.meta.url)),
  ]
    .map((text: string) => text.match(/--allow-run=[^\s"]+/)?.[0]);
  const script = new URL("./fixtures/kill-tree.ts", import.meta.url);
  for (const flag of flags) {
    assert(flag, "every way the editor starts lists its --allow-run tools");
    const out = await new Deno.Command(Deno.execPath(), {
      args: ["run", flag, "--allow-read", fromFileUrl(script)],
      stdout: "piped",
      stderr: "piped",
    }).output();
    assertEquals(
      new TextDecoder().decode(out.stdout).trim(),
      "gone",
      `${flag}: ${new TextDecoder().decode(out.stderr)}`,
    );
  }
});

Deno.test({
  name: "killTree ends a process and its grandchild",
  async fn() {
    // A parent that starts a long-lived child, prints the child's pid, then waits
    const parent = new Deno.Command(Deno.execPath(), {
      args: [
        "eval",
        `const c = new Deno.Command(Deno.execPath(), { args: ["eval", "setTimeout(() => {}, 120000)"] }).spawn();
         console.log(c.pid);
         setTimeout(() => {}, 120000);`,
      ],
      stdout: "piped",
    }).spawn();
    const reader = parent.stdout.getReader();
    const { value } = await reader.read();
    const grandchild = Number(new TextDecoder().decode(value).trim());
    assert(Number.isInteger(grandchild) && grandchild > 0);
    assert(isRunning(grandchild));

    killTree(parent.pid);
    await parent.status;
    for (let i = 0; i < 20 && isRunning(grandchild); i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assertEquals(isRunning(grandchild), false);
    await reader.cancel();
  },
});
