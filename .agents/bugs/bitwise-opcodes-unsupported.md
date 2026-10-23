# Bitwise Opcodes Unsupported

## Symptom

A script compiled with `{$USE bitwise}` shows a `CLEO.asi` dialog, "Incorrect opcode ID: 0B10", at its first bitwise command. `scrlog.log` ends at `[0B10] COMMAND_0B10`, then two garbled opcodes (`6802`, `0243`), and the game crashes with no `--Game Shutdown--` marker in `cleo.log` and no `Logging finished` footer in `scrlog.log`.

## Root Cause

The Sanny Builder library lists the `bitwise` extension for GTA III, but this install's CLEO does not register `0B10`. The install runs `III.CLEO.asi` plus CLEO Redux 0.236 (`cleo_redux.asi`), and no loaded plugin provides bitwise commands (`IniFiles`, `III.IniFiles`, `Input`, `MemoryOperations`, `TextLoader`, `ImGuiReduxWin32`, `Events`, `Frontend`, `dylib`, `FxtLoader`, `IdeLoader`). The compiler accepts the opcodes because the library JSON defines them; only the game rejects them.

## Fix

Scripts do not use bitwise commands. Mission latches are one local each. The probe is `tests/bitwise-probe.txt`, installed with `deno task probe bitwise`.

## Ruled Out

- A missing `{$USE bitwise}` directive: the script compiled with it.
- Opcode `0AF1` (`IniFile.WriteInt`): it ran before `0B10` and wrote `00_started=1`.

## Open

The probe player also fell through the world after spawning at 1144.0, -596.0, 14.97. The scene wait (`IsCollisionInMemory`) had passed before the fade-in. Cause not isolated.
