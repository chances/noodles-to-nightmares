# Story: Noodles to Nightmares

## Premise

### Rosa Chang

A23-year-old mixed woman of color working minimum wage at a ramen shop in
Portland's Chinatown, is thrust into the world of organized crime. She is of
Chinese and Spanish descent, but speaks very little Chinese. Her sense of self
is reflected in the Portuguese/Spanish communities of Liberty City.

Her journey culminates in, either, her death _or_ becoming the boss of Liberty
City's entire mob scene.

### Tone

Survival-driven with dark humor and irreverence, aligning with base-game
sensibilities.

---

## Core Mission Structure

**MVP: 9 core missions** across three acts (linear progression)

**Plus**: 2–3 independent/optional missions per island (side activities,
tutorials, encounters)

### Emphasis

1. Driving mechanics
2. Stealth gameplay
3. Investigation/reconnaissance
4. Empire-building (faction/territory control)
5. Combat, i.e. the lowest priority, but sometimes necceasry to protect life and
   limb

---

## [Act 1: The Setup](./story/act-one.md)

### Mission 0: Car Tutorial

- **Location**: Ramen shop in Portland's Chinatown (Spawns out front)
- **Objective**: Rosa learns to drive home after a long shift, and how to park a
  car and what a safehouse is.
- **Current State**: Framework exists in `0_tutorial.txt`. Rosa's first
  safehouse is her apartment in north Portland.
- **Status**: To be completed

### Mission 1: The Shady Job

- **Location**: Portland / Chinatown
- **Objective**: Rosa accepts a "simple" job from a mysterious contact at the
  ramen shop; discovers it involves moving contraband
- **Key Mechanic**: Stealth delivery (avoid police/gangs during transport)
- **Outcome**: Sets Rosa on the path to organized crime

### Mission 2: Proving Herself

- **Location**: Portland
- **Objective**: Rosa completes a job that tests her loyalty; possibly involves
  confronting a rival gang or earning respect from a crime boss
- **Key Mechanic**: Driving + combat encounter
- **Outcome**: Earns Rosa a seat at the table; transition to Staunton Island

---

## Act 2: The Rise

### Mission 3: Reconnaissance

- **Location**: Staunton Island
- **Objective**: Rosa investigates a rival faction's operations; teaches
  stealth/observation; gather intel on the faction's motives for roping her into
  organized crime
- **Key Mechanic**: Investigation, stealth reconnaissance
- **Outcome**: Identifies opportunity for expansion

### Tutorial: "You've never handled a gun?!"

- **Location**: Ammunation, Staunton Island
- **Objective**: The mob has guns; Her mentor reccomended this (but it's not
  _required_); Learn how to aim and fire a pistol in the shooting range
- **Key Mechanic**: Combat
- **Outcome**: She can shoot to kill if necceary

### Mission 4: The Heist (Part 1)

- **Location**: Staunton Island
- **Objective**: Rosa executes a heist on a mob-controlled warehouse or business
  (coordinated driving & _light_ combat)
- **Key Mechanic**: Multi-stage heist (getaway driving critical)
- **Outcome**: Major score; establishes Rosa as a serious player

### Mission 5: Consolidation Battle

- **Location**: Staunton Island
- **Objective**: Direct conflict with a gang trying to muscle in on territory
  Rosa's claimed
- **Key Mechanic**: Gang warfare, driving, tactical positioning
- **Outcome**: Secures Staunton Island control; unlocks Shoreside Vale

---

## Act 3: The Takeover

### Mission 6: The Northern Front

- **Location**: Shoreside Vale
- **Objective**: Rosa establishes a foothold; confronts the dominant power in
  the north
- **Key Mechanic**: Stealth + negotiation-adjacent mission (intimidation through
  force)
- **Outcome**: Rosa gains control of north sector

### Mission 7: The Heist (Part 2) – The Crown Jewel

- **Location**: Shoreside Vale (high-value target: bank, drug deal, or mob
  vault)
- **Objective**: Rosa executes the largest heist yet; signals her dominance
- **Key Mechanic**: Complex heist with multiple phases (driving, stealth,
  escape)
- **Outcome**: Massive wealth and power consolidation

### Mission 8: The Final Battle

- **Location**: Shoreside Vale / Liberty City (climax)
- **Objective**: Rosa faces off against remaining rivals; cement her position as
  Liberty City's mob boss
- **Key Mechanic**: Large-scale gang warfare + driving
- **Outcome**: Victory; Rosa becomes the undisputed boss; ending
  cutscene/epilogue

---

## Independent/Optional Missions (2–3 per island)

These are **not** part of the main story arc but provide:

- Extra tutorial mechanics (e.g., "Let's Go Shopping" tutorial)
- Immersion and side encounters
- Skill-building opportunities

### Portland

- **Shopping Tutorial**: Mundane errand that goes wrong (hobo encounter, theft,
  etc.)
- **TBD**: Street-level introduction to a faction or NPC

### Staunton Island

- **TBD**: Favor mission or side conflict
- **TBD**: Faction-specific encounter

### Shoreside Vale

- **TBD**: Final-act side opportunity
- **TBD**: Endgame faction interaction

---

## Future Expansion: Branching Narratives

Once MVP is complete, add:

- Mission choice branches (e.g., ally with Faction A or B)
- Multiple ending paths based on player decisions
- Deeper NPC relationship tracking
- Dynamic territory control (consequences for choices)

---

## Implementation Notes

- **Assets**: Existing GTA3 map, characters, vehicles
- **Future**: Replace protagonist character skin/model
- **Script Limits**: 9 core missions well within GTA3's 120-mission limit
- **Development**: Missions follow Sanny Builder paradigms, per AGENTS.md

---

## Next Steps

1. [ ] Complete Mission 0 (tutorial framework)
2. [ ] Design Mission 1 dialogue, locations, and objectives
3. [ ] Create mission script templates for each act
4. [ ] Define independent missions to fill out each island
5. [ ] Plan branching narrative structure for future iterations
