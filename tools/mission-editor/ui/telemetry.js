// deno-fmt-ignore-file
import { html, useEffect, useState } from "/vendor/preact.js";

/**
 * Hook that subscribes to the game's telemetry SSE bridge, /api/telemetry in server.ts.
 *
 * @remarks Events: `status` (on connect: the last position, every channel's last reading, the channel names, and
 * whether a run is under way), `telemetry` and `capture` (positions), `debug` (one reading of a DEBUG_* channel),
 * `names`, `run` (`building`, `running`, `done`), `log` (a line of the run's output), `exit` (crash or normal quit),
 * and a 1 Hz `ping`. `POST /api/run` answers 202 at once; everything after it arrives as these events.
 */
export function useTelemetry(projectQuery) {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [capture, setCapture] = useState(null);
  const [captures, setCaptures] = useState([]);
  // A run in progress or just ended: { state: "building" | "running" | "done", code?, error? }
  const [runState, setRunState] = useState(null);
  const [runLog, setRunLog] = useState([]);
  // How the last run's game ended: { code, known, crashed, signs, exception? }
  const [exit, setExit] = useState(null);
  // The newest reading of each debug channel by channel number, the last 200 readings, and the channel names
  const [debugValues, setDebugValues] = useState({});
  const [debugLog, setDebugLog] = useState([]);
  const [names, setNames] = useState({});
  const running = runState?.state === "building" || runState?.state === "running";

  useEffect(() => {
    const es = new EventSource("/api/telemetry");

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(data.connected);
        if (data.pos) setTelemetry(data);
        if (data.names) setNames(data.names);
        if (data.debug) {
          setDebugValues(Object.fromEntries(data.debug.map((d) => [d.channel, d])));
        }
        if (data.running) setRunState((prev) => prev ?? { state: "running" });
      } catch {}
    });

    es.addEventListener("debug", (e) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(true);
        setDebugValues((prev) => ({ ...prev, [data.channel]: data }));
        setDebugLog((prev) => [data, ...prev.slice(0, 199)]);
      } catch {}
    });

    es.addEventListener("names", (e) => {
      try {
        setNames(JSON.parse(e.data));
      } catch {}
    });

    es.addEventListener("run", (e) => {
      try {
        setRunState(JSON.parse(e.data));
      } catch {}
    });

    es.addEventListener("log", (e) => {
      try {
        const { line } = JSON.parse(e.data);
        setRunLog((prev) => [...prev.slice(-199), line]);
      } catch {}
    });

    es.addEventListener("exit", (e) => {
      try {
        setExit(JSON.parse(e.data));
      } catch {}
    });

    es.addEventListener("telemetry", (e) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(true);
        setTelemetry(data);
      } catch {}
    });

    es.addEventListener("capture", (e) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(true);
        setTelemetry(data);
        setCapture(data);
        setCaptures((prev) => [data, ...prev.slice(0, 49)]);
      } catch {}
    });

    es.addEventListener("ping", (e) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(data.connected);
      } catch {}
    });

    es.onerror = () => setConnected(false);

    return () => es.close();
  }, []);

  /** Builds, installs, and launches the game; its telemetry, output, and exit arrive as SSE events. */
  const runInGame = async () => {
    if (running) return;
    setExit(null);
    setRunLog([]);
    setDebugLog([]);
    setRunState({ state: "building" });
    try {
      const res = await fetch(`/api/run?${projectQuery}`, { method: "POST" });
      if (!res.ok) {
        // The API answers { error } as JSON; show its message, not the raw body
        const body = await res.text();
        let error = body;
        try { error = JSON.parse(body).error ?? body; } catch {}
        setRunState({ state: "done", error });
      }
    } catch (e) {
      setRunState({ state: "done", error: String(e) });
    }
  };

  /** Ends the run and the game it started; the `run` event then reports it done and stopped. */
  const stopGame = async () => {
    try { await fetch("/api/stop", { method: "POST" }); } catch {}
  };

  return {
    connected, telemetry, capture, captures, setCapture, runInGame, stopGame, running,
    runState, runLog, exit, debugValues, debugLog, names,
  };
}

/** Status pill in header: Red (disconnected), Green (live 15Hz telemetry). */
export function TelemetryPill({ connected, telemetry }) {
  const title = connected
    ? `Game Connected (15Hz)\nPos: ${telemetry?.pos ? telemetry.pos.map((n) => n.toFixed(1)).join(", ") : "waiting"}\nHeading: ${telemetry?.heading?.toFixed(1) ?? 0}°`
    : "Game Disconnected (Start GTA III with sockets.cleo)";

  return html`
    <div class="telemetry-pill ${connected ? "connected" : "disconnected"}" title=${title}>
      <span class="telemetry-dot"></span>
      <span class="telemetry-label">${connected ? "Live" : "Offline"}</span>
    </div>
  `;
}

/** Toast alert when F8 is pressed in game. */
export function CaptureToast({ capture, onDismiss }) {
  if (!capture) return null;
  const coords = capture.pos ? capture.pos.map((n) => n.toFixed(2)).join(", ") : "";

  return html`
    <div class="capture-toast" onClick=${onDismiss} title="Click to dismiss">
      <span class="capture-icon">📍</span>
      <div class="capture-body">
        <strong>F8 Position Captured</strong>
        <span>[${coords}], Heading: ${capture.heading?.toFixed(1)}°</span>
      </div>
    </div>
  `;
}
