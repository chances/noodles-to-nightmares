---
state: fixed
---
# Rosa's Apartment Invisible In-Game

**Status**: Resolved. Confirmed in game after the TXD was rebuilt for Direct3D 8.

## Symptom
`ind_newtenement08` overridden with the Rosa's Apartment model rendered nothing in GTA III. ModLoader imported the DFF and TXD without errors. Blender, Ariane, and [gtastuff.com/viewer](https://gtastuff.com/viewer) displayed the model correctly.

## Root cause
[`rosa_apartment.txd`](../../../models/Rosa's%20Apartment/rosa_apartment.txd) was a Direct3D 9 texture dictionary (platform `9`, device `2`, RW stamp `0x1803ffff`). GTA III only streams Direct3D 8 dictionaries (platform `8`, device `0`, stamp `0x320`, as in stock `inditaly1.txd`). A dictionary the game cannot parse never loads, so the model that depends on it never becomes available.

## Fix
[`scripts/convert-txd-d3d9-to-d3d8.py`](../../../scripts/convert-txd-d3d9-to-d3d8.py) rewrites each native texture header to platform `8` and keeps the pixel data: 32-bit `A8R8G8B8` textures become `FORMAT_888` when fully opaque, and DXT1 textures keep their mip chain.

## Ruled out
| Candidate | Evidence |
| :--- | :--- |
| Multiple atomics or frames | DFF has 1 frame, 1 atomic, 1 geometry |
| Texture names in the DFF | All 15 names exist in the TXD |
| DFF version `0x32000` | Required for GTA III PC (see `.agents/Memory.md`) |
| Draw distance, IPL float formatting, billboard texture dimensions | Each tested separately; model stayed invisible |

## Prevention
Check the platform field of any new or edited TXD before debugging IDE or IPL entries. Procedure: the `txd-importing` skill, [section 4](../../skills/txd-importing/SKILL.md).
