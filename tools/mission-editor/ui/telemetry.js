// deno-fmt-ignore-file
import { html, useEffect, useState } from "/vendor/preact.js";

/** Hook that subscribes to the game's UDP telemetry SSE bridge. */
export function useTelemetry(projectQuery) {
  const [connected, setConnected] = useState(false);
  const [telemetry, setTelemetry] = useState(null);
  const [capture, setCapture] = useState(null);
  const [captures, setCaptures] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const es = new EventSource("/api/telemetry");

    es.addEventListener("status", (e) => {
      try {
        const data = JSON.parse(e.data);
        setConnected(data.connected);
        if (data.pos) setTelemetry(data);
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

  const runInGame = async () => {
    if (running) return;
    setRunning(true);
    try {
      await fetch(`/api/run?${projectQuery}`, { method: "POST" });
    } catch (e) {
      console.error("Run in game failed:", e);
    } finally {
      setRunning(false);
    }
  };

  return { connected, telemetry, capture, captures, setCapture, runInGame, running };
}

/** Status pill in header: Red (disconnected), Green (live 15Hz telemetry). */
export function TelemetryPill({ connected, telemetry }) {
  const title = connected
    ? `Game Connected (15Hz)\nPos: ${telemetry?.pos ? telemetry.pos.map((n) => n.toFixed(1)).join(", ") : "waiting"}\nHeading: ${telemetry?.heading?.toFixed(1) ?? 0}°`
    : "Game Disconnected (Start GTA III with sockets.cleo)";

  return html`
    <div class="telemetry-pill ${connected ? "connected" : "disconnected"}" title=${title}>
      <span class="telemetry-dot"></span>
      <span class="telemetry-label">${connected ? "Game Live" : "Game Offline"}</span>
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
