---
state: fixed
---
# Cutscene Camera Points East and Rosa Will Not Turn

**Status**: Resolved. The user confirmed the camera and the facing work after `main.txt`'s camera block was moved out of missions.

## Symptom
In `missions/1_shady_job.txt`, the cutscene camera pointed east instead of south at Sal. Rosa's heading stayed at its starting value (`286.823`, `158`, and `315` in different runs) through `Player.TurnToFaceChar`, `Char.SetHeading`, and `Player.SetHeading`: after one frame it was back to the old value.

## Root Cause
[`main.txt`](../../../main.txt) ran its "camera avoidance" block every frame, including while a mission was running. Inside Punk Noodles it alternated `Camera.SetFixedPosition(1027.28, -623.825, 21.47, ...)` and `Camera.Restore()` each frame, overriding the mission's own `Camera.SetFixedPosition` and `Camera.PointAtChar($sal, ...)`. `scrlog.log` showed `015F` (`SET_FIXED_CAMERA_POSITION`) and `015A` (`RESTORE_CAMERA`) alternating on consecutive frames. A first attempt (adding `$onMission == false` to the `if and`) made it worse: the `else` branch, which calls `Camera.Restore()`, then ran on every mission frame.

Rosa's heading values never changed from the starting reading while this ran. The exact path from the per-frame camera calls to the heading reset was not traced; removing the interference fixed both symptoms.

## Fix
In [`main.txt`](../../../main.txt) the `if and` keeps its `$onMission == false` condition, and its `else` branch wraps `Camera.SetInterpolationParameters` and `Camera.Restore()` in a nested `if $onMission == false`, so neither call runs while a mission is active.

## Ruled Out
| Candidate | Evidence |
| :--- | :--- |
| Wrong heading math | Sal read `5`, the inverse `185` (south); `invertHeading` compiled correctly |
| Wrong global slots | Fixed earlier by `variables.txt`; `$player` matched in both binaries |
| `Player.SetHeading` versus `Char.SetHeading` | Both reverted identically |
| `scrlog` capturing the cutscene | The log kept only the last frames, so it could not |

## Prevention
Any per-frame block in `main.txt` that touches the camera, the player's position, or the player's heading needs an `$onMission == false` guard on every branch, including its `else`, not just its `if` condition.
