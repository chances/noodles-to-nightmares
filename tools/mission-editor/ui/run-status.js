/**
 * The Game Run chip's state (`idle`, `building`, `running`, `exited`, `error`) and label for a run (`runState`) and
 * how its game ended (`exit`).
 *
 * @remarks A run that ends without an exit verdict never launched the game, so a failed code or an `error` is a
 * build error; a crash comes only from the game's logs (`exit.crashed`).
 */
export function runStatus(runState, exit) {
  if (!runState) return { state: "idle", label: "Not Started" };
  if (runState.state === "building") {
    return { state: "building", label: "Building" };
  }
  if (runState.state === "running") {
    return { state: "running", label: "Running" };
  }
  if (runState.stopped) return { state: "exited", label: "Stopped" };
  if (exit?.crashed) return { state: "error", label: "Crashed" };
  if (exit) return { state: "exited", label: "Exited" };
  if (runState.error || runState.code) {
    return { state: "error", label: "Build Error" };
  }
  return { state: "exited", label: "Exited" };
}
