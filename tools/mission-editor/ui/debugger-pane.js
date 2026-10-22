// deno-fmt-ignore-file
import { html, useState } from "/vendor/preact.js";

/** Debugger pane showing live telemetry, F8 capture history, and event streams. */
export function DebuggerPane({ connected, telemetry, captures = [], onApplyCoords }) {
  const [filter, setFilter] = useState("all");

  const copy = (text) => {
    try { navigator.clipboard.writeText(text); } catch {}
  };

  return html`
    <div class="debugger-pane">
      <section class="debug-section">
        <h4 class="debug-heading">
          <span>Live Player HUD</span>
          <span class="telemetry-badge ${connected ? "live" : "offline"}">
            ${connected ? "15Hz Connected" : "Game Offline"}
          </span>
        </h4>
        ${telemetry?.pos ? html`
          <div class="player-hud-grid">
            <div class="hud-stat">
              <span class="hud-label">Position X</span>
              <span class="hud-value">${telemetry.pos[0].toFixed(3)}</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">Position Y</span>
              <span class="hud-value">${telemetry.pos[1].toFixed(3)}</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">Position Z</span>
              <span class="hud-value">${telemetry.pos[2].toFixed(3)}</span>
            </div>
            <div class="hud-stat">
              <span class="hud-label">Heading</span>
              <span class="hud-value">${telemetry.heading?.toFixed(1) ?? 0}°</span>
            </div>
          </div>
          <div class="hud-actions">
            <button class="mini" onClick=${() => copy(`${telemetry.pos[0].toFixed(2)}, ${telemetry.pos[1].toFixed(2)}, ${telemetry.pos[2].toFixed(2)}`)}>
              Copy Vector
            </button>
            ${onApplyCoords && html`
              <button class="mini primary" onClick=${() => onApplyCoords(telemetry.pos)}>
                Apply to Spot
              </button>
            `}
          </div>
        ` : html`
          <p class="hint">No telemetry received yet. Run GTA III with sockets.cleo to stream live position.</p>
        `}
      </section>

      <section class="debug-section">
        <h4 class="debug-heading">
          <span>F8 Captures (${captures.length})</span>
        </h4>
        <div class="captures-list">
          ${captures.length === 0 ? html`<p class="hint">Press F8 in-game to capture snapshots.</p>` : (
            captures.map((c, i) => html`
              <div key=${i} class="capture-entry">
                <div class="capture-time">${new Date(c.time || Date.now()).toLocaleTimeString()}</div>
                <div class="capture-coords">${c.pos.map((n) => n.toFixed(2)).join(", ")} (${c.heading?.toFixed(1)}°)</div>
                <div class="capture-actions">
                  <button class="icon" title="Copy" onClick=${() => copy(`${c.pos[0].toFixed(2)}, ${c.pos[1].toFixed(2)}, ${c.pos[2].toFixed(2)}`)}>📋</button>
                  ${onApplyCoords && html`
                    <button class="icon" title="Apply" onClick=${() => onApplyCoords(c.pos)}>📍</button>
                  `}
                </div>
              </div>
            `)
          )}
        </div>
      </section>
    </div>
  `;
}
