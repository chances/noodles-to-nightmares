# Geography System & UDP Sockets Architecture

Replaces `utils/geography.txt` with a unified POI catalog (`data/geography.json`), compile-time resolution into native Sanny opcodes, and a lightweight UDP CLEO plugin (`sockets.cleo`) for real-time live telemetry, 2D map tracking, and in-editor debugging.

## 1. Architecture Overview

```mermaid
flowchart TD
    subgraph Editor ["Mission Editor"]
        Header["Header: Status Pill (Red/Yellow/Green) & 'Run in Game' Button"]
        RadarMap["2D Radar Map (Player Position & Heading)"]
        Inspector["Inspector: Spot Picker + 'Use Player Pos'"]
        Modes["Modes: Editing vs Debugging (Read-Only)"]
        DenoUDP["Deno UDP Listener (port 8089) -> SSE to UI"]
    end

    subgraph BuildPipeline ["Build Pipeline"]
        GeoJSON["data/geography.json (Single Source of Truth)"]
        FSMGen["@noodles/fsm Generator"]
    end

    subgraph Runtime ["GTA III Runtime"]
        Game["Game Loop"]
        SocketsPlugin["CLEO Plugin (sockets.cleo)"]
        LiveScript["Live Streamer Script (15Hz + F8 Key)"]
        Missions["Compiled CLEO Missions (.cm)"]
    end

    LiveScript -->|UDP localhost:8089| SocketsPlugin
    SocketsPlugin --> DenoUDP
    DenoUDP --> Header
    DenoUDP --> RadarMap
    DenoUDP --> Inspector
    GeoJSON --> FSMGen
    FSMGen -->|Native Sanny Opcodes (Clean Break)| Missions
    Game <--> LiveScript
```

## 2. Components

### A. Catalog: `data/geography.json`
- Single source of truth; replaces `utils/geography.txt` (clean break across all missions).
- Schema:
  ```json
  {
    "id": "SAFEHOUSE_ARRIVE",
    "district": "portland",
    "group": "SAFEHOUSE",
    "category": "objective",
    "tags": ["safehouse", "arrival"],
    "pos": [1170.85, -416.097, 23.25],
    "heading": 315.0,
    "radius": 3.0
  }
  ```

### B. Compile-Time Resolution (`@noodles/fsm`)
- Inlines coordinates from `data/geography.json` directly into native opcodes (`00EC`, `00A1`, `Blip.AddSpriteForCoord`).
- Zero runtime DLL dependency or custom opcodes for mission execution.

### C. UDP CLEO Plugin: `sockets.cleo`
- Built via CMake + MSVC in `plugins/sockets/`, installed to `CLEO/CLEO_PLUGINS/sockets.cleo`.
- Uses Win32 non-blocking UDP (`ioctlsocket(FIONBIO)`):
  - `0B30: port x y z heading event` sends `POS:x,y,z,heading`, or `CAPTURE:x,y,z,heading` when `event` is 1 (F8).
  - `0B31: port channel kind value` sends script debug readings as `DBG:<channel>,<i|f|c|t>,<value>`.
- Bidirectional control (`udp_bind` / `udp_recv`) deferred to post-POC.

### D. In-Game Telemetry Streamer (`capture.cs`)
- Background CLEO script running in game:
  - 15 Hz continuous position/heading stream.
  - Instant event on `F8` keypress.

### E. Mission Editor UI & Modes
- **Header Additions**:
  - **Connection Status Pill**: Red (disconnected), yellow spinner (connecting/polling), green (live 15Hz telemetry).
  - **"Run in Game" Button**: Play icon after Export to launch/install active mission.
- **Editing vs Debugging Modes**:
  - *Editing*: Standard script/inspector form editing.
  - *Debugging*: Automatically activates when game connects; locks inspector to read-only testing view.
- **Radar & HUD**:
  - 2D interactive radar map overlay displaying live player blip & heading.
  - Inspector coordinate inputs carry "Use Current Position" button.
  - Toast notification whenever `F8` is pressed in game.

## 3. Implementation Phasing

1. **Phase 1: Catalog Clean Break & FSM Compilation**
   - Create `data/geography.json` from `utils/geography.txt`.
   - Update `@noodles/fsm` and existing missions; remove `utils/geography.txt`.
2. **Phase 2: UDP Plugin (`sockets.cleo`) & In-Game 15Hz Streamer**
   - Implement `plugins/sockets/` C++ DLL and Sanny opcode definition.
   - Deploy `capture.cs` streaming at 15Hz and on F8.
3. **Phase 3: Editor UDP Server, Connection Status Pill & "Run in Game"** (done)
   - UDP listener on port 8089 (`scripts/telemetry.ts`, `node:dgram`) and SSE bridge in `tools/mission-editor/server.ts`.
   - Status pill and Run button (starts `deno task run --events`); Debug mode swaps the Script pane for the debugger pane (Game Run, Script Watches, F8 captures).
4. **Phase 4: Radar Map & Live Capture Controls**
   - Render 2D Portland radar map with real-time player position indicator.
   - Wire "Use Current Position" buttons and F8 toasts in Inspector.
5. **Phase 5 (Post-POC / Future)**:
   - Bidirectional UDP control (teleport, step/pause/stop mission execution).
   - Live timeline play-head tracking active state machine node.
