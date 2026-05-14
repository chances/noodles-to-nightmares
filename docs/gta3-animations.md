# GTA III `Char.PlayAnimation` Reference

**Opcode:** `0372` — `set_actor [char] anim [id] wait_state_time [ms]`

```
Char.PlayAnimation($playerChar, AnimGroup.Player, {animId}, {blendMs})
```

- **animId** — see table below (GTA III: 0–20)
- **blendMs** — blend-in duration in milliseconds; `0` = instant snap. No
  confirmed engine default; `100` is a common community value but unverified.

## Animation IDs (GTA III)

| ID |  Loop?  | Description                                    |
| -- | :-----: | ---------------------------------------------- |
| 0  |   No    | Reset to normal idle                           |
| 2  | **Yes** | Stands still, hands behind back                |
| 3  |   No    | Leans back, looks left and right               |
| 8  |   No    | Hands behind back, then scratches head         |
| 9  |   No    | Bounces/stumbles backwards or forwards         |
| 10 |   No    | Turns around 360°                              |
| 11 |   No    | Stumbles, then scratches head                  |
| 12 | **Yes** | Bends over, catches breath                     |
| 13 |   No    | Hands behind back for ~5s (ignores time limit) |
| 14 |   No    | Steps away and ducks as if protecting itself   |
| 15 |   No    | Surprised while stepping back                  |
| 16 |   No    | Hails a taxi                                   |
| 17 |   No    | Steps back, raises both hands                  |
| 18 |   No    | Surprised while stepping back (variant)        |
| 19 |   No    | Hand gestures (conversation)                   |
| 20 | **Yes** | Catches breath, then leans back at time limit  |

Unlisted IDs have no effect. IDs 21–35 are Vice City only.
