import { join } from "@std/path";
import { type AlertStore } from "./alerts.ts";
import { GAME_PROCESSES, LOG_SOURCES, type LogSource } from "./config.ts";
import {
  applyAbsentRules,
  applyRules,
  type Finding,
  type Rule,
} from "./rules.ts";

export interface GameProcess {
  name: string;
  pid: number;
}

export interface MonitorDeps {
  listProcesses(): Promise<GameProcess[]>;
  /** A stable start stamp for the process, or null when unavailable. */
  processStartStamp(pid: number): Promise<string | null>;
  /** Wait after the process exits so the game's last log writes land. */
  settleMs: number;
}

async function run(command: string, args: string[]): Promise<string> {
  const { stdout } = await new Deno.Command(command, {
    args,
    stdout: "piped",
    stderr: "null",
  })
    .output();
  return new TextDecoder().decode(stdout);
}

/** Picks game processes out of `tasklist /FO CSV /NH` output, matching image names case-insensitively. */
export function parseTasklist(csv: string): GameProcess[] {
  const found: GameProcess[] = [];
  for (const match of csv.matchAll(/^"([^"]+)","(\d+)"/gm)) {
    if (GAME_PROCESSES.includes(match[1].toLowerCase())) {
      found.push({ name: match[1], pid: Number(match[2]) });
    }
  }
  return found;
}

export const systemDeps: MonitorDeps = {
  settleMs: 1500,
  async listProcesses() {
    return parseTasklist(await run("tasklist", ["/FO", "CSV", "/NH"]));
  },
  async processStartStamp(pid) {
    try {
      const out = await run("powershell", [
        "-NoProfile",
        "-Command",
        `(Get-Process -Id ${pid}).StartTime.ToUniversalTime().ToString('yyyyMMddTHHmmss')`,
      ]);
      return out.trim() || null;
    } catch {
      return null;
    }
  },
};

export interface GameStatus {
  running: boolean;
  pid: number | null;
  session: string;
  lastExit: { session: string; at: string } | null;
  logs: {
    id: string;
    path: string;
    exists: boolean;
    bytes: number;
    modified: string | null;
  }[];
}

export class Monitor {
  session = "idle";
  running = false;
  pid: number | null = null;
  lastExit: { session: string; at: string } | null = null;

  private offsets = new Map<string, number>();
  private snapshotKeys = new Map<string, string>();
  private timer: ReturnType<typeof setInterval> | undefined;
  private ticking = false;

  constructor(
    readonly gameDir: string,
    readonly rules: Rule[],
    readonly store: AlertStore,
    private readonly deps: MonitorDeps = systemDeps,
    private readonly sources: LogSource[] = LOG_SOURCES,
  ) {}

  pathOf(source: LogSource): string {
    return join(this.gameDir, source.path);
  }

  findSource(id: string): LogSource | undefined {
    return this.sources.find((source) => source.id === id);
  }

  get logSources(): LogSource[] {
    return this.sources;
  }

  /** Detect a game that is already running, or scan the last run's logs once. */
  async init(): Promise<void> {
    const game = (await this.deps.listProcesses())[0];
    if (game) {
      await this.beginSession(game);
      await this.scan(false);
    } else {
      this.session = "last-run";
      await this.scan(true);
    }
  }

  start(intervalMs = 1000): void {
    this.timer = setInterval(() => {
      if (this.ticking) return;
      this.ticking = true;
      this.tick().catch((error) => console.error("tick failed:", error))
        .finally(() => {
          this.ticking = false;
        });
    }, intervalMs);
  }

  stop(): void {
    clearInterval(this.timer);
  }

  async tick(): Promise<void> {
    const game = (await this.deps.listProcesses())[0];
    if (game && (!this.running || game.pid !== this.pid)) {
      if (this.running) await this.finishSession();
      await this.beginSession(game);
    } else if (!game && this.running) {
      await this.finishSession();
      return;
    }
    if (this.running) await this.scan(false);
  }

  private async beginSession(game: GameProcess): Promise<void> {
    const stamp = await this.deps.processStartStamp(game.pid) ??
      new Date().toISOString();
    this.session = `${game.pid}-${stamp}`;
    this.running = true;
    this.pid = game.pid;
    this.offsets.clear();
    this.snapshotKeys.clear();
  }

