import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl } from "@std/path";
import {
  cond,
  condDescriptors,
  enumsFor,
  fieldPattern,
  loadMission,
  step,
  stepDescriptors,
} from "@noodles/fsm";
import type { Cond, Step } from "@noodles/fsm";
import {
  buildCond,
  buildLines,
  buildWhen,
  closedCombo,
  constantOptions,
  defaults,
  enumOptions,
  fieldPattern as clientPattern,
  filterOptions,
  flipShown,
  formatField,
  formatName,
  formatNumber,
  functionOptions,
  globalOptions,
  isValid,
  numberProblem,
  parseCond,
  parseLines,
  parseWhen,
  spotOptions,
} from "./ui/templates.js";

const missions = fromFileUrl(new URL("../../missions", import.meta.url));

const byName = <T extends { name: string }>(list: T[], name: string): T =>
  list.find((d) => d.name === name)!;

Deno.test("a call function card names a function in scope, and reads back from its line", () => {
  const d = byName(stepDescriptors, "callFunction");
  const functions = [{
    name: "ensureVanBlip",
    source: "../utils/missions.txt",
  }];
  assertEquals(defaults(d, [], [], [], functions).name, "ensureVanBlip");
  assertEquals(defaults(d).name, "");
  assertEquals(
    functionOptions(functions).map((o: { value: string }) => o.value),
    [
      "ensureVanBlip",
    ],
  );
  assertEquals(
    parseLines(stepDescriptors, ["ensureVanBlip()"])?.descriptor.name,
    "callFunction",
  );
});

