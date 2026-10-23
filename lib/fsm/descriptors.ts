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
  | "latch"
  | "spot"
  | "toggle";

/** The radius a "Player is near" card starts with, and the one an emptied radius field falls back to. */
export const DEFAULT_RADIUS = "3.0";

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  /** The bounds of a `number` field; the editor shows an `input[type=number]` with these `min` and `max` attributes. */
  min?: number;
  max?: number;
  /** The allowed values of a `choice`. */
  options?: string[];
  /** What the editor shows for an option whose Sanny value reads poorly; the value itself is unchanged. */
  labels?: Record<string, string>;
  default?: string;
  /** What an empty input shows. An emptied `expr` field takes this value. */
  placeholder?: string;
  /**
   * The Sanny type an `expr` field's number must have. Sanny reads an int literal or constant in a float
   * parameter as about zero, so `problems` rejects the mismatch.
   */
  numeric?: "int" | "float";
  /** The Sanny enum a `name` field takes a member of, e.g. `RadarSprite`; see `ENUMS` in `sprites.ts`. */
  enum?: string;
  /** The declared type a `handle` field's variable has in variables.txt, e.g. `Blip`; the editor offers only those. */
  varType?: string;
}

/** The regular expression source a value of each field type must match entirely; `choice` takes its options. */
export const FIELD_PATTERNS: Record<Exclude<FieldType, "choice">, string> = {
  text: '[^"\\n]*',
  number: "\\d+",
  expr: "-?\\d+(?:\\.\\d+)?|#?[A-Za-z_$][\\w$]*",
  handle: "\\$\\w+",
  name: "\\w+",
  latch: "[A-Z]\\w*",
  // A POI id; its `_X`, `_Y`, and `_Z` follow in the line, so this must give them back when it backtracks.
  spot: "[A-Z][A-Z0-9_]*",
  toggle: "true|false",
};

const escapeRegex = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The regular expression source a value of `field` must match entirely. */
export function fieldPattern(field: Field): string {
  return field.type === "choice"
    ? (field.options ?? []).map(escapeRegex).join("|")
    : FIELD_PATTERNS[field.type];
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
  group: "Text" | "Camera" | "Map" | "Result" | "Player" | "World";
  /**
   * Gives the card a "Shown" checkbox, checked when `on`. Flipping it turns the card into its `partner`, so the
   * card's title and Sanny follow the checkbox: "Add Blip" when shown, "Remove Blip" when not.
   */
  shown?: { on: boolean; partner: string };
}

