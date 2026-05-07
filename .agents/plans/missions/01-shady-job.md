# Plan: Mission 1 — Easy Money (`1_shady_job.txt`)

## Goal

Implement the full mission script for *Easy Money*: a contraband delivery job
that teaches wanted-level avoidance and multi-stage mission structure.

---

## Key Data

| Item | Value |
|---|---|
| Reward | $800 |
| Time limit | 120 seconds (2 in-game hours) |
| Max wanted stars | 1 (fail at 2+) |
| Car damage threshold | Tbd in script (e.g. `$health < 250`) |
| Payphone coord | `(1168.33, -414.141, 22.8)` |
| Mission title card | `"Easy Money"` |

---

## Implementation Steps

### Step 1 — Opening dialogue & title card

Mirrors `0_tutorial.txt` preamble. Print the "Easy Money" title card (already
stubbed), then deliver the contact's intro lines via `Text.PrintString`.

```
Text.PrintString("I hear you're meek like a mouse. I need someone discreet.", 3500)
wait 3750
Text.PrintString("Wait for our call. Pick up a package and deliver it. Simple.", 4000)
wait 4250
Text.PrintString("Keep a low profile. We don't want the cops sniffin' around.", 3500)
wait 3750
```

### Step 2 — Payphone ring + call cutscene

Trigger `Sound.AddOneOffSound` at the payphone coord to simulate an incoming
call, then print the delivery briefing lines.

```
Sound.AddOneOffSound(1168.33, -414.141, 22.8, ScriptSound.SoundPayphoneRinging)
wait 3000
Text.PrintString("Pick up the package at the docks, deliver it to the warehouse on the south side.", 4500)
wait 4750
Text.PrintString("You don't have much time. Don't fuck this up.", 3000)
wait 3250
```

Add a blip on the payphone so the player walks to it first (optional: make them
touch the phone before the briefing plays, using a `Player.LocateAnyMeans2D`
check).

### Step 3 — Package pickup

1. Spawn a pickup object at the pickup waypoint (quiet alley / docks area —
   scout a Portland coord with low civilian density; candidate: near the docks
   at ~`(1340.0, -695.0, 14.0)`).
2. Add a radar blip for the pickup.
3. Loop until `Pickup.HasBeenCollected($package)` is true.
4. On pickup: remove blip, set `$hasPackage = true`, print help string
   `"Package secured. Get to the warehouse."`, add delivery blip.

```sanny
$package = Pickup.Create(model, PickupType.OnStreet, 1340.0, -695.0, 14.0)
$pickupBlip = Blip.AddSpriteForCoord(1340.0, -695.0, 14.0, BlipSprite.Package)

// in main loop:
if Pickup.HasBeenCollected($package)
then
  $hasPackage = true
  Blip.Remove($pickupBlip)
  // add delivery blip
end
```

### Step 4 — Delivery

1. Add a radar blip for the delivery zone (industrial area, south Portland —
   candidate: `(880.0, -880.0, 14.0)` near the Portland docks/warehouse row).
2. Use `Player.LocateAnyMeans2D` (or `LocateInAnyCar2D`) to detect arrival at
   the delivery zone (~5.0 radius).
3. On arrival: set `$delivered = true`.

### Step 5 — Mission event loop

Structure mirrors `0_tutorial.txt`. The loop runs every `wait 0` and checks
(in order):

1. **Wasted/busted** → `Mission.Fail()`
2. **Wanted level ≥ 2** → print "Too hot — job's blown." → `Mission.Fail()`
3. **Car health below threshold** → print "Package is toast." → `Mission.Fail()`
4. **Timer expired** → print "Took too long." → `Mission.Fail()`
5. **Delivered** → success branch

```sanny
$startTime = 0
Timer.Set($startTime) // or use game clock opcode

while true
  wait 0

  checkSafety() // shared util for health/death

  if or
    Player.IsDead($player)
    Player.HasBeenArrested($player)
  then
    // fail
  end

  // Wanted level check
  $wanted = 0
  Player.GetWantedLevel($player, $wanted)
  if $wanted >= 2
  then
    Text.PrintString("Too hot. Job's blown.", 2500)
    // fail
  end

  // Car damage check (only if player is in a car)
  if Player.IsInAnyCar($player)
  then
    Player.StoreCarIsIn($player, $missionCar)
    $carHealth = 0
    Car.GetHealth($missionCar, $carHealth)
    if $carHealth < 250
    then
      Text.PrintString("Package is toast.", 2500)
      // fail
    end
  end

  // Time limit: 120 seconds = 120000 ms
  if Timer.IsGreaterThan($startTime, 120000)
  then
    Text.PrintString("Took too long.", 2500)
    // fail
  end

  // Win
  if $delivered == true
  then
    // success branch
    break
  end
end
```

> **Note on timer**: GTA3 CLEO doesn't have a `Timer` class; use the
> `get_game_timer` opcode (`0171`) into a local int and diff against start.
> Alternatively use a frame counter. Confirm the correct opcode before coding.

### Step 6 — Success sequence

```sanny
Audio.PlayMissionPassedTune(1)
register_mission_passed 'NooM_1'
Text.PrintString("Here's your cut. There may be more work soon. I'll be in touch.", 4000)
wait 4250
Player.AddScore($player, REWARD)
Text.PrintWithNumberBig('M_PASS', REWARD, 5000, TextStyle.Middle)
wait 5500

Camera.DoFade(750, Fade.Out)
wait 800
Camera.RestoreJumpcut()
Camera.DoFade(750, Fade.In)
wait 1000
```

### Step 7 — Teardown

```sanny
Mission.Finish()
$onMission = false
$missionIndex = $missionIndex + 1

05DC: terminate_custom_thread

{$INCLUDE ../utils/missions.txt}
```

---

## Failure Helper

Extract failure handling into an inline block (or a `failMission()` function
once util support is confirmed):

```sanny
Text.PrintBig('M_FAIL', 3500, TextStyle.Middle)
wait 3000
Mission.Fail()
break
```

---

## Locations to Scout / Confirm

| Purpose | Candidate Coord | Notes |
|---|---|---|
| Payphone | `(1168.33, -414.141, 22.8)` | Specified in act-one.md |
| Package pickup | `(1340.0, -695.0, 14.0)` | Portland docks alley; verify in-engine |
| Delivery zone | `(880.0, -880.0, 14.0)` | South Portland industrial; verify |

---

## Checklist (mirrors act-one.md)

- [ ] Opening dialogue + title card
- [ ] Payphone ring sound at correct coord
- [ ] Package pickup waypoint + blip
- [ ] Package object spawned and collected via `Pickup`
- [ ] Delivery zone detection
- [ ] Wanted-level fail condition (≥ 2 stars)
- [ ] Car-damage fail condition
- [ ] Timer fail condition (120 s)
- [ ] Wasted/busted fail conditions
- [ ] Success dialogue + mission-passed sequence
- [ ] Reward $800 applied
- [ ] `$missionIndex` incremented, thread terminated
- [ ] `data/strings.txt` entry `NooM_1` added
- [ ] Tested: delivery possible without triggering fail conditions
- [ ] Tested: each fail condition triggers correctly