Deno.test("every step descriptor builds the lines its builder builds", () => {
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
    ["blipRemove", { handle: "$B" }, step.blipRemove("$B")],
    [
      "blipAt",
      { handle: "$B", spot: "SAFEHOUSE", sprite: "Savehouse" },
      step.blipAt("$B", "SAFEHOUSE", "Savehouse"),
    ],
    [
      "cameraAtPlayer",
      { spot: "PAYPHONE_CALL_CAM", ms: "1250" },
      step.cameraAtPlayer("PAYPHONE_CALL_CAM", 1250),
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
    ["playerControl", { on: "false" }, step.playerControl(false)],
    ["requestModel", { model: "827" }, step.requestModel(827)],
    ["loadModels", {}, step.loadModels()],
    [
      "soundAt",
      { spot: "PAYPHONE", sound: "SoundPayphoneRinging" },
      step.soundAt("PAYPHONE", "SoundPayphoneRinging"),
    ],
    ["clearUi", {}, step.clearUi()],
    ["wait", { ms: "0" }, step.wait(0)],
    [
      "charCreate",
      {
        slot: "1",
        name: "FRANKIE",
        model: "#SPECIAL01",
        pedType: "Special",
        spot: "NOODLES_SAL",
        char: "sal",
      },
      step.charCreate(
        1,
        "FRANKIE",
        "#SPECIAL01",
        "Special",
        "NOODLES_SAL",
        "sal",
      ),
    ],
    [
      "charPersonality",
      { char: "sal", stat: "ToughGuy" },
      step.charPersonality("sal", "ToughGuy"),
    ],
    ["charFacePlayer", { char: "sal" }, step.charFacePlayer("sal")],
    ["charLookPlayer", { char: "sal" }, step.charLookPlayer("sal")],
    [
      "charAnimGroup",
      { char: "sal", animGroup: "Man" },
      step.charAnimGroup("sal", "Man"),
    ],
    [
      "cameraAtChar",
      { char: "sal", switch: "JumpCut" },
      step.cameraAtChar("sal", "JumpCut"),
    ],
    [
      "cameraFixedAtChar",
      { spot: "NOODLES_SECURITY_CAM", char: "sal", switch: "JumpCut" },
      step.cameraFixedAtChar("NOODLES_SECURITY_CAM", "sal", "JumpCut"),
    ],
    ["cameraInterpolation", { ms: "750" }, step.cameraInterpolation(750)],
    ["cameraBehindPlayer", {}, step.cameraBehindPlayer()],
    [
      "cameraGenerateCars",
      { on: "false" },
      step.cameraGenerateCars(false),
    ],
    [
      "charHeading",
      { var: "salHeading", char: "sal" },
      step.charHeading("salHeading", "sal"),
    ],
    [
      "invertHeading",
      { var: "faceSalHeading", source: "salHeading" },
      step.invertHeading("faceSalHeading", "salHeading"),
    ],
    ["playerFaceChar", { char: "sal" }, step.playerFaceChar("sal")],
    [
      "playerHeading",
      { angle: "faceSalHeading" },
      step.playerHeading("faceSalHeading"),
    ],
    ["playerLookChar", { char: "sal" }, step.playerLookChar("sal")],
    ["playerStopLooking", {}, step.playerStopLooking()],
    ["charStopLooking", { char: "sal" }, step.charStopLooking("sal")],
    [
      "charRunning",
      { char: "sal", running: "true" },
      step.charRunning("sal", true),
    ],
    [
      "charGoto",
      { char: "sal", spot: "ROSA_SPAWN" },
      step.charGoto("sal", "ROSA_SPAWN"),
    ],
    ["charRemove", { char: "sal" }, step.charRemove("sal")],
    [
      "callFunction",
      { name: "ensureVanBlip" },
      step.callFunction("ensureVanBlip"),
    ],
    [
      "carCreate",
      { car: "$myCar", model: "#RUMPO", spot: "SUPPLY_VAN" },
      step.carCreate("$myCar", "#RUMPO", "SUPPLY_VAN"),
    ],
    [
      "carModel",
      { var: "$myCarModel", model: "#RUMPO" },
      step.carModel("$myCarModel", "#RUMPO"),
    ],
    [
      "blipForCoord",
      { handle: "deliveryBlip", spot: "DELIVERY" },
      step.blipForCoord("deliveryBlip", "DELIVERY"),
    ],
    [
      "blipForPickup",
      { handle: "pickupBlip", pickup: "packagePickup" },
      step.blipForPickup("pickupBlip", "packagePickup"),
    ],
    [
      "pickupCreate",
      { pickup: "packagePickup", model: "1321", spot: "PACKAGE_PICKUP" },
      step.pickupCreate("packagePickup", 1321, "PACKAGE_PICKUP"),
    ],
    [
      "pickupRemove",
      { pickup: "packagePickup" },
      step.pickupRemove("packagePickup"),
    ],
    [
      "phoneGrab",
      { spot: "PAYPHONE", var: "payphoneHandle" },
      step.phoneGrab("PAYPHONE", "payphoneHandle"),
    ],
    ["phoneOn", { var: "payphoneHandle" }, step.phoneOn("payphoneHandle")],
    ["phoneOff", { var: "payphoneHandle" }, step.phoneOff("payphoneHandle")],
    [
      "debugLog",
      { key: "DEBUG_PLAYER", value: "$player" },
      step.debugLog("DEBUG_PLAYER", "$player"),
    ],
    [
      "setTimeOfDay",
      { hours: "12", minutes: "0" },
      step.setTimeOfDay(12, 0),
    ],
    ["setTimeScale", { scale: "1.0" }, step.setTimeScale("1.0")],
    ["storeClock", {}, step.storeClock()],
    ["restoreClock", {}, step.restoreClock()],
    ["showTimer", { timer: "TIMERB" }, step.showTimer("TIMERB")],
    ["clearTimer", { timer: "TIMERB" }, step.clearTimer("TIMERB")],
    ["freezeTimer", { on: "true" }, step.freezeTimer(true)],
    ["forceWeather", { type: "Rainy" }, step.forceWeather("Rainy")],
    ["forceWeatherNow", { type: "Foggy" }, step.forceWeatherNow("Foggy")],
    ["releaseWeather", {}, step.releaseWeather()],
    ["forceRain", { on: "true" }, step.forceRain(true)],
    ["setNeverGetsTired", { on: "true" }, step.setNeverGetsTired(true)],
    ["setPlayerVisible", { on: "false" }, step.setPlayerVisible(false)],
    ["setHealth", { health: "100" }, step.setHealth(100)],
    ["addArmour", { amount: "100" }, step.addArmour(100)],
    ["setMaxWantedLevel", { max: "6" }, step.setMaxWantedLevel(6)],
    [
      "swapBuildingModel",
      { spot: "SAFEHOUSE", radius: "10.0", from: "100", to: "200" },
      step.swapBuildingModel("SAFEHOUSE", "10.0", 100, 200),
    ],
    [
      "setObjectVisible",
      { spot: "SAFEHOUSE", radius: "3.0", model: "100", on: "false" },
      step.setObjectVisible("SAFEHOUSE", "3.0", 100, false),
    ],
    [
      "clearArea",
      { spot: "SAFEHOUSE", radius: "10.0", particles: "false" },
      step.clearArea("SAFEHOUSE", "10.0", false),
    ],
    ["setMusicFades", { on: "true" }, step.setMusicFades(true)],
    ["openGarage", { garage: "$Garage" }, step.openGarage("$Garage")],
    ["closeGarage", { garage: "$Garage" }, step.closeGarage("$Garage")],
    ["activateGarage", { garage: "$Garage" }, step.activateGarage("$Garage")],
    [
      "deactivateGarage",
      { garage: "$Garage" },
      step.deactivateGarage("$Garage"),
    ],
    ["playEndTune", {}, step.playEndTune()],
    [
      "setRadioChannel",
      { channel: "HeadRadio", startMs: "0" },
      step.setRadioChannel("HeadRadio", 0),
    ],
    [
      "blipForChar",
      { handle: "charBlip", char: "sal" },
      step.blipForChar("charBlip", "sal"),
    ],
    [
      "blipChangeColor",
      { handle: "$B", color: "Red" },
      step.blipChangeColor("$B", "Red"),
    ],
    ["blipDim", { handle: "$B", on: "true" }, step.blipDim("$B", true)],
    ["cameraShake", { intensity: "2" }, step.cameraShake(2)],
    ["cameraInFrontOfPlayer", {}, step.cameraInFrontOfPlayer()],
    [
      "cameraPointAtCar",
      { car: "$myCar", cut: "Interpolation" },
      step.cameraPointAtCar("$myCar", "Interpolation"),
    ],
    [
      "cameraFadeColor",
      { r: "0", g: "0", b: "0" },
      step.cameraFadeColor(0, 0, 0),
    ],
    ["cameraNearClip", { distance: "0.1" }, step.cameraNearClip("0.1")],
    [
      "cameraMotionBlur",
      { type: "Cutscene" },
      step.cameraMotionBlur("Cutscene"),
    ],
    ["carDelete", { car: "$myCar" }, step.carDelete("$myCar")],
    [
      "carGoto",
      { car: "$myCar", spot: "SAFEHOUSE" },
      step.carGoto("$myCar", "SAFEHOUSE"),
    ],
    ["carSetIdle", { car: "$myCar" }, step.carSetIdle("$myCar")],
    ["carExplode", { car: "$myCar" }, step.carExplode("$myCar")],
    [
      "carSetHealth",
      { car: "$myCar", health: "1000" },
      step.carSetHealth("$myCar", 1000),
    ],
    [
      "carLock",
      { car: "$myCar", lock: "Locked" },
      step.carLock("$myCar", "Locked"),
    ],
    [
      "carSetHeading",
      { car: "$myCar", angle: "0.0" },
      step.carSetHeading("$myCar", "0.0"),
    ],
    ["charDelete", { char: "sal" }, step.charDelete("sal")],
    [
      "charSetHealth",
      { char: "sal", health: "100" },
      step.charSetHealth("sal", 100),
    ],
    [
      "charGiveWeapon",
      { char: "sal", weapon: "Pistol", ammo: "50" },
      step.charGiveWeapon("sal", "Pistol", 50),
    ],
    ["charSetIdle", { char: "sal" }, step.charSetIdle("sal")],
    [
      "charSetHeading",
      { char: "sal", angle: "0.0" },
      step.charSetHeading("sal", "0.0"),
    ],
    [
      "setWantedMultiplier",
      { multiplier: "1.0" },
      step.setWantedMultiplier("1.0"),
    ],
    ["setPoliceIgnorePlayer", { on: "true" }, step.setPoliceIgnorePlayer(true)],
    [
      "setEveryoneIgnorePlayer",
      { on: "true" },
      step.setEveryoneIgnorePlayer(true),
    ],
    ["activateSaveMenu", {}, step.activateSaveMenu()],
    ["setAllCarsDamage", { on: "true" }, step.setAllCarsDamage(true)],
    [
      "changeGarageType",
      { garage: "$Garage", type: "Mission" },
      step.changeGarageType("$Garage", "Mission"),
    ],
    [
      "showCounter",
      { counter: "$counter", display: "Number" },
      step.showCounter("$counter", "Number"),
    ],
    ["clearCounter", { counter: "$counter" }, step.clearCounter("$counter")],
    ["widescreen", { on: "true" }, step.widescreen(true)],
    [
      "objectCreate",
      { var: "$object", model: "0", spot: "SAFEHOUSE" },
      step.objectCreate("$object", 0, "SAFEHOUSE"),
    ],
    ["objectDelete", { object: "$object" }, step.objectDelete("$object")],
    [
      "padShake",
      { pad: "Pad1", ms: "1000", intensity: "100" },
      step.padShake("Pad1", 1000, 100),
    ],
    [
      "pickupCreateMoney",
      { pickup: "moneyPickup", spot: "SAFEHOUSE", amount: "100" },
      step.pickupCreateMoney("moneyPickup", "SAFEHOUSE", 100),
    ],
    [
      "pickupCreateFloatingPackage",
      { pickup: "packagePickup", spot: "SAFEHOUSE" },
      step.pickupCreateFloatingPackage("packagePickup", "SAFEHOUSE"),
    ],
    ["pickupDropMine", { spot: "SAFEHOUSE" }, step.pickupDropMine("SAFEHOUSE")],
    ["playerWarp", { spot: "SAFEHOUSE" }, step.playerWarp("SAFEHOUSE")],
    ["playerWarpIntoCar", { car: "$myCar" }, step.playerWarpIntoCar("$myCar")],
    ["playerClearWantedLevel", {}, step.playerClearWantedLevel()],
    ["playerAlterWantedLevel", { stars: "2" }, step.playerAlterWantedLevel(2)],
    [
      "playerGiveWeapon",
      { weapon: "Pistol", ammo: "50" },
      step.playerGiveWeapon("Pistol", 50),
    ],
    [
      "playerSetAmmo",
      { weapon: "Pistol", ammo: "50" },
      step.playerSetAmmo("Pistol", 50),
    ],
    ["playerRemoveWeapons", {}, step.playerRemoveWeapons()],
    [
      "playerSetAnimGroup",
      { animGroup: "Player" },
      step.playerSetAnimGroup("Player"),
    ],
    [
      "streamLoadSpecialCharacter",
      { slot: "1", name: "sal" },
      step.streamLoadSpecialCharacter(1, "sal"),
    ],
    [
      "streamUnloadSpecialCharacter",
      { slot: "1" },
      step.streamUnloadSpecialCharacter(1),
    ],
    ["streamUnloadModel", { model: "0" }, step.streamUnloadModel(0)],
    [
      "streamLoadCollision",
      { level: "Industrial" },
      step.streamLoadCollision("Industrial"),
    ],
    [
      "streamLoadScene",
      { spot: "SAFEHOUSE" },
      step.streamLoadScene("SAFEHOUSE"),
    ],
    ["clearPrints", {}, step.clearPrints()],
    ["clearHelp", {}, step.clearHelp()],
    ["useCommands", { on: "true" }, step.useCommands(true)],
    ["textBackground", { on: "true" }, step.textBackground(true)],
    ["cutsceneLoad", { name: "INTRO" }, step.cutsceneLoad("INTRO")],
    [
      "cutsceneSetOffset",
      { spot: "SAFEHOUSE" },
      step.cutsceneSetOffset("SAFEHOUSE"),
    ],
    ["cutsceneStart", {}, step.cutsceneStart()],
    ["cutsceneClear", {}, step.cutsceneClear()],
    [
      "cutsceneObjectCreate",
      { var: "$cutObject", model: "0" },
      step.cutsceneObjectCreate("$cutObject", 0),
    ],
    [
      "cutsceneObjectAnim",
      { object: "$cutObject", anim: "IDLE" },
      step.cutsceneObjectAnim("$cutObject", "IDLE"),
    ],
    [
      "cutsceneHeadCreate",
      { var: "$cutHead", object: "$cutObject", model: "0" },
      step.cutsceneHeadCreate("$cutHead", "$cutObject", 0),
    ],
    [
      "boatGoto",
      { boat: "$boat", spot: "SAFEHOUSE" },
      step.boatGoto("$boat", "SAFEHOUSE"),
    ],
    ["boatStop", { boat: "$boat" }, step.boatStop("$boat")],
    [
      "boatCruiseSpeed",
      { boat: "$boat", speed: "20.0" },
      step.boatCruiseSpeed("$boat", "20.0"),
    ],
    [
      "boatAnchor",
      { boat: "$boat", on: "true" },
      step.boatAnchor("$boat", true),
    ],
    [
      "carGeneratorSwitch",
      { generator: "$carGenerator", count: "1" },
      step.carGeneratorSwitch("$carGenerator", 1),
    ],
    [
      "craneDeactivate",
      { spot: "SAFEHOUSE" },
      step.craneDeactivate("SAFEHOUSE"),
    ],
    [
      "gangCarModel",
      { gang: "Yakuza", model: "0" },
      step.gangCarModel("Yakuza", 0),
    ],
    [
      "gangWeapons",
      { gang: "Yakuza", first: "Pistol", second: "Uzi" },
      step.gangWeapons("Yakuza", "Pistol", "Uzi"),
    ],
    [
      "gangModelPreference",
      { gang: "Yakuza", override: "Any" },
      step.gangModelPreference("Yakuza", "Any"),
    ],
    [
      "fxExplosion",
      { spot: "SAFEHOUSE", type: "Car" },
      step.fxExplosion("SAFEHOUSE", "Car"),
    ],
    [
      "pathAddRoutePoint",
      { route: "1", spot: "SAFEHOUSE" },
      step.pathAddRoutePoint(1, "SAFEHOUSE"),
    ],
    ["pathRemoveRoute", { route: "1" }, step.pathRemoveRoute(1)],
    [
      "restartAddHospital",
      { spot: "SAFEHOUSE", angle: "0.0" },
      step.restartAddHospital("SAFEHOUSE", "0.0"),
    ],
    [
      "restartOverrideNext",
      { spot: "SAFEHOUSE", angle: "0.0" },
      step.restartOverrideNext("SAFEHOUSE", "0.0"),
    ],
    ["restartCancelOverride", {}, step.restartCancelOverride()],
    [
      "restartFadeAfterDeath",
      { on: "true" },
      step.restartFadeAfterDeath(true),
    ],
    ["rcBlowUp", {}, step.rcBlowUp()],
    [
      "fireCreate",
      { var: "$fire", spot: "SAFEHOUSE" },
      step.fireCreate("$fire", "SAFEHOUSE"),
    ],
    ["fireRemove", { fire: "$fire" }, step.fireRemove("$fire")],
    ["fireAudio", { fire: "$fire", on: "true" }, step.fireAudio("$fire", true)],
    [
      "sphereCreate",
      { var: "$sphere", spot: "SAFEHOUSE", radius: "3.0" },
      step.sphereCreate("$sphere", "SAFEHOUSE", "3.0"),
    ],
    ["sphereRemove", { sphere: "$sphere" }, step.sphereRemove("$sphere")],
    ["statProgress", { amount: "1" }, step.statProgress(1)],
    ["statSetProgressTotal", { total: "10" }, step.statSetProgressTotal(10)],
    ["statMissionGiven", {}, step.statMissionGiven()],
    [
      "stuckCarAdd",
      { car: "$myCar", distance: "5.0", time: "5000" },
      step.stuckCarAdd("$myCar", "5.0", 5000),
    ],
    ["stuckCarRemove", { car: "$myCar" }, step.stuckCarRemove("$myCar")],
    [
      "txdLoadDictionary",
      { name: "MAIN" },
      step.txdLoadDictionary("MAIN"),
    ],
    [
      "txdLoadSprite",
      { slot: "0", name: "SPRITE" },
      step.txdLoadSprite(0, "SPRITE"),
    ],
    ["txdRemove", {}, step.txdRemove()],
    [
      "chaseSceneStart",
      { startTime: "0.0" },
      step.chaseSceneStart("0.0"),
    ],
    ["chaseSceneStop", {}, step.chaseSceneStop()],
    [
      "chaseSceneRemoveCar",
      { index: "0" },
      step.chaseSceneRemoveCar(0),
    ],
    ["catalinaHeliStart", {}, step.catalinaHeliStart()],
    ["catalinaHeliTakeOff", {}, step.catalinaHeliTakeOff()],
    ["catalinaHeliRemove", {}, step.catalinaHeliRemove()],
    ["drugRunStart", {}, step.drugRunStart()],
    ["drugDropOffStart", {}, step.drugDropOffStart()],
    ["pacmanStartRace", {}, step.pacmanStartRace()],
    [
      "pacmanStartScramble",
      { spot: "SAFEHOUSE", distance: "10.0", count: "10" },
      step.pacmanStartScramble("SAFEHOUSE", "10.0", 10),
    ],
    ["pacmanClear", {}, step.pacmanClear()],
    ["creditsStart", {}, step.creditsStart()],
    ["creditsStop", {}, step.creditsStop()],
    [
      "zoneSetCarDensity",
      { zone: "CBD", time: "Day", density: "1" },
      step.zoneSetCarDensity("CBD", "Day", 1),
    ],
    [
      "zoneSetPedDensity",
      { zone: "CBD", time: "Day", density: "1" },
      step.zoneSetPedDensity("CBD", "Day", 1),
    ],
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
      { spot: "SAFEHOUSE_ARRIVE", radius: "R", sphere: "true" },
      cond.playerNear3D("SAFEHOUSE_ARRIVE", "R"),
    ],
    ["healthBelow", { amount: "45" }, cond.healthBelow(45)],
    [
      "playerNear2D",
      { spot: "PAYPHONE", radius: "R", sphere: "false" },
      cond.playerNear2D("PAYPHONE", "R"),
    ],
    [
      "playerOnFootNear3D",
      { spot: "SAFEHOUSE", radius: "R", sphere: "true" },
      cond.playerOnFootNear3D("SAFEHOUSE", "R"),
    ],
    [
      "playerOnFootNear2D",
      { spot: "PAYPHONE", radius: "R", sphere: "false" },
      cond.playerOnFootNear2D("PAYPHONE", "R"),
    ],
    [
      "playerStoppedNear3D",
      { spot: "SAFEHOUSE", radius: "R", sphere: "true" },
      cond.playerStoppedNear3D("SAFEHOUSE", "R"),
    ],
    [
      "playerNear3D",
      { spot: "PAYPHONE", radius: "3.0", sphere: "false" },
      cond.playerNear3D("PAYPHONE", undefined, false),
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
    ["wantedAbove", { max: "1" }, cond.wantedAbove(1)],
    [
      "carHealthBelow",
      { car: "$myCar", amount: "250" },
      cond.carHealthBelow("$myCar", 250),
    ],
    ["latchSet", { id: "driveHint" }, cond.latchSet("driveHint")],
    ["latchClear", { id: "driveHint" }, cond.latchClear("driveHint")],
    [
      "variableEquals",
      { name: "$skipCutscene", value: "false" },
      cond.variableEquals("$skipCutscene", "false"),
    ],
    [
      "pickupNotCollected",
      { pickup: "$pickup" },
      cond.pickupNotCollected("$pickup"),
    ],
    [
      "timeLimitExceeded",
      { seconds: "60" },
      cond.timeLimitExceeded(60),
    ],
    [
      "timeLimitNotExceeded",
      { seconds: "60" },
      cond.timeLimitNotExceeded(60),
    ],
    ["clockAtOrAfter", { hour: "20" }, cond.clockAtOrAfter(20)],
    ["clockBefore", { hour: "6" }, cond.clockBefore(6)],
    ["playerHealthAbove", { amount: "50" }, cond.playerHealthAbove(50)],
    ["garageOpen", { garage: "$Garage" }, cond.garageOpen("$Garage")],
    ["garageClosed", { garage: "$Garage" }, cond.garageClosed("$Garage")],
    [
      "garageContainsCar",
      { garage: "$Garage", car: "$myCar" },
      cond.garageContainsCar("$Garage", "$myCar"),
    ],
    ["charDead", { char: "sal" }, cond.charDead("sal")],
    ["carDead", { car: "$myCar" }, cond.carDead("$myCar")],
    ["carStopped", { car: "$myCar" }, cond.carStopped("$myCar")],
    ["carStuckOnRoof", { car: "$myCar" }, cond.carStuckOnRoof("$myCar")],
    [
      "carIsModel",
      { car: "$myCar", model: "0" },
      cond.carIsModel("$myCar", 0),
    ],
    ["playerShooting", {}, cond.playerShooting()],
    ["playerStopped", {}, cond.playerStopped()],
    ["playerOnFoot", {}, cond.playerOnFoot()],
    [
      "padButtonPressed",
      { pad: "Pad1", button: "Cross" },
      cond.padButtonPressed("Pad1", "Cross"),
    ],
    [
      "collisionLoaded",
      { level: "Industrial" },
      cond.collisionLoaded("Industrial"),
    ],
    ["specialCharLoaded", { slot: "1" }, cond.specialCharLoaded(1)],
    ["missionAudioFinished", {}, cond.missionAudioFinished()],
    ["cutsceneFinished", {}, cond.cutsceneFinished()],
    [
      "craneLiftingCar",
      { spot: "SAFEHOUSE", car: "$myCar" },
      cond.craneLiftingCar("SAFEHOUSE", "$myCar"),
    ],
    ["fireExtinguished", { fire: "$fire" }, cond.fireExtinguished("$fire")],
    ["stuckCarStuck", { car: "$myCar" }, cond.stuckCarStuck("$myCar")],
    ["catalinaHeliShotDown", {}, cond.catalinaHeliShotDown()],
    ["drugRunCompleted", {}, cond.drugRunCompleted()],
    ["drugRunShotDown", {}, cond.drugRunShotDown()],
    ["drugDropOffShotDown", {}, cond.drugDropOffShotDown()],
    ["creditsFinished", {}, cond.creditsFinished()],
  ];
  // `playerNear3D` is listed twice: once with a typed radius, once with the default radius and no sphere.
  assertEquals(
    cases.map(([name]) => name).filter((n, i, all) => all.indexOf(n) === i),
    condDescriptors.map((d) => d.name),
  );
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
    "Player.LocateAnyMeans3D($player, A_X, A_Y, A_Z, 2.0, 3.0, 2.0, true)";
  assertEquals(parseCond(condDescriptors, { test: lines }), null);
  // Coordinates from two different spots are not one spot either.
  const mixed =
    "Player.LocateAnyMeans3D($player, A_X, A_Y, B_Z, 2.0, 2.0, 2.0, true)";
  assertEquals(parseCond(condDescriptors, { test: mixed }), null);
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
  const [spot, expr] = byName(condDescriptors, "playerNear3D").fields;
  assert(
    isValid(expr, "SAFEHOUSE_X") && isValid(expr, "-3.5") &&
      !isValid(expr, "a b"),
  );
  assert(isValid(spot, "PAYPHONE_CALL_CAM") && !isValid(spot, "payphone"));
  assert(!isValid(spot, "") && !isValid(spot, "A B"));
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
  const [spot, expr] = byName(condDescriptors, "playerNear3D").fields;
  assertEquals(formatField(expr, "SAFE HOUSE_X"), "SAFEHOUSE_X");
  assertEquals(formatField(spot, "safe house-1"), "SAFEHOUSE1");
});

