// Serves the editor UI and its API with Hono. Runs in a browser tab (`deno task serve`) and as a desktop app (`deno desktop`).
//
// Imports use inline `jsr:` specifiers because `deno desktop` resolves them at run time without this
// package's import map. Preact with htm is vendored in `ui/vendor/` for the same reason.

import { Hono } from "jsr:@hono/hono@^4.13.13";
import { csrf } from "jsr:@hono/hono@^4.13.13/csrf";
import { serveStatic } from "jsr:@hono/hono@^4.13.13/deno";
import { HTTPException } from "jsr:@hono/hono@^4.13.13/http-exception";
import { logger } from "jsr:@hono/hono@^4.13.13/logger";
import { secureHeaders } from "jsr:@hono/hono@^4.13.13/secure-headers";
import { vValidator } from "jsr:@hono/valibot-validator@^0.6.1";
import * as v from "@valibot/valibot";
import { stripAnsiCode } from "@std/fmt/colors";
import { fromFileUrl, join, resolve } from "@std/path";
import {
  condDescriptors,
  ENUMS,
  GEOGRAPHY,
  listMissions,
  listNames,
  loadKnown,
  loadMission,
  NODE,
  problems,
  saveMission,
  stepDescriptors,
  transitions,
} from "@noodles/fsm";
import { parseEventLine } from "../../scripts/run-events.ts";
import {
  listenTelemetry,
  type Packet,
  TELEMETRY_PORT,
} from "../../scripts/telemetry.ts";
import { killTree } from "./process-tree.ts";
import { createProject, listProjects, openProject } from "./projects.ts";
import type { ProjectDirs } from "./projects.ts";

const uiDir = fromFileUrl(new URL("./ui/", import.meta.url));

const game = v.picklist(["gta3", "vc"]);
const createBody = v.object({ name: v.string(), game, parent: v.string() });
const openBody = v.object({ path: v.string(), game: v.optional(game) });
const projectQuery = v.object({ project: v.pipe(v.string(), v.minLength(1)) });
const saveBody = v.object({
  mission: v.unknown(),
  layout: v.optional(v.unknown()),
});

export function defaultDirs(): ProjectDirs {
  const home = Deno.env.get("USERPROFILE") ?? Deno.env.get("HOME") ?? ".";
  return {
    appData: Deno.env.get("APPDATA") ?? join(home, ".config"),
    documents: join(home, "Documents"),
  };
}

