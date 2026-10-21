import { assert, assertEquals } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  cond,
  condDescriptors,
  loadMission,
  step,
  stepDescriptors,
} from "@noodles/fsm";
import type { Cond, Step } from "@noodles/fsm";
import {
  buildCond,
  buildLines,
  buildWhen,
  defaults,
  formatField,
  formatName,
  formatNumber,
  isValid,
  parseCond,
  parseLines,
  parseWhen,
} from "./ui/templates.js";

const missions = fromFileUrl(new URL("../../missions", import.meta.url));

const byName = <T extends { name: string }>(list: T[], name: string): T =>
  list.find((d) => d.name === name)!;

Deno.test("every step descriptor builds the lines its builder builds", () => {
  const spot: [string, string, string] = ["X", "Y", "Z"];
  const cases: [string, Record<string, string>, Step][] = [
    ["say", { text: "Hi", ms: "3500" }, step.say("Hi", 3500)],
    [
      "title",
      { text: "T", ms: "5000", style: "BottomRight" },
      step.title("T", 5000, "BottomRight"),
    ],
    ["help", { text: "Drive safe." }, step.help("Drive safe.")],
    ["radarFlashOn", {}, step.radarFlash(true)],
    ["radarFlashOff", {}, step.radarFlash(false)],
    [
      "blipAt",
      { handle: "$B", x: "X", y: "Y", z: "Z", sprite: "Savehouse" },
      step.blipAt("$B", spot, "Savehouse"),
    ],
    [
      "cameraAtPlayer",
      { x: "X", y: "Y", z: "Z", ms: "1250" },
      step.cameraAtPlayer(spot, 1250),
    ],
    ["restoreJumpcut", {}, step.restoreJumpcut()],
    ["fade", { ms: "750", direction: "Out" }, step.fade(750, "Out")],
    ["loadSplash", { name: "SPLASH1" }, step.loadSplash("SPLASH1")],
    ["passTune", {}, step.passTune()],
    ["registerPassed", { id: "NooM_0" }, step.registerPassed("NooM_0")],
    ["addScore", { amount: "REWARD" }, step.addScore("REWARD")],
    ["passBanner", { amount: "REWARD" }, step.passBanner("REWARD")],
    ["failBanner", {}, step.failBanner()],
    ["rememberPlayerCar", {}, step.rememberPlayerCar()],
  ];
  assertEquals(cases.map(([name]) => name), stepDescriptors.map((d) => d.name));
  for (const [name, values, expected] of cases) {
    const descriptor = byName(stepDescriptors, name);
    assertEquals(buildLines(descriptor, values), expected, name);
    assertEquals(parseLines(stepDescriptors, expected)?.descriptor.name, name);
  }
});

Deno.test("every condition descriptor builds the condition its builder builds", () => {
  const cases: [string, Record<string, string>, Cond][] = [
    ["playerDead", {}, cond.playerDead()],
    ["playerBusted", {}, cond.playerBusted()],
    ["playerSittingInCar", {}, cond.playerSittingInCar()],
    ["playerInCar", {}, cond.playerInCar()],
    [
      "playerNear3D",
      { x: "X", y: "Y", z: "Z", radius: "R" },
      cond.playerNear3D(["X", "Y", "Z"], "R"),
    ],
    ["healthBelow", { amount: "45" }, cond.healthBelow(45)],
    [
      "playerNear2D",
      { x: "X", y: "Y", radius: "R" },
      cond.playerNear2D(["X", "Y"], "R"),
    ],
    [
      "playerOnFootNear3D",
      { x: "X", y: "Y", z: "Z", radius: "R" },
      cond.playerOnFootNear3D(["X", "Y", "Z"], "R"),
    ],
    [
      "playerOnFootNear2D",
      { x: "X", y: "Y", radius: "R" },
      cond.playerOnFootNear2D(["X", "Y"], "R"),
    ],
    [
      "playerStoppedNear3D",
      { x: "X", y: "Y", z: "Z", radius: "R" },
      cond.playerStoppedNear3D(["X", "Y", "Z"], "R"),
    ],
    ["playerInThisCar", { car: "$myCar" }, cond.playerInThisCar("$myCar")],
    ["playerLiftingPhone", {}, cond.playerLiftingPhone()],
    ["playerCanStartMission", {}, cond.playerCanStartMission()],
    ["keyPressed", { key: "Space" }, cond.keyPressed("Space")],
    ["carUpsideDown", { car: "$myCar" }, cond.carUpsideDown("$myCar")],
    ["carInWater", { car: "$myCar" }, cond.carInWater("$myCar")],
    ["pickupCollected", { pickup: "$p" }, cond.pickupCollected("$p")],
    ["charSpottedPlayer", { char: "sal" }, cond.charSpottedPlayer("sal")],
    ["saveFinished", {}, cond.saveFinished()],
    ["modelLoaded", { model: "827" }, cond.modelLoaded(827)],
    ["latchSet", { id: "driveHint" }, cond.latchSet("driveHint")],
    ["latchClear", { id: "driveHint" }, cond.latchClear("driveHint")],
  ];
  assertEquals(cases.map(([name]) => name), condDescriptors.map((d) => d.name));
  for (const [name, values, expected] of cases) {
    assertEquals(
      buildCond(byName(condDescriptors, name), values),
      expected,
      name,
    );
    const parsed = parseCond(condDescriptors, expected);
    assertEquals(parsed?.descriptor.name, name);
    assertEquals(parsed?.values, values);
  }
});

