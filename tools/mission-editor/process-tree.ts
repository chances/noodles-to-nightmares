// Ends a process and every process it started, including descendants whose parent already exited.

/** Kills `pid` and all of its descendants. Windows follows the recorded parent ids, which survive a parent's exit. */
export function killTree(pid: number): void {
  if (Deno.build.os === "windows") {
    const script = `
      function Stop-Tree($id) {
        Get-CimInstance Win32_Process -Filter "ParentProcessId=$id" | ForEach-Object { Stop-Tree $_.ProcessId }
        Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
      }
      Stop-Tree ${pid}
    `;
    new Deno.Command("powershell", {
      args: ["-NoProfile", "-NonInteractive", "-Command", script],
      stdout: "null",
      stderr: "null",
    }).outputSync();
    return;
  }
  // Elsewhere children are killed by process group; pkill -P covers the direct children
  new Deno.Command("pkill", {
    args: ["-KILL", "-P", String(pid)],
    stdout: "null",
    stderr: "null",
  })
    .outputSync();
  try {
    Deno.kill(pid, "SIGKILL");
  } catch {
    // Already gone
  }
}
