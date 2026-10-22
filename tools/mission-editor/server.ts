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

/** `log` prints one line per request; the desktop app turns it on and the tests leave it off. */
export function createApp(dirs: ProjectDirs, { log = false } = {}) {
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

  // Run/build active mission in game
  app.post("/api/run", vValidator("query", projectQuery), async (c) => {
    const { project } = c.req.valid("query");
    const cmd = new Deno.Command(Deno.execPath(), {
      args: ["task", "build:missions"],
      cwd: resolve(project),
    });
    const output = await cmd.output();
    return c.json({
      success: output.success,
      output: new TextDecoder().decode(output.stdout),
    });
  });

  // UDP Live Telemetry SSE Bridge
  let latestTelemetry = {
    connected: false,
    lastSeen: 0,
    pos: [0, 0, 0],
    heading: 0,
  };
  const listeners = new Set<(event: string, data: unknown) => void>();
  let udpStarted = false;

  const startUdp = () => {
    if (udpStarted) return;
    try {
      const socket = Deno.listenDatagram({ port: 8089, transport: "udp" });
      udpStarted = true;
      (async () => {
        const dec = new TextDecoder();
        for await (const [bytes] of socket) {
          const raw = dec.decode(bytes).trim();
          const isCapture = raw.startsWith("CAPTURE:");
          const isPos = raw.startsWith("POS:");
          if (isPos || isCapture) {
            const coords = raw.slice(isCapture ? 8 : 4).split(",").map(Number);
            const pos = [coords[0] || 0, coords[1] || 0, coords[2] || 0];
            const heading = coords[3] || 0;
            const now = Date.now();
            latestTelemetry = { connected: true, lastSeen: now, pos, heading };
            const payload = {
              type: isCapture ? "capture" : "pos",
              pos,
              heading,
              time: now,
            };
            for (const fn of listeners) {
              fn(isCapture ? "capture" : "telemetry", payload);
            }
          }
        }
      })();
    } catch {
      // Port in use or unpermitted in tests
    }
  };

  app.get("/api/telemetry", (c) => {
    startUdp();
    c.header("Content-Type", "text/event-stream");
    c.header("Cache-Control", "no-cache");
    c.header("Connection", "keep-alive");

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

        const now = Date.now();
        send("status", {
          connected: now - latestTelemetry.lastSeen < 2500,
          pos: latestTelemetry.pos,
          heading: latestTelemetry.heading,
        });

        const onEvent = (evt: string, data: unknown) => send(evt, data);
        listeners.add(onEvent);

        timer = setInterval(() => {
          const isConnected = Date.now() - latestTelemetry.lastSeen < 2500;
          send("ping", { connected: isConnected });
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

    return new Response(body);
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