Deno.test("a repeated field must repeat the same text", () => {
  const lines =
    "Player.LocateAnyMeans3D($player, X, Y, Z, 2.0, 3.0, 2.0, true)";
  assertEquals(parseCond(condDescriptors, { test: lines }), null);
});

Deno.test("a condition with someone else's pre lines is not a typed condition", () => {
  assertEquals(parseCond(condDescriptors, { test: "health < 45" }), null);
});

Deno.test("fields refuse text that would not read back", () => {
  const say = byName(stepDescriptors, "say");
  const [text, ms] = say.fields;
  assert(isValid(text, "Fuck me, that shift was long."));
  assert(!isValid(text, 'a "quote"'));
  assert(isValid(ms, "3500"));
  assert(!isValid(ms, ""));
  const expr = byName(condDescriptors, "playerNear3D").fields[0];
  assert(
    isValid(expr, "SAFEHOUSE_X") && isValid(expr, "-3.5") &&
      !isValid(expr, "a b"),
  );
});

Deno.test("typing is rewritten into the field's format", () => {
  assertEquals(formatName("go home"), "GO_HOME");
  assertEquals(formatName("  3rd-floor  walk!"), "RD_FLOOR_WALK");
  assertEquals(formatNumber("12a.5.6"), "12.56");
  assertEquals(formatNumber("5-3"), "53");
  const [text, ms] = byName(stepDescriptors, "say").fields;
  assertEquals(formatField(text, 'say "hi"'), "say hi");
  assertEquals(formatField(ms, "0042 ms"), "42");
  const [handle] = byName(stepDescriptors, "blipAt").fields;
  assertEquals(formatField(handle, "Safe Blip"), "$SafeBlip");
  const expr = byName(condDescriptors, "playerNear3D").fields[0];
  assertEquals(formatField(expr, "SAFE HOUSE_X"), "SAFEHOUSE_X");
});

Deno.test("a fresh step of every kind reads back as itself", () => {
  for (const d of [...stepDescriptors, ...condDescriptors]) {
    const lines = buildLines(d, defaults(d, ["driveHint"]));
    const parsed =
      "group" in d && d.group === "Monitors" || "pre" in d || "locals" in d ||
        condDescriptors.includes(d as never)
        ? parseCond(condDescriptors, buildCond(d, defaults(d, ["driveHint"])))
        : parseLines(stepDescriptors, lines);
    assertEquals(parsed?.descriptor.name, d.name);
  }
});

Deno.test("mission 0's steps and conditions all read as typed controls, except the nested when", async () => {
  const doc = await loadMission(missions, "0_tutorial");
  const m = doc!.mission;
  const untyped: string[] = [];
  const steps = (list: Step[] = []) => {
    for (const s of list) {
      if (
        !parseLines(stepDescriptors, s) &&
        !parseWhen(stepDescriptors, condDescriptors, s)
      ) untyped.push(s[0]);
    }
  };
  const conds = (list: Cond[] = []) => {
    for (const c of list) {
      if (!parseCond(condDescriptors, c)) untyped.push(c.test);
    }
  };
  conds(m.fail);
  for (const mon of m.monitors ?? []) {
    conds(mon.when);
    steps(mon.once);
  }
  for (const s of Object.values(m.states)) {
    steps(s.onEnter);
    steps(s.onExit);
    conds(s.until);
    for (const rule of s.on ?? []) conds(rule.when);
    for (const beat of s.beats ?? []) {
      conds(beat.when);
      steps(beat.do);
    }
  }
  assertEquals(untyped, []);
});

Deno.test("a conditional step reads back into conditions, a then body, and an else body", () => {
  const lines = step.when(
    [cond.healthBelow(45), cond.latchClear("driveHint")],
    [step.help("A"), step.fade(750, "Out")],
    [step.when([cond.playerDead()], [step.help("B")]), ["wait 0"]],
  );
  const parsed = parseWhen(stepDescriptors, condDescriptors, lines)!;
  assertEquals(parsed.conds.map((c: Cond) => c.test), [
    "health < 45",
    "latchDriveHint == false",
  ]);
  assertEquals(parsed.then, [step.help("A"), step.fade(750, "Out")]);
  assertEquals(parsed.otherwise, [
    step.when([cond.playerDead()], [step.help("B")]),
    ["wait 0"],
  ]);
  assertEquals(buildWhen(parsed), lines);
});

Deno.test("lines that are not a conditional the editor wrote stay untyped", () => {
  assertEquals(parseWhen(stepDescriptors, condDescriptors, ["wait 0"]), null);
  assertEquals(
    parseWhen(stepDescriptors, condDescriptors, [
      "mystery = 1",
      "if",
      "  mystery == 1",
      "then",
      "end",
    ]),
    null,
  );
});
