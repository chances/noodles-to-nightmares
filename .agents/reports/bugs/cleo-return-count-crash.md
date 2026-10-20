---
state: fixed
---
# `invertHeading` Crashes the Game

**Status**: Resolved in code. The compiled function body has the corrected operands; later runs executed `invertHeading` without crashing.

## Symptom
Crash to desktop at `$faceSalHeading = invertHeading($salHeading)` in `missions/1_shady_job.txt`, and wrong inverted headings before that.

## Root Cause
Two compile results in [`utils/missions.txt`](../../../utils/missions.txt):

| Source | Compiled | Effect |
| :--- | :--- | :--- |
| `cleo_return opposite` | `0AB2` with the float local as the return count | CLEO read a count of about 1.1 billion return values |
| `float opposite = heading + 180.0` | `0A8E` (`INT_ADD`) | Integer add on float bits; wrong value |

The first operand of `0AB2` (`cleo_return`) is the number of returned values, then the values. `0AB1` and `0AB2` themselves are supported by the installed CLEO 2.1.1 (`CustomOpcodes.cpp` registers `0AB1` for III).

## Fix
`cleo_return 1 opposite`, and the sum written in place: `float opposite = heading`, then `opposite += 180.0` (`000B`). Confirmed in the compiled body: `0AB2 04 01 03 01 00` returns one value from local `1@`.

## Ruled Out
| Candidate | Evidence |
| :--- | :--- |
| CLEO lacks `0AB1` or `0AB2` | Both register in CLEO for III 2.x; `tryRemoveSal()` calls compile to the same opcode |
| `Char.GetHeading` wrong | Operands `0172 $sal $salHeading` are correct, and the logged value was `5` |

## Prevention
After editing a function, dump its compiled body (the `0AB1` target is `-offset` from the script start) and check the opcode ids and operand counts. Float arithmetic with three operands in Sanny for GTA III: write it as an assignment plus `+=`, `-=`, `*=`, or `/=`.
