---
name: cleo-guidance
description: Use when creating, building, debugging, or integrating CLEO C++ plugins (.cleo), registering custom opcodes, or interfacing CLEO scripts with runtime DLLs for GTA III and Vice City.
---

# CLEO Plugin & Custom Opcode Guidance for GTA III

## Overview

CLEO for GTA III & Vice City loads custom C++ extension plugins (`.cleo` files) to add native functionality and custom SCM opcodes to the game engine.

---

## 1. CLEO C++ Plugin Architecture

### Official SDK Location
- Headers and import libraries: `D:\Users\enigm\GitHub\III.VC.CLEO\source\CLEO_SDK`
  - GTA III: `III.CLEO.h`, `III.CLEO.lib`
  - Vice City: `VC.CLEO.h`, `VC.CLEO.lib`

### Required Target Architecture
- **Must be 32-bit (x86)**: `-A Win32` in CMake, MSVC compiler.

### Plugin Template (`dllmain.cpp`)
```cpp
#define WIN32_LEAN_AND_MEAN
#include <windows.h>

#if CLEO_VC
#pragma comment (lib, "VC.CLEO.lib")
#include "VC.CLEO.h"
#else
#pragma comment (lib, "III.CLEO.lib")
#include "III.CLEO.h"
#endif

#define CLEO_VERSION_MAIN    2
#define CLEO_VERSION_MAJOR   1
#define CLEO_VERSION_MINOR   0
#define CLEO_VERSION ((CLEO_VERSION_MAIN << 24)|(CLEO_VERSION_MAJOR << 16)|(CLEO_VERSION_MINOR << 8))

static tScriptVar *Params;

eOpcodeResult WINAPI OPCODE_CUSTOM(CScript *script)
{
    // Collect parameters
    script->Collect(2);

    int argInt = Params[0].nVar;
    float argFloat = Params[1].fVar;

    // Optional comparison flag update for IF opcodes:
    // script->UpdateCompareFlag(true);

    return OR_CONTINUE;
}

BOOL APIENTRY DllMain(HMODULE hModule, DWORD reason, LPVOID lpReserved)
{
    if (reason == DLL_PROCESS_ATTACH)
    {
        if (CLEO_GetVersion() < CLEO_VERSION)
            return FALSE;

        Params = CLEO_GetParamsAddress();
        Opcodes::RegisterOpcode(0x0B30, OPCODE_CUSTOM);
    }
    return TRUE;
}
```

### Parameter Types in `tScriptVar`
- `Params[i].nVar`: 32-bit integer / boolean / handle
- `Params[i].fVar`: 32-bit IEEE float
- `Params[i].pVar`: Pointer (memory address or string buffer)

---

## 2. Plugin Deployment Paths

There are two co-existing CLEO runtimes:
1. **Classic CLEO (`III.CLEO.asi`)**: Scans and loads `CLEO\*.cleo` directly.
2. **CLEO Redux (`cleo_redux.asi`)**: Scans and loads `CLEO\CLEO_PLUGINS\*.cleo`.

> **Deployment Rule**: Always copy compiled `.cleo` plugins into **both** locations:
> - `<GTA3>\CLEO\<plugin>.cleo`
> - `<GTA3>\CLEO\CLEO_PLUGINS\<plugin>.cleo`

Always resolve `<GTA3>` from `.env` (`GTA3=...`).

---

## 3. Sanny Builder Opcode Definition

### Method A: In-Script Definition (`{$OPCODE}`)
For local probes and standalone scripts without modifying global Sanny configs:
```sanny
{$USE CLEO}
{$OPCODE 0B30=6,udp_send_telemetry %1d% %2d% %3d% %4d% %5d% %6d%}

0B30: 8089 $px $py $pz $heading $event
```

### Method B: Custom Extension JSON (SBL Mode)
For project-wide language integration in `gta3_sbl`:

1. **Create extension file** (e.g. `data/gta3_sbl/sockets.json`):
   ```json
   {
     "extensions": [
       {
         "name": "sockets",
         "commands": [
           {
             "id": "0B30",
             "name": "UDP_SEND_TELEMETRY",
             "num_params": 6,
             "short_desc": "Sends UDP telemetry to localhost",
             "input": [
               { "name": "port", "type": "int" },
               { "name": "x", "type": "float" },
               { "name": "y", "type": "float" },
               { "name": "z", "type": "float" },
               { "name": "heading", "type": "float" },
               { "name": "event", "type": "int" }
             ]
           }
         ]
       }
     ]
   }
   ```

2. **Register in `mode.xml`**:
   ```xml
   <library>@sb:\data\gta3_sbl\sockets.json</library>
   ```

3. **Use in scripts**:
   ```sanny
   {$USE CLEO, sockets}
   UDP_SEND_TELEMETRY 8089 $px $py $pz $heading $event
   ```

---

## 4. Common Pitfalls & Rules

- **Link Import Library**: Always link `III.CLEO.lib`. Never use dynamic `GetProcAddress` lookups on `cleo.asi` (in GTA III the binary is named `III.CLEO.asi`).
- **Short Strings in GTA III SCM**: GTA III SCM does not support dynamic double-quoted string literals in unmapped opcodes. Passing `"ws2_32.dll"` inlines raw ASCII bytes that corrupt the bytecode execution stream. Use numeric/float parameters or short single-quoted strings (`'short'`) where strings are necessary.
- **Opcode Collision**: Choose IDs above `0x0AF0` not reserved by standard extensions (`0x0B30+` recommended).
