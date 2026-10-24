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
  charCreate: (
    slot: Expr,
    name: string,
    model: Expr,
    pedType: string,
    spot: Spot,
    char: Expr,
  ): Step => [
    `load_special_character ${slot} 1 ${model} '${name}'`,
    `Char.Create(PedType.${pedType}, ${model}, ${coords(spot, 3)}, ${char})`,
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
  playerHeading: (
    angle: Expr,
  ): Step => [`Player.SetHeading($player, ${angle})`],
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
  /** Calls a function the mission's includes define, e.g. `ensureVanBlip`. */
  callFunction: (name: string): Step => [`${name}()`],
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
    `${pickup} = Pickup.Create(${model}, PickupType.OnStreet, ${
      coords(spot, 3)
    })`,
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
  setTimeOfDay: (hours: Expr, minutes: Expr): Step => [
    `Clock.SetTimeOfDay(${hours}, ${minutes})`,
  ],
  setTimeScale: (scale: Expr): Step => [`Clock.SetTimeScale(${scale})`],
  storeClock: (): Step => ["Clock.Store()"],
  restoreClock: (): Step => ["Clock.Restore()"],
  /** Shows a countdown on the HUD that counts the value in `timer`, e.g. `TIMERB`. */
  showTimer: (timer: Expr): Step => [`Hud.DisplayTimer(${timer})`],
  clearTimer: (timer: Expr): Step => [`Hud.ClearTimer(${timer})`],
  freezeTimer: (on: boolean): Step => [`Hud.FreezeTimer(${on})`],
  forceWeather: (type: string): Step => [`Weather.Force(WeatherType.${type})`],
  forceWeatherNow: (type: string): Step => [
    `Weather.ForceNow(WeatherType.${type})`,
  ],
  releaseWeather: (): Step => ["Weather.Release()"],
  forceRain: (on: boolean): Step => [`Weather.ForceRain(${on})`],
  setNeverGetsTired: (on: boolean): Step => [
    `Player.SetNeverGetsTired($player, ${on})`,
  ],
  setPlayerVisible: (
    on: boolean,
  ): Step => [`Player.SetVisible($player, ${on})`],
  setHealth: (health: Expr): Step => [`Player.SetHealth($player, ${health})`],
  addArmour: (amount: Expr): Step => [`Player.AddArmour($player, ${amount})`],
  setMaxWantedLevel: (max: Expr): Step => [`Game.SetMaxWantedLevel(${max})`],
  swapBuildingModel: (
    spot: Spot,
    radius: Expr,
    from: Expr,
    to: Expr,
  ): Step => [
    `World.SwapNearestBuildingModel(${
      coords(spot, 3)
    }, ${radius}, ${from}, ${to})`,
  ],
  setObjectVisible: (
    spot: Spot,
    radius: Expr,
    model: Expr,
    on: boolean,
  ): Step => [
    `World.SetVisibilityOfClosestObjectOfType(${
      coords(spot, 3)
    }, ${radius}, ${model}, ${on})`,
  ],
  clearArea: (spot: Spot, radius: Expr, clearParticles: boolean): Step => [
    `World.ClearArea(${coords(spot, 3)}, ${radius}, ${clearParticles})`,
  ],
  setMusicFades: (on: boolean): Step => [`Audio.SetMusicDoesFade(${on})`],
  openGarage: (garage: Expr): Step => [`Garage.Open(${garage})`],
  closeGarage: (garage: Expr): Step => [`Garage.Close(${garage})`],
  activateGarage: (garage: Expr): Step => [`Garage.Activate(${garage})`],
  deactivateGarage: (garage: Expr): Step => [`Garage.Deactivate(${garage})`],
  playEndTune: (): Step => ["Audio.PlayEndOfGameTune()"],
  setRadioChannel: (channel: string, startMs: Expr): Step => [
    `Audio.SetRadioChannel(RadioChannel.${channel}, ${startMs})`,
  ],
  blipForChar: (variable: Expr, char: Expr): Step => [
    `${variable} = Blip.AddForChar(${char})`,
  ],
  blipChangeColor: (handle: string, color: string): Step => [
    `Blip.ChangeColor(${handle}, BlipColor.${color})`,
  ],
  blipDim: (
    handle: string,
    on: boolean,
  ): Step => [`Blip.Dim(${handle}, ${on})`],
  cameraShake: (intensity: Expr): Step => [`Camera.Shake(${intensity})`],
  cameraInFrontOfPlayer: (): Step => ["Camera.SetInFrontOfPlayer()"],
  cameraPointAtCar: (car: Expr, cut: "JumpCut" | "Interpolation"): Step => [
    `Camera.PointAtCar(${car}, CameraMode.Fixed, SwitchType.${cut})`,
  ],
  cameraFadeColor: (r: Expr, g: Expr, b: Expr): Step => [
    `Camera.SetFadingColor(${r}, ${g}, ${b})`,
  ],
  cameraNearClip: (distance: Expr): Step => [`Camera.SetNearClip(${distance})`],
  cameraMotionBlur: (type: string): Step => [
    `Camera.SetMotionBlur(MotionBlurType.${type})`,
  ],
  carDelete: (car: Expr): Step => [`Car.Delete(${car})`],
  carGoto: (car: Expr, spot: Spot): Step => [
    `Car.GotoCoordinates(${car}, ${coords(spot, 3)})`,
  ],
  carSetIdle: (car: Expr): Step => [`Car.SetIdle(${car})`],
  carExplode: (car: Expr): Step => [`Car.Explode(${car})`],
  carSetHealth: (car: Expr, health: Expr): Step => [
    `Car.SetHealth(${car}, ${health})`,
  ],
  carLock: (car: Expr, lock: string): Step => [
    `Car.LockDoors(${car}, CarLock.${lock})`,
  ],
  carSetHeading: (car: Expr, heading: Expr): Step => [
    `Car.SetHeading(${car}, ${heading})`,
  ],
  charDelete: (char: Expr): Step => [`Char.Delete(${char})`],
  charSetHealth: (char: Expr, health: Expr): Step => [
    `Char.SetHealth(${char}, ${health})`,
  ],
  charGiveWeapon: (char: Expr, weapon: string, ammo: Expr): Step => [
    `Char.GiveWeapon(${char}, WeaponType.${weapon}, ${ammo})`,
  ],
  charSetIdle: (char: Expr): Step => [`Char.SetIdle(${char})`],
  charSetHeading: (char: Expr, heading: Expr): Step => [
    `Char.SetHeading(${char}, ${heading})`,
  ],
  setWantedMultiplier: (multiplier: Expr): Step => [
    `Game.SetWantedMultiplier(${multiplier})`,
  ],
  setPoliceIgnorePlayer: (on: boolean): Step => [
    `Game.SetPoliceIgnorePlayer($player, ${on})`,
  ],
  setEveryoneIgnorePlayer: (on: boolean): Step => [
    `Game.SetEveryoneIgnorePlayer($player, ${on})`,
  ],
  activateSaveMenu: (): Step => ["Game.ActivateSaveMenu()"],
  setAllCarsDamage: (on: boolean): Step => [
    `Game.SetAllCarsCanBeDamaged(${on})`,
  ],
  changeGarageType: (garage: string, type: string): Step => [
    `Garage.ChangeType(${garage}, GarageType.${type})`,
  ],
  showCounter: (counter: Expr, display: "Number" | "Bar"): Step => [
    `Hud.DisplayCounter(${counter}, CounterDisplay.${display})`,
  ],
  clearCounter: (counter: Expr): Step => [`Hud.ClearCounter(${counter})`],
  widescreen: (on: boolean): Step => [`Hud.SwitchWidescreen(${on})`],
  objectCreate: (variable: Expr, model: Expr, spot: Spot): Step => [
    `${variable} = Object.Create(${model}, ${coords(spot, 3)})`,
  ],
  objectDelete: (object: Expr): Step => [`Object.Delete(${object})`],
  padShake: (pad: string, ms: Expr, intensity: Expr): Step => [
    `Pad.Shake(PadId.${pad}, ${ms}, ${intensity})`,
  ],
  pickupCreateMoney: (pickup: Expr, spot: Spot, amount: Expr): Step => [
    `${pickup} = Pickup.CreateMoney(${coords(spot, 3)}, ${amount})`,
  ],
  pickupCreateFloatingPackage: (pickup: Expr, spot: Spot): Step => [
    `${pickup} = Pickup.CreateFloatingPackage(${coords(spot, 3)})`,
  ],
  pickupDropMine: (spot: Spot): Step => [
    `Pickup.DropMine(${coords(spot, 3)})`,
  ],
  playerWarp: (spot: Spot): Step => [
    `Player.SetCoordinates($player, ${coords(spot, 3)})`,
  ],
  playerWarpIntoCar: (
    car: Expr,
  ): Step => [`Player.WarpIntoCar($player, ${car})`],
  playerClearWantedLevel: (): Step => ["Player.ClearWantedLevel($player)"],
  playerAlterWantedLevel: (stars: Expr): Step => [
    `Player.AlterWantedLevel($player, ${stars})`,
  ],
  playerGiveWeapon: (weapon: string, ammo: Expr): Step => [
    `Player.GiveWeapon($player, WeaponType.${weapon}, ${ammo})`,
  ],
  playerSetAmmo: (weapon: string, ammo: Expr): Step => [
    `Player.SetAmmo($player, WeaponType.${weapon}, ${ammo})`,
  ],
  playerRemoveWeapons: (): Step => ["Player.RemoveAllWeapons($player)"],
  playerSetAnimGroup: (animGroup: string): Step => [
    `Player.SetAnimGroup($player, AnimGroup.${animGroup})`,
  ],
  streamLoadSpecialCharacter: (slot: Expr, name: string): Step => [
    `Streaming.LoadSpecialCharacter(${slot}, '${name}')`,
  ],
  streamUnloadSpecialCharacter: (slot: Expr): Step => [
    `Streaming.UnloadSpecialCharacter(${slot})`,
  ],
  streamUnloadModel: (model: Expr): Step => [
    `Streaming.MarkModelAsNoLongerNeeded(${model})`,
  ],
  streamLoadCollision: (level: string): Step => [
    `Streaming.LoadCollision(LevelName.${level})`,
  ],
  streamLoadScene: (spot: Spot): Step => [
    `Streaming.LoadScene(${coords(spot, 3)})`,
  ],
  clearPrints: (): Step => ["Text.ClearPrints()"],
  clearHelp: (): Step => ["Text.ClearHelp()"],
  useCommands: (on: boolean): Step => [`Text.UseCommands(${on})`],
  textBackground: (on: boolean): Step => [`Text.SetBackground(${on})`],
  cutsceneLoad: (name: string): Step => [`Cutscene.Load('${name}')`],
  cutsceneSetOffset: (spot: Spot): Step => [
    `Cutscene.SetOffset(${coords(spot, 3)})`,
  ],
  cutsceneStart: (): Step => ["Cutscene.Start()"],
  cutsceneClear: (): Step => ["Cutscene.Clear()"],
  cutsceneObjectCreate: (variable: Expr, model: Expr): Step => [
    `${variable} = CutsceneObject.Create(${model})`,
  ],
  cutsceneObjectAnim: (object: Expr, anim: string): Step => [
    `CutsceneObject.SetAnim(${object}, '${anim}')`,
  ],
  cutsceneHeadCreate: (variable: Expr, object: Expr, model: Expr): Step => [
    `${variable} = CutsceneHead.Create(${object}, ${model})`,
  ],
  boatGoto: (boat: Expr, spot: Spot): Step => [
    `Boat.Goto(${boat}, ${coords(spot, 3)})`,
  ],
  boatStop: (boat: Expr): Step => [`Boat.Stop(${boat})`],
  boatCruiseSpeed: (boat: Expr, speed: Expr): Step => [
    `Boat.SetCruiseSpeed(${boat}, ${speed})`,
  ],
  boatAnchor: (
    boat: Expr,
    on: boolean,
  ): Step => [`Boat.Anchor(${boat}, ${on})`],
  carGeneratorSwitch: (generator: Expr, count: Expr): Step => [
    `CarGenerator.Switch(${generator}, ${count})`,
  ],
  craneDeactivate: (spot: Spot2D): Step => [
    `Crane.Deactivate(${coords(spot, 2)})`,
  ],
  gangCarModel: (gang: string, model: Expr): Step => [
    `Gang.SetCarModel(GangType.${gang}, ${model})`,
  ],
  gangWeapons: (gang: string, first: string, second: string): Step => [
    `Gang.SetWeapons(GangType.${gang}, WeaponType.${first}, WeaponType.${second})`,
  ],
  gangModelPreference: (gang: string, override: string): Step => [
    `Gang.SetPedModelPreference(GangType.${gang}, GangModelOverride.${override})`,
  ],
  fxExplosion: (spot: Spot, type: string): Step => [
    `Fx.AddExplosion(${coords(spot, 3)}, ExplosionType.${type})`,
  ],
  pathAddRoutePoint: (route: Expr, spot: Spot): Step => [
    `Path.AddRoutePoint(${route}, ${coords(spot, 3)})`,
  ],
  pathRemoveRoute: (route: Expr): Step => [`Path.RemoveRoute(${route})`],
  restartAddHospital: (spot: Spot, angle: Expr): Step => [
    `Restart.AddHospital(${coords(spot, 3)}, ${angle})`,
  ],
  restartOverrideNext: (spot: Spot, angle: Expr): Step => [
    `Restart.OverrideNext(${coords(spot, 3)}, ${angle})`,
  ],
  restartCancelOverride: (): Step => ["Restart.CancelOverride()"],
  restartFadeAfterDeath: (on: boolean): Step => [
    `Restart.SetFadeInAfterNextDeath(${on})`,
  ],
  rcBlowUp: (): Step => ["Rc.BlowUpBuggy()"],
  fireCreate: (variable: Expr, spot: Spot): Step => [
    `${variable} = ScriptFire.Create(${coords(spot, 3)})`,
  ],
  fireRemove: (fire: Expr): Step => [`ScriptFire.Remove(${fire})`],
  fireAudio: (fire: Expr, on: boolean): Step => [
    `ScriptFire.SetAudio(${fire}, ${on})`,
  ],
  sphereCreate: (variable: Expr, spot: Spot, radius: Expr): Step => [
    `${variable} = Sphere.Create(${coords(spot, 3)}, ${radius})`,
  ],
  sphereRemove: (sphere: Expr): Step => [`Sphere.Remove(${sphere})`],
  statProgress: (amount: Expr): Step => [`Stat.PlayerMadeProgress(${amount})`],
  statSetProgressTotal: (total: Expr): Step => [
    `Stat.SetProgressTotal(${total})`,
  ],
  statMissionGiven: (): Step => ["Stat.RegisterMissionGiven()"],
  stuckCarAdd: (car: Expr, distance: Expr, time: Expr): Step => [
    `StuckCarCheck.Add(${car}, ${distance}, ${time})`,
  ],
  stuckCarRemove: (car: Expr): Step => [`StuckCarCheck.Remove(${car})`],
  txdLoadDictionary: (name: string): Step => [`Txd.LoadDictionary('${name}')`],
  txdLoadSprite: (slot: Expr, name: string): Step => [
    `Txd.LoadSprite(${slot}, '${name}')`,
  ],
  txdRemove: (): Step => ["Txd.Remove()"],
  chaseSceneStart: (startTime: Expr): Step => [
    `ChaseScene.Start(${startTime})`,
  ],
  chaseSceneStop: (): Step => ["ChaseScene.Stop()"],
  chaseSceneRemoveCar: (index: Expr): Step => [
    `ChaseScene.RemoveCarFromChase(${index})`,
  ],
  catalinaHeliStart: (): Step => ["CatalinaHeli.Start()"],
  catalinaHeliTakeOff: (): Step => ["CatalinaHeli.TakeOff()"],
  catalinaHeliRemove: (): Step => ["CatalinaHeli.Remove()"],
  drugRunStart: (): Step => ["DrugRun.Start()"],
  drugDropOffStart: (): Step => ["DrugDropOff.Start()"],
  pacmanStartRace: (): Step => ["Pacman.StartRace(0)"],
  pacmanStartScramble: (spot: Spot, distance: Expr, count: Expr): Step => [
    `Pacman.StartScramble(${coords(spot, 3)}, ${distance}, ${count})`,
  ],
  pacmanClear: (): Step => ["Pacman.Clear()"],
  creditsStart: (): Step => ["Credits.Start()"],
  creditsStop: (): Step => ["Credits.Stop()"],
  zoneSetCarDensity: (
    zone: string,
    time: "Day" | "Night",
    density: Expr,
  ): Step => [
    `Zone.SetCarDensity('${zone}', DayOrNight.${time}, ${density})`,
  ],
  zoneSetPedDensity: (
    zone: string,
    time: "Day" | "Night",
    density: Expr,
  ): Step => [
    `Zone.SetPedDensity('${zone}', DayOrNight.${time}, ${density})`,
  ],
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
    test: `TIMERB >${seconds}000`,
  }),
  timeLimitNotExceeded: (seconds: number): Cond => ({
    test: `TIMERB <=${seconds}000`,
  }),
  /** Reads the in-game hour into the scratch local `hours`, which holds 0 to 23. */
  clockAtOrAfter: (hour: number): Cond => ({
    pre: ["hours = 0", "minutes = 0", "Clock.GetTimeOfDay(hours, minutes)"],
    test: `hours >= ${hour}`,
    locals: ["hours", "minutes"],
  }),
  clockBefore: (hour: number): Cond => ({
    pre: ["hours = 0", "minutes = 0", "Clock.GetTimeOfDay(hours, minutes)"],
    test: `hours < ${hour}`,
    locals: ["hours", "minutes"],
  }),
  playerHealthAbove: (amount: number): Cond => ({
    test: `Player.IsHealthGreater($player, ${amount})`,
  }),
  garageOpen: (garage: Expr): Cond => ({ test: `Garage.IsOpen(${garage})` }),
  garageClosed: (garage: Expr): Cond => ({
    test: `Garage.IsClosed(${garage})`,
  }),
  garageContainsCar: (garage: Expr, car: Expr): Cond => ({
    test: `Garage.DoesContainCar(${garage}, ${car})`,
  }),
  charDead: (char: Expr): Cond => ({ test: `Char.IsDead(${char})` }),
  carDead: (car: Expr): Cond => ({ test: `Car.IsDead(${car})` }),
  carStopped: (car: Expr): Cond => ({ test: `Car.IsStopped(${car})` }),
  carStuckOnRoof: (car: Expr): Cond => ({ test: `Car.IsStuckOnRoof(${car})` }),
  carIsModel: (car: Expr, model: Expr): Cond => ({
    test: `Car.IsModel(${car}, ${model})`,
  }),
  playerShooting: (): Cond => ({ test: "Player.IsShooting($player)" }),
  playerStopped: (): Cond => ({ test: "Player.IsStopped($player)" }),
  playerOnFoot: (): Cond => ({ test: "Player.IsOnFoot($player)" }),
  padButtonPressed: (pad: string, button: string): Cond => ({
    test: `Pad.IsButtonPressed(PadId.${pad}, Button.${button})`,
  }),
  collisionLoaded: (level: string): Cond => ({
    test: `Streaming.IsCollisionInMemory(LevelName.${level})`,
  }),
  specialCharLoaded: (slot: Expr): Cond => ({
    test: `Streaming.HasSpecialCharacterLoaded(${slot})`,
  }),
  missionAudioFinished: (): Cond => ({
    test: "Audio.HasMissionAudioFinished()",
  }),
  cutsceneFinished: (): Cond => ({ test: "Cutscene.HasFinished()" }),
  craneLiftingCar: (spot: Spot2D, car: Expr): Cond => ({
    test: `Crane.IsLiftingCar(${coords(spot, 2)}, ${car})`,
  }),
  fireExtinguished: (fire: Expr): Cond => ({
    test: `ScriptFire.IsExtinguished(${fire})`,
  }),
  stuckCarStuck: (car: Expr): Cond => ({
    test: `StuckCarCheck.IsCarStuck(${car})`,
  }),
  catalinaHeliShotDown: (): Cond => ({
    test: "CatalinaHeli.HasBeenShotDown()",
  }),
  drugRunCompleted: (): Cond => ({ test: "DrugRun.HasBeenCompleted()" }),
  drugRunShotDown: (): Cond => ({ test: "DrugRun.HasPlaneBeenShotDown()" }),
  drugDropOffShotDown: (): Cond => ({
    test: "DrugDropOff.HasPlaneBeenShotDown()",
  }),
  creditsFinished: (): Cond => ({ test: "Credits.AreFinished()" }),
  latchSet: (id: string): Cond => cmp(latchLocal(id), "==", "true"),
  latchClear: (id: string): Cond => cmp(latchLocal(id), "==", "false"),
};
