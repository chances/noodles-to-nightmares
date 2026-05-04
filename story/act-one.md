# Act One: The Setup

Rosa's introduction to Liberty City's criminal underworld. She transitions from
minimum-wage work to street-level crime, discovering both survival instinct and
unexpected aptitude for navigating the mob.

---

## Story Arc

### Thesis

Rosa is broke, exhausted, and invisible. She works the closing shift at Punk
Noodles shop in Portland's Chinatown for pocket change. When an opportunity
presents itself, one that's dangerous but pays, she takes it. Her survival
depends on becoming someone harder, faster, and more ruthless.

### Emotional Journey

1. **Mundane desperation** (M0) → "I just need to get home"
2. **Temptation and complicity** (M1) → "This is just one job, right?"
3. **Crossing the line** (M2) → "I'm in too deep now. Might as well own it"

### Portland Setting

Portland is Rosa's turf, the neighborhoods she knows and the streets she's
walked a hundred times on shift breaks. The island should feel _familiar_ but
increasingly dangerous as her choices attract attention.

---

## Mission 0: The Carpool Shortcut (Done)

**Script File**: `missions/0_tutorial.txt`

### Setup

- **Location**: Punk Noodles (Chinatown, Portland)
- **Context**: End of shift. It's late, Rosa's tired, and she needs to get home
  to her apartment in north Portland (~~(1188, -408, 24)~~).
- **Trigger**: Leaving the shop at night; player spawns out front

### Gameplay Objectives

1. **Steal a car** – Demonstrate vehicle entry and hotwiring
2. **Drive to safehouse** – Navigate to Rosa's apartment (marked on map)
3. **Park the car** – Learn that safehouses store vehicles
4. **Enter safehouse** – Transition to interior; mission completion

### Script Requirements

- [x] Spawn Rosa outside Punk Noodles at night
- [x] Marker/blip for safehouse location
- [x] HUD prompts for "find a car," "drive to safehouse," etc.
- [x] Vehicle entry detection and player positioning
- [x] Safehouse zone detection (sphere or coordinate check)
- [ ] Vehicle garage mechanic, i.e. car parked = car stored
- [x] Mission passed sequence and reward: $250; Rosa's paycheck

### Story Text

- **Opening**: "How'd you get here?" (confused, tired)
- **Car hint**: "Steal something that runs. I don't care if it's a taxi or a
  junker."
- **Safehouse intro**: "That's home. Not much, but it's mine. Park it outside
  and you can pick it up anytime."
- **Completion**: "Good work. Now get some sleep—tomorrow's another day."

### Dialogue & NPCs

Internal monologue: exhausted, matter-of-fact.

### Win/Fail Conditions

- **Win**: Rosa walks or drives to safehouse
- **Fail**: Rosa gets wasted or busted: mission restarts

### Mechanical Teaching Points

- Basic driving
- Safehouse concept (save games, vehicle storage)
- Map navigation

---

## Mission 1: Easy Money (In Progress)

**Script File**: `missions/1_shady_job.txt`

### Setup

- **Location**: Punk Noodles (interior) → Chinatown street delivery route
- **Context**: A few days after mission 0, Rosa returns to work. A mysterious
  "contact" approaches with a job: move some contraband from point A to point B.
  It pays $800, more than a week's tips.
- **Trigger**: Entering the Punk Noodles interior

### Gameplay Objectives

1. **Accept the job** – Dialogue choice (optional stealth foreshadowing)
2. **Retrieve contraband package** – Go to waypoint (alley, docks, or warehouse)
3. **Transport package to destination** – Avoid police & gang attention
4. **Deliver without damage** – Stealth-focused delivery (no combat)
5. **Return to contact** – Confirm successful job

### Story Context

Rosa learns that "simple jobs" often come with complications. The contraband
attracts police attention. Rival gangs know the delivery route. She has to drive
carefully, avoid high-speed chases, and think tactically about her route.

### Script Requirements

- [ ] Interior dialogue at Punk Noodles (accept job cutscene)
- [ ] Waypoint marker for package pickup location outside her apartment
- [ ] Ring the pay-phone (1168.33, -414.141, 22.8)
  `Sound.AddOneOffSound(1168.33, -414.141, 22.8, ScriptSound.SoundPayphoneRinging)`
- [ ] Package object creation (e.g. briefcase, duffel bag, etc.)
- [ ] Police wanted level tracking (avoid 2-star wanted)
- [ ] Destination zone detection
- [ ] Dialogue triggers for "danger near delivery point"
- [ ] Failure states:
  - Busted or wasted,
  - Package damaged (i.e. car takes too much damage), or
  - Wanted level too high

### Story Text

- **Contact intro**: "I hear you're meek like a mouse. I need someone discreet.
  It pays "
- **Job briefing**: "Wait for our call. Pick up a package and deliver it.
  Simple. And keep a low profile. We don't want the cops sniffin' around."
