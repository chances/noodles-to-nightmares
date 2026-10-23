import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { createApp, createHandler, handler } from "./server.ts";

const get = (path: string) => handler(new Request(`http://editor.test${path}`));
const repo = encodeURIComponent(
  fromFileUrl(new URL("../../", import.meta.url)),
);

Deno.test("serves the welcome page at the root and the editor at app.html", async () => {
  const welcome = await get("/");
  assertEquals(welcome.status, 200);
  assertStringIncludes(await welcome.text(), "/welcome.js");
  const editor = await get("/app.html");
  assertEquals(editor.status, 200);
  assertStringIncludes(await editor.text(), "/app.js");
});

Deno.test("serves the app module and the stylesheet", async () => {
  const app = await get("/app.js");
  assertEquals(app.status, 200);
  await app.body?.cancel();
  const css = await get("/styles.css");
  assertEquals(css.status, 200);
  await css.body?.cancel();
});

Deno.test("serves the vendored Preact with htm as JavaScript", async () => {
  const res = await get("/vendor/preact.js");
  assertEquals(res.status, 200);
  assertStringIncludes(
    res.headers.get("content-type") ?? "",
    "javascript",
  );
  assertStringIncludes(await res.text(), "export{");
});

Deno.test("lists the repo's missions that have a table", async () => {
  const res = await get(`/api/missions?project=${repo}`);
  assertEquals(res.status, 200);
  const missions = await res.json();
  assert(missions.some((m: { stem: string }) => m.stem === "0_tutorial"));
});

Deno.test("a mission request without a project is a 400", async () => {
  const res = await get("/api/missions");
  assertEquals(res.status, 400);
  await res.body?.cancel();
});

Deno.test("serves a mission's table, layout, and edges", async () => {
  const res = await get(`/api/missions/0_tutorial?project=${repo}`);
  assertEquals(res.status, 200);
  const body = await res.json();
  assert(body.source === "states.ts" || body.source === "fsm.json");
  assertEquals(body.mission.start, "INTRO");
  assertEquals(typeof body.layout.GO_HOME.x, "number");
  assert(
    body.edges.some((e: { from: string; to: string }) =>
      e.from === "LOSE" && e.to === "GO_HOME"
    ),
  );
});

Deno.test("serves the step and condition vocabulary", async () => {
  const body = await (await get("/api/vocabulary")).json();
  assert(body.steps.some((d: { name: string }) => d.name === "say"));
  assert(body.conds.some((d: { name: string }) => d.name === "playerNear3D"));
  assert(body.spots.some((s: { id: string }) => s.id === "SAFEHOUSE"));
  assert(
    body.enums.RadarSprite.some((m: { name: string }) =>
      m.name === "Savehouse"
    ),
  );
});

Deno.test("serves the constants and globals the project's files declare", async () => {
  const body = await (await get(`/api/missions/0_tutorial?project=${repo}`))
    .json();
  const chong = body.names.constants.find((c: { name: string }) =>
    c.name === "CHONG"
  );
  assertEquals(chong.kind, "int");
  assertEquals(chong.source, "constants.txt");
  const player = body.names.globals.find((g: { name: string }) =>
    g.name === "$player"
  );
  assertEquals(player.type, "Player");
  // Spot constants have their own typeahead, so they are not repeated here.
  assertEquals(
    body.names.constants.some((c: { name: string }) =>
      c.name === "SAFEHOUSE_X"
    ),
    false,
  );
});

Deno.test("serves the project's Sanny files as paths from the missions folder", async () => {
  const body = await (await get(`/api/missions/0_tutorial?project=${repo}`))
    .json();
  assert(body.sannyFiles.includes("../utils/missions.txt"));
  assert(body.sannyFiles.includes("../constants.txt"));
  assertEquals(
    body.sannyFiles.some((f: string) => f.includes("0_tutorial")),
    false,
  );
});

Deno.test("serves a mission's problems with its table", async () => {
  const body = await (await get(`/api/missions/0_tutorial?project=${repo}`))
    .json();
  assertEquals(body.problems, [{
    severity: "warning",
    message:
      "Consider simplifying states: ARRIVE and HOME_TUTORIAL are both cutscene states linked together.",
    state: "ARRIVE",
  }]);
});