/** Runs `work`, turning a thrown error into a 422 whose message the UI shows. */
async function unprocessable<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    throw new HTTPException(422, {
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/** A started `deno task run --events`: its output streams and its end. */
export interface GameRun {
  pid: number;
  stdout: ReadableStream<Uint8Array>;
  stderr: ReadableStream<Uint8Array>;
  status: Promise<{ code: number }>;
}

/**
 * Starts `deno task run --events` in the project: build, install, launch, and relay the game's telemetry.
 *
 * @remarks Runs `deno` from the PATH, not `Deno.execPath()`: in the desktop app the executable is the app itself,
 * and `<app> task run` would not run the project's task. The app needs `--allow-run=deno` to start it.
 */
function startGameRun(project: string): GameRun {
  return new Deno.Command("deno", {
    args: ["task", "run", "--events"],
    cwd: project,
    stdout: "piped",
    stderr: "piped",
  }).spawn();
}

/**
 * `log` prints one line per request; the desktop app turns it on and the tests leave it off. `spawnRun` starts a
 * run of the game and `stopRun` ends it with everything it started, the game included; the tests replace both so
 * no game launches.
 */
export function createApp(
  dirs: ProjectDirs,
  {
    log = false,
    spawnRun = startGameRun,
    stopRun = (run: GameRun) => killTree(run.pid),
    telemetryPort = TELEMETRY_PORT,
  } = {},
) {
  const app = new Hono();

  if (log) app.use(logger());
  app.use(secureHeaders());
  // Refuses cross-site form posts; the JSON validators below refuse everything else without a JSON body.
  app.use("/api/*", csrf());

  app.onError((error, c) =>
    error instanceof HTTPException
      ? c.json({ error: error.message }, error.status)
      : (console.error(error), c.json({ error: "Internal Server Error" }, 500))
  );

  app.get("/api/projects", async (c) => c.json(await listProjects(dirs)));

  app.post("/api/projects", vValidator("json", createBody), async (c) => {
    const options = c.req.valid("json");
    return c.json(await unprocessable(() => createProject(dirs, options)), 201);
  });

  app.post("/api/projects/open", vValidator("json", openBody), async (c) => {
    const { path, game } = c.req.valid("json");
    return c.json(await unprocessable(() => openProject(dirs, path, game)));
  });

  // A project's missions live in its `missions/` folder.
  app.get("/api/missions", vValidator("query", projectQuery), async (c) => {
    const { project } = c.req.valid("query");
    return c.json(await listMissions(join(resolve(project), "missions")));
  });

  app.get(
    "/api/missions/:stem",
    vValidator("query", projectQuery),
    async (c) => {
      const stem = c.req.param("stem");
      const { project } = c.req.valid("query");
      const loaded = await unprocessable(() => {
        return loadMission(join(resolve(project), "missions"), stem);
      });
      if (!loaded) {
        throw new HTTPException(404, { message: `No mission named ${stem}` });
      }
      const known = await loadKnown(
        join(resolve(project), "missions"),
        loaded.mission,
      );
      return c.json({
        ...loaded,
        edges: transitions(loaded.mission),
        node: NODE,
        problems: problems(loaded.mission, known),
        // The constants and globals the typeaheads offer, from the project's Sanny files.
        names: listNames(known),
      });
    },
  );

  // Autosave: the editor sends the whole table after every edit. A `.states.ts` mission gets a `.fsm.json`
  // beside it on its first save, and that file wins from then on.
  app.put(
    "/api/missions/:stem",
    vValidator("query", projectQuery),
    vValidator("json", saveBody),
    async (c) => {
      const stem = c.req.param("stem");
      const { project } = c.req.valid("query");
      const { mission, layout } = c.req.valid("json");
      const saved = await unprocessable(() => {
        return saveMission(join(resolve(project), "missions"), stem, {
          version: 1,
          mission,
          layout,
        });
      });
      return c.json({
        source: saved.source,
        problems: problems(
          saved.mission,
          await loadKnown(join(resolve(project), "missions"), saved.mission),
        ),
      });
    },
  );

  // The steps and conditions the Inspector offers as typed controls.
  app.get(
    "/api/vocabulary",
    (c) =>
      c.json({
        steps: stepDescriptors,
        conds: condDescriptors,
        // The spots a `spot` field offers.
        spots: Object.values(GEOGRAPHY),
        // The members of the Sanny enums that `enum` fields offer, e.g. `RadarSprite`.
        enums: ENUMS,
      }),
  );

  // POI catalog from data/geography.json
  app.get("/api/geography", (c) => c.json(GEOGRAPHY));

  // Live telemetry from the game (plugins/sockets), as SSE events on /api/telemetry. Packets come from this
  // editor's own UDP listener, or, while a run is in progress, from the run's output (see below).
  let latestTelemetry: {
    connected: boolean;
    lastSeen: number;
    pos: number[] | null;
    heading: number;
  } = { connected: false, lastSeen: 0, pos: null, heading: 0 };
  /** The newest reading of each debug channel, so a viewer that connects late sees them all. */
  const latestDebug = new Map<number, unknown>();
  let debugChannelNames: Record<string, string> = {};
  /** Everything a viewer needs to show the game's state: sent on connect and again when a run starts over. */
  const status = () => ({
    connected: isConnected(),
    pos: latestTelemetry.pos,
    heading: latestTelemetry.heading,
    debug: [...latestDebug.values()],
    names: debugChannelNames,
    running,
  });
  const listeners = new Set<(event: string, data: unknown) => void>();
  const broadcast = (event: string, data: unknown) => {
    for (const fn of listeners) fn(event, data);
  };

  const publish = (packet: Packet) => {
    const now = Date.now();
    if (packet.type === "debug") {
      const payload = {
        type: "debug",
        channel: packet.channel,
        kind: packet.kind,
        value: packet.value,
        time: now,
      };
      latestTelemetry = { ...latestTelemetry, connected: true, lastSeen: now };
      latestDebug.set(packet.channel, payload);
      broadcast("debug", payload);
      return;
    }
    latestTelemetry = {
      connected: true,
      lastSeen: now,
      pos: packet.pos,
      heading: packet.heading,
    };
    broadcast(packet.type === "capture" ? "capture" : "telemetry", {
      type: packet.type,
      pos: packet.pos,
      heading: packet.heading,
      time: now,
    });
  };

  let udp: { close: () => Promise<void> } | null = null;
  const startUdp = async () => {
    if (udp || running) return;
    // A null result means the port is taken, e.g. by a run started from a terminal
    udp = await listenTelemetry(telemetryPort, publish);
  };

  // Run in game: `deno task run --events` builds, installs, and launches GTA III. The run captures telemetry on
  // the same UDP port, so the editor lets go of it until the run ends and takes the game's packets, the exit
  // verdict, and the rest of the output from the run's event lines instead (see scripts/run-events.ts).
  let running = false;
  /** True from the run's `launch` event until the game exits; readings arrive only when a value changes, so a quiet run is still connected. */
  let launched = false;
  const isConnected = () =>
    launched || Date.now() - latestTelemetry.lastSeen < 2500;
  let current: { child: GameRun; stopped: boolean } | null = null;
  app.post("/api/run", vValidator("query", projectQuery), async (c) => {
    if (running) {
      throw new HTTPException(409, { message: "The game is already running" });
    }
    const { project } = c.req.valid("query");
    running = true;
    await udp?.close();
    udp = null;
    // The last run's readings are not this run's state
    latestTelemetry = { connected: false, lastSeen: 0, pos: null, heading: 0 };
    latestDebug.clear();
    broadcast("status", status());
    broadcast("run", { state: "building" });
    let child: GameRun;
    try {
      child = spawnRun(resolve(project));
    } catch (error) {
      // e.g. no `deno` on the PATH, or the app was started without --allow-run
      running = false;
      void startUdp();
      throw new HTTPException(500, {
        message: `Could not start the run: ${
          error instanceof Error ? error.message : String(error)
        }`,
      });
    }
    current = { child, stopped: false };
    void relayRun(current);
    return c.json({ started: true }, 202);
  });

  // Stop: ends the run and the game it started. The game then leaves no shutdown marker, so there is no exit
  // verdict; the run's `done` event says `stopped` instead.
  app.post("/api/stop", async (c) => {
    if (!current) {
      throw new HTTPException(409, { message: "No run is in progress" });
    }
    current.stopped = true;
    await stopRun(current.child);
    return c.json({ stopping: true }, 202);
  });

  /** Forwards one line of the run's output: an event line to its SSE event, any other line to the log. */
  const relayLine = (line: string) => {
    const event = parseEventLine(line);
    if (!event) {
      // The app shows the log as plain text, so the run's colors and cursor codes are removed here
      const text = stripAnsiCode(line);
      if (text.trim()) broadcast("log", { line: text });
    } else if (event.kind === "names") {
      debugChannelNames = event.names;
      broadcast("names", event.names);
    } else if (event.kind === "launch") {
      launched = true;
      broadcast("run", { state: "running" });
    } else if (event.kind === "packet") {
      publish(event.event);
    } else {
      broadcast("exit", event);
    }
  };

  async function relayRun(run: { child: GameRun; stopped: boolean }) {
    const { child } = run;
    const relay = async (stream: ReadableStream<Uint8Array>) => {
      const reader = stream.pipeThrough(new TextDecoderStream()).getReader();
      let rest = "";
      for (
        let chunk = await reader.read();
        !chunk.done;
        chunk = await reader.read()
      ) {
        const lines = (rest + chunk.value).split(/\r?\n/);
        rest = lines.pop() ?? "";
        lines.forEach(relayLine);
      }
      if (rest) relayLine(rest);
    };
    await Promise.all([relay(child.stdout), relay(child.stderr)]);
    const status = await child.status;
    running = false;
    launched = false;
    current = null;
    broadcast("run", {
      state: "done",
      code: status.code,
      stopped: run.stopped,
    });
    void startUdp();
  }

  app.get("/api/telemetry", (c) => {
    void startUdp();

    let timer: ReturnType<typeof setInterval> | undefined;
    const body = new ReadableStream({
      start(controller) {
        const send = (event: string, data: unknown) => {
          try {
            controller.enqueue(
              new TextEncoder().encode(
                `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`,
              ),
            );
          } catch {}
        };

        send("status", status());

        const onEvent = (evt: string, data: unknown) => send(evt, data);
        listeners.add(onEvent);

        timer = setInterval(() => {
          send("ping", { connected: isConnected() });
        }, 1000);

        c.req.raw.signal.addEventListener("abort", () => {
          if (timer) clearInterval(timer);
          listeners.delete(onEvent);
          try {
            controller.close();
          } catch {}
        });
      },
      cancel() {
        if (timer) clearInterval(timer);
      },
    });

    // The headers belong on this Response: `c.header` is ignored once a handler returns its own Response, and
    // an EventSource refuses a stream that is not `text/event-stream`
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  });

  app.use("*", serveStatic({ root: uiDir }));
  return app;
}

export function createHandler(
  dirs: ProjectDirs,
): (req: Request) => Response | Promise<Response> {
  return createApp(dirs).fetch;
}

export const handler = createHandler(defaultDirs());
