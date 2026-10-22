// deno-fmt-ignore-file
import { html, useEffect, useState } from "/vendor/preact.js";

/** Displays POI catalog spots and live player coordinates. */
export function AssetsPane({ telemetry }) {
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    fetch("/api/geography")
      .then((r) => r.json())
      .then((data) => setSpots(Object.values(data)))
      .catch(() => setSpots([]));
  }, []);

  return html`
    <div class="assets-pane">
      ${telemetry?.pos && html`
        <div class="live-player-card">
          <div class="live-player-header">
            <span class="telemetry-dot"></span>
            <strong>Player (Live Game)</strong>
          </div>
          <div class="live-player-coords">
            <span>X: ${telemetry.pos[0].toFixed(2)}</span>
            <span>Y: ${telemetry.pos[1].toFixed(2)}</span>
            <span>Z: ${telemetry.pos[2].toFixed(2)}</span>
            <span>H: ${telemetry.heading?.toFixed(1) ?? 0}°</span>
          </div>
        </div>
      `}
      <div class="spots-list">
        <h4 class="spots-heading">Catalog Spots (${spots.length})</h4>
        ${spots.map((s) => html`
          <div key=${s.id} class="spot-item" title=${`ID: ${s.id}\nPos: [${s.pos.join(", ")}]\nDistrict: ${s.district}`}>
            <div class="spot-meta">
              <span class="spot-id">${s.id}</span>
              <span class="spot-cat">${s.category ?? s.group}</span>
            </div>
            <div class="spot-coords">
              ${s.pos.map((n) => n.toFixed(1)).join(", ")}
            </div>
          </div>
        `)}
      </div>
    </div>
  `;
}