  private async finishSession(): Promise<void> {
    if (this.deps.settleMs > 0) {
      await new Promise((r) => setTimeout(r, this.deps.settleMs));
    }
    await this.scan(true);
    await this.store.append({
      session: this.session,
      rule: "game-exited",
      severity: "info",
      source: "process",
      title: "Game process exited",
      line: `pid ${this.pid} exited`,
      fingerprint: "game-exited",
    });
    this.lastExit = { session: this.session, at: new Date().toISOString() };
    this.running = false;
    this.pid = null;
  }

  /** Reads what is new in each source and stores the findings as alerts. */
  async scan(atExit: boolean): Promise<void> {
    for (const source of this.sources) {
      const findings: Finding[] = [];
      const path = this.pathOf(source);
      if (source.mode === "append") {
        const text = await this.readNewLines(source, path, atExit);
        if (text) findings.push(...applyRules(this.rules, source.id, text));
      } else if (source.mode === "snapshot") {
        const text = await this.readIfChanged(source, path);
        if (text) findings.push(...applyRules(this.rules, source.id, text));
      } else if (atExit) {
        const text = await readOrNull(path);
        if (text) findings.push(...applyRules(this.rules, source.id, text));
      }
      if (atExit) {
        const full = await readOrNull(path);
        findings.push(...applyAbsentRules(this.rules, source.id, full ?? ""));
      }
      for (const finding of findings) {
        await this.store.append({
          session: this.session,
          rule: finding.rule.id,
          severity: finding.rule.severity,
          source: source.id,
          title: finding.rule.title,
          line: finding.line,
          hint: finding.rule.hint,
          report: finding.rule.report,
          fingerprint: finding.fingerprint,
        });
      }
    }
  }

  private async readNewLines(
    source: LogSource,
    path: string,
    atExit: boolean,
  ): Promise<string | null> {
    let size: number;
    try {
      size = (await Deno.stat(path)).size;
    } catch {
      return null;
    }
    let offset = this.offsets.get(source.id) ?? 0;
    if (size < offset) offset = 0;
    if (size === offset) return null;
    const bytes = new Uint8Array(size - offset);
    using file = await Deno.open(path, { read: true });
    await file.seek(offset, Deno.SeekMode.Start);
    const read = await file.read(bytes) ?? 0;
    let end = read;
    if (!atExit) {
      end = bytes.subarray(0, read).lastIndexOf(0x0a) + 1;
      if (end === 0) return null;
    }
    this.offsets.set(source.id, offset + end);
    return new TextDecoder().decode(bytes.subarray(0, end));
  }

  private async readIfChanged(
    source: LogSource,
    path: string,
  ): Promise<string | null> {
    try {
      const info = await Deno.stat(path);
      const key = `${info.mtime?.getTime()}:${info.size}`;
      if (this.snapshotKeys.get(source.id) === key) return null;
      this.snapshotKeys.set(source.id, key);
      return await Deno.readTextFile(path);
    } catch {
      return null;
    }
  }

  async status(): Promise<GameStatus> {
    const logs = await Promise.all(this.sources.map(async (source) => {
      try {
        const info = await Deno.stat(this.pathOf(source));
        return {
          id: source.id,
          path: this.pathOf(source),
          exists: true,
          bytes: info.size,
          modified: info.mtime?.toISOString() ?? null,
        };
      } catch {
        return {
          id: source.id,
          path: this.pathOf(source),
          exists: false,
          bytes: 0,
          modified: null,
        };
      }
    }));
    return {
      running: this.running,
      pid: this.pid,
      session: this.session,
      lastExit: this.lastExit,
      logs,
    };
  }

  /** Empties every watched log. Refuses while the game holds them open. */
  async clearLogs(): Promise<string[]> {
    if (this.running) {
      throw new Error("The game is running. Close it before clearing logs.");
    }
    const cleared: string[] = [];
    for (const source of this.sources) {
      try {
        await Deno.truncate(this.pathOf(source), 0);
        cleared.push(source.id);
      } catch (error) {
        if (!(error instanceof Deno.errors.NotFound)) throw error;
      }
    }
    this.offsets.clear();
    this.snapshotKeys.clear();
    return cleared;
  }
}

async function readOrNull(path: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(path);
  } catch {
    return null;
  }
}
