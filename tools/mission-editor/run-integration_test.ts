import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import dgram from "node:dgram";
import { createApp, type GameRun } from "./server.ts";

// These drive the real chain a run uses: a child process printing event lines, the editor's UDP socket, and the
// SSE stream. fixtures/fake-run.ts stands in for run.ts, so no game launches.

const fakeRun = fromFileUrl(new URL("./fixtures/fake-run.ts", import.meta.url));
const repo = encodeURIComponent(
  fromFileUrl(new URL("../../", import.meta.url)),
);

let nextPort = 28000 + Math.floor(Math.random() * 1000);

/** An app on its own UDP port whose runs are `fake-run.ts` sending `packets` to that port. */
function setup() {
  const port = nextPort++;
  const packets: string[][] = [];
  const spawnRun = (): GameRun => {
    const logPath = Deno.makeTempFileSync({ suffix: ".jsonl" });
    return new Deno.Command(Deno.execPath(), {
      args: [
        "run",
        "--allow-net",
        "--allow-read",
        "--allow-write",
        fakeRun,
        String(port),
        logPath,
        ...(packets.shift() ?? []),
      ],
      stdout: "piped",
      stderr: "piped",
    }).spawn();
  };
  const api = createApp(
    { appData: "unused", documents: "unused" },
    { spawnRun, telemetryPort: port },
  );
  return { api, port, queue: (...next: string[]) => packets.push(next) };
}

interface Sse {
  event: string;
  data: any;
}

/** An open /api/telemetry stream whose events can be waited on. */
async function watch(api: ReturnType<typeof createApp>) {
  const res = await api.request("/api/telemetry");
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  const seen: Sse[] = [];
  let rest = "";
  const pump = (async () => {
    for (
      let chunk = await reader.read();
      !chunk.done;
      chunk = await reader.read()
    ) {
      rest += decoder.decode(chunk.value);
      const frames = rest.split("\n\n");
      rest = frames.pop() ?? "";
      for (const frame of frames) {
        const [, event, data] = /^event: (.*)\ndata: (.*)$/s.exec(frame) ?? [];
        if (event) seen.push({ event, data: JSON.parse(data) });
      }
    }
  })().catch(() => {});
  return {
    seen,
    /** Resolves with the first event after `from` that `match` accepts, or fails after `ms`. */
    async until(match: (e: Sse) => boolean, from = 0, ms = 15000) {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const found = seen.slice(from).find(match);
        if (found) return found;
        await new Promise((r) => setTimeout(r, 25));
      }
      throw new Error(
        `No matching event; saw ${
          JSON.stringify(seen.slice(from).map((e) => e.event))
        }`,
      );
    },
    async close() {
      await reader.cancel();
      await pump;
    },
  };
}

const run = async (api: ReturnType<typeof createApp>) => {
  const res = await api.request(`/api/run?project=${repo}`, {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  await res.body?.cancel();
  assertEquals(res.status, 202);
};

const done = (e: Sse) => e.event === "run" && e.data.state === "done";

Deno.test("a run's UDP readings reach the editor's stream", async () => {
  const { api, queue } = setup();
  queue("DBG:9,i,5", "POS:1,2,3,90");
  const viewer = await watch(api);
  await run(api);
  await viewer.until(done);
  const debug = viewer.seen.find((e) => e.event === "debug");
  assertEquals([debug?.data.channel, debug?.data.value], [9, 5]);
  assertEquals(viewer.seen.find((e) => e.event === "telemetry")?.data.pos, [
    1,
    2,
    3,
  ]);
  await viewer.close();
});

Deno.test("a new run starts from a clean slate, not the last run's readings", async () => {
  const { api, queue } = setup();
  queue("DBG:9,i,5", "POS:1,2,3,90");
  const first = await watch(api);
  await run(api);
  await first.until(done);
  await first.close();

  // The second run launches but sends nothing; a viewer that joins as it starts must not see run one's state
  queue();
  const viewer = await watch(api);
  const before = viewer.seen.length;
  await run(api);
  const fresh = await viewer.until((e) => e.event === "status", before);
  assertEquals(fresh.data.debug, []);
  assertEquals(fresh.data.pos, null);
  assertEquals(fresh.data.connected, false);
  await viewer.until(done, before);
  await viewer.close();
});

Deno.test("a viewer that joins after a run sees that run's last readings", async () => {
  const { api, queue } = setup();
  queue("DBG:9,i,5");
  const early = await watch(api);
  await run(api);
  await early.until((e) => e.event === "debug");
  await early.until(done);
  await early.close();

  const late = await watch(api);
  const status = await late.until((e) => e.event === "status");
  assertEquals(status.data.debug.map((d: { channel: number }) => d.channel), [
    9,
  ]);
  await late.close();
});

Deno.test("the editor takes the UDP port back when a run ends", async () => {
  const { api, port, queue } = setup();
  queue("DBG:9,i,5");
  const viewer = await watch(api);
  await run(api);
  await viewer.until(done);
  const before = viewer.seen.length;

  const socket = dgram.createSocket("udp4");
  // The editor rebinds a moment after the run ends, so keep sending until it hears one
  const timer = setInterval(
    () => socket.send("DBG:9,i,6", port, "127.0.0.1"),
    100,
  );
  try {
    const heard = await viewer.until(
      (e) => e.event === "debug" && e.data.value === 6,
      before,
      5000,
    );
    assert(heard);
  } finally {
    clearInterval(timer);
    socket.close();
    await viewer.close();
  }
});
