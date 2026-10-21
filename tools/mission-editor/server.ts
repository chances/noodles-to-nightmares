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
import { listMissions, loadMission, NODE, transitions } from "@noodles/fsm";
import { createProject, listProjects, openProject } from "./projects.ts";
import type { ProjectDirs } from "./projects.ts";

const uiDir = fromFileUrl(new URL("./ui/", import.meta.url));

const game = v.picklist(["gta3", "vc"]);
const createBody = v.object({ name: v.string(), game, parent: v.string() });
const openBody = v.object({ path: v.string(), game: v.optional(game) });
const projectQuery = v.object({ project: v.pipe(v.string(), v.minLength(1)) });

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
      const loaded = await unprocessable(() =>
        loadMission(join(resolve(project), "missions"), stem)
      );
      if (!loaded) {
        throw new HTTPException(404, { message: `No mission named ${stem}` });
      }
      return c.json({
        ...loaded,
        edges: transitions(loaded.mission),
        node: NODE,
      });
    },
  );

  app.use("*", serveStatic({ root: uiDir }));
  return app;
}

export function createHandler(
  dirs: ProjectDirs,
): (req: Request) => Response | Promise<Response> {
  return createApp(dirs).fetch;
}

export const handler = createHandler(defaultDirs());
