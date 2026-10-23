---
state: open
---
# Buildings and Vehicles Pop In and Out

**Status**: Open. No candidate below has been tested by itself.

## Symptom
Buildings and vehicles pop in and out in `main.txt` and `missions/1_shady_job.txt`. A related audio fix is recorded in the project memory (`Audio.SetMusicDoesFade`); the pop-cycles stayed.

## Candidates
| Candidate | Evidence | Test |
| :--- | :--- | :--- |
| `Streaming.LoadCollision(0)` at `main.txt:25` | The `LevelName` enum in the library's `enums.json` lists `Industrial` 1, `Commercial` 2, `Suburban` 3. The Sanny template `stripped.txt` also writes `0`. | Change only this argument and replay |
| Requested models never released | `missions/1_shady_job.txt:133-139` has seven `RequestModel` calls and grep finds no `MarkModelAsNoLongerNeeded`. The library describes `0249` as "freeing game memory". | Add the release calls and replay |
| `Streaming.Switch` never called | The library describes it as toggling streaming of "additional models like peds, cars, and maps". No script here calls it. | Call it once and replay |

## Related Findings
- `Streaming.LoadModel` and `Streaming.IsModelLoaded` appear in `main.txt` and the mission file. Neither name is in the library's `gta3.json` on GitHub master, and neither string appears in the Sanny install's `data` folder. The library names are `RequestModel` and `HasModelLoaded`. Where the project names come from is not established.
- `main.txt:104-105` calls `LoadSpecialCharacter` into slots 1 and 2 with no `HasSpecialCharacterLoaded` check.

## Reference
Library commands and the request, wait, use cycle: [`lessons/0004-the-streaming-class.html`](../lessons/0004-the-streaming-class.html).
