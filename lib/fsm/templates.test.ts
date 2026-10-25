import { assertEquals } from "@std/assert";
import { generate } from "./generate.ts";
import { problems } from "./problems.ts";
import { assertReferences, docFromMission, parseFsmDoc } from "./fsm-file.ts";
import {
  createMissionFromTemplate,
  TEMPLATE_IDS,
  TEMPLATES,
} from "./templates.ts";
import type { TemplateId } from "./templates.ts";

Deno.test("every template has zero problems and zero warnings", () => {
  for (const [id, info] of Object.entries(TEMPLATES)) {
    const mission = info.create();
    assertReferences(mission);
    const found = problems(mission);
    assertEquals(
      found,
      [],
      `Template "${id}" produced problems: ${JSON.stringify(found)}`,
    );
  }
});

Deno.test("every template round-trips through docFromMission and parseFsmDoc", () => {
  for (const [id, info] of Object.entries(TEMPLATES)) {
    const mission = info.create();
    const doc = docFromMission(mission);
    const roundTripped = parseFsmDoc(JSON.parse(JSON.stringify(doc)));
    assertEquals(roundTripped.mission.start, mission.start);
    assertEquals(roundTripped.mission.onFail, mission.onFail);
    assertEquals(
      Object.keys(roundTripped.mission.states),
      Object.keys(mission.states),
      `State keys match for ${id}`,
    );
  }
});

Deno.test("every template generates valid Sanny script output", () => {
  for (const [id, info] of Object.entries(TEMPLATES)) {
    const mission = info.create();
    const sanny = generate(mission, "fsm.json");
    assertEquals(
      typeof sanny,
      "string",
      `Template "${id}" should generate a string`,
    );
    assertEquals(
      sanny.includes("{$CLEO .cm}"),
      true,
      `Template "${id}" must contain {$CLEO .cm}`,
    );
    assertEquals(
      sanny.includes("05DC: terminate_custom_thread"),
      true,
      `Template "${id}" must terminate thread`,
    );
  }
});

Deno.test("createMissionFromTemplate falls back to empty template on unknown id", () => {
  const fallback = createMissionFromTemplate("non_existent" as TemplateId);
  const empty = createMissionFromTemplate("empty");
  assertEquals(fallback.start, empty.start);
  assertEquals(fallback.onFail, empty.onFail);
});
