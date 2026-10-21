// The step and condition vocabulary as data, so the editor can show typed controls and read them back from
// Sanny lines. Each `lines` entry is a Sanny line with `{field}` slots; `vocabulary.ts` builds the same
// lines in code, and the editor's `templates_test.ts` keeps the two in step.

/** How a field is written in Sanny. `expr` is a number or an identifier such as a constant name. */
export type FieldType =
  | "text"
  | "number"
  | "expr"
  | "handle"
  | "name"
  | "choice"
  | "latch";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  /** The allowed values of a `choice`. */
  options?: string[];
  /** What the editor shows for an option whose Sanny value reads poorly; the value itself is unchanged. */
  labels?: Record<string, string>;
  default?: string;
}

export interface Descriptor {
  /** Matches the builder in `vocabulary.ts`. */
  name: string;
  label: string;
  /** Sanny lines with `{field}` slots; a field used twice must hold one value in both places. */
  lines: string[];
  fields: Field[];
}

export interface StepDescriptor extends Descriptor {
  group: "Text" | "Camera" | "Map" | "Result" | "Player";
}

export interface CondDescriptor extends Descriptor {
  group: "Player" | "Position" | "Input" | "Vehicles" | "World" | "Monitors";
  /** Lines that run before the `if`; `lines` holds the test. */
  pre?: string[];
  locals?: string[];
}

const ms: Field = {
  name: "ms",
  label: "Duration (ms)",
  type: "number",
  default: "3000",
};
const text: Field = { name: "text", label: "Text", type: "text", default: "" };
const spot = (): Field[] => [
  { name: "x", label: "X", type: "expr", default: "0" },
  { name: "y", label: "Y", type: "expr", default: "0" },
  { name: "z", label: "Z", type: "expr", default: "0" },
];

export const stepDescriptors: StepDescriptor[] = [
  {
    name: "say",
    label: "Say",
    group: "Text",
    lines: ['Text.PrintString("{text}", {ms})'],
    fields: [text, ms],
  },
  {
    name: "title",
    label: "Title",
    group: "Text",
    lines: ['Text.PrintBigString("{text}", {ms}, TextStyle.{style})'],
    fields: [text, ms, {
      name: "style",
      label: "Position",
      type: "choice",
      options: ["Middle", "BottomRight", "Bottom"],
      labels: { BottomRight: "Bottom right" },
      default: "Middle",
    }],
  },
  {
    name: "help",
    label: "Help Text",
    group: "Text",
    lines: ['Text.PrintHelpString("{text}")'],
    fields: [text],
  },
  {
    name: "radarFlashOn",
    label: "Radar Flash On",
    group: "Map",
    lines: ["Hud.FlashObject(HudObject.Radar)"],
    fields: [],
  },
  {
    name: "radarFlashOff",
    label: "Radar Flash Off",
    group: "Map",
    lines: ["Hud.FlashObject(0)"],
    fields: [],
  },
  {
    name: "blipAt",
    label: "Add Map Blip",
    group: "Map",
    lines: [
      "{handle} = Blip.AddSpriteForCoord({x}, {y}, {z}, RadarSprite.{sprite})",
    ],
    fields: [
      {
        name: "handle",
        label: "Blip Variable",
        type: "handle",
        default: "$Blip",
      },
      ...spot(),
      { name: "sprite", label: "Map Icon", type: "name", default: "Savehouse" },
    ],
  },
  {
    name: "cameraAtPlayer",
    label: "Camera looks at player",
    group: "Camera",
    lines: [
      "Camera.SetFixedPosition({x}, {y}, {z}, 0, 0, 0)",
      "Camera.SetInterpolationParameters(0, {ms})",
      "Camera.PointAtPlayer($player, CameraMode.Fixed, SwitchType.Interpolation)",
    ],
    fields: [...spot(), { ...ms, default: "1000" }],
  },
  {
    name: "restoreJumpcut",
    label: "Restore Camera",
    group: "Camera",
    lines: ["Camera.RestoreJumpcut()"],
    fields: [],
  },
  {
    name: "fade",
    label: "Fade",
    group: "Camera",
    lines: ["Camera.DoFade({ms}, Fade.{direction})"],
    fields: [{ ...ms, default: "750" }, {
      name: "direction",
      label: "Effect",
      type: "choice",
      options: ["In", "Out"],
      labels: { In: "Fade in", Out: "Fade out" },
      default: "Out",
    }],
  },
  {
    name: "loadSplash",
    label: "Load Splash",
    group: "Camera",
    lines: ["Hud.LoadSplash('{name}')"],
    fields: [{
      name: "name",
      label: "Splash",
      type: "name",
      default: "SPLASH1",
    }],
  },
  {
    name: "passTune",
    label: "Play Pass Tune",
    group: "Result",
    lines: ["Audio.PlayMissionPassedTune(1)"],
    fields: [],
  },
  {
    name: "registerPassed",
    label: "Register Passed",
    group: "Result",
    lines: ["register_mission_passed '{id}'"],
    fields: [{
      name: "id",
      label: "Mission Name Key",
      type: "name",
      default: "NooM_0",
    }],
  },
  {
    name: "addScore",
    label: "Add Score",
    group: "Result",
    lines: ["Player.AddScore($player, {amount})"],
    fields: [{
      name: "amount",
      label: "Amount",
      type: "expr",
      default: "REWARD",
    }],
  },
  {
    name: "passBanner",
    label: "Pass Banner",
    group: "Result",
    lines: [
      "Text.PrintWithNumberBig('M_PASS', {amount}, 5000, TextStyle.Middle)",
    ],
    fields: [{
      name: "amount",
      label: "Amount",
      type: "expr",
      default: "REWARD",
    }],
  },
  {
    name: "failBanner",
    label: "Fail Banner",
    group: "Result",
    lines: ["Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)"],
    fields: [],
  },
  {
    name: "rememberPlayerCar",
    label: "Remember Player Car",
    group: "Player",
    lines: ["Player.StoreCarIsIn($player, $myCar)"],
    fields: [],
  },
];

