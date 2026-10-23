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
  /** Restarts TIMERB, the clock `cond.timeLimit` reads. */
  startTimer: (): Step => ["TIMERB = 0"],
  soundAt: (spot: Spot, sound: string): Step => [
    `Sound.AddOneOffSound(${coords(spot, 3)}, ScriptSound.${sound})`,
  ],
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
  /**
   * True once `minutes` of game time have passed on TIMERB, which counts from the mission's start or from the
   * last `startTimer` step. A game minute is 1000 ms at the game's default clock speed.
   */
  timeLimit: (minutes: number): Cond => ({
    test: `TIMERB > ${minutes * 1000}`,
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
  latchSet: (id: string): Cond => cmp(latchLocal(id), "==", "true"),
  latchClear: (id: string): Cond => cmp(latchLocal(id), "==", "false"),
};
