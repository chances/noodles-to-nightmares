// The step and condition vocabulary for mission state tables. Each entry maps a friendly name to its Sanny lines.

import { cmp, ifBlock, latchLocal } from "./emit.ts";
import type { Cond, Step } from "./types.ts";

/** A number or a Sanny identifier such as a constant name. */
export type Expr = string | number;
export type Spot = [x: Expr, y: Expr, z: Expr];

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
      spot.join(", ")
    }, RadarSprite.${sprite})`,
  ],
  cameraAtPlayer: (spot: Spot, ms: number): Step => [
    `Camera.SetFixedPosition(${spot.join(", ")}, 0, 0, 0)`,
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
  playerNear3D: (spot: Spot, radius: Expr): Cond => ({
    test: `Player.LocateAnyMeans3D($player, ${
      spot.join(", ")
    }, ${radius}, ${radius}, ${radius}, true)`,
  }),
  /** Reads the player's health into the scratch local `health`. */
  healthBelow: (amount: number): Cond => ({
    pre: ["health = 0", "Player.GetHealth($player, health)"],
    test: `health < ${amount}`,
    locals: ["health"],
  }),
  latchSet: (id: string): Cond => cmp(latchLocal(id), "==", "true"),
  latchClear: (id: string): Cond => cmp(latchLocal(id), "==", "false"),
};