export interface CondDescriptor extends Descriptor {
  group: "Player" | "Position" | "Input" | "Vehicles" | "World" | "Monitors";
  /** Lines that run before the `if`; `lines` holds the test. `pre` lines may use `{field}` slots like `lines`. */
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
// A `spot` field holds a POI id from data/geography.json. Its lines read the consts the generated
// utils/geography.txt declares for it: `{spot}_X`, `{spot}_Y`, `{spot}_Z`, and where a POI has them `_HEADING`
// and `_RADIUS`.
const spot: Field = {
  name: "spot",
  label: "Spot",
  type: "spot",
  default: "SAFEHOUSE",
};

const blipHandle: Field = {
  name: "handle",
  label: "Blip Variable",
  type: "handle",
  default: "$Blip",
  varType: "Blip",
};

// A Sanny character local, e.g. `sal`, which the mission declares as a Char.
const charField: Field = {
  name: "char",
  label: "Character",
  type: "expr",
  default: "sal",
  varType: "Char",
};

const toggle = (name: string, label: string, def: boolean): Field => ({
  name,
  label,
  type: "toggle",
  default: String(def),
});

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
    name: "blipRemove",
    label: "Remove Blip",
    group: "Map",
    shown: { on: false, partner: "blipAt" },
    lines: ["Blip.Remove({handle})"],
    fields: [blipHandle],
  },
  {
    name: "blipAt",
    label: "Add Blip",
    group: "Map",
    shown: { on: true, partner: "blipRemove" },
    lines: [
      "{handle} = Blip.AddSpriteForCoord({spot}_X, {spot}_Y, {spot}_Z, RadarSprite.{sprite})",
    ],
    fields: [
      blipHandle,
      spot,
      {
        name: "sprite",
        label: "Map Icon",
        type: "name",
        default: "Savehouse",
        enum: "RadarSprite",
      },
    ],
  },
  {
    name: "cameraAtPlayer",
    label: "Camera looks at player",
    group: "Camera",
    lines: [
      "Camera.SetFixedPosition({spot}_X, {spot}_Y, {spot}_Z, 0, 0, 0)",
      "Camera.SetInterpolationParameters(0, {ms})",
      "Camera.PointAtPlayer($player, CameraMode.Fixed, SwitchType.Interpolation)",
    ],
    fields: [{ ...spot, default: "PAYPHONE_CALL_CAM" }, {
      ...ms,
      default: "1000",
    }],
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
      numeric: "int",
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
      numeric: "int",
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
  {
    name: "playerControl",
    label: "Player Control",
    group: "Player",
    lines: ["Player.SetControl($player, {on})"],
    fields: [{
      name: "on",
      label: "Player Can Move",
      type: "toggle",
      default: "true",
    }],
  },
  {
    name: "requestModel",
    label: "Request Model",
    group: "World",
    lines: ["Streaming.RequestModel({model})"],
    fields: [{
      name: "model",
      label: "Model",
      type: "expr",
      default: "0",
      numeric: "int",
    }],
  },
  {
    name: "loadModels",
    label: "Load Models Now",
    group: "World",
    lines: ["Streaming.LoadAllModelsNow()"],
    fields: [],
  },
  {
    name: "soundAt",
    label: "Play Sound",
    group: "World",
    lines: [
      "Sound.AddOneOffSound({spot}_X, {spot}_Y, {spot}_Z, ScriptSound.{sound})",
    ],
    fields: [{ ...spot, default: "PAYPHONE" }, {
      name: "sound",
      label: "Sound",
      type: "name",
      default: "SoundPayphoneRinging",
    }],
  },
  {
    name: "clearUi",
    label: "Clear UI",
    group: "Text",
    lines: ["clearUI()"],
    fields: [],
  },
  {
    name: "wait",
    label: "Wait",
    group: "World",
    lines: ["wait {ms}"],
    fields: [{ ...ms, label: "Wait (ms)", default: "0" }],
  },
  {
    name: "loadSpecialCharacter",
    label: "Load Special Character",
    group: "World",
    lines: ["load_special_character {slot} 1 {model} '{name}'"],
    fields: [{
      name: "slot",
      label: "Slot",
      type: "number",
      min: 1,
      default: "1",
    }, {
      name: "model",
      label: "Model",
      type: "expr",
      default: "#SPECIAL01",
    }, {
      name: "name",
      label: "Name",
      type: "name",
      default: "FRANKIE",
    }],
  },
  {
    name: "charCreate",
    label: "Create Character",
    group: "World",
    lines: [
      "Char.Create(PedType.Special, {model}, {spot}_X, {spot}_Y, {spot}_Z, {char})",
    ],
    fields: [{
      name: "model",
      label: "Model",
      type: "expr",
      default: "#SPECIAL01",
    }, { ...spot, default: "NOODLES_SAL" }, charField],
  },
  {
    name: "charPersonality",
    label: "Set Personality",
    group: "World",
    lines: ["Char.SetPersonality({char}, PedStat.{stat})"],
    fields: [charField, {
      name: "stat",
      label: "Personality",
      type: "name",
      default: "ToughGuy",
    }],
  },
  {
    name: "charFacePlayer",
    label: "Character Faces Player",
    group: "World",
    lines: ["Char.TurnToFacePlayer({char}, $player)"],
    fields: [charField],
  },
  {
    name: "charLookPlayer",
    label: "Character Looks at Player",
    group: "World",
    lines: ["Char.LookAtPlayerAlways({char}, $player)"],
    fields: [charField],
  },
  {
    name: "charAnimGroup",
    label: "Animation Group",
    group: "World",
    lines: ["Char.SetAnimGroup({char}, AnimGroup.{animGroup})"],
    fields: [charField, {
      name: "animGroup",
      label: "Animation Group",
      type: "name",
      default: "Man",
    }],
  },
  {
    name: "cameraAtChar",
    label: "Camera looks at character",
    group: "Camera",
    lines: ["Camera.PointAtChar({char}, CameraMode.Fixed, SwitchType.{switch})"],
    fields: [charField, {
      name: "switch",
      label: "Cut",
      type: "choice",
      options: ["JumpCut", "Interpolation"],
      labels: { JumpCut: "Jump cut", Interpolation: "Interpolate" },
      default: "JumpCut",
    }],
  },
  {
    name: "cameraFixedAtChar",
    label: "Fix camera, looking at character",
    group: "Camera",
    lines: [
      "Camera.SetFixedPosition({spot}_X, {spot}_Y, {spot}_Z, 0, 0, 0)",
      "Camera.PointAtChar({char}, CameraMode.Fixed, SwitchType.{switch})",
    ],
    fields: [{ ...spot, default: "NOODLES_SECURITY_CAM" }, charField, {
      name: "switch",
      label: "Cut",
      type: "choice",
      options: ["JumpCut", "Interpolation"],
      labels: { JumpCut: "Jump cut", Interpolation: "Interpolate" },
      default: "JumpCut",
    }],
  },
  {
    name: "cameraInterpolation",
    label: "Camera Interpolation Time",
    group: "Camera",
    lines: ["Camera.SetInterpolationParameters(0, {ms})"],
    fields: [{ ...ms, default: "0" }],
  },
  {
    name: "cameraBehindPlayer",
    label: "Camera Behind Player",
    group: "Camera",
    lines: ["Camera.SetBehindPlayer()"],
    fields: [],
  },
  {
    name: "cameraGenerateCars",
    label: "Generate Cars Around Camera",
    group: "Camera",
    lines: ["Camera.SetGenerateCarsAround({on})"],
    fields: [toggle("on", "Generate Cars", true)],
  },
  {
    name: "charHeading",
    label: "Read Character Heading",
    group: "World",
    lines: ["{var} = Char.GetHeading({char})"],
    fields: [{
      name: "var",
      label: "Variable",
      type: "expr",
      default: "salHeading",
    }, charField],
  },
  {
    name: "invertHeading",
    label: "Invert Heading",
    group: "World",
    lines: ["{var} = invertHeading({source})"],
    fields: [{
      name: "var",
      label: "Variable",
      type: "expr",
      default: "faceSalHeading",
    }, {
      name: "source",
      label: "From",
      type: "expr",
      default: "salHeading",
    }],
  },
  {
    name: "playerFaceChar",
    label: "Player Faces Character",
    group: "Player",
    lines: ["Player.TurnToFaceChar($player, {char})"],
    fields: [charField],
  },
  {
    name: "playerHeading",
    label: "Set Player Heading",
    group: "Player",
    lines: ["Player.SetHeading($player, {angle})"],
    fields: [{
      name: "angle",
      label: "Heading",
      type: "expr",
      default: "faceSalHeading",
    }],
  },
  {
    name: "playerLookChar",
    label: "Player Looks at Character",
    group: "Player",
    lines: ["Player.LookAtCharAlways($player, {char})"],
    fields: [charField],
  },
  {
    name: "playerStopLooking",
    label: "Player Stops Looking",
    group: "Player",
    lines: ["Player.StopLooking($player)"],
    fields: [],
  },
  {
    name: "charStopLooking",
    label: "Character Stops Looking",
    group: "World",
    lines: ["Char.StopLooking({char})"],
    fields: [charField],
  },
  {
    name: "charRunning",
    label: "Character Runs",
    group: "World",
    lines: ["Char.SetRunning({char}, {running})"],
    fields: [charField, toggle("running", "Runs", true)],
  },
  {
    name: "charGoto",
    label: "Character Walks to Spot",
    group: "World",
    lines: ["Char.SetObjGotoCoordOnFoot({char}, {spot}_X, {spot}_Y)"],
    fields: [charField, { ...spot, default: "ROSA_SPAWN" }],
  },
  {
    name: "charRemove",
    label: "Remove Character",
    group: "World",
    lines: [
      "Char.MarkAsNoLongerNeeded({char})",
      "Char.Delete({char})",
      "{char} = 0",
    ],
    fields: [charField],
  },
  {
    name: "ensureVanBlip",
    label: "Ensure Van Blip",
    group: "Map",
    lines: ["ensureVanBlip()"],
    fields: [],
  },
  {
    name: "carCreate",
    label: "Create Car at Spot",
    group: "World",
    lines: ["{car} = Car.Create({model}, {spot}_X, {spot}_Y, {spot}_Z)"],
    fields: [{
      name: "car",
      label: "Car",
      type: "expr",
      default: "$myCar",
      varType: "Car",
    }, {
      name: "model",
      label: "Model",
      type: "expr",
      default: "#RUMPO",
    }, { ...spot, default: "SUPPLY_VAN" }],
  },
  {
    name: "carModel",
    label: "Set Car Model Variable",
    group: "World",
    lines: ["{var} = {model}"],
    fields: [{
      name: "var",
      label: "Variable",
      type: "expr",
      default: "$myCarModel",
    }, {
      name: "model",
      label: "Model",
      type: "expr",
      default: "#RUMPO",
    }],
  },
  {
    name: "blipForCoord",
    label: "Add Blip at Spot",
    group: "Map",
    lines: ["{var} = Blip.AddForCoord({spot}_X, {spot}_Y, {spot}_Z)"],
    fields: [{
      name: "var",
      label: "Blip Variable",
      type: "expr",
      default: "deliveryBlip",
    }, { ...spot, default: "DELIVERY" }],
  },
  {
    name: "blipForPickup",
    label: "Add Blip for Pickup",
    group: "Map",
    lines: ["{var} = Blip.AddForPickup({pickup})"],
    fields: [{
      name: "var",
      label: "Blip Variable",
      type: "expr",
      default: "pickupBlip",
    }, {
      name: "pickup",
      label: "Pickup",
      type: "expr",
      default: "packagePickup",
      varType: "Pickup",
    }],
  },
  {
    name: "blipRemoveVar",
    label: "Remove Blip Variable",
    group: "Map",
    lines: ["Blip.Remove({var})"],
    fields: [{
      name: "var",
      label: "Blip Variable",
      type: "expr",
      default: "payphoneBlip",
    }],
  },
  {
    name: "pickupCreate",
    label: "Create Pickup at Spot",
    group: "World",
    lines: [
      "{pickup} = Pickup.Create({model}, PickupType.OnStreet, {spot}_X, {spot}_Y, {spot}_Z)",
    ],
    fields: [{
      name: "pickup",
      label: "Pickup Variable",
      type: "expr",
      default: "packagePickup",
      varType: "Pickup",
    }, {
      name: "model",
      label: "Model",
      type: "expr",
      default: "1321",
      numeric: "int",
    }, { ...spot, default: "PACKAGE_PICKUP" }],
  },
  {
    name: "pickupRemove",
    label: "Remove Pickup",
    group: "World",
    lines: ["Pickup.Remove({pickup})"],
    fields: [{
      name: "pickup",
      label: "Pickup",
      type: "expr",
      default: "packagePickup",
      varType: "Pickup",
    }],
  },
  {
    name: "phoneGrab",
    label: "Pick Up Phone",
    group: "World",
    lines: ["Phone.Grab({spot}_X, {spot}_Y, {var})"],
    fields: [{ ...spot, default: "PAYPHONE" }, {
      name: "var",
      label: "Phone Variable",
      type: "expr",
      default: "payphoneHandle",
    }],
  },
  {
    name: "phoneOn",
    label: "Turn Phone On",
    group: "World",
    lines: ["Phone.TurnOn({var})"],
    fields: [{
      name: "var",
      label: "Phone Variable",
      type: "expr",
      default: "payphoneHandle",
    }],
  },
  {
    name: "phoneOff",
    label: "Turn Phone Off",
    group: "World",
    lines: ["Phone.TurnOff({var})"],
    fields: [{
      name: "var",
      label: "Phone Variable",
      type: "expr",
      default: "payphoneHandle",
    }],
  },
  {
    name: "debugLog",
    label: "Debug Log",
    group: "World",
    lines: ["debugLogInt({key}, {value})"],
    fields: [{
      name: "key",
      label: "Debug Key",
      type: "expr",
      default: "DEBUG_PLAYER",
    }, {
      name: "value",
      label: "Value",
      type: "expr",
      default: "$player",
    }],
  },
];

