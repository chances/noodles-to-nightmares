# Mission State Machine

Mission scripts run as sequential `wait` code with ad hoc globals (`$onMission`, `$onCutscene`, `$skipCutscene`, `$missionIndex`) shared by main and each CLEO thread. This plan replaces them with an explicit finite state machine (FSM) per mission. Cross-thread channels, ownership and purity lints, and a CLEO plugin live in [cross-thread-state-and-clea-plugin.md](cross-thread-state-and-cleo-plugin.md).

## Findings

| Source | Fact | Use Here |
| --- | --- | --- |
| [Game Programming Patterns, State](https://gameprogrammingpatterns.com/state.html) | Boolean flags (`isJumping_`, `isDucking_`) multiply until branches break; an FSM has a fixed state set, one current state, events, and transitions | Replace the `$on*` flag set with one state variable per mission |
| Same | Hierarchical state machines share transitions between related states; pushdown automata keep a stack of states | A cutscene or fail screen is a pushed state that returns to the prior state |

## Scope

A finite state machine for `*.cm` mission scripts. Each mission owns its state machine: mission steps, transitions between them, and win and lose states.

| Topic | Decision |
| --- | --- |
| Authoring | A state table per mission; `build.ts` emits the `.txt` |
| Cutscenes | A beat table (text and duration pairs) stepped by one cutscene state with a timer |
| Cleanup | Per-state exit routine for blips and pickups, plus a mission-wide sweep for leftovers (Sal, van) |
| Table format | TypeScript module per mission, typed so a bad state name fails at build time |
| Body code | Declarative typed steps (`spawnPickup`, `showBlip`, `waitUntilNear`); the generator writes the Sanny |
| Local budget | The generator uses `state` and `beat` as locals; `TIMERA` times the current beat; each latch and each scratch read is one more local, all counted against the mission's 16 |
| Pilot mission | Mission 0, Tutorial |
| Fail handling | A mission-level `fail` list checked every tick before the current state; a state may add `failExtra` |
| Monitors | A mission-level `monitors` list of typed rules that run every tick in every state, with a once-only latch the generator manages |
| Escape hatch | A `raw` step holds Sanny text verbatim |
| Output location | Generated `missions/*.txt`, committed |
| Latch storage | One local per latch, counted against the mission's 16; the lint fails above 16. Bitfields are unavailable: opcode `0B10` is rejected by this install's CLEO ([bug report](../reports/bugs/bitwise-opcodes-unsupported.md)) |
| Transitions | `until` plus `next` as shorthand for a single exit; explicit `on: [{ when, goto }]` rules when a state branches |
| Drift guard | A `GENERATED` header, and the lint regenerates in memory and fails the build when the committed file differs |
| Vocabulary | Own friendly names (`playerNear`, `showHelp`); `raw` covers the rest |
| Vocabulary home | One module, `lib/fsm/vocabulary.ts` (workspace package `@noodles/fsm`), mapping each name to a Sanny emitter and typed args |
| Epilogue | A shared label routine in `utils/missions.txt` that generated code calls |
| Testing | Per-step unit tests, plus golden-file and compile checks on mission 0 and a small fixture |
| Mission 0 states | `INTRO`, `GO_HOME`, `ARRIVE`, `HOME_TUTORIAL`, `WIN`; dialog lines are beat tables |
| Lose | `LOSE` shows `M_FAIL`, clears every monitor latch, and resets to `GO_HOME` ("Find your way home") instead of falling through to the tutorial |
| Mission.Fail | `LOSE` does not call `Mission.Fail()` |
| Phasing | Phase 0: proof-of-concept port of mission 0. Later phases: port the rest, delete dead code, refine and refactor |

## Generated Shape

```sanny
const STATE_CUTSCENE = 0
const STATE_GO_TO_PAYPHONE = 1
const STATE_CARRY_PACKAGE = 2
const STATE_DONE = 3

int state = STATE_CUTSCENE
int stateEnteredAt = 0

while true
  wait 0
  switch state
    case STATE_CUTSCENE
      // run, then enterState(STATE_GO_TO_PAYPHONE)
  end
end
```

Constraints from the Sanny skill: locals need `{$CLEO}` and cap at 16 per script, a `function` cannot see script locals (so `enterState` is a label subroutine), and `switch` has no fall-through.

## Open Items

- The generator's `LOSE` consumes neither `Mission.Fail()` nor an outcome; revisit when a mission needs a terminal failure.
- Search for era scripting languages (Quake C, UnrealScript states) as design references; the first search returned nothing.
