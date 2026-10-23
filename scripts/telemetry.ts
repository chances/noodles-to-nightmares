/**
 * telemetry.ts
 *
 * Parses the UDP datagrams that plugins/sockets (sockets.cleo) sends to 127.0.0.1:8089, captures them while the
 * game runs, and reads the DEBUG_* channel names out of constants.txt.
 *
 * @remarks One datagram is one reading: `POS:x,y,z,heading` (15 Hz) and `CAPTURE:x,y,z,heading` (F8) from opcode
 * 0B30, and `DBG:<channel>,<i|f|c|t>,<value>` from opcode 0B31 (int, float, counter, trace step; see
 * plugins/sockets/sockets.cpp for when each is sent). Both the editor server and `deno task run` listen on UDP
 * 8089, so only one can hold the port: the server lets go of it for a run and takes the run's packets from its
 * `--events` output (run-events.ts). `listenTelemetry` checks the net permission first because node:dgram reports a
 * denied bind as an uncaught error, not a rejection.
 */

import dgram from "node:dgram";

export const TELEMETRY_PORT = 8089;

export type DebugKind = "i" | "f" | "c" | "t";

export type Packet =
  | { type: "debug"; channel: number; kind: DebugKind; value: number }
  | {
    type: "pos" | "capture";
    pos: [x: number, y: number, z: number];
    heading: number;
  };

/** One datagram as a packet, or `null` when it is neither a position, a capture, nor a debug reading. */
export function parsePacket(raw: string): Packet | null {
  const text = raw.trim();
  if (text.startsWith("DBG:")) {
    const [channel, kind, value] = text.slice(4).split(",");
    const number = Number(value);
    if (
      !/^\d+$/.test(channel ?? "") || !"ifct".includes(kind ?? "x") ||
      kind.length !== 1 || value === undefined || value === "" ||
      Number.isNaN(number)
    ) {
      return null;
    }
    return {
      type: "debug",
      channel: Number(channel),
      kind: kind as DebugKind,
      value: number,
    };
  }
  const capture = text.startsWith("CAPTURE:");
  if (capture || text.startsWith("POS:")) {
    const [x, y, z, heading] = text.slice(capture ? 8 : 4).split(",").map(
      Number,
    );
    if ([x, y, z, heading].some((n) => n === undefined || Number.isNaN(n))) {
      return null;
    }
    return { type: capture ? "capture" : "pos", pos: [x, y, z], heading };
  }
  return null;
}

/** What a debug channel reported over a capture. */
export interface ChannelStats {
  kind: DebugKind;
  count: number;
  last: number;
  min: number;
  max: number;
}

/** A packet with the milliseconds since the capture began. */
export type TimedPacket = Packet & { t: number };

export interface Summary {
  packets: number;
  channels: Map<number, ChannelStats>;
  positions: number;
  captures: number;
  lastPosition?: TimedPacket;
  /** The newest events, oldest first: the last thing the game said before it exited. */
  recent: TimedPacket[];
}

/** Position packets arrive at 15 Hz; the log keeps one per second. */
const POSITION_LOG_MS = 1000;
const RECENT_EVENTS = 12;

/**
 * Listens on `port` and hands every datagram that parses to `onPacket`. Returns `null` when the port is taken,
 * for example by another listener. `close` releases the port.
 */
export async function listenTelemetry(
  port: number,
  onPacket: (packet: Packet) => void,
): Promise<{ close: () => Promise<void> } | null> {
  // node:dgram reports a denied bind as an uncaught error, not a rejection, so ask first
  const net = Deno.permissions.querySync({
    name: "net",
    host: `127.0.0.1:${port}`,
  });
  if (net.state !== "granted") return null;
  const socket = dgram.createSocket("udp4");
  try {
    await new Promise<void>((resolve, reject) => {
      socket.once("error", reject);
      socket.bind(port, "127.0.0.1", () => {
        socket.off("error", reject);
        resolve();
      });
    });
  } catch {
    socket.close();
    return null;
  }
  socket.on("message", (bytes) => {
    const packet = parsePacket(bytes.toString("utf8"));
    if (packet) onPacket(packet);
  });
  return {
    close: () => new Promise<void>((resolve) => socket.close(() => resolve())),
  };
}

/**
 * Listens on `port` and appends every debug reading, capture, and one position a second to `logPath` as JSON
 * lines. Returns `null` when the port is taken, for example by the mission editor, which listens on the same one.
 * `onEvent` sees every packet, positions at their full 15 Hz rate. `stop` waits a moment for the last datagrams,
 * closes the socket and the log, and returns the summary.
 */
export async function startCapture(
  port: number,
  logPath: string,
  onEvent?: (event: TimedPacket) => void,
): Promise<{ stop: () => Promise<Summary> } | null> {
  const started = Date.now();
  const summary: Summary = {
    packets: 0,
    channels: new Map(),
    positions: 0,
    captures: 0,
    recent: [],
  };
  let lastPositionLogged = -POSITION_LOG_MS;
  let file: Deno.FsFile | undefined;
  const encoder = new TextEncoder();

  const listener = await listenTelemetry(port, (packet) => {
    const event: TimedPacket = { ...packet, t: Date.now() - started };
    summary.packets++;
    onEvent?.(event);
    if (event.type === "debug") {
      const stats = summary.channels.get(event.channel);
      summary.channels.set(
        event.channel,
        stats
          ? {
            kind: event.kind,
            count: stats.count + 1,
            last: event.value,
            min: Math.min(stats.min, event.value),
            max: Math.max(stats.max, event.value),
          }
          : {
            kind: event.kind,
            count: 1,
            last: event.value,
            min: event.value,
            max: event.value,
          },
      );
    } else if (event.type === "capture") {
      summary.captures++;
    } else {
      summary.positions++;
      summary.lastPosition = event;
      if (event.t - lastPositionLogged < POSITION_LOG_MS) return;
      lastPositionLogged = event.t;
    }
    summary.recent.push(event);
    if (summary.recent.length > RECENT_EVENTS) summary.recent.shift();
    file?.writeSync(encoder.encode(JSON.stringify(event) + "\n"));
  });
  if (!listener) return null;
  file = await Deno.open(logPath, {
    create: true,
    write: true,
    truncate: true,
  });
  return {
    stop: async () => {
      await new Promise((resolve) => setTimeout(resolve, 250));
      await listener.close();
      file?.close();
      return summary;
    },
  };
}

/** The `DEBUG_*` constants of constants.txt as a map from channel to name, e.g. 9 to `MY_CAR`. */
export function debugNames(constants: string): Map<number, string> {
  const names = new Map<number, string>();
  for (const match of constants.matchAll(/^const DEBUG_(\w+)\s*=\s*(\d+)/gm)) {
    names.set(Number(match[2]), match[1]);
  }
  return names;
}
