---
mission: 0
title: The Carpool Shortcut
act: One
script_file: 0_tutorial.txt
status: Done
location: Punk Noodles (Chinatown, Portland)
trigger: Leaving the shop at night; the player spawns out front
reward: $250, Rosa's paycheck
context: >-
  End of shift. It is late, Rosa is tired, and she needs to get home to her
  apartment in north Portland (~~(1188, -408, 24)~~).
objectives:
  - "Steal a car: Demonstrate vehicle entry and hot-wiring"
  - "Drive to safehouse: Navigate to Rosa's apartment (marked on the map)"
  - "Park the car: Learn that safe-houses store vehicles"
  - "Enter safehouse: Transition to the interior; mission completion"
dialogue_and_npcs:
  - "Internal monologue: exhausted, matter-of-fact"
win: Rosa walks or drives to the safehouse (her apartment)
fail:
  - Rosa is wasted or busted; the mission restarts
teaching_points:
  - Basic driving
  - Safehouse concept (save games, vehicle storage)
  - Map navigation
---

# Mission 0: The Carpool Shortcut

Story script for [`0_tutorial.txt`](0_tutorial.txt). Part of [Act One: The Setup](../story/act-one.md).

## Script Requirements

- [x] Spawn Rosa outside Punk Noodles at night
- [x] Marker or blip for the safehouse location
- [x] HUD prompts for "find a car," "drive to safehouse," and similar
- [x] Vehicle entry detection and player positioning
- [x] Safehouse zone detection (sphere or coordinate check)
- [ ] Vehicle garage mechanic, i.e. car parked means car stored
- [x] Mission passed sequence and reward: $250; Rosa's paycheck

## Completion Checklist

- [x] Script framework complete (`0_tutorial.txt`)
- [x] Dialogue text finalized
- [x] Safehouse location confirmed (north Portland apartment, ~~(1188, -408, 24)~~)
- [ ] Vehicle spawn and entry mechanics
- [ ] Parking zone detection
- [ ] Mission passed sequence
- [ ] Testing: player can steal, drive, and park without bugs

## Script

Internal monologue throughout: exhausted, matter-of-fact.

**EXT. PUNK NOODLES, CHINATOWN, PORTLAND - NIGHT**

The shop sign buzzes over an empty street. ROSA steps out the front door, the last one to leave. The player takes control.

**ROSA** (V.O., confused, tired)
How'd you get here?

**[GAMEPLAY]** The player has no car. A HUD prompt asks Rosa to find one.

**ROSA** (V.O.)
Steal something that runs. I don't care if it's a taxi or a junker.

**[GAMEPLAY]** Vehicle entry and hot-wiring. The map blip marks the safehouse; the HUD prompts the drive home.

**EXT. NORTH PORTLAND, ROSA'S APARTMENT - NIGHT**

Rosa arrives on foot or by car. A safehouse marker waits at the door.

**ROSA** (V.O.)
That's home. Not much, but it's mine. Park it outside and you can pick it up anytime.

**[GAMEPLAY]** Park the car at the safehouse (car parked means car stored). Rosa walks to the door; the interior transition ends the mission.

**ROSA** (V.O.)
Good work. Now get some sleep, tomorrow's another day.

**[MISSION PASSED]** $250.

**[MISSION FAILED]** If Rosa is wasted or busted, the mission restarts.