- **The Call**: "Pick up the package at the docks, deliver it to the warehouse
  on the south side. You don't have much time. Don't fuck this up."
- **In-vehicle**: Minimal intervention from contact
- **Success**: "Here's your cut. There may be more work soon. I'll be in touch."

### Dialogue & NPCs

- **Contact (mysterious, professional)** – Broker of the job; never fully
  revealed in Act One
- **Rosa** – Growing confidence; beginning to rationalize the crime
- **Possible**: Radio chatter, police dispatch (atmospheric)

### Win/Fail Conditions

- **Win**: Deliver the package without triggering failure conditions
- **Fail**:
  - Busted (mission restart)
  - Wasted (mission restart)
  - Time limit exceeded: 2 hours, i.e. two minutes in real life
  - Wanted level exceeds 1 star
  - Package damaged beyond threshold, i.e. car damage threshold **not** exceeded

### Mechanical Teaching Points

- Wanted level mechanic, police don't come after with a bribe
- Stealth driving and avoiding attention
- Multi-stage mission structure
- Route planning on map

### Map Considerations

- **Pickup**: Quiet alley, low civilian density
- **Delivery**: Industrial zone far from police stations
- **Route**: 1–2 minutes of driving, ideally routes through varied terrain

---

## Mission 2: Breaking In

**Script File**: `missions/2_proving_herself.txt` (To be created)

### Setup

- **Location**: Portland street intersection / gang territory
- **Context**: Two weeks later. Rosa's made a few successful deliveries. Now the
  contact wants her to prove she's serious—and that she can handle pressure. A
  minor gang is encroaching on the contact's territory. Rosa is tasked with
  confronting them and "persuading" them to back off. It's her first violent
  encounter; she's armed but hasn't used the gun in anger before.
- **Trigger**: Briefing at a neutral safehouse or street corner

### Gameplay Objectives

1. **Get a weapon** – Visit an Ammu-Nation or receive one from contact
2. **Drive to gang meeting point** – Marked location in Portland
3. **Confront gang members** – Dialogue standoff + intimidation
4. **Combat encounter** – Light firefight (3–5 gang members, not overwhelming)
5. **Escape/survive** – Chase sequence or retreat to safehouse
6. **Report back** – Confirm success to contact

### Story Context

This is Rosa's metamorphosis moment. She's no longer just moving packages; she's
using violence. The job tests her nerve and establishes her as someone who can
handle herself in conflict. It also signals to the criminal underworld that
she's not just a delivery driver.

### Script Requirements

- [ ] Weapon acquisition, provided or purchased
- [ ] Ring the pay-phone (1168.33, -414.141, 22.8)
  `Sound.AddOneOffSound(1168.33, -414.141, 22.8, ScriptSound.SoundPayphoneRinging)`
- [ ] Gang meeting point waypoint
- [ ] Dialogue system for gang confrontation, rising tension
- [ ] Combat trigger: when player draws weapon or dialogue fails
- [ ] Enemy spawning and AI behavior
- [ ] Health & armor tracking
- [ ] Chase/retreat logic (police response optional)
- [ ] Safehouse return waypoint
- [ ] Mission passed with $1,200 reward

### Story Text

- **Contact briefing**: "There's a crew moving in on my territory. They don't
  know who you are. That's an advantage. Go tell them to leave—one way or
  another."
- **Gang dialogue (confrontation)**:
  - Gang leader: "Who the hell are you?"
  - Rosa: "Someone who just told you to leave."
  - Gang leader: "You don't know what you're starting..."
  - (Combat trigger)
- **In-combat**: (Minimal dialogue; gunfire, shouting, sirens)
- **Success**: "Good. Word spreads fast on the street. You handled yourself
  well. You're ready for bigger things."

### Dialogue & NPCs

- **Contact** – Now treating Rosa with respect; suggesting her next career move
- **Gang Leader** – Hostile, dismissive; doesn't take Rosa seriously until
  bullets fly
- **Gang Members** – Hostile NPCs (3–5 total)
- **Rosa** – Grim determination; no longer hesitating

### Win/Fail Conditions

- **Win**: Eliminate or successfully chase off all gang members; return to
  contact alive
- **Fail**:
  - Rosa is wasted
  - Rosa is busted (5-star wanted; mission fails if apprehended)
  - Time limit exceeded (optional: if scripted as time-limited confrontation)

### Mechanical Teaching Points

- Weapon acquisition and use
- Basic combat (aiming, cover, health management)
- Combat retreat (when to run vs. fight)
- Wanted level consequences
- Escape driving and evasion

### Map Considerations

- **Meeting point**: Neutral gang territory; industrial or warehouse district
- **Combat arena**: Open enough for movement; buildings for cover
- **Escape route**: Clear path to safehouse or hideout (2–3 minute drive)
- **Police presence**: Station far enough away that response is delayed but not
  absent

---

## Optional Side Missions: Portland

### Side Mission: Supply Run

**Script File**: `missions/side_shopping.txt` (To be created)

