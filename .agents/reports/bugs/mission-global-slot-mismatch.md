---
state: fixed
---
# Mission Reads Wrong Global Variable Slots

**Status**: Resolved in code. The rebuilt `main.scm` and `1_shady_job.cm` use the same slot for `$player`; later runs got past the cutscene heading code.

## Symptom
Crash to desktop (`Unhandled exception: c0000005`) after the first Sal dialogue line in `missions/1_shady_job.txt`, at the first command that took `$sal` (`Player.TurnToFaceChar($player, $sal)`). `Player.SetControl($player, ...)` earlier in the mission did not crash.

## Root Cause
Sanny Builder hands each script's undeclared `$globals` slots in order of first use, starting at index `4313` (`0x4364`). A `var ... end` block declares types but does not allocate. `main.scm` and every `.cm` compile separately, so the same name landed in different slots:

| Name | `main.scm` | `1_shady_job.cm` | Slot's owner in main |
| :--- | :--- | :--- | :--- |
| `$player` | `0x4378` | `0x436c` | `$myCar` (`0`) |
| `$sal` | none | `0x4370` | `$isCameraAvoidingObstacle` |

Main's camera block writes `true` or `false` into `$isCameraAvoidingObstacle` every frame, so `$sal` held `0` or `1` by the time the cutscene used it. Handle `0` is not a ped, and the engine dereferenced it. `$player` read `0`, which happens to be a valid player index, so it worked by accident. A compiled `.cm` stores its name-to-slot table after the code (`VAR` section), and every operand is visible in a hex dump.

## Fix
[`variables.txt`](../../../variables.txt) pins every global with `Alloc($name, index)` (indices `4400` to `4429`) and keeps the typed `var` block. `globals.txt` and every mission include it first. Confirmed by operands: `$player` is `0x44c4` in `main.scm` and in the `.cm`.

## Ruled Out
| Candidate | Evidence |
| :--- | :--- |
| Wrong command signature | `TurnToFaceChar(Player, Char)` and `LookAtCharAlways(Player, Char)` match the Sanny library |
| Stale build cache | The `.cm` was freshly compiled and still had the shifted slots |
| Stale `.cm` in `[gta3]/CLEO` | Found and removed earlier; separate defect, now linted by `scripts/install.ts` |

## Prevention
Put every global that more than one script touches, or that any script uses, in `variables.txt` with the next free index. Never rely on declaration order. After adding a global, dump the `.cm` operands or the `VAR` table and compare with `main.scm`.
