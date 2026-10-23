# Rejected FSM Codegen Options

The generator emits one subroutine per state, each with its own tick loop (design: [`fsm-codegen-patterns.md`](fsm-codegen-patterns.md)). These options were considered and not chosen.

| Option | Verdict | Reason |
| :--- | :--- | :--- |
| State as program counter (`goto @state_x`) | Rejected | Needs `goto` for every transition; `AGENTS.md` marks gotos as a smell. Subroutines give the same per-tick cost |
| Subroutine per state, still a `beat` ladder | Rejected | Keeps the `beat ==` compare chain, which is most of the per-tick cost |
| Trim the current loop (`else` chain, range checks) | Rejected | Still tests the state and beat every tick; the if-ladder stays |
| CLEO plugin with its own call stack and shared locals | Rejected | Would lift the six-deep `gosub` limit, but the limit keeps missions shallow and simple |
| CLEO plugin with an indexed jump opcode | Rejected | Dispatch runs once per transition, so it would save a few compares per state change |
| Plugin to hide `:label` / `return` syntax | Not possible | The Sanny compiler owns that syntax; the generator already hides it |
| CLEO `function` per state | Rejected | A `function` cannot see the script's locals; mission state would need arguments or globals |
| Mission state in globals | Rejected | Spends global slots (see `Memory.md`, Global Slots); mission-private state stays in CLEO locals |

## Evidence

| Fact | Source |
| :--- | :--- |
| `gosub` stack holds six return addresses | `m_aGosubAddr[6]` in [`plugins/sockets/III.CLEO.h`](../../plugins/sockets/III.CLEO.h) |
| Seven nested `gosub`s entered, the eighth crashed the game | [`tests/stack-probe.txt`](../../tests/stack-probe.txt), [result](../../tests/results/stack-2026-10-23T01-04-54-520Z.md) |
| A `return` inside a `while` inside a `gosub` works | `01_return_from_while_expect_3=3` in the same result |
| Plain `return` in a `function` is CLEO 5 only; use `cleo_return` | [Sanny functions](https://docs.sannybuilder.com/language/functions.md) |
| A `function` cannot see script locals | `Memory.md`, CLEO Locals |