const radius: Field = {
  name: "radius",
  label: "Radius",
  type: "expr",
  default: "2.0",
};

export const condDescriptors: CondDescriptor[] = [
  {
    name: "playerDead",
    label: "Player is dead",
    group: "Player",
    lines: ["Player.IsDead($player)"],
    fields: [],
  },
  {
    name: "playerBusted",
    label: "Player is busted",
    group: "Player",
    lines: ["Player.HasBeenArrested($player)"],
    fields: [],
  },
  {
    name: "playerSittingInCar",
    label: "Player is sitting in a car",
    group: "Player",
    lines: ["Player.IsSittingInAnyCar($player)"],
    fields: [],
  },
  {
    name: "playerInCar",
    label: "Player is in a car",
    group: "Player",
    lines: ["Player.IsInAnyCar($player)"],
    fields: [],
  },
  {
    name: "playerNear3D",
    label: "Player is near (3D)",
    group: "Position",
    lines: [
      "Player.LocateAnyMeans3D($player, {x}, {y}, {z}, {radius}, {radius}, {radius}, true)",
    ],
    fields: [
      ...spot(),
      { name: "radius", label: "Radius", type: "expr", default: "2.0" },
    ],
  },
  {
    name: "healthBelow",
    label: "Health below",
    group: "Player",
    pre: ["health = 0", "Player.GetHealth($player, health)"],
    lines: ["health < {amount}"],
    locals: ["health"],
    fields: [{
      name: "amount",
      label: "Health",
      type: "number",
      default: "45",
    }],
  },
  {
    name: "playerNear2D",
    label: "Player is near (2D)",
    group: "Position",
    lines: [
      "Player.LocateAnyMeans2D($player, {x}, {y}, {radius}, {radius}, false)",
    ],
    fields: [...spot().slice(0, 2), radius],
  },
  {
    name: "playerOnFootNear3D",
    label: "Player is on foot near (3D)",
    group: "Position",
    lines: [
      "Player.LocateOnFoot3D($player, {x}, {y}, {z}, {radius}, {radius}, {radius}, true)",
    ],
    fields: [...spot(), radius],
  },
  {
    name: "playerOnFootNear2D",
    label: "Player is on foot near (2D)",
    group: "Position",
    lines: [
      "Player.LocateOnFoot2D($player, {x}, {y}, {radius}, {radius}, false)",
    ],
    fields: [...spot().slice(0, 2), radius],
  },
  {
    name: "playerStoppedNear3D",
    label: "Player has stopped on foot near",
    group: "Position",
    lines: [
      "Player.LocateStoppedOnFoot3D($player, {x}, {y}, {z}, {radius}, {radius}, {radius}, true)",
    ],
    fields: [...spot(), radius],
  },
  {
    name: "playerInThisCar",
    label: "Player is in a given car",
    group: "Player",
    lines: ["Player.IsInCar($player, {car})"],
    fields: [{ name: "car", label: "Car", type: "expr", default: "$myCar" }],
  },
  {
    name: "playerLiftingPhone",
    label: "Player is lifting a phone",
    group: "Player",
    lines: ["Player.IsLiftingAPhone($player)"],
    fields: [],
  },
  {
    name: "playerCanStartMission",
    label: "Player can start a mission",
    group: "Player",
    lines: ["Player.CanStartMission($player)"],
    fields: [],
  },
  {
    name: "keyPressed",
    label: "Key is pressed",
    group: "Input",
    lines: ["Pad.IsKeyPressed(KeyCode.{key})"],
    fields: [{ name: "key", label: "Key", type: "name", default: "Space" }],
  },
  {
    name: "carUpsideDown",
    label: "Car is upside down",
    group: "Vehicles",
    lines: ["Car.IsUpsidedown({car})"],
    fields: [{ name: "car", label: "Car", type: "expr", default: "$myCar" }],
  },
  {
    name: "carInWater",
    label: "Car is in water",
    group: "Vehicles",
    lines: ["Car.IsInWater({car})"],
    fields: [{ name: "car", label: "Car", type: "expr", default: "$myCar" }],
  },
  {
    name: "pickupCollected",
    label: "Pickup has been collected",
    group: "World",
    lines: ["Pickup.HasBeenCollected({pickup})"],
    fields: [{
      name: "pickup",
      label: "Pickup",
      type: "expr",
      default: "$pickup",
    }],
  },
  {
    name: "charSpottedPlayer",
    label: "Character has spotted the player",
    group: "World",
    lines: ["Char.HasSpottedPlayer({char}, $player)"],
    fields: [{
      name: "char",
      label: "Character",
      type: "expr",
      default: "$char",
    }],
  },
  {
    name: "saveFinished",
    label: "Game save has finished",
    group: "World",
    lines: ["Game.HasSaveGameFinished()"],
    fields: [],
  },
  {
    name: "modelLoaded",
    label: "Model is loaded",
    group: "World",
    lines: ["Streaming.IsModelLoaded({model})"],
    fields: [{ name: "model", label: "Model", type: "expr", default: "0" }],
  },
  {
    name: "latchSet",
    label: "Monitor has fired",
    group: "Monitors",
    lines: ["latch{id} == true"],
    fields: [{ name: "id", label: "Monitor", type: "latch" }],
  },
  {
    name: "latchClear",
    label: "Monitor has not fired",
    group: "Monitors",
    lines: ["latch{id} == false"],
    fields: [{ name: "id", label: "Monitor", type: "latch" }],
  },
];
