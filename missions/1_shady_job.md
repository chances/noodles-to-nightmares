---
mission: 1
title: Easy Money
act: One
script_file: 1_shady_job.txt
status: In progress
location: Punk Noodles (interior), then a Chinatown street delivery route
trigger: Entering the Punk Noodles interior
reward: $800, more than a week's tips
context: |-
  A few days after mission 0, Rosa returns to work. A mysterious "Handler" (Salvatore Leone) approaches with a job: move some contraband from point A to point B.

  Rosa learns that "simple jobs" often come with complications. The contraband attracts police attention. Rival gangs know the delivery route. She has to drive carefully, avoid high-speed chases, and think tactically about her route.
objectives:
  - "Accept the job: Dialogue choice (optional stealth foreshadowing)"
  - "Retrieve contraband package: Go to the waypoint (alley, docks, or warehouse)"
  - "Transport package to destination: Avoid police and gang attention"
  - "Deliver without damage: Stealth-focused delivery (no combat)"
  - "Return to Handler: Confirm the successful job"
dialogue_and_npcs:
  - "Contact (mysterious, professional): Broker of the job; never fully revealed in Act One"
  - "Rosa: Growing confidence; beginning to rationalize the crime"
  - "Possible: Radio chatter, police dispatch (atmospheric)"
win: Deliver the package without triggering failure conditions
fail:
  - Busted (mission restart)
  - Wasted (mission restart)
  - "Time limit exceeded: 2 hours, i.e. two minutes in real life"
  - Wanted level exceeds 1 star
  - "Package damaged beyond threshold, i.e. car damage threshold not exceeded"
teaching_points:
  - Wanted level mechanic, police don't come after with a bribe
  - Stealth driving and avoiding attention
  - Multi-stage mission structure
  - Route planning on the map
map_considerations:
  pickup: Quiet alley, low civilian density
  delivery: Industrial zone far from police stations
  route: 1 to 2 minutes of driving, ideally through varied terrain
---

# Mission 1: Easy Money

Story script for [`1_shady_job.txt`](1_shady_job.txt). Part of [Act One: The Setup](../story/act-one.md).

## Script Requirements

- [x] Interior dialogue at Punk Noodles (accept job cutscene)
- [x] Waypoint marker for package pickup location outside her apartment
- [x] Ring the pay-phone (1168.33, -414.141, 22.8)
      `Sound.AddOneOffSound(1168.33, -414.141, 22.8, ScriptSound.SoundPayphoneRinging)`
- [x] Package object creation (e.g. briefcase, duffel bag, etc.)
- [ ] Police wanted level tracking (avoid 2-star wanted)
- [x] Destination zone detection
- [ ] Dialogue triggers for "danger near delivery point"
- [ ] Failure states:
  - Busted or wasted,
  - Package damaged (i.e. car takes too much damage), or
  - Wanted level too high

## Completion Checklist

- [x] Script created (`1_shady_job.txt`)
- [x] Pickup and delivery locations scouted
- [x] Contraband object or model selected
- [ ] Wanted level thresholds defined
- [ ] Police response timing configured
- [x] Dialogue written and integrated
- [ ] Testing: delivery possible without excessive wanted level

## Script

**INT. PUNK NOODLES, CHINATOWN, PORTLAND - NIGHT**

A few days after the carpool shortcut, the shop is a familiar routine. SALVATORE LEONE, the Handler, approaches Rosa as casually as if he were asking her to sweep the floor.

**SALVATORE**
I hear you're meek like a mouse. I need someone discreet. It pays ...

**[GAMEPLAY]** The player accepts the job. The dialogue choice can foreshadow stealth.

**SALVATORE**
Wait for our call. Pick up a package and deliver it. Simple. And keep a low profile. We don't want the cops sniffin' around.

**EXT. PAYPHONE, CHINATOWN STREET - NIGHT**

The pay-phone rings (`1168.33, -414.141, 22.8`). Rosa answers.

**SALVATORE** (on the phone)
Pick up the package at the docks, deliver it to the warehouse on the south side. You don't have much time. Don't fuck this up.

**[GAMEPLAY]** A waypoint marks the package pickup, a quiet alley with low civilian density. Rosa collects the package.

**EXT. PORTLAND STREETS - NIGHT**

**[GAMEPLAY]** Transport the package to the delivery zone, an industrial area far from police stations. The route takes 1 to 2 minutes of driving. Avoid police and gang attention; no combat. The Handler stays out of the way in the vehicle.

**EXT. DELIVERY POINT, SOUTH SIDE - NIGHT**

Rosa arrives. The package is intact.

**SALVATORE** (V.O.)
Here's your cut. There may be more work soon. I'll be in touch.

**[MISSION PASSED]** $800.

**[MISSION FAILED]** Busted or wasted restarts the mission. The mission also fails if the time limit passes, the wanted level exceeds 1 star, or the package takes too much damage.