const radius: Field = {
  name: "radius",
  label: "Radius",
  type: "expr",
  default: DEFAULT_RADIUS,
  placeholder: DEFAULT_RADIUS,
  numeric: "float",
};

// The last argument of every Locate command: whether the game draws the zone as a sphere.
const sphere = (on: boolean): Field => ({
  name: "sphere",
  label: "Show Sphere",
  type: "toggle",
  default: String(on),
});

const carField: Field = {
  name: "car",
  label: "Car",
  type: "expr",
  default: "$myCar",
  varType: "Car",
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
      "Player.LocateAnyMeans3D($player, {spot}_X, {spot}_Y, {spot}_Z, {radius}, {radius}, {radius}, {sphere})",
    ],
    fields: [spot, radius, sphere(true)],
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
      "Player.LocateAnyMeans2D($player, {spot}_X, {spot}_Y, {radius}, {radius}, {sphere})",
    ],
    fields: [spot, radius, sphere(false)],
  },
  {
    name: "playerOnFootNear3D",
    label: "Player is on foot near (3D)",
    group: "Position",
    lines: [
      "Player.LocateOnFoot3D($player, {spot}_X, {spot}_Y, {spot}_Z, {radius}, {radius}, {radius}, {sphere})",
    ],
    fields: [spot, radius, sphere(true)],
  },
  {
    name: "playerOnFootNear2D",
    label: "Player is on foot near (2D)",
    group: "Position",
    lines: [
      "Player.LocateOnFoot2D($player, {spot}_X, {spot}_Y, {radius}, {radius}, {sphere})",
    ],
    fields: [spot, radius, sphere(false)],
  },
  {
    name: "playerStoppedNear3D",
    label: "Player has stopped on foot near",
    group: "Position",
    lines: [
      "Player.LocateStoppedOnFoot3D($player, {spot}_X, {spot}_Y, {spot}_Z, {radius}, {radius}, {radius}, {sphere})",
    ],
    fields: [spot, radius, sphere(true)],
  },
  {
    name: "playerInThisCar",
    label: "Player is in a given car",
    group: "Player",
    lines: ["Player.IsInCar($player, {car})"],
    fields: [carField],
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
    fields: [carField],
  },
  {
    name: "carInWater",
    label: "Car is in water",
    group: "Vehicles",
    lines: ["Car.IsInWater({car})"],
    fields: [carField],
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
      varType: "Pickup",
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
      varType: "Char",
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
    fields: [{
      name: "model",
      label: "Model",
      type: "expr",
      default: "0",
      numeric: "int",
    }],
  },
  {
    name: "wantedAbove",
    label: "Wanted level above",
    group: "Player",
    pre: ["wanted = 0", "01C0: wanted = player $player wanted_level"],
    lines: ["wanted > {max}"],
    locals: ["wanted"],
    fields: [{
      name: "max",
      label: "Highest Allowed Stars",
      type: "number",
      min: 0,
      max: 6,
      default: "1",
    }],
  },
  {
    name: "carHealthBelow",
    label: "Car health below",
    group: "Vehicles",
    pre: ["carHealth = 0", "0227: carHealth = car {car} health"],
    lines: ["carHealth < {amount}"],
    locals: ["carHealth"],
    fields: [carField, {
      name: "amount",
      label: "Lowest Allowed Health",
      type: "number",
      min: 0,
      max: 1000,
      default: "250",
    }],
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
  {
    name: "variableEquals",
    label: "Variable equals",
    group: "World",
    lines: ["{name} == {value}"],
    fields: [{
      name: "name",
      label: "Variable",
      type: "expr",
      default: "$skipCutscene",
    }, {
      name: "value",
      label: "Value",
      type: "expr",
      default: "false",
    }],
  },
  {
    name: "pickupNotCollected",
    label: "Pickup has not been collected",
    group: "World",
    lines: ["not Pickup.HasBeenCollected({pickup})"],
    fields: [{
      name: "pickup",
      label: "Pickup",
      type: "expr",
      default: "$pickup",
      varType: "Pickup",
    }],
  },
  {
    name: "timeLimitExceeded",
    label: "Time limit exceeded",
    group: "World",
    lines: ["TIMERB > {seconds}000"],
    fields: [{
      name: "seconds",
      label: "Seconds",
      type: "number",
      min: 1,
      default: "60",
    }],
  },
  {
    name: "timeLimitNotExceeded",
    label: "Time limit not exceeded",
    group: "World",
    lines: ["TIMERB <= {seconds}000"],
    fields: [{
      name: "seconds",
      label: "Seconds",
      type: "number",
      min: 1,
      default: "60",
    }],
  },
];