Deno.test("saving writes a .fsm.json that loads back, and refuses a bad table", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(dir, "missions"));
    const project = encodeURIComponent(dir);
    const loaded = await (await get(`/api/missions/0_tutorial?project=${repo}`))
      .json();
    const put = (body: unknown) =>
      handler(
        new Request(
          `http://editor.test/api/missions/0_tutorial?project=${project}`,
          {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        ),
      );

    const edited = { ...loaded.mission, header: ["Edited"] };
    const ok = await put({ mission: edited, layout: loaded.layout });
    assertEquals(ok.status, 200);
    assertEquals((await ok.json()).source, "fsm.json");

    const reload = await (await handler(
      new Request(
        `http://editor.test/api/missions/0_tutorial?project=${project}`,
      ),
    )).json();
    assertEquals(reload.mission.header, ["Edited"]);

    const dangling = { ...edited, start: "NOWHERE" };
    const bad = await put({ mission: dangling });
    assertEquals(bad.status, 422);
    assertStringIncludes((await bad.json()).error, "unknown state NOWHERE");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("answers 404 for a mission with no table", async () => {
  const res = await get(`/api/missions/9_nothing?project=${repo}`);
  assertEquals(res.status, 404);
  assertStringIncludes((await res.json()).error, "9_nothing");
});

Deno.test("answers 422 with the reason for an invalid table", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(join(dir, "missions"));
    await Deno.writeTextFile(
      join(dir, "missions", "7_bad.fsm.json"),
      `{"version": 2}`,
    );
    const res = await get(
      `/api/missions/7_bad?project=${encodeURIComponent(dir)}`,
    );
    assertEquals(res.status, 422);
    assertStringIncludes((await res.json()).error, "invalid .fsm.json");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("creates a project over the API, lists it, and refuses a non-JSON body", async () => {
  const root = await Deno.makeTempDir();
  try {
    const api = createHandler({
      appData: join(root, "Roaming"),
      documents: join(root, "Documents"),
    });
    const post = (path: string, body: unknown, type = "application/json") =>
      api(
        new Request(`http://editor.test${path}`, {
          method: "POST",
          headers: { "content-type": type },
          body: JSON.stringify(body),
        }),
      );

    const crossSite = await post("/api/projects", { name: "X" }, "text/plain");
    assertEquals(crossSite.status, 403);
    await crossSite.body?.cancel();

    const incomplete = await post("/api/projects", { name: "X" });
    assertEquals(incomplete.status, 400);
    await incomplete.body?.cancel();

    const created = await post("/api/projects", {
      name: "Neon Nights",
      game: "vc",
      parent: join(root, "Projects"),
    });
    assertEquals(created.status, 201);
    const project = await created.json();
    assertEquals(project.game, "vc");

    const dup = await post("/api/projects", {
      name: "Neon Nights",
      game: "vc",
      parent: join(root, "Projects"),
    });
    assertEquals(dup.status, 422);
    assertStringIncludes((await dup.json()).error, "already exists");

    const listing =
      await (await api(new Request("http://editor.test/api/projects"))).json();
    assertEquals(listing.recent.map((p: { name: string }) => p.name), [
      "Neon Nights",
    ]);

    const opened = await post("/api/projects/open", { path: project.path });
    assertEquals(opened.status, 200);
    await opened.body?.cancel();
  } finally {
    await Deno.remove(root, { recursive: true });
  }
});

Deno.test("a run relays the game's telemetry, output, and exit verdict as events", async () => {
  const encoder = new TextEncoder();
  const stream = (text: string) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  const lines = [
    '@telemetry {"kind":"names","names":{"9":"MY_CAR"}}',
    '@telemetry {"kind":"launch","exe":"gta3-game.exe"}',
    '@telemetry {"kind":"packet","event":{"type":"debug","channel":9,"kind":"i","value":13570,"t":1200}}',
    "Compiled main.txt",
    '@telemetry {"kind":"exit","code":30193,"known":true,"crashed":false,"signs":[]}',
  ];
  const api = createApp(
    { appData: "unused", documents: "unused" },
    {
      spawnRun: () => ({
        pid: 1,
        stdout: stream(lines.join("\n") + "\n"),
        stderr: stream(""),
        status: Promise.resolve({ code: 0 }),
      }),
    },
  );

  const events = await api.request("/api/telemetry");
  // A browser's EventSource refuses anything else
  assertEquals(events.headers.get("content-type"), "text/event-stream");
  const reader = events.body!.getReader();
  // A browser sends the page's own origin with a same-site POST, which the CSRF check wants
  const started = await api.request(`/api/run?project=${repo}`, {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  assertEquals(started.status, 202);
  await started.body?.cancel();

  // Read until the run is done: the stream also carries 1 Hz pings
  const decoder = new TextDecoder();
  let text = "";
  while (!text.includes('"state":"done"')) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  await reader.cancel();

  assertStringIncludes(text, 'event: names\ndata: {"9":"MY_CAR"}');
  assertStringIncludes(text, 'event: run\ndata: {"state":"building"}');
  assertStringIncludes(text, 'event: run\ndata: {"state":"running"}');
  assertStringIncludes(text, 'event: debug\ndata: {"type":"debug","channel":9');
  assertStringIncludes(text, 'event: log\ndata: {"line":"Compiled main.txt"}');
  assertStringIncludes(text, 'event: exit\ndata: {"kind":"exit","code":30193');
  assertStringIncludes(
    text,
    'event: run\ndata: {"state":"done","code":0,"stopped":false}',
  );
});

Deno.test("a run's output reaches the stream without ANSI console codes", async () => {
  const encoder = new TextEncoder();
  const stream = (text: string) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(text));
        controller.close();
      },
    });
  const api = createApp(
    { appData: "unused", documents: "unused" },
    {
      spawnRun: () => ({
        pid: 1,
        stdout: stream(
          "\x1b[32mCompiled main.txt\x1b[0m\n\x1b[2K\x1b[1G\x1b[36mWaiting for the game\x1b[39m\n",
        ),
        stderr: stream("\x1b[33mwarning: slow\x1b[m\n"),
        status: Promise.resolve({ code: 0 }),
      }),
    },
  );
  const events = await api.request("/api/telemetry");
  const reader = events.body!.getReader();
  const started = await api.request(`/api/run?project=${repo}`, {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  await started.body?.cancel();

  const decoder = new TextDecoder();
  let text = "";
  while (!text.includes('"state":"done"')) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  await reader.cancel();

  const lines = [...text.matchAll(/event: log\ndata: (\{.*\})/g)].map((m) =>
    JSON.parse(m[1]).line
  );
  assertEquals(lines.sort(), [
    "Compiled main.txt",
    "Waiting for the game",
    "warning: slow",
  ]);
});

Deno.test("build answers with the build step's result", async () => {
  const api = createApp(
    { appData: "unused", documents: "unused" },
    {
      runBuild: () => Promise.resolve({ ok: false, lines: ["Unknown state GHOST"] }),
    },
  );
  const res = await api.request(`/api/build?project=${repo}`, {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  assertEquals(res.status, 200);
  assertEquals(await res.json(), { ok: false, lines: ["Unknown state GHOST"] });
});

Deno.test("the game stays connected while a launched run is quiet between readings", async () => {
  const encoder = new TextEncoder();
  let out!: ReadableStreamDefaultController<Uint8Array>;
  let exit!: (status: { code: number }) => void;
  const api = createApp(
    { appData: "unused", documents: "unused" },
    {
      spawnRun: () => ({
        pid: 1,
        stdout: new ReadableStream<Uint8Array>({ start: (c) => (out = c) }),
        stderr: new ReadableStream<Uint8Array>({ start: () => {} }),
        status: new Promise((resolve) => (exit = resolve)),
      }),
    },
  );
  const events = await api.request("/api/telemetry");
  const reader = events.body!.getReader();
  const started = await api.request(`/api/run?project=${repo}`, {
    method: "POST",
    headers: { origin: "http://localhost" },
  });
  await started.body?.cancel();
  out.enqueue(encoder.encode(
    '@telemetry {"kind":"launch","exe":"gta3-game.exe"}\n' +
      '@telemetry {"kind":"packet","event":{"type":"debug","channel":9,"kind":"i","value":1,"t":1}}\n',
  ));

  // One reading, then silence for longer than the 2.5 s the editor waits before calling the game gone
  const decoder = new TextDecoder();
  let text = "";
  const quietUntil = Date.now() + 3600;
  while (Date.now() < quietUntil) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  await reader.cancel();
  out.close();
  exit({ code: 0 });

  const pings = [...text.matchAll(/event: ping\ndata: (\{.*\})/g)].map((m) =>
    JSON.parse(m[1]).connected
  );
  assertEquals(pings.at(-1), true);
});

Deno.test("a run that cannot start answers 500 with the reason and can be tried again", async () => {
  let attempts = 0;
  const api = createApp(
    { appData: "unused", documents: "unused" },
    {
      spawnRun: () => {
        attempts++;
        throw new Error("Requires run access to deno");
      },
    },
  );
  const run = () =>
    api.request(`/api/run?project=${repo}`, {
      method: "POST",
      headers: { origin: "http://localhost" },
    });

  const first = await run();
  assertEquals(first.status, 500);
  assertStringIncludes(
    (await first.json()).error,
    "Could not start the run: Requires run access to deno",
  );
  // The failed start must not leave the editor thinking a run is under way (that would answer 409)
  const second = await run();
  assertEquals(second.status, 500);
  await second.body?.cancel();
  assertEquals(attempts, 2);
});

Deno.test("stopping a run ends it, reports it stopped, and answers 409 when none is running", async () => {
  // A run whose output stays open until it is stopped, as a running game's does
  let end = () => {};
  const open = () =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        end = () => controller.close();
      },
    });
  const stopped: number[] = [];
  const api = createApp(
    { appData: "unused", documents: "unused" },
    {
      spawnRun: () => {
        const stdout = open();
        const closeStdout = end;
        const stderr = open();
        const closeStderr = end;
        end = () => {
          closeStdout();
          closeStderr();
        };
        return {
          pid: 4242,
          stdout,
          stderr,
          status: new Promise((resolve) => {
            const close = end;
            end = () => {
              close();
              resolve({ code: 1 });
            };
          }),
        };
      },
      stopRun: (run) => {
        stopped.push(run.pid);
        end();
      },
    },
  );
  const post = (path: string) =>
    api.request(path, {
      method: "POST",
      headers: { origin: "http://localhost" },
    });

  const none = await post("/api/stop");
  assertEquals(none.status, 409);
  await none.body?.cancel();

  const events = await api.request("/api/telemetry");
  const reader = events.body!.getReader();
  const started = await post(`/api/run?project=${repo}`);
  assertEquals(started.status, 202);
  await started.body?.cancel();
  const stopping = await post("/api/stop");
  assertEquals(stopping.status, 202);
  await stopping.body?.cancel();

  const decoder = new TextDecoder();
  let text = "";
  while (!text.includes('"state":"done"')) {
    const { value, done } = await reader.read();
    if (done) break;
    text += decoder.decode(value);
  }
  await reader.cancel();

  assertEquals(stopped, [4242]);
  assertStringIncludes(text, '"state":"done","code":1,"stopped":true');
  // The run is over, so there is nothing left to stop
  const again = await post("/api/stop");
  assertEquals(again.status, 409);
  await again.body?.cancel();
});

Deno.test("serves geography catalog", async () => {
  const res = await get("/api/geography");
  assertEquals(res.status, 200);
  const geo = await res.json();
  assert(geo.SAFEHOUSE);
  assertEquals(typeof geo.SAFEHOUSE.pos[0], "number");
});

Deno.test("answers 404 for an unknown path", async () => {
  const res = await get("/nope.js");
  assertEquals(res.status, 404);
  await res.body?.cancel();
});
