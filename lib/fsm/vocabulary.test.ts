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

Deno.test("charCreate waits for the special character to load before creating it", () => {
  assertEquals(
    step.charCreate(1, "FRANKIE", "#SPECIAL01", "Special", "NOODLES_SAL", "sal"),
    [
      "Streaming.LoadSpecialCharacter(1, 'FRANKIE')",
      "while not Streaming.HasSpecialCharacterLoaded(1)",
      "  wait 0",
      "end",
      "Char.Create(PedType.Special, #SPECIAL01, NOODLES_SAL_X, NOODLES_SAL_Y, NOODLES_SAL_Z, sal)",
    ],
  );
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
  assertEquals(
    step.blipAt("$SafeBlip", ["X", "Y", "Z"], "RadarSprite.Savehouse"),
    [
      "$SafeBlip = Blip.AddSpriteForCoord(X, Y, Z, RadarSprite.Savehouse)",
    ],
  );
  assertEquals(step.blipAt("payphoneBlip", ["X", "Y", "Z"], "PAYPHONE"), [
    "payphoneBlip = Blip.AddSpriteForCoord(X, Y, Z, PAYPHONE)",
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

Deno.test("wantedAbove tests the wanted level with IsWantedLevelGreater", () => {
  assertEquals(cond.wantedAbove(1), {
    test: "Player.IsWantedLevelGreater($player, 1)",
  });
});

Deno.test("carHealthBelow reads the car's health into a scratch local", () => {
  assertEquals(cond.carHealthBelow("$myCar", 250), {
    pre: ["carHealth = 0", "0227: carHealth = car $myCar health"],
    test: "carHealth < 250",
    locals: ["carHealth"],
  });
});

Deno.test("clock steps set time, speed, and the HUD timer", () => {
  assertEquals(step.setTimeOfDay(20, 30), ["Clock.SetTimeOfDay(20, 30)"]);
  assertEquals(step.setTimeScale("1.0"), ["Clock.SetTimeScale(1.0)"]);
  assertEquals(step.storeClock(), ["Clock.Store()"]);
  assertEquals(step.restoreClock(), ["Clock.Restore()"]);
  assertEquals(step.showTimer(), ["Hud.DisplayTimer($hudTimer)"]);
  assertEquals(step.clearTimer(), ["Hud.ClearTimer($hudTimer)"]);
  assertEquals(step.showTimer("TIMERB"), ["Hud.DisplayTimer(TIMERB)"]);
  assertEquals(step.clearTimer("TIMERB"), ["Hud.ClearTimer(TIMERB)"]);
  assertEquals(step.freezeTimer(true), ["Hud.FreezeTimer(true)"]);
});

Deno.test("weather steps name a WeatherType member", () => {
  assertEquals(step.forceWeather("Rainy"), [
    "Weather.Force(WeatherType.Rainy)",
  ]);
  assertEquals(step.forceWeatherNow("Foggy"), [
    "Weather.ForceNow(WeatherType.Foggy)",
  ]);
  assertEquals(step.releaseWeather(), ["Weather.Release()"]);
  assertEquals(step.forceRain(false), ["Weather.ForceRain(false)"]);
});

Deno.test("world steps read a spot's coordinates", () => {
  assertEquals(step.swapBuildingModel("SAFEHOUSE", "10.0", 100, 200), [
    "World.SwapNearestBuildingModel(SAFEHOUSE_X, SAFEHOUSE_Y, SAFEHOUSE_Z, 10.0, 100, 200)",
  ]);
  assertEquals(step.setObjectVisible("SAFEHOUSE", "3.0", 100, false), [
    "World.SetVisibilityOfClosestObjectOfType(SAFEHOUSE_X, SAFEHOUSE_Y, SAFEHOUSE_Z, 3.0, 100, false)",
  ]);
  assertEquals(step.clearArea("SAFEHOUSE", "10.0", false), [
    "World.ClearArea(SAFEHOUSE_X, SAFEHOUSE_Y, SAFEHOUSE_Z, 10.0, false)",
  ]);
});

Deno.test("player, music, and garage steps", () => {
  assertEquals(step.setNeverGetsTired(true), [
    "Player.SetNeverGetsTired($player, true)",
  ]);
  assertEquals(step.setPlayerVisible(false), [
    "Player.SetVisible($player, false)",
  ]);
  assertEquals(step.setHealth(100), ["Player.SetHealth($player, 100)"]);
  assertEquals(step.addArmour(100), ["Player.AddArmour($player, 100)"]);
  assertEquals(step.setMaxWantedLevel(6), ["Game.SetMaxWantedLevel(6)"]);
  assertEquals(step.setMusicFades(true), ["Audio.SetMusicDoesFade(true)"]);
  assertEquals(step.openGarage("$Garage"), ["Garage.Open($Garage)"]);
  assertEquals(step.closeGarage("$Garage"), ["Garage.Close($Garage)"]);
  assertEquals(step.activateGarage("$Garage"), ["Garage.Activate($Garage)"]);
  assertEquals(step.deactivateGarage("$Garage"), [
    "Garage.Deactivate($Garage)",
  ]);
});

Deno.test("clockAtOrAfter and clockBefore read the hour into scratch locals", () => {
  const pre = [
    "hours = 0",
    "minutes = 0",
    "Clock.GetTimeOfDay(hours, minutes)",
  ];
  assertEquals(cond.clockAtOrAfter(20), {
    pre,
    test: "hours >= 20",
    locals: ["hours", "minutes"],
  });
  assertEquals(cond.clockBefore(6), {
    pre,
    test: "hours < 6",
    locals: ["hours", "minutes"],
  });
});

Deno.test("garage and health conditions", () => {
  assertEquals(
    cond.playerHealthAbove(50).test,
    "Player.IsHealthGreater($player, 50)",
  );
  assertEquals(cond.garageOpen("$Garage").test, "Garage.IsOpen($Garage)");
  assertEquals(cond.garageClosed("$Garage").test, "Garage.IsClosed($Garage)");
  assertEquals(
    cond.garageContainsCar("$Garage", "$myCar").test,
    "Garage.DoesContainCar($Garage, $myCar)",
  );
});

Deno.test("latch conditions name the monitor's local", () => {
  assertEquals(cond.latchSet("driveHint").test, "latchDriveHint == true");
  assertEquals(cond.latchClear("driveHint").test, "latchDriveHint == false");
});
