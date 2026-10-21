import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { Alert, AlertStore } from "./alerts.ts";
import type { Monitor } from "./monitor.ts";
import { SEVERITIES } from "./rules.ts";

const MAX_TAIL_CHARS = 20_000;

const text = (body: string, structured?: Record<string, unknown>) => ({
  content: [{ type: "text" as const, text: body }],
  ...(structured ? { structuredContent: structured } : {}),
});

const failure = (message: string) => ({
  content: [{ type: "text" as const, text: `Error: ${message}` }],
  isError: true,
});

function formatAlert(alert: Alert, current: string): string {
  const stale = alert.session === current ? "" : " (stale session)";
  const lines = [
    `[${alert.severity}] ${alert.id} ${alert.title}${stale}`,
    `  ${alert.source}: ${alert.line}`,
  ];
  if (alert.hint) lines.push(`  hint: ${alert.hint}`);
  if (alert.report) lines.push(`  report: ${alert.report}`);
  return lines.join("\n");
}

export function registerTools(
  server: McpServer,
  monitor: Monitor,
  store: AlertStore,
): void {
  const sourceIds = monitor.logSources.map((source) => source.id) as [
    string,
    ...string[],
  ];

  server.registerTool("gamelog_get_alerts", {
    title: "Get Game Log Alerts",
    description:
      `List problems detected in the GTA III logs (cleo, cleo_redux, modloader, scrlog, debug_ini, d3d8) and game process exits.
Read-only. Defaults to unacknowledged alerts from the current game session.

Args:
  - session ('current' | 'all' | a session id): which session to list (default 'current')
  - min_severity ('info' | 'warn' | 'error' | 'critical'): default 'info'
  - include_acked (boolean): include acknowledged alerts (default false)
  - limit (number): newest N alerts (default 50)

Returns: text list plus structuredContent { session, running, total, alerts[] }. Each alert has id, severity, source, title, line, hint, and report (a path to a matching bug report).
Use gamelog_ack_alerts with the ids once handled.`,
    inputSchema: {
      session: z.string().default("current").describe(
        "'current', 'all', or a session id",
      ),
      min_severity: z.enum(SEVERITIES as [string, ...string[]]).default("info"),
      include_acked: z.boolean().default(false),
      limit: z.number().int().min(1).max(200).default(50),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async ({ session, min_severity, include_acked, limit }) => {
    const alerts = await store.list({
      session: session === "all"
        ? undefined
        : session === "current"
        ? monitor.session
        : session,
      minSeverity: min_severity as never,
      includeAcked: include_acked,
    });
    const shown = alerts.slice(-limit);
    const body = shown.length
      ? shown.map((alert) => formatAlert(alert, monitor.session)).join("\n")
      : `No alerts for session ${
        session === "current" ? monitor.session : session
      }.`;
    return text(
      `Session ${monitor.session}, game ${
        monitor.running ? "running" : "not running"
      }, ${alerts.length} alert(s).\n${body}`,
      {
        session: monitor.session,
        running: monitor.running,
        total: alerts.length,
        alerts: shown,
      },
    );
  });

  server.registerTool("gamelog_ack_alerts", {
    title: "Acknowledge Game Log Alerts",
    description:
      `Mark alerts as handled so gamelog_get_alerts and the prompt hook stop listing them.

Args:
  - ids (string[] | 'all'): alert ids from gamelog_get_alerts, or 'all' for every open alert in the current session

Returns: how many alerts were newly acknowledged.`,
    inputSchema: {
      ids: z.union([z.literal("all"), z.array(z.string()).min(1)]),
    },
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async ({ ids }) => {
    const count = await store.ack(ids, monitor.session);
    return text(`Acknowledged ${count} alert(s).`, { acknowledged: count });
  });

  server.registerTool("gamelog_tail_log", {
    title: "Tail Game Log",
    description:
      `Read the last lines of a watched GTA III log, optionally filtered by a regex.
Read-only.

Args:
  - log (${sourceIds.join(" | ")})
  - lines (number): last N matching lines, 1-500 (default 50)
  - pattern (string): optional case-insensitive regex; only matching lines are kept

Returns the lines as text. Output is capped at ${MAX_TAIL_CHARS} characters.
scrlog is large (hundreds of KB): pass a pattern or a small 'lines'.`,
    inputSchema: {
      log: z.enum(sourceIds),
      lines: z.number().int().min(1).max(500).default(50),
      pattern: z.string().optional(),
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async ({ log, lines, pattern }) => {
    const source = monitor.findSource(log)!;
    let content: string;
    try {
      content = await Deno.readTextFile(monitor.pathOf(source));
    } catch {
      return failure(
        `${monitor.pathOf(source)} does not exist yet. Launch the game once.`,
      );
    }
    let kept = content.split(/\r?\n/);
    if (pattern) {
      try {
        const re = new RegExp(pattern, "i");
        kept = kept.filter((line) => re.test(line));
      } catch (error) {
        return failure(`Invalid pattern: ${(error as Error).message}`);
      }
    }
    let out = kept.slice(-lines).join("\n");
    if (out.length > MAX_TAIL_CHARS) out = "...\n" + out.slice(-MAX_TAIL_CHARS);
    return text(out || "(no matching lines)");
  });

  server.registerTool("gamelog_game_status", {
    title: "Get Game Status",
    description:
      `Report whether gta3.exe is running, the current session id, the last exit, and the size and modified time of each watched log.
Read-only. Returns structuredContent { running, pid, session, lastExit, logs[] }.`,
    inputSchema: {},
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async () => {
    const status = await monitor.status();
    const open = (await store.list({ session: status.session })).length;
    const body = [
      `Game ${
        status.running ? `running (pid ${status.pid})` : "not running"
      }; session ${status.session}; ${open} open alert(s).`,
      status.lastExit
        ? `Last exit: ${status.lastExit.at} (session ${status.lastExit.session}).`
        : "No exit seen yet.",
      ...status.logs.map((log) =>
        `${log.id}: ${
          log.exists
            ? `${log.bytes} bytes, modified ${log.modified}`
            : "missing"
        }`
      ),
    ].join("\n");
    return text(body, { ...status, openAlerts: open });
  });

  server.registerTool("gamelog_clear_logs", {
    title: "Clear Game Logs",
    description:
      `Empty every watched GTA III log file (cleo, cleo_redux, modloader, scrlog, debug_ini, d3d8) so the next run starts clean.
Destructive to log contents only. Refuses while the game is running. Alerts already recorded stay in dist/game-alerts.jsonl.

Returns the ids of the logs that were emptied.`,
    inputSchema: {},
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: false,
    },
  }, async () => {
    try {
      const cleared = await monitor.clearLogs();
      return text(`Cleared: ${cleared.join(", ") || "nothing to clear"}.`, {
        cleared,
      });
    } catch (error) {
      return failure((error as Error).message);
    }
  });
}