Deno.test("a fresh step of every kind reads back as itself", () => {
  const scope = [{ name: "ensureVanBlip", source: "../utils/missions.txt" }];
  for (const d of [...stepDescriptors, ...condDescriptors]) {
    const lines = buildLines(d, defaults(d, ["driveHint"], [], [], scope));
    const parsed =
      "group" in d && d.group === "Monitors" || "pre" in d || "locals" in d ||
        condDescriptors.includes(d as never)
        ? parseCond(
          condDescriptors,
          buildCond(d, defaults(d, ["driveHint"], [], [], scope)),
        )
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

Deno.test("Shady Job's steps and conditions read as typed controls, except the lines listed here", async () => {
  const doc = await loadMission(missions, "1_shady_job");
  const m = doc!.mission;
  const untyped: string[] = [];
  const steps = (list: Step[] = []) => {
    for (const s of list) {
      // A beat with no `do` loads as one empty step, which has nothing to type.
      if (s.every((line) => line === "")) continue;
      if (
        !parseLines(stepDescriptors, s) &&
        !parseWhen(stepDescriptors, condDescriptors, s)
      ) untyped.push(s.join(" | "));
    }
  };
  const conds = (list: Cond[] = []) => {
    for (const c of list) {
      if (!parseCond(condDescriptors, c)) untyped.push(c.test);
    }
  };
  conds(m.fail);
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
  assertEquals(untyped, [
    "request_model {modelId} #RUMPO",
    "load_all_models_now",
    "Car.TurnToFaceCoord($myCar, PAYPHONE_X, PAYPHONE_BLIP_Y)",
    "payphoneBlip = Blip.AddSpriteForCoord(PAYPHONE_X, PAYPHONE_BLIP_Y, PAYPHONE_Z, PAYPHONE)",
  ]);
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

Deno.test("no card asks for raw x, y, or z coordinates", () => {
  for (const d of [...stepDescriptors, ...condDescriptors]) {
    const names = d.fields.map((f) => f.name);
    assertEquals(
      names.filter((n) => ["x", "y", "z", "heading"].includes(n)),
      [],
      d.name,
    );
    // Every card that reads coordinates takes them from one spot field.
    if (d.lines.some((l) => l.includes("{spot}_X"))) {
      assertEquals(d.fields.filter((f) => f.type === "spot").length, 1, d.name);
    }
  }
});

Deno.test("a new spot field starts on its default spot, or on the first spot the catalog has", () => {
  const near = byName(condDescriptors, "playerNear3D");
  assertEquals(defaults(near, [], []).spot, "SAFEHOUSE");
  assertEquals(defaults(near, [], ["SAFEHOUSE", "PAYPHONE"]).spot, "SAFEHOUSE");
  assertEquals(defaults(near, [], ["PAYPHONE", "NOODLES"]).spot, "PAYPHONE");
});

Deno.test("typing in a spot field keeps the spots that match every word", () => {
  const spots = [
    {
      id: "PAYPHONE",
      group: "PAYPHONE",
      category: "interactive",
      tags: ["ringer"],
    },
    {
      id: "PAYPHONE_BLIP",
      group: "PAYPHONE",
      category: "blip",
      tags: ["blip"],
    },
    {
      id: "SAFEHOUSE",
      group: "SAFEHOUSE",
      category: "safehouse",
      tags: ["bribe"],
    },
  ];
  const ids = (query: string) =>
    filterOptions(spotOptions(spots), query).map((o: { value: string }) =>
      o.value
    );
  assertEquals(ids(""), ["PAYPHONE", "PAYPHONE_BLIP", "SAFEHOUSE"]);
  assertEquals(ids("phone"), ["PAYPHONE", "PAYPHONE_BLIP"]);
  assertEquals(ids("phone BLIP"), ["PAYPHONE_BLIP"]);
  assertEquals(ids("bribe"), ["SAFEHOUSE"]);
  assertEquals(ids("nothing"), []);
});

Deno.test("the editor's field patterns are the library's", () => {
  for (const d of [...stepDescriptors, ...condDescriptors]) {
    for (const f of d.fields) {
      assertEquals(clientPattern(f), fieldPattern(f), `${d.name}.${f.name}`);
    }
  }
});

const constants = [
  {
    name: "REWARD",
    kind: "int",
    value: "250",
    comment: "Rosa's paycheck",
    source: "This mission",
  },
  { name: "WIDE", kind: "float", value: "20.0", source: "constants.txt" },
  { name: "CHONG", kind: "int", value: "87", source: "constants.txt" },
  { name: "SUM", kind: undefined, value: "A+B", source: "constants.txt" },
];

Deno.test("a float field offers only float constants, an int field only int ones", () => {
  const names = (numeric?: string) =>
    constantOptions(constants, numeric).map((o: { value: string }) => o.value);
  assertEquals(names("float"), ["WIDE"]);
  assertEquals(names("int"), ["REWARD", "CHONG"]);
  assertEquals(names(), ["REWARD", "WIDE", "CHONG", "SUM"]);
  const [reward] = constantOptions(constants, "int");
  assertEquals(reward.meta, "int · 250 · Rosa's paycheck · This mission");
});

Deno.test("a new variable field starts on a declared variable of its type", () => {
  const blip = byName(stepDescriptors, "blipAt");
  const globals = [{ name: "$myCar", type: "Car" }, {
    name: "$SafeBlip",
    type: "Blip",
  }];
  assertEquals(defaults(blip, [], [], globals).handle, "$SafeBlip");
  // With nothing declared, the descriptor's own default stands.
  assertEquals(defaults(blip).handle, "$Blip");
  assertEquals(
    defaults(byName(condDescriptors, "carInWater"), [], [], globals).car,
    "$myCar",
  );
});

Deno.test("unchecking Shown turns Add Blip into Remove Blip, and checking it again restores the blip's spot and icon", () => {
  const add = byName(stepDescriptors, "blipAt");
  const remove = byName(stepDescriptors, "blipRemove");
  assertEquals([add.label, add.shown], ["Add Blip", {
    on: true,
    partner: "blipRemove",
  }]);
  assertEquals([remove.label, remove.shown], ["Remove Blip", {
    on: false,
    partner: ["blipAt", "blipForCoord", "blipForPickup", "blipForChar"],
  }]);

  const context = { monitorIds: [], spotIds: ["SAFEHOUSE"], globals: [] };
  const lines = step.blipAt("$SafeBlip", "PAYPHONE", "Diablo");
  const parsed = parseLines(stepDescriptors, lines)!;

  const hidden = flipShown(
    stepDescriptors,
    parsed.descriptor,
    parsed.values,
    {},
    context,
  );
  assertEquals(hidden.descriptor.name, "blipRemove");
  assertEquals(
    buildLines(hidden.descriptor, hidden.values),
    step.blipRemove("$SafeBlip"),
  );

  // The removal lines carry no spot or icon, so the card keeps them to restore on the way back.
  const removal = parseLines(stepDescriptors, step.blipRemove("$SafeBlip"))!;
  const shown = flipShown(
    stepDescriptors,
    removal.descriptor,
    removal.values,
    hidden.remembered,
    context,
  );
  assertEquals(shown.descriptor.name, "blipAt");
  assertEquals(buildLines(shown.descriptor, shown.values), lines);

  // With nothing remembered, the restored card starts on the descriptor's defaults.
  const fresh = flipShown(
    stepDescriptors,
    removal.descriptor,
    removal.values,
    {},
    context,
  );
  assertEquals(fresh.values, {
    handle: "$SafeBlip",
    spot: "SAFEHOUSE",
    sprite: "Savehouse",
  });
});

Deno.test("only the shown form of a card is offered when adding a step", () => {
  const offered = stepDescriptors.filter((d) => d.shown?.on !== false).map((
    d,
  ) => d.name);
  assert(offered.includes("blipAt") && !offered.includes("blipRemove"));
  // Every Shown card names its partners, and each partner names it back.
  for (const d of stepDescriptors.filter((d) => d.shown)) {
    for (const partner of [d.shown!.partner].flat()) {
      assert(
        [byName(stepDescriptors, partner).shown?.partner].flat().includes(
          d.name,
        ),
      );
    }
  }
});

Deno.test("unchecking Remove Blip returns to the Add Blip form it was last flipped from", () => {
  const context = { monitorIds: [], spotIds: ["DELIVERY"], globals: [] };
  const lines = step.blipForPickup("pickupBlip", "packagePickup");
  const parsed = parseLines(stepDescriptors, lines)!;

  const removed = flipShown(
    stepDescriptors,
    parsed.descriptor,
    parsed.values,
    {},
    context,
  );
  assertEquals(removed.descriptor.name, "blipRemove");
  assertEquals(
    buildLines(removed.descriptor, removed.values),
    step.blipRemove("pickupBlip"),
  );

  const restored = flipShown(
    stepDescriptors,
    removed.descriptor,
    removed.values,
    removed.remembered,
    context,
  );
  assertEquals(restored.descriptor.name, "blipForPickup");
  assertEquals(buildLines(restored.descriptor, restored.values), lines);

  // With no form remembered, Remove Blip returns to Add Blip at a spot.
  const fresh = flipShown(
    stepDescriptors,
    removed.descriptor,
    removed.values,
    {},
    context,
  );
  assertEquals(fresh.descriptor.name, "blipAt");
});

Deno.test("the map icon field offers the RadarSprite members, filtered as you type", () => {
  const sprite = byName(stepDescriptors, "blipAt").fields.find((f) =>
    f.name === "sprite"
  )!;
  assertEquals(sprite.enum, "RadarSprite");
  const options = enumOptions(enumsFor("gta3").RadarSprite);
  const names = (query: string) =>
    filterOptions(options, query).map((o: { value: string }) => o.value);
  assertEquals(names("save"), ["Savehouse"]);
  // A query also matches the numeric id, so 8 finds id 8 (Diablo) and id 18 (Spray).
  assertEquals(names("8"), ["Diablo", "Spray"]);
  assertEquals(names("zzz"), []);
  assertEquals(
    options.find((o: { value: string }) => o.value === "Diablo").meta,
    "id 8",
  );
});

Deno.test("a variable field offers the globals of its declared type", () => {
  const globals = [
    { name: "$SafeBlip", type: "Blip" },
    { name: "$myCar", type: "Car" },
    { name: "$onMission" },
  ];
  const names = (type?: string) =>
    globalOptions(globals, type).map((o: { value: string }) => o.value);
  assertEquals(names("Blip"), ["$SafeBlip"]);
  assertEquals(names("Car"), ["$myCar"]);
  assertEquals(names(), ["$SafeBlip", "$myCar", "$onMission"]);
  const car = byName(condDescriptors, "carInWater").fields[0];
  assertEquals(car.varType, "Car");
});

Deno.test("typing a number of the wrong type into a numbered field is called out as it is typed", () => {
  const radius = byName(condDescriptors, "playerNear3D").fields[1];
  assertEquals(radius.numeric, "float");
  assertEquals(numberProblem(radius, "2.0", constants), "");
  assertEquals(numberProblem(radius, "WIDE", constants), "");
  assertEquals(
    numberProblem(radius, "20", constants),
    "20 is an int; write 20.0.",
  );
  assertEquals(
    numberProblem(radius, "REWARD", constants),
    "REWARD is an int constant; declare it with a decimal point.",
  );
  const amount = byName(stepDescriptors, "addScore").fields[0];
  assertEquals(numberProblem(amount, "250", constants), "");
  assertEquals(
    numberProblem(amount, "2.5", constants),
    "2.5 is a float; use a whole number.",
  );
  assertEquals(numberProblem(amount, "$unknown", constants), "");
});

Deno.test("a typeahead that loses focus closes and goes back to its committed value", () => {
  assertEquals(closedCombo("2.0"), { open: false, typed: null, draft: "2.0" });
});

Deno.test("the typeahead closes through closedCombo on blur, Escape, and a pick", () => {
  const source = Deno.readTextFileSync(
    new URL("./ui/step-controls.js", import.meta.url),
  );
  assertStringIncludes(source, "closedCombo(last.current)");
  // Blur leaves through focusout on the wrapper, so tabbing out or clicking away both reach `close`. Preact
  // listens for the event name it is given when the element has no `onfocusout` property, and Chrome has none,
  // so `onFocusOut` would listen for "FocusOut" and never fire.
  assertStringIncludes(
    source,
    "onfocusout=${(e) => { if (!root.current.contains(e.relatedTarget)) close(); }}",
  );
  assertEquals(source.includes("onFocusOut"), false);
});

Deno.test("every card with a radius has a Show Sphere toggle and a 3.0 default shown as its placeholder", () => {
  const withRadius = condDescriptors.filter((d) =>
    d.fields.some((f) => f.name === "radius")
  );
  assertEquals(withRadius.map((d) => d.name), [
    "playerNear3D",
    "playerNear2D",
    "playerOnFootNear3D",
    "playerOnFootNear2D",
    "playerStoppedNear3D",
  ]);
  for (const d of withRadius) {
    const radius = d.fields.find((f) => f.name === "radius")!;
    assertEquals(radius.default, "3.0", d.name);
    assertEquals(radius.placeholder, "3.0", d.name);
    const sphere = d.fields.find((f) => f.name === "sphere")!;
    assertEquals(sphere.type, "toggle", d.name);
    assertEquals(defaults(d).radius, "3.0", d.name);
    // The sphere is the command's last argument.
    assert(d.lines[0].endsWith("{sphere})"), d.name);
  }
  // 2D zones start without a sphere, 3D ones with it.
  assertEquals(
    defaults(byName(condDescriptors, "playerNear2D")).sphere,
    "false",
  );
  assertEquals(
    defaults(byName(condDescriptors, "playerNear3D")).sphere,
    "true",
  );
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
