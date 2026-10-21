import { dirname } from "@std/path";
import { type Severity, severityAtLeast } from "./rules.ts";

export interface Alert {
  id: string;
  ts: string;
  session: string;
  rule: string;
  severity: Severity;
  source: string;
  title: string;
  line: string;
  hint?: string;
  report?: string;
}

export type NewAlert = Omit<Alert, "id" | "ts"> & { fingerprint: string };

interface State {
  acked: string[];
  shown: string[];
}

export interface ListOptions {
  /** Only alerts from this session; omit for every session. */
  session?: string;
  minSeverity?: Severity;
  includeAcked?: boolean;
}

async function alertId(session: string, fingerprint: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${session}|${fingerprint}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
  return Array.from(digest.slice(0, 5), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Append-only JSONL of alerts plus a small state file of acknowledgements.
 * Several servers (one per agent session) may share one store: ids derive from
 * the session and fingerprint, so the same finding is stored once.
 */
export class AlertStore {
  constructor(readonly alertsPath: string, readonly statePath: string) {}

  async readAll(): Promise<Alert[]> {
    let text: string;
    try {
      text = await Deno.readTextFile(this.alertsPath);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) return [];
      throw error;
    }
    const alerts: Alert[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        alerts.push(JSON.parse(line));
      } catch {
        // A partial line from a concurrent write; the next read sees it whole.
      }
    }
    return alerts;
  }

  async append(alert: NewAlert): Promise<Alert | null> {
    const { fingerprint, ...rest } = alert;
    const id = await alertId(alert.session, fingerprint);
    if ((await this.readAll()).some((existing) => existing.id === id)) {
      return null;
    }
    const stored: Alert = { id, ts: new Date().toISOString(), ...rest };
    await Deno.mkdir(dirname(this.alertsPath), { recursive: true });
    await Deno.writeTextFile(this.alertsPath, JSON.stringify(stored) + "\n", {
      append: true,
    });
    return stored;
  }

  async readState(): Promise<State> {
    try {
      const state = JSON.parse(await Deno.readTextFile(this.statePath));
      return { acked: state.acked ?? [], shown: state.shown ?? [] };
    } catch {
      return { acked: [], shown: [] };
    }
  }

  private async writeState(state: State): Promise<void> {
    await Deno.mkdir(dirname(this.statePath), { recursive: true });
    await Deno.writeTextFile(this.statePath, JSON.stringify(state));
  }

  async list(options: ListOptions = {}): Promise<Alert[]> {
    const { acked } = await this.readState();
    return (await this.readAll()).filter((alert) =>
      (!options.session || alert.session === options.session) &&
      severityAtLeast(alert.severity, options.minSeverity ?? "info") &&
      (options.includeAcked || !acked.includes(alert.id))
    );
  }

  /** Marks alerts seen. Returns how many were newly acknowledged. */
  async ack(ids: string[] | "all", session?: string): Promise<number> {
    const state = await this.readState();
    const targets = ids === "all"
      ? (await this.list({ session })).map((alert) => alert.id)
      : ids;
    const fresh = targets.filter((id) => !state.acked.includes(id));
    state.acked.push(...fresh);
    await this.writeState(state);
    return fresh.length;
  }

  /** Records that the prompt hook already printed these alerts. */
  async markShown(ids: string[]): Promise<void> {
    const state = await this.readState();
    state.shown.push(...ids.filter((id) => !state.shown.includes(id)));
    await this.writeState(state);
  }
}
