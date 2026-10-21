import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { createHandler, handler } from "./server.ts";

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
  assertEquals(body.source, "states.ts");
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
});

Deno.test("serves a mission's problems with its table", async () => {
  const body = await (await get(`/api/missions/0_tutorial?project=${repo}`))
    .json();
  assertEquals(body.problems, []);
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

Deno.test("answers 404 for an unknown path", async () => {
  const res = await get("/nope.js");
  assertEquals(res.status, 404);
  await res.body?.cancel();
});
