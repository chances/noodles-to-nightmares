/**
 * fake-run.ts
 *
 * Stands in for `deno task run --events` in the editor's integration tests: it prints the same event lines as
 * scripts/run.ts, captures UDP exactly as run.ts does, and plays the game's part by sending the packets named in
 * the arguments, then exits. No game launches.
 *
 * Usage: deno run --allow-net --allow-read --allow-write fake-run.ts <port> <log-path> <packet>...
 */

import dgram from "node:dgram";
import { eventLine, type RunEvent } from "../../../scripts/run-events.ts";
import { startCapture } from "../../../scripts/telemetry.ts";

const [port, logPath, ...packets] = Deno.args;
const emit = (event: RunEvent) => console.log(eventLine(event));

emit({ kind: "names", names: { "9": "MY_CAR" } });
const capture = await startCapture(
  Number(port),
  logPath,
  (event) => emit({ kind: "packet", event }),
);
if (!capture) {
  console.log(`UDP ${port} is in use, so telemetry is not captured`);
}
emit({ kind: "launch", exe: "gta3-game.exe" });

const socket = dgram.createSocket("udp4");
for (const packet of packets) {
  await new Promise<void>((resolve) =>
    socket.send(packet, Number(port), "127.0.0.1", () => resolve())
  );
}
socket.close();

await capture?.stop();
emit({ kind: "exit", code: 0, known: true, crashed: false, signs: [] });
