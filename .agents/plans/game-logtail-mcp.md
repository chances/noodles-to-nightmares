# Game Logtail MCP

Project-local stdio MCP that follows the GTA III log files and process, detects problems, and surfaces them to agents.

## Decisions

| Topic | Decision |
| --- | --- |
| Location | `.agents/mcp/game-logtail`, own Deno workspace with `deno.json` |
| Runtime | Deno TypeScript, stdio transport, registered in the project `.mcp.json`; JSR packages first, NPM as fallback; no Python |
| Live feed | Tail files plus game process events (`gta3.exe` start, exit, exit code, crash dump) |
| Watched files | `cleo.log`, `cleo_redux.log`, `modloader.log`, `scrlog.log`, `CLEO\debug.ini` under the `GTA3` folder from `.env` |
| Sessions | A `gta3.exe` start begins a session; alerts carry the session id; older sessions stay readable and are marked stale |
| Rules | JSON rules file: source log, regex, severity, hint linking the matching `.agents/reports/bugs` entry; seeded from existing bug reports |
| Ping | Pull tools plus `dist/game-alerts.jsonl`; a project prompt-submit hook prints unseen alerts |
| Scope | Read logs, plus clear logs; build, install, and run stay as `deno task` commands |

## Detectors

| Detector | Source | Example |
| --- | --- | --- |
| CLEO and script errors | `cleo.log`, `cleo_redux.log` | "Incorrect opcode ID: 0AF3" |
| Crashes and exits | process watcher, `scrlog.log` tail | exception address, last frames, repeated `RemoveElegantly` |
| ModLoader failures | `modloader.log` | missing file, rejected package, shadowed asset |
| Debug value anomalies | `CLEO\debug.ini` | blip handle `-1` |

## Tools

| Tool | Purpose |
| --- | --- |
| `get_alerts` | Unseen alerts for the current session, filterable by severity |
| `ack_alerts` | Mark alerts seen |
| `tail_log` | Last N lines of a watched log with an optional regex |
| `game_status` | Running state, session id, last exit code |
| `clear_logs` | Truncate watched logs before a test run |

## Open Items

- Crash dump location and format on this install.
- Whether `scrlog.log` tail analysis needs frame parsing or a plain regex is enough.
- Evaluation questions (ten, read-only) once the server runs.
