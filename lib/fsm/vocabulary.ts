// The step and condition vocabulary for mission state tables. Each entry maps a friendly name to its Sanny lines.

import { DEFAULT_RADIUS } from "./descriptors.ts";
import { cmp, ifBlock, latchLocal } from "./emit.ts";
import type { Cond, Step } from "./types.ts";

/** A number or a Sanny identifier such as a constant name. */
export type Expr = string | number;
/** A POI id from data/geography.json (`SAFEHOUSE`), or explicit coordinates. */
export type Spot = string | [x: Expr, y: Expr, z: Expr];
export type Spot2D = string | [x: Expr, y: Expr];

/** The coordinate arguments of `spot`: a POI id reads its generated `_X`, `_Y`, and `_Z` consts. */
const coords = (spot: Spot | Spot2D, axes: 2 | 3): string =>
  typeof spot === "string"
    ? ["X", "Y", "Z"].slice(0, axes).map((axis) => `${spot}_${axis}`).join(", ")
    : spot.join(", ");

export const step = {
  say: (text: string, ms: number): Step => [
    `Text.PrintString("${text}", ${ms})`,
  ],
  title: (
    text: string,
    ms: number,
    style: "BottomRight" | "Middle" | "Bottom" = "Middle",
  ): Step => [`Text.PrintBigString("${text}", ${ms}, TextStyle.${style})`],
  help: (text: string): Step => [`Text.PrintHelpString("${text}")`],
  radarFlash: (on: boolean): Step => [
    on ? "Hud.FlashObject(HudObject.Radar)" : "Hud.FlashObject(0)",
  ],
  /** Stores a new sprite blip's handle in `handle`, e.g. `$SafeBlip`. */
  blipAt: (handle: string, spot: Spot, sprite: string): Step => [
    `${handle} = Blip.AddSpriteForCoord(${
      coords(spot, 3)
    }, RadarSprite.${sprite})`,
  ],
  /** Removes the blip whose handle `handle` holds, e.g. `$SafeBlip`. */
  blipRemove: (handle: string): Step => [`Blip.Remove(${handle})`],
  cameraAtPlayer: (spot: Spot, ms: number): Step => [
    `Camera.SetFixedPosition(${coords(spot, 3)}, 0, 0, 0)`,
    `Camera.SetInterpolationParameters(0, ${ms})`,
    "Camera.PointAtPlayer($player, CameraMode.Fixed, SwitchType.Interpolation)",
  ],
  restoreJumpcut: (): Step => ["Camera.RestoreJumpcut()"],
  fade: (ms: number, direction: "In" | "Out"): Step => [
    `Camera.DoFade(${ms}, Fade.${direction})`,
  ],
  loadSplash: (name: string): Step => [`Hud.LoadSplash('${name}')`],
  passTune: (): Step => ["Audio.PlayMissionPassedTune(1)"],
  registerPassed: (id: string): Step => [`register_mission_passed '${id}'`],
  addScore: (amount: Expr): Step => [`Player.AddScore($player, ${amount})`],
  passBanner: (amount: Expr): Step => [
    `Text.PrintWithNumberBig('M_PASS', ${amount}, 5000, TextStyle.Middle)`,
  ],
  failBanner: (): Step => ["Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)"],
  rememberPlayerCar: (): Step => ["Player.StoreCarIsIn($player, $myCar)"],
  /** Gives the player control back (`true`) or takes it away (`false`). */
  playerControl: (on: boolean): Step => [`Player.SetControl($player, ${on})`],
  requestModel: (model: Expr): Step => [`Streaming.RequestModel(${model})`],
  loadModels: (): Step => ["Streaming.LoadAllModelsNow()"],
  soundAt: (spot: Spot, sound: string): Step => [
    `Sound.AddOneOffSound(${coords(spot, 3)}, ScriptSound.${sound})`,
  ],
  clearUi: (): Step => ["clearUI()"],
  wait: (ms: Expr): Step => [`wait ${ms}`],
  loadSpecialCharacter: (slot: Expr, model: Expr, name: string): Step => [
    `load_special_character ${slot} 1 ${model} '${name}'`,
  ],
  charCreate: (model: Expr, spot: Spot, char: Expr): Step => [
    `Char.Create(PedType.Special, ${model}, ${coords(spot, 3)}, ${char})`,
  ],
  charPersonality: (char: Expr, stat: string): Step => [
    `Char.SetPersonality(${char}, PedStat.${stat})`,
  ],
  charFacePlayer: (char: Expr): Step => [
    `Char.TurnToFacePlayer(${char}, $player)`,
  ],
  charLookPlayer: (char: Expr): Step => [
    `Char.LookAtPlayerAlways(${char}, $player)`,
  ],
  charAnimGroup: (char: Expr, animGroup: string): Step => [
    `Char.SetAnimGroup(${char}, AnimGroup.${animGroup})`,
  ],
  cameraAtChar: (char: Expr, cut: "JumpCut" | "Interpolation"): Step => [
    `Camera.PointAtChar(${char}, CameraMode.Fixed, SwitchType.${cut})`,
  ],
  cameraFixedAtChar: (
    spot: Spot,
    char: Expr,
    cut: "JumpCut" | "Interpolation",
  ): Step => [
    `Camera.SetFixedPosition(${coords(spot, 3)}, 0, 0, 0)`,
    `Camera.PointAtChar(${char}, CameraMode.Fixed, SwitchType.${cut})`,
  ],
  cameraInterpolation: (ms: Expr): Step => [
    `Camera.SetInterpolationParameters(0, ${ms})`,
  ],
  cameraBehindPlayer: (): Step => ["Camera.SetBehindPlayer()"],
  cameraGenerateCars: (on: boolean): Step => [
    `Camera.SetGenerateCarsAround(${on})`,
  ],
  charHeading: (variable: Expr, char: Expr): Step => [
    `${variable} = Char.GetHeading(${char})`,
  ],
  invertHeading: (variable: Expr, source: Expr): Step => [
    `${variable} = invertHeading(${source})`,
  ],
  playerFaceChar: (char: Expr): Step => [
    `Player.TurnToFaceChar($player, ${char})`,
  ],
  playerHeading: (angle: Expr): Step => [`Player.SetHeading($player, ${angle})`],
  playerLookChar: (char: Expr): Step => [
    `Player.LookAtCharAlways($player, ${char})`,
  ],
  playerStopLooking: (): Step => ["Player.StopLooking($player)"],
  charStopLooking: (char: Expr): Step => [`Char.StopLooking(${char})`],
  charRunning: (char: Expr, running: boolean): Step => [
    `Char.SetRunning(${char}, ${running})`,
  ],
  charGoto: (char: Expr, spot: Spot2D): Step => [
    `Char.SetObjGotoCoordOnFoot(${char}, ${coords(spot, 2)})`,
  ],
  charRemove: (char: Expr): Step => [
    `Char.MarkAsNoLongerNeeded(${char})`,
    `Char.Delete(${char})`,
    `${char} = 0`,
  ],
  ensureVanBlip: (): Step => ["ensureVanBlip()"],
  carCreate: (car: Expr, model: Expr, spot: Spot): Step => [
    `${car} = Car.Create(${model}, ${coords(spot, 3)})`,
  ],
  carModel: (variable: Expr, model: Expr): Step => [
    `${variable} = ${model}`,
  ],
  blipForCoord: (variable: Expr, spot: Spot): Step => [
    `${variable} = Blip.AddForCoord(${coords(spot, 3)})`,
  ],
  blipForPickup: (variable: Expr, pickup: Expr): Step => [
    `${variable} = Blip.AddForPickup(${pickup})`,
  ],
  blipRemoveVar: (variable: Expr): Step => [`Blip.Remove(${variable})`],
  pickupCreate: (pickup: Expr, model: Expr, spot: Spot): Step => [
    `${pickup} = Pickup.Create(${model}, PickupType.OnStreet, ${coords(spot, 3)})`,
  ],
  pickupRemove: (pickup: Expr): Step => [`Pickup.Remove(${pickup})`],
  phoneGrab: (spot: Spot2D, variable: Expr): Step => [
    `Phone.Grab(${coords(spot, 2)}, ${variable})`,
  ],
  phoneOn: (variable: Expr): Step => [`Phone.TurnOn(${variable})`],
  phoneOff: (variable: Expr): Step => [`Phone.TurnOff(${variable})`],
  debugLog: (key: Expr, value: Expr): Step => [`debugLogInt(${key}, ${value})`],
  /** Runs `then` when every condition holds, `otherwise` when not. */
  when: (conds: Cond[], then: Step[], otherwise: Step[] = []): Step =>
    ifBlock(conds, then.flat(), otherwise.flat()),
  /** Escape hatch: Sanny lines copied as written. */
  raw: (...lines: string[]): Step => lines,
};

