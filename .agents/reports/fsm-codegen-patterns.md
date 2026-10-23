# FSM Codegen: Subroutine per State

Goal: cut the branching in the Sanny that `lib/fsm/generate.ts` emits, mainly for per-tick cost, also for readability.

## Where the Branches Come From

Counted from `missions/1_shady_job.txt` (10 states, 400+ lines) and `generate.ts`.

| Source | Cost per tick | Why |
| --- | --- | --- |
| State dispatch | 10 compares | Every state block is `if state == X`; no `else`, so all run every tick |
| Beat ladder | 1 compare per beat (up to 6) | Each beat is a run block plus a wait block, both guarded by `beat ==` |
| Fail check | up to 4 state compares plus 3 conditions | `or` over the failable states, even in states that cannot fail |
| `enterState` / `exitState` | 10 compares per transition | The target is known at generate time, but the routine re-dispatches on `state` |
| `beat >= n` gate | 1 compare per state | Guards the exit route |

Worst case (DELIVER, late beat) is about 25 compares to reach one `Player.LocateAnyMeans3D`.

## Design

Each state is a label subroutine with its own tick loop. It loops until a transition holds, sets `state`, and `return`s. A thin dispatcher `gosub`s whichever state is current. The dispatch compare chain runs once per transition, not once per tick. Sources: the [State pattern](https://refactoring.guru/design-patterns/state) and Replace Conditional with Polymorphism on [refactoring.guru](https://refactoring.guru/replace-conditional-with-polymorphism).

```sanny
while true
  switch state
    case STATE_DELIVER   gosub @s_deliver
    case STATE_PAYOUT    gosub @s_payout
  end
end

:s_deliver
  // onEnter steps, then straight-line beats
  while true
    wait 0
    gosub @checkFail
    if failed == true then state = STATE_LOSE return end
    if Player.LocateAnyMeans3D(...) then state = STATE_PAYOUT return end
  end
```

| Effect | Result |
| --- | --- |
| State dispatch | 0 per tick, about 5 per transition |
| Beat ladder | gone; waits are plain `wait` or `while TIMERA < n` loops |
| Fail check | runs only inside failable states |
| `enterState` | gone; a state's `onEnter` steps open its own routine |
| `goto` | none; labels are subroutine entries |
| Plugin needed | no |

## Label Subroutines, Not `function`s

State routines read and write mission locals, and a `function` cannot see the script's locals (see `.agents/Memory.md`, CLEO Locals). Every routine the generator emits stays a `:label` ending in `return`.

## How Other Games Do It

| Pattern | Used for | Fit here |
| --- | --- | --- |
| State as function, returns the next state | Most hand-written game code | This design |
| Function-pointer or jump table | C and C++ engines | SCM has no computed jump |
| Coroutine per state or per actor | Unity, Lua scripts, mission scripts | Each state loop is a coroutine by `wait` |
| Hierarchical FSM, shared parent transitions | Animation graphs | `checkFail` and `runMonitors` are the shared parent |
| Behavior tree | NPC AI | Overkill for linear missions |

A CLEO plugin with an indexed jump opcode would make dispatch O(1). This design pays dispatch only per transition, so the plugin would save a few compares per state change.

## Open Questions

- A state's `onExit` steps live in a `leave<State>` routine that the state calls just before it sets `state` and returns.
- Implementation: [`lib/fsm/generate.ts`](../../lib/fsm/generate.ts).
- `monitors` (a rule that fires once, any state) need a `gosub @runMonitors` inside every tick loop.
- States entered from several places (LOSE back to INTRO) need nothing extra, since the dispatcher owns entry.
- Call depth is the state routine, then `checkFail`, `runMonitors`, or a `leave` routine: two `gosub` levels, since the dispatcher is the script body. [`tests/stack-probe.txt`](../../tests/stack-probe.txt) on `main.scm` entered seven nested `gosub`s and crashed the game on the eighth ([result](../../tests/results/stack-2026-10-23T01-04-54-520Z.md)). `CScript` in [`III.CLEO.h`](../../plugins/sockets/III.CLEO.h) holds six return addresses (`m_aGosubAddr[6]`), so the seventh overran into the next field and six is the safe depth. A `.cm` thread is untested; the generator stays at two levels plus what a step calls.
