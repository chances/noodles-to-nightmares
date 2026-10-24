import { assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import { generateGeographyTxt } from "./geography.ts";
import { loadKnown, parseConsts } from "./known.ts";
import { loadMission } from "./fsm-file.ts";
import { problems } from "./problems.ts";
import { ENUMS } from "./sprites.ts";
import type { Known } from "./problems.ts";
import { defineMission } from "./types.ts";
import type { Cond, Mission } from "./types.ts";
import { cond } from "./vocabulary.ts";

const missions = fromFileUrl(new URL("../../missions", import.meta.url));

const known: Known = {
  constants: new Map([
    ["SAFEHOUSE_X", { kind: "float", source: "geography" }],
    ["SAFEHOUSE_Y", { kind: "float", source: "geography" }],
    ["SAFEHOUSE_Z", { kind: "float", source: "geography" }],
    ["TIMERA", { kind: "int", source: "built in" }],
    ["WIDE", { kind: "float", value: "20.0", source: "constants.txt" }],
    ["NARROW", { kind: "int", value: "20", source: "constants.txt" }],
  ]),
  globals: new Map([
    ["$player", { type: "Player", slot: 4402 }],
    ["$SafeBlip", { type: "Blip", slot: 4501 }],
    ["$myCar", { type: "Car", slot: 4405 }],
    ["$unpinned", { type: "Blip" }],
  ]),
};

const withLines = (...lines: string[]) =>
  defineMission({
    header: ["Fixture"],
    consts: { REWARD: 250 },
    start: "A",
    onFail: "LOSE",
    fail: [cond.playerDead()],
    states: {
      A: { onEnter: [lines], next: "WIN" },
      WIN: { finish: true },
      LOSE: { next: "A" },
    },
  });

const messages = (m: Mission, k?: Known) =>
  problems(m, k).map((p) => `${p.severity}: ${p.message}`);

Deno.test("a STATE_ constant for a state that does not exist is an error", () => {
  assertEquals(messages(withLines("state = STATE_NOWHERE")), [
    "error: STATE_NOWHERE is used, but the mission has no such state.",
  ]);
  assertEquals(messages(withLines("state = STATE_WIN")), []);
});

Deno.test("an undeclared constant or global is an error, once the project's names are known", () => {
  const lines = withLines(
    "$player = REWARD",
    "x = SAFEHOUSE_X",
    "y = GONE_Y",
    "$missing = TIMERA",
  );
  assertEquals(messages(lines), []);
  assertEquals(messages(lines, known), [
    "error: GONE_Y is used, but no constant or include declares it.",
    "error: $missing is used, but variables.txt does not declare it.",
  ]);
});

Deno.test("names in strings, comments, members, and models are not code", () => {
  const lines = withLines(
    `Text.PrintHelpString("Reach SAFEHOUSE_Y and $nobody and latchGhost")`,
    "x = 1 // GONE_Y, $nobody",
    "Hud.FlashObject(HudObject.RADAR)",
    "Model.Load(#BANSHEE)",
  );
  assertEquals(messages(lines, known), []);
});

Deno.test("removing a constant leaves its uses flagged", () => {
  const withoutConst = { ...withLines("x = REWARD"), consts: {} };
  assertEquals(messages(withoutConst, known), [
    "error: REWARD is used, but no constant or include declares it.",
  ]);
});

Deno.test("removing a monitor leaves its latch flagged", () => {
  const gone: Mission = {
    ...withLines("x = 1"),
    states: {
      A: { until: [cond.latchClear("driveHint")], next: "WIN" },
      WIN: { finish: true },
      LOSE: { next: "A" },
    },
  };
  assertEquals(messages(gone), [
    "error: latchDriveHint is read or set, but no monitor makes it.",
  ]);
});

const withCond = (...conds: Cond[]): Mission => ({
  ...withLines("x = 1"),
  states: {
    A: { until: conds, next: "WIN" },
    WIN: { finish: true },
    LOSE: { next: "A" },
  },
});

Deno.test("a variable declared without an Alloc pin has no slot, so a mission cannot use it", () => {
  assertEquals(messages(withLines("$unpinned = 1"), known), [
    "error: $unpinned has no Alloc pin in variables.txt, so it has no slot.",
  ]);
});

Deno.test("a spot that is not in the geography is one error, not three missing constants", () => {
  const step = (spot: string) =>
    withLines(
      `Camera.SetFixedPosition(${spot}_X, ${spot}_Y, ${spot}_Z, 0, 0, 0)`,
    );
  assertEquals(messages(step("SAFEHOUSE"), known), []);
  assertEquals(messages(step("NOWHERE"), known), [
    "error: Spot NOWHERE is not in the geography.",
  ]);
});

Deno.test("a map icon that is not a RadarSprite member is an error, with or without the project's files", () => {
  const blip = (sprite: string) =>
    withLines(
      `$SafeBlip = Blip.AddSpriteForCoord(SAFEHOUSE_X, SAFEHOUSE_Y, SAFEHOUSE_Z, RadarSprite.${sprite})`,
    );
  for (const names of [undefined, known]) {
    assertEquals(messages(blip("Savehouse"), names), []);
    assertEquals(messages(blip("Savehose"), names), [
      "error: RadarSprite.Savehose does not exist.",
    ]);
  }
});

Deno.test("the radar sprite list matches the ids constants.txt relies on", () => {
  const diablo = ENUMS.RadarSprite.find((m) => m.name === "Diablo");
  assertEquals(diablo?.id, 8);
  assertEquals(ENUMS.RadarSprite.some((m) => m.name === "None"), false);
});

Deno.test("a ScriptSound the library names without a number is still a member", () => {
  const sound = (name: string) =>
    withLines(
      `Sound.AddOneOffSound(SAFEHOUSE_X, SAFEHOUSE_Y, SAFEHOUSE_Z, ScriptSound.${name})`,
    );
  for (const names of [undefined, known]) {
    assertEquals(messages(sound("SoundPayphoneRinging"), names), []);
    assertEquals(messages(sound("SoundNotASound"), names), [
      "error: ScriptSound.SoundNotASound does not exist.",
    ]);
  }
});

Deno.test("a variable of the wrong declared type is an error", () => {
  const blip = (handle: string) =>
    withLines(
      `${handle} = Blip.AddSpriteForCoord(SAFEHOUSE_X, SAFEHOUSE_Y, SAFEHOUSE_Z, RadarSprite.Savehouse)`,
    );
  assertEquals(messages(blip("$SafeBlip"), known), []);
  assertEquals(messages(blip("$myCar"), known), [
    "error: Variable needs a Blip variable, but $myCar is a Car.",
  ]);
  assertEquals(messages(blip("$Blip"), known), [
    "error: $Blip is used, but variables.txt does not declare it.",
  ]);
});

Deno.test("an int radius is an error, because Sanny reads it as about zero", () => {
  assertEquals(messages(withCond(cond.playerNear3D("SAFEHOUSE", "20"))), [
    "error: Radius needs a float, but 20 is an int. Write 20.0.",
  ]);
  assertEquals(messages(withCond(cond.playerNear3D("SAFEHOUSE", "20.0"))), []);
  assertEquals(messages(withCond(cond.playerNear2D("SAFEHOUSE", "3"))), [
    "error: Radius needs a float, but 3 is an int. Write 3.0.",
  ]);
});

Deno.test("a constant's number type is checked against the parameter it fills", () => {
  const inRadius = (name: string) =>
    messages(withCond(cond.playerNear3D("SAFEHOUSE", name)), known);
  assertEquals(inRadius("WIDE"), []);
  assertEquals(inRadius("NARROW"), [
    "error: Radius needs a float, but NARROW is an int constant. Declare it with a decimal point, such as 20.0, or Sanny reads it as about zero.",
  ]);
  // The table's own constants count too, with or without the project's files.
  const own = { ...withCond(cond.playerNear3D("SAFEHOUSE", "REWARD")) };
  assertEquals(messages(own), [
    "error: Radius needs a float, but REWARD is an int constant. Declare it with a decimal point, such as 20.0, or Sanny reads it as about zero.",
  ]);
});

Deno.test("a float where an int belongs is an error too", () => {
  const score = (amount: string) =>
    messages({ ...withLines(`Player.AddScore($player, ${amount})`) }, known);
  assertEquals(score("250"), []);
  assertEquals(score("NARROW"), []);
  assertEquals(score("2.5"), [
    "error: Amount needs an int, but 2.5 is a float. Use a whole number.",
  ]);
  assertEquals(score("WIDE"), [
    "error: Amount needs an int, but WIDE is a float constant. Use a whole number.",
  ]);
});

Deno.test("every geography constant is declared as a float", () => {
  const consts = parseConsts(generateGeographyTxt(), "geography");
  const wrong = [...consts].filter(([, info]) => info.kind !== "float").map((
    [name],
  ) => name);
  assertEquals(wrong, []);
  assertEquals(consts.get("PAYPHONE_RADIUS")?.value, "20.0");
});

Deno.test("constants.txt is read with each constant's type and comment", () => {
  const consts = parseConsts(
    "const CHONG = 87\nconst PAYPHONE = 8 // RadarSprite.Diablo\nconst R = 2.5\n",
    "constants.txt",
  );
  assertEquals(consts.get("CHONG"), {
    kind: "int",
    value: "87",
    comment: undefined,
    source: "constants.txt",
  });
  assertEquals(consts.get("PAYPHONE")?.comment, "RadarSprite.Diablo");
  assertEquals(consts.get("R")?.kind, "float");
});

Deno.test("the tutorial and its project files declare every name it uses", async () => {
  const doc = await loadMission(missions, "0_tutorial");
  const names = await loadKnown(missions, doc!.mission);
  assertEquals(names !== undefined, true);
  assertEquals(
    problems(doc!.mission, names).map((p) => `${p.severity}: ${p.message}`),
    [
      "warning: Consider simplifying states: ARRIVE and HOME_TUTORIAL are both cutscene states linked together.",
    ],
  );
});

Deno.test("a project with no variables.txt has no known names to check against", async () => {
  const dir = await Deno.makeTempDir();
  try {
    await Deno.mkdir(`${dir}/missions`);
    const mission = withLines("x = 1");
    assertEquals(await loadKnown(`${dir}/missions`, mission), undefined);
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