export const cond = {
  playerDead: (): Cond => ({ test: "Player.IsDead($player)" }),
  playerBusted: (): Cond => ({ test: "Player.HasBeenArrested($player)" }),
  playerSittingInCar: (): Cond => ({
    test: "Player.IsSittingInAnyCar($player)",
  }),
  playerInCar: (): Cond => ({ test: "Player.IsInAnyCar($player)" }),
  playerNear3D: (
    spot: Spot,
    radius: Expr = DEFAULT_RADIUS,
    sphere = true,
  ): Cond => ({
    test: `Player.LocateAnyMeans3D($player, ${
      coords(spot, 3)
    }, ${radius}, ${radius}, ${radius}, ${sphere})`,
  }),
  /** Reads the player's health into the scratch local `health`. */
  healthBelow: (amount: number): Cond => ({
    pre: ["health = 0", "Player.GetHealth($player, health)"],
    test: `health < ${amount}`,
    locals: ["health"],
  }),
  playerNear2D: (
    spot: Spot2D,
    radius: Expr = DEFAULT_RADIUS,
    sphere = false,
  ): Cond => ({
    test: `Player.LocateAnyMeans2D($player, ${
      coords(spot, 2)
    }, ${radius}, ${radius}, ${sphere})`,
  }),
  playerOnFootNear3D: (
    spot: Spot,
    radius: Expr = DEFAULT_RADIUS,
    sphere = true,
  ): Cond => ({
    test: `Player.LocateOnFoot3D($player, ${
      coords(spot, 3)
    }, ${radius}, ${radius}, ${radius}, ${sphere})`,
  }),
  playerOnFootNear2D: (
    spot: Spot2D,
    radius: Expr = DEFAULT_RADIUS,
    sphere = false,
  ): Cond => ({
    test: `Player.LocateOnFoot2D($player, ${
      coords(spot, 2)
    }, ${radius}, ${radius}, ${sphere})`,
  }),
  playerStoppedNear3D: (
    spot: Spot,
    radius: Expr = DEFAULT_RADIUS,
    sphere = true,
  ): Cond => ({
    test: `Player.LocateStoppedOnFoot3D($player, ${
      coords(spot, 3)
    }, ${radius}, ${radius}, ${radius}, ${sphere})`,
  }),
  playerInThisCar: (car: Expr): Cond => ({
    test: `Player.IsInCar($player, ${car})`,
  }),
  playerLiftingPhone: (): Cond => ({ test: "Player.IsLiftingAPhone($player)" }),
  playerCanStartMission: (): Cond => ({
    test: "Player.CanStartMission($player)",
  }),
  keyPressed: (key: string): Cond => ({
    test: `Pad.IsKeyPressed(KeyCode.${key})`,
  }),
  carUpsideDown: (car: Expr): Cond => ({ test: `Car.IsUpsidedown(${car})` }),
  carInWater: (car: Expr): Cond => ({ test: `Car.IsInWater(${car})` }),
  pickupCollected: (pickup: Expr): Cond => ({
    test: `Pickup.HasBeenCollected(${pickup})`,
  }),
  charSpottedPlayer: (char: Expr): Cond => ({
    test: `Char.HasSpottedPlayer(${char}, $player)`,
  }),
  saveFinished: (): Cond => ({ test: "Game.HasSaveGameFinished()" }),
  modelLoaded: (model: Expr): Cond => ({
    test: `Streaming.IsModelLoaded(${model})`,
  }),
  /** Reads the wanted level (stars) into the scratch local `wanted`. */
  wantedAbove: (max: number): Cond => ({
    pre: ["wanted = 0", "01C0: wanted = player $player wanted_level"],
    test: `wanted > ${max}`,
    locals: ["wanted"],
  }),
  /** Reads the car's health (1000 is undamaged) into the scratch local `carHealth`. */
  carHealthBelow: (car: Expr, amount: number): Cond => ({
    pre: ["carHealth = 0", `0227: carHealth = car ${car} health`],
    test: `carHealth < ${amount}`,
    locals: ["carHealth"],
  }),
  variableEquals: (name: Expr, value: Expr): Cond => ({
    test: `${name} == ${value}`,
  }),
  pickupNotCollected: (pickup: Expr): Cond => ({
    test: `not Pickup.HasBeenCollected(${pickup})`,
  }),
  /** True once `seconds` have passed on TIMERB, the clock a state's Time Limit restarts on entry. */
  timeLimitExceeded: (seconds: number): Cond => ({
    test: `TIMERB > ${seconds}000`,
  }),
  timeLimitNotExceeded: (seconds: number): Cond => ({
    test: `TIMERB <= ${seconds}000`,
  }),
  latchSet: (id: string): Cond => cmp(latchLocal(id), "==", "true"),
  latchClear: (id: string): Cond => cmp(latchLocal(id), "==", "false"),
};
