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

### Setting

Portland is Rosa's turf, the neighborhoods she knows and the streets she's
walked a hundred times on shift breaks. The island should feel _familiar_ but
increasingly dangerous as her choices attract attention.

---

## Missions

Each mission has a story script beside its code in [`missions/`](../missions/):
YAML front matter (setup, objectives, win and fail conditions), the GFM
requirement and completion checklists, and a screenplay of the scenes.

### Mission 0: The Carpool Shortcut (Done)

End of shift: Rosa steals a car, drives home, and learns what a safehouse is.
Script: [`0_tutorial.md`](../missions/0_tutorial.md). Code:
[`0_tutorial.txt`](../missions/0_tutorial.txt).

### Mission 1: Easy Money (In Progress)

Salvatore Leone, the Handler, offers Rosa $800 to move contraband from point A
to point B. Script: [`1_shady_job.md`](../missions/1_shady_job.md). Code:
[`1_shady_job.txt`](../missions/1_shady_job.txt).

### Mission 2: Breaking In

Two weeks later, the Handler sends Rosa to persuade a rival gang to back off.
Her first violent encounter. Script:
[`2_proving_herself.md`](../missions/2_proving_herself.md). Code:
[`2_proving_herself.txt`](../missions/2_proving_herself.txt) (to be created).

---

## Optional Side Missions: Portland

### Side Mission: Supply Run

A grocery errand for Lee Chong goes sideways. Script:
[`side_supply_run.md`](../missions/side_supply_run.md). Code:
[`side_supply_run.txt`](../missions/side_supply_run.txt) (stub).

### Side Mission: The Squeeze

A loan shark hires Rosa to collect a debt. Script:
[`side_debt_collect.md`](../missions/side_debt_collect.md). Code:
[`side_debt_collect.txt`](../missions/side_debt_collect.txt) (stub).

---

### Dramatic Turn: The Betrayal

After the success of Mission 2, Salvatore invites Rosa to a private meeting at
an industrial warehouse. During the meeting, it becomes clear that Salvatore
intends to use Rosa as a fall-person for an upcoming mob hit, effectively
eliminating her as a loose end. Rosa narrowly survives a setup attempt (A
calculated execution order carried out by his own crew) leaving her wounded and
realizing that Portland is no longer safe. She must escape to Staunton Island,
where she has heard rumors of another organization willing to take in someone
with her particular "talents."

---

## Narrative Flow Between Missions

### M0 → M1 (3–5 Days)

**Transition scene**: Rosa at the Punk Noodles, now a familiar routine. The
Handler approaches casually, as if asking her to sweep the floor. Tension builds
as the job is described. Rosa accepts without dramatic deliberation—it's
survival.

**Environmental cues**: The shop grows slightly seedier; customers of
questionable origin; Handler appears regularly. Portland feels less like home,
more like a trap closing.

### M1 → M2 (1–2 Weeks)

**Montage (optional cutscene)**: Rosa on multiple delivery runs. Each successful
job builds confidence and attracts attention. Other criminals begin to recognize
her.

**Transition dialogue**: The Handler mentions that a crew is "testing" the
territory, and needs Rosa to reinforce control. This is framed as an
opportunity, not a threat.

**Environmental change**: Police presence increases in Portland. Gang tags
appear on walls. The safehouse becomes less a sanctuary and more a hideout.

### M2 → Act 2 (After M2 Success)

**Climax dialogue**: The Handler reveals they work for a larger organization.
"You've proven yourself in Portland. Now we've got bigger plans—but not here.
There's work for you on Staunton Island. A real organization. Real money."

**Narrative beat**: Rosa is offered (not forced) a position. The player feels
agency, even though the path is constrained. She chooses to leave Portland for
bigger opportunities.

---

## Optional Missions Checklist

Per-mission checklists live in each mission's script under
[`missions/`](../missions/).

- [x] Side missions scoped (Shopping Spree, Debt Collection)
- [x] Scripts created or scheduled
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
- Act 2 reveal: Rosa's Handler works for a larger syndicate; Staunton Island is
  their stronghold
- Portland becomes "where she started" rather than "where she operates"

---

## References

- **Sanny Builder Guidelines**: `AGENTS.md`
- **Mission Scripts**: [`missions/`](../missions/) (story scripts as `.md`
  beside each mission's `.txt`)
- **Mission Framework**: [`missions/0_tutorial.txt`](../missions/0_tutorial.txt)
- **GTA3 Limits**:
  [Sanny Builder Docs](https://docs.sannybuilder.com/scm-documentation)
