# Coding Agent Rules

## 1. Script Structure & Architecture

### Overview

- **Header Directives**: `DEFINE OBJECTS`, `DEFINE MISSIONS`, `{$USE CLEO}`
- **Global Declarations**: Variables (`var` block) and memory allocation
  (`Alloc()`)
- **Main Script**: Entry point that initializes game state and runs main loop
- **Missions**: Separate script threads launched via `DEFINE MISSION`
- **Functions**: Reusable code blocks called from main loop

### GTA3 Script Limits

| Limit               | Value         |
| ------------------- | ------------- |
| Total Missions      | 120           |
| Main Script Size    | 131,072 bytes |
| Mission Script Size | 32,768 bytes  |
| Running Scripts     | 128           |
| Global Variables    | 16,381        |

**Ref**:
[GTA Limits - Sanny Builder](https://docs.sannybuilder.com/scm-documentation)

---

## 2. Control Flow Rules

### Labels

- **Definition**: `:LabelName` (colon prefix)
- **Reference**: `@LabelName` (at-sign prefix)
- **Usage**: Marks locations for `goto`, `gosub`, or mission entry points

```sanny
:M_LOOP           // Label definition
goto @M_TRIG      // Label reference
```

### Goto Patterns

#### PREFER: Gosub Pattern for Returning Control Flow

```sanny
:M_LOOP
while true
  wait 250 ms
  gosub @M_TRIG    // Call subroutine
  // Control automatically returns here
end

:M_TRIG            // Subroutine
  // Do something
  return           // Return to caller
```

**Rule**: **PREFER `gosub` over `goto` when control-flow is intended to return
back to the call-site.** Use `gosub` and `return` for cleaner, more maintainable
code.

#### Legacy: Goto Subroutine Pattern (Avoid)

```sanny
:M_LOOP
while true
  wait 250 ms
  goto @M_TRIG      // Jump to subroutine
:MiTrRET           // Return point (manual label management)
  // Continue main logic
end

:M_TRIG            // Subroutine
  // Do something
  goto @MiTrRET    // Return to caller
```

**Legacy Rule** (if using `goto` for subroutines): Always provide an explicit
return label and ensure proper flow when using `goto` for subroutines.

### Loop Constructs

- `while true ... end` - Infinite loop (requires `wait` inside)
- `while condition ... end` - Conditional loop
- `repeat ... until condition` - Post-test loop
- **Critical**: All loops must contain a `wait` statement to prevent game freeze

```sanny
while true
  wait 250 ms  // REQUIRED - prevents infinite tight loop
  // game logic
end
```

**Ref**:
[Loops - Sanny Builder](https://docs.sannybuilder.com/language/control-flow)

### Mission Launch Context

**Critical Rule**: `Mission.LoadAndLaunchInternal()` must be called from
**within** the main loop's `while true` block.

```sanny
:M_LOOP
while true
  wait 250 ms
  goto @M_TRIG        // Jump here from inside loop

:M_TRIG
  if and
    Player.IsPlaying($player)
    Player.CanStartMission($player)
    $onMission == False
  then
    Mission.LoadAndLaunchInternal($missionIndex)
  end
  goto @MiTrRET       // Return inside loop context

:MiTrRET
  // Continue loop
end
```

**Why**: GTA3's mission system expects continuous main loop execution. Calling
mission load outside loop context causes script state corruption and crashes.

---

## 3. Mission System Rules

### Mission Definition

```sanny
DEFINE MISSIONS 1
DEFINE MISSION 0 AT @Tutorial
```

- **Syntax**: `DEFINE MISSION {index} AT @{label}`
- **Index Range**: 0-119 (GTA3 max: 120 missions)
- **Label**: Points to mission script entry point

**Ref**:
[0417: LOAD_AND_LAUNCH_MISSION_INTERNAL - GTAMods Wiki](https://www.gtamodding.com/index.php?title=0417)

### Mission Script Structure

```sanny
:Tutorial
script_name 'Tutorial'
wait 0

// Mission logic here

// When mission ends:
terminate_this_script
```

- **Entry Point**: Label matching `DEFINE MISSION`
- **Script Name**: 7-character max via `script_name`
- **Termination**: `terminate_this_script` ends mission and returns control to
  main

### Mission Requirements

- Missions **must** be defined at script header
- Only defined missions can be launched with `Mission.LoadAndLaunchInternal()`
- Changed mission code does not require game restart

---

## 4. Variables & Memory Management

### Variable Declaration

```sanny
var
  $player: Player
  $playerChar: Char
  $missionIndex: int
end
```

- **Scope**: Global (accessible from all scripts)
- **Types**: `Player`, `Char`, `int`, `float`, arrays
- **Naming**: `$name` for globals

### Memory Allocation

```sanny
Alloc($TIMER, 4310)
Alloc($Banshee, 4315)
```

- **Usage**: Allocate memory handles for object references (vehicles, peds,
  blips)
- **Index Range**: Varies by object type (see script for allocation indices)
- **Purpose**: Track game entities (cars, characters, pickups, etc.)

### Global State Pattern

```sanny
declare_mission_flag $onMission  // Mission flag
$missionIndex = START_MISSION_INDEX
$onMission = False               // Initialize state
```

**Rule**: Initialize all global state before main loop begins.

---

## 5. Functions & Subroutines

### Function Definition

```sanny
function initBlips()
  $SafeBlip = Blip.AddSpriteForCoord(...)
end

function monitorWangPickup()
  if and
    // condition logic
  then
    // action
  end
end
```

- **Call**: `initBlips()` or `monitorWangPickup()`
- **Return**: Implicit return at `end`
- **Scope**: Global visibility

### Gosub vs Goto Patterns

```sanny
// Modern gosub pattern
gosub @SubLabel
// or
SubLabel()

:SubLabel
  // code
  return
```

**vs** Goto subroutine (used in this script):

```sanny
goto @M_TRIG
:MiTrRET
  // Continues here after M_TRIG returns via goto
```

---

## 6. Performance & Best Practices

### Wait Statements

- **Minimum**: `wait 0 ms` - Yields control to game, prevents freeze
- **Common**: `wait 250 ms` - Balances responsiveness and CPU usage
- **Critical**: Every loop must contain a `wait` or game hangs

### Main Loop Timing

```sanny
:M_LOOP
while true
  script_name 'Main'
  wait 250 ms      // 4 iterations per second
  goto @M_TRIG
:MiTrRET
  // Other game logic
end
```

This script checks mission conditions every 250ms, allowing smooth gameplay
without excessive polling.

### Naming Conventions

- `:M_LOOP` - Main loop label
- `:M_TRIG` - Mission trigger subroutine
- `:MiTrRET` - Mission trigger return point
- Functions use camelCase: `monitorWangPickup()`

---

## 7. Common Pitfalls & Errors

### ❌ Don't: Call Mission.LoadAndLaunchInternal() Outside Main Loop

```sanny
goto @M_TRIG
:M_LOOP
while true
  // ...
end

:M_TRIG
  Mission.LoadAndLaunchInternal($missionIndex)  // CRASH: Outside loop context
end
```

### ✅ Do: Call Mission.LoadAndLaunchInternal() Inside Main Loop

```sanny
:M_LOOP
while true
  wait 250 ms
  goto @M_TRIG
:MiTrRET
  // Continue loop
  
:M_TRIG
  if not $onMission then
    Mission.LoadAndLaunchInternal($missionIndex)
  end
  goto @MiTrRET
end
```

### ❌ Don't: Forget Return Goto in Label Subroutines

```sanny
:M_TRIG
  Mission.LoadAndLaunchInternal($missionIndex)
  // Missing: goto @MiTrRET
  // Control falls off, causes undefined behavior
```

### ❌ Don't: Assign Condition Opcodes Directly

```sanny
// Error 0013: Unknown directive
$collected = Pickup.HasBeenCollected($myPickup)  // INVALID
```

### ✅ Do: Use an `if` Block for Condition Opcodes

```sanny
if Pickup.HasBeenCollected($myPickup)
then
  $collected = True
end
```

### ❌ Don't: Loop Without Wait

```sanny
while true
  if condition then
    // action
  end
  // Missing wait - game freezes!
end
```

---

## 8. Code Comments & Documentation

### TODO and FIXME Preservation

**Critical Rule**: NEVER delete user `TODO` and `FIXME` comments unless you are
completing or fixing the respective issue.

```sanny
// ❌ Don't: Remove TODO comments
// FIXME: Gotos are code-smells. Figure out how to start a mission from a function
gosub @M_TRIG  // Don't delete the FIXME above!

// ✅ Do: Keep TODO/FIXME and note resolution when fixed
// FIXME: Gotos are code-smells. Figure out how to start a mission from a function
// NOTE: Refactored to use gosub pattern (FIXME addressed)
gosub @M_TRIG
```

**Why**: TODO and FIXME comments represent known issues, future improvements, or
design decisions. They:

- Communicate intent to other developers
- Track technical debt and work items
- Should only be removed when the issue is resolved or explicitly documented as
  addressed

### Collaboration Protocol

**Critical Rule**: ALWAYS read files for human changes before making your own
edits.

When collaborating on this script:

1. Read the relevant file sections to understand current state
2. Check for recent changes or uncommitted modifications
3. Understand the human's intent from context and comments
4. Only then proceed with your edits
5. Preserve all human-written comments and decisions

**Why**: You are a tool assisting a human with real intelligence. The human
makes architectural and design decisions. You must respect their decisions and
understand context before making changes.

---

## 9. Official References

### Sanny Builder Documentation

- [Control Flow - Sanny Builder](https://docs.sannybuilder.com/language/control-flow)
- [Labels - Sanny Builder](https://docs.sannybuilder.com/language/control-flow/labels)
- [Functions - Sanny Builder](https://docs.sannybuilder.com/language/instructions/functions)
- [GTA Limits - Sanny Builder](https://docs.sannybuilder.com/scm-documentation)

### GTAMods Wiki

- [Create a Script](https://gtamods.com/wiki/Create_a_script)
- [0417: LOAD_AND_LAUNCH_MISSION_INTERNAL](https://www.gtamodding.com/index.php?title=0417)
- [Mission Script Overview](https://gtamods.com/wiki/Mission_script)
- [SCM Language](https://gtamods.com/wiki/SCM_language)

### Sanny Builder Library

- [SBL Opcode Documentation](https://library.sannybuilder.com/)
