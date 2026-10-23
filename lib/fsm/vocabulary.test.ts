import { assertEquals } from "@std/assert";
import { cond, step } from "./vocabulary.ts";

Deno.test("say and title print text for a duration", () => {
  assertEquals(step.say("Hi", 3500), ['Text.PrintString("Hi", 3500)']);
  assertEquals(step.title("The Carpool Shortcut", 5000, "BottomRight"), [
    'Text.PrintBigString("The Carpool Shortcut", 5000, TextStyle.BottomRight)',
  ]);
  assertEquals(step.title("Hi", 100), [
    'Text.PrintBigString("Hi", 100, TextStyle.Middle)',
  ]);
});

Deno.test("help prints a help message", () => {
  assertEquals(step.help("Drive safe."), [
    'Text.PrintHelpString("Drive safe.")',
  ]);
});

Deno.test("radarFlash turns the radar flash on and off", () => {
  assertEquals(step.radarFlash(true), ["Hud.FlashObject(HudObject.Radar)"]);
  assertEquals(step.radarFlash(false), ["Hud.FlashObject(0)"]);
});

Deno.test("blipAt stores a sprite blip handle", () => {
  assertEquals(step.blipAt("$SafeBlip", ["X", "Y", "Z"], "Savehouse"), [
    "$SafeBlip = Blip.AddSpriteForCoord(X, Y, Z, RadarSprite.Savehouse)",
  ]);
});

Deno.test("cameraAtPlayer fixes the camera and interpolates", () => {
  assertEquals(step.cameraAtPlayer([1, 2, 3], 1250), [
    "Camera.SetFixedPosition(1, 2, 3, 0, 0, 0)",
    "Camera.SetInterpolationParameters(0, 1250)",
    "Camera.PointAtPlayer($player, CameraMode.Fixed, SwitchType.Interpolation)",
  ]);
});

Deno.test("camera, fade, and splash steps", () => {
  assertEquals(step.restoreJumpcut(), ["Camera.RestoreJumpcut()"]);
  assertEquals(step.fade(750, "Out"), ["Camera.DoFade(750, Fade.Out)"]);
  assertEquals(step.loadSplash("SPLASH1"), ["Hud.LoadSplash('SPLASH1')"]);
});

Deno.test("mission result steps", () => {
  assertEquals(step.passTune(), ["Audio.PlayMissionPassedTune(1)"]);
  assertEquals(step.registerPassed("NooM_0"), [
    "register_mission_passed 'NooM_0'",
  ]);
  assertEquals(step.addScore("REWARD"), ["Player.AddScore($player, REWARD)"]);
  assertEquals(step.passBanner("REWARD"), [
    "Text.PrintWithNumberBig('M_PASS', REWARD, 5000, TextStyle.Middle)",
  ]);
  assertEquals(step.failBanner(), [
    "Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)",
  ]);
  assertEquals(step.rememberPlayerCar(), [
    "Player.StoreCarIsIn($player, $myCar)",
  ]);
});

Deno.test("when wraps steps in an if with an optional else", () => {
  assertEquals(
    step.when([cond.latchClear("driveHint")], [step.help("A")], [
      step.help("B"),
    ]),
    [
      "if",
      "  latchDriveHint == false",
      "then",
      '  Text.PrintHelpString("A")',
      "else",
      '  Text.PrintHelpString("B")',
      "end",
    ],
  );
});

Deno.test("raw copies lines as written", () => {
  assertEquals(step.raw("wait 0", "wait 1"), ["wait 0", "wait 1"]);
});

Deno.test("player conditions", () => {
  assertEquals(cond.playerDead().test, "Player.IsDead($player)");
  assertEquals(cond.playerBusted().test, "Player.HasBeenArrested($player)");
  assertEquals(
    cond.playerSittingInCar().test,
    "Player.IsSittingInAnyCar($player)",
  );
  assertEquals(cond.playerInCar().test, "Player.IsInAnyCar($player)");
  assertEquals(
    cond.playerNear3D(["X", "Y", "Z"], "R").test,
    "Player.LocateAnyMeans3D($player, X, Y, Z, R, R, R, true)",
  );
});

Deno.test("healthBelow reads health into a scratch local", () => {
  assertEquals(cond.healthBelow(45), {
    pre: ["health = 0", "Player.GetHealth($player, health)"],
    test: "health < 45",
    locals: ["health"],
  });
});

Deno.test("wantedAbove reads the wanted level into a scratch local", () => {
  assertEquals(cond.wantedAbove(1), {
    pre: ["wanted = 0", "01C0: wanted = player $player wanted_level"],
    test: "wanted > 1",
    locals: ["wanted"],
  });
});

Deno.test("carHealthBelow reads the car's health into a scratch local", () => {
  assertEquals(cond.carHealthBelow("$myCar", 250), {
    pre: ["carHealth = 0", "0227: carHealth = car $myCar health"],
    test: "carHealth < 250",
    locals: ["carHealth"],
  });
});

Deno.test("latch conditions name the monitor's local", () => {
  assertEquals(cond.latchSet("driveHint").test, "latchDriveHint == true");
  assertEquals(cond.latchClear("driveHint").test, "latchDriveHint == false");
});
