---
mission: 2
title: Breaking In
act: One
script_file: 2_proving_herself.txt
status: To be created
location: Portland street intersection and gang territory
trigger: Briefing at a neutral safehouse or street corner
reward: $1,200
context: |-
  Two weeks later. Rosa has made a few successful deliveries. Now the Handler wants her to prove she's serious and that she can handle pressure. A minor gang is encroaching on the Handler's territory. Rosa is tasked with confronting them and "persuading" them to back off. It's her first violent encounter; she's armed but hasn't used the gun in anger before.

  This is Rosa's metamorphosis moment. She's no longer just moving packages; she's using violence. The job tests her nerve and establishes her as someone who can handle herself in conflict. It also signals to the criminal underworld that she's not just a delivery driver.
objectives:
  - "Get a weapon: Visit an Ammu-Nation or receive one from the Handler"
  - "Drive to gang meeting point: Marked location in Portland"
  - "Confront gang members: Dialogue standoff and intimidation"
  - "Combat encounter: Light firefight (3 to 5 gang members, not overwhelming)"
  - "Escape or survive: Chase sequence or retreat to the safehouse"
  - "Report back: Confirm success to the Handler"
dialogue_and_npcs:
  - "Contact: Now treating Rosa with respect; suggesting her next career move"
  - "Gang Leader: Hostile, dismissive; doesn't take Rosa seriously until bullets fly"
  - "Gang Members: Hostile NPCs (3 to 5 total)"
  - "Rosa: Grim determination; no longer hesitating"
win: Eliminate or successfully chase off all gang members; return to the Handler alive
fail:
  - Rosa is wasted
  - Rosa is busted (5-star wanted; mission fails if apprehended)
  - "Time limit exceeded (optional: if scripted as a time-limited confrontation)"
teaching_points:
  - Weapon acquisition and use
  - Basic combat (aiming, cover, health management)
  - Combat retreat (when to run versus fight)
  - Wanted level consequences
  - Escape driving and evasion
map_considerations:
  meeting_point: Neutral gang territory; industrial or warehouse district
  combat_arena: Open enough for movement; buildings for cover
  escape_route: Clear path to a safehouse or hideout (2 to 3 minute drive)
  police_presence: Station far enough away that response is delayed but not absent
---

# Mission 2: Breaking In

Story script for [`2_proving_herself.txt`](2_proving_herself.txt). Part of [Act One: The Setup](../story/act-one.md).

## Script Requirements

- [ ] Weapon acquisition, provided or purchased
- [ ] Ring the pay-phone (1168.33, -414.141, 22.8)
      `Sound.AddOneOffSound(1168.33, -414.141, 22.8, ScriptSound.SoundPayphoneRinging)`
- [ ] Gang meeting point waypoint
- [ ] Dialogue system for gang confrontation, rising tension
- [ ] Combat trigger: when the player draws a weapon or dialogue fails
- [ ] Enemy spawning and AI behavior
- [ ] Health and armor tracking
- [ ] Chase or retreat logic (police response optional)
- [ ] Safehouse return waypoint
- [ ] Mission passed with $1,200 reward

## Completion Checklist

- [x] Script created (`2_proving_herself.txt`)
- [ ] Gang territory location confirmed
- [ ] Combat arena designed (cover, spawning)
- [ ] Enemy AI configured
- [ ] Weapon system integrated
- [ ] Escape route planned
- [ ] Dialogue and tension beats finalized
- [ ] Testing: combat is challenging but fair; escape is possible

## Script

**EXT. NEUTRAL SAFEHOUSE OR STREET CORNER, PORTLAND - DUSK**

Two weeks have passed. Rosa has made a few deliveries, and other criminals have started to recognize her. The Handler waits, treating her with new respect.

**HANDLER**
There's a crew moving in on my territory. They don't know who you are. That's an advantage. Go tell them to leave, one way or another.

**[GAMEPLAY]** Rosa gets a weapon, provided by the Handler or bought at an Ammu-Nation. The pay-phone rings. A waypoint marks the gang meeting point.

**EXT. GANG MEETING POINT, INDUSTRIAL DISTRICT - NIGHT**

Neutral gang territory. Warehouses give cover and room to move. The GANG LEADER and his crew (3 to 5 members) wait. Tension rises.

**GANG LEADER**
Who the hell are you?

**ROSA**
Someone who just told you to leave.

**GANG LEADER**
You don't know what you're starting...

**[GAMEPLAY]** Combat triggers when the player draws a weapon or the dialogue fails.

**EXT. GANG MEETING POINT - CONTINUOUS**

A light firefight. Minimal dialogue; gunfire, shouting, and sirens. The police station is far enough away that the response is delayed but not absent.

**[GAMEPLAY]** Eliminate or chase off every gang member, then escape by driving a clear 2 to 3 minute route to the safehouse or hideout.

**EXT. SAFEHOUSE - NIGHT**

Rosa reports back to the Handler.

**HANDLER**
Good. Word spreads fast on the street. You handled yourself well. You're ready for bigger things.

**[MISSION PASSED]** $1,200.

**[MISSION FAILED]** If Rosa is wasted or busted, the mission fails.