**Objective**: Rosa runs a simple errand: buy groceries for the Punk
Noodles owner, Lee Chong (character 87). It goes sideways when a street gang blocks the route or a
homeless NPC steals her money.

**Mechanics**:

- Light exploration and NPC dialogue
- Minor combat or stealth (stealing back cash)
- Shopping cart/package delivery mechanic

**Reward**: $150 + relationship boost with shop owner

**Teaching Points**: Shop interiors, NPC dialogue trees, inventory management

---

### Side Mission: The Squeeze

**Script File**: `missions/side_debt_collect.txt` (To be created)

**Objective**: A street-level loan shark hires Rosa to collect a debt from a
local business owner. Rosa intimidates and collects payment.

**Mechanics**:

- Dialogue-driven intimidation (player chooses threat level)
- Combat if intimidation fails
- Money pickup and return

**Reward**: $200

**Teaching Points**: Dialogue consequences, non-combat problem-solving, NPC
relationships

---

## Narrative Flow Between Missions

### M0 → M1 (3–5 days)

**Transition scene**: Rosa at the Punk Noodles, now a familiar routine. The
contact approaches casually, as if asking her to sweep the floor. Tension builds
as the job is described. Rosa accepts without dramatic deliberation—it's
survival.

**Environmental cues**: The shop grows slightly seedier; customers of
questionable origin; contact appears regularly. Portland feels less like home,
more like a trap closing.

### M1 → M2 (1–2 weeks)

**Montage (optional cutscene)**: Rosa on multiple delivery runs. Each successful
job builds confidence and attracts attention. Other criminals begin to recognize
her.

**Transition dialogue**: The contact mentions that a crew is "testing" the
territory, and needs Rosa to reinforce control. This is framed as an
opportunity, not a threat.

**Environmental change**: Police presence increases in Portland. Gang tags
appear on walls. The safehouse becomes less a sanctuary and more a hideout.

### M2 → Act 2 (after M2 success)

**Climax dialogue**: The contact reveals they work for a larger organization.
"You've proven yourself in Portland. Now we've got bigger plans—but not here.
There's work for you on Staunton Island. A real organization. Real money."

**Narrative beat**: Rosa is offered (not forced) a position. The player feels
agency, even though the path is constrained. She chooses to leave Portland for
bigger opportunities.

---

## Mission Completion Checklist

### Mission 0: Car Tutorial

- [ ] Script framework complete (0_tutorial.txt)
- [ ] Dialogue text finalized
- [x] Safehouse location confirmed (north Portland apartment, ~~(1188,
      -408, 24)~~)
- [ ] Vehicle spawn and entry mechanics
- [ ] Parking zone detection
- [ ] Mission passed sequence
- [ ] Testing: player can steal, drive, and park without bugs

### Mission 1: Easy Money

- [ ] Script created (1_shady_job.txt)
- [ ] Pickup and delivery locations scouted
- [ ] Contraband object/model selected
- [ ] Wanted level thresholds defined
- [ ] Police response timing configured
- [ ] Dialogue written and integrated
- [ ] Testing: delivery possible without excessive wanted level

### Mission 2: Breaking In

- [ ] Script created (2_proving_herself.txt)
- [ ] Gang territory location confirmed
- [ ] Combat arena designed (cover, spawning)
- [ ] Enemy AI configured
- [ ] Weapon system integrated
- [ ] Escape route planned
- [ ] Dialogue and tension beats finalized
- [ ] Testing: combat is challenging but fair; escape is possible

### Optional Missions

- [ ] Side missions scoped (Shopping Spree, Debt Collection)
- [ ] Scripts created or scheduled
- [ ] Integration points identified

---

## Design Notes & Open Questions

### Tone & Character Voice

- Rosa should feel like a _real_ person, not a action hero
- Dark humor acceptable (GTA3 style): "At least the pay's better than ramen"
- Avoid over-exposition; let player infer story through context

### Map & Environment

- Portland should feel lived-in but dangerous
- Consider day/night cycle impact on missions (M0 at night, M1-M2 at
  dusk/night?)
- Gang territories should be visually distinct (graffiti, patrols, atmosphere)

### Difficulty Balance

- M0: Tutorial-easy (can't fail much)
- M1: Moderate (stealth puzzle; wrong route = wanted level spike)
- M2: Challenging (first combat; combat arena with cover; can be tough)
- Optional missions: Easy-to-moderate (skill-building, exploration reward)

### Future Act Expansion

- M2 should _feel_ like a turning point; player should sense bigger things
  coming
- Act 2 reveal: Rosa's contact works for a larger syndicate; Staunton Island is
  their stronghold
- Portland becomes "where she started" rather than "where she operates"

---

## References

- **Sanny Builder Guidelines**: `AGENTS.md`
- **Mission Framework**: `missions/0_tutorial.txt`
- **GTA3 Limits**:
  [Sanny Builder Docs](https://docs.sannybuilder.com/scm-documentation)
