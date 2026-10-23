// deno-fmt-ignore-file
import { html, useRef, useState } from "/vendor/preact.js";
import { PauseIcon, StepInIcon, StepOutIcon, StepOverIcon } from "./icons.js";

const svg = (paths) => html`<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
const CopyIcon = () => svg(html`<rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" />`);
const CheckIcon = () => svg(html`<path d="M5 12.5l4.5 4.5L19 7.5" />`);

const ACTIONS = [
  { label: "Pause / Resume", Icon: PauseIcon },
  { label: "Step Out", Icon: StepOutIcon },
  { label: "Step Over", Icon: StepOverIcon },
  { label: "Step In", Icon: StepInIcon },
];

/**
 * Execution controls for the pane's heading. All are disabled: pausing and stepping the game's scripts needs
 * the bidirectional UDP control that has not been built (geography-system-and-cleo-plugin.md, Phase 5).
 */
export function DebugControls() {
  return html`
    <div class="button-group" role="group" aria-label="Execution">
      ${ACTIONS.map(({ label, Icon }) => html`
        <button key=${label} disabled title=${`${label} (not built yet)`}><${Icon} /><span class="sr-only">${label}</span></button>
      `)}
    </div>
  `;
}

/** An icon button that copies `text` to the clipboard and shows a green checkmark for a moment. */
function CopyButton({ text, label = "Copy", class: className = "" }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { return; }
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1500);
  };
  return html`
    <button class="icon copy ${copied ? "copied" : ""} ${className}" aria-label=${copied ? "Copied" : label} title=${copied ? "Copied" : label} onClick=${copy}>
      ${copied ? html`<${CheckIcon} />` : html`<${CopyIcon} />`}
    </button>
  `;
}

/**
 * Debugger pane showing live telemetry, F8 capture history, and event streams.
 *
 * @remarks Identifiers, file names, and literal values are `<code>`, keys are `<kbd>`, and program output is
 * `<samp>`, so they read apart from the prose around them.
 */
export function DebuggerPane({
  telemetry, captures = [], onApplyCoords,
  runState, runLog = [], exit, debugValues = {}, debugLog = [], names = {},
}) {
  const [channel, setChannel] = useState("all");
  const channelName = (n) => names[n] ?? `Channel ${n}`;
  const watches = Object.values(debugValues).sort((a, b) => a.channel - b.channel);
  const logged = debugLog.filter((d) => channel === "all" || String(d.channel) === channel);
  const kindLabel = { i: "int", f: "float", c: "count", t: "trace" };
  // A DEBUG_* name is an identifier from constants.txt, so it reads as code; the "Channel 9" fallback is plain text
  const channelLabel = (n) => names[n] ? html`<code>${names[n]}</code>` : `Channel ${n}`;
  // File names inside a sentence, e.g. "cleo.log has no shutdown marker", read as code
  const withFiles = (text) => text.split(/([\w-]+\.(?:log|cleo|txt|scm|jsonl))/).map((part, i) => i % 2 ? html`<code>${part}</code>` : part);

  return html`
    <div class="debugger-pane">
      <section class="debug-section">
        <h4 class="debug-heading">
          <span>Player</span>
        </h4>
        ${telemetry?.pos ? html`
          <div class="player-hud-grid">
            <${CopyButton} class="hud-copy" label="Copy Vector" text=${telemetry.pos.map((n) => n.toFixed(2)).join(", ")} />
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
          ${onApplyCoords && html`
            <div class="hud-actions">
              <button class="primary" onClick=${() => onApplyCoords(telemetry.pos)}>
                Apply to Spot
              </button>
            </div>
          `}
        ` : html`
          <p class="hint">No telemetry received yet. Run GTA III with <code>sockets.cleo</code> to stream live position.</p>
        `}
      </section>

      <section class="debug-section">
        <h4 class="debug-heading">
          <span>Game Run</span>
          <span class="telemetry-badge ${runState?.state === "running" ? "live" : "offline"}">
            ${runState ? ({ building: "Building", running: "Running", done: runState.stopped ? "Stopped" : "Exited" })[runState.state] : "Not Started"}
          </span>
        </h4>
        ${runState?.error && html`<p class="hint">${runState.error}</p>`}
        ${exit && html`
          <p class="run-verdict ${exit.crashed ? "crashed" : "normal"}">
            ${!exit.known ? "No game log was written, so a crash cannot be ruled in or out."
              : exit.crashed ? html`The game crashed: ${exit.signs.flatMap((sign, i) => [i ? "; " : "", ...withFiles(sign)])}`
              : "The game exited normally."}
          </p>
          ${exit.exception && html`<code class="run-exception">${exit.exception}</code>`}
        `}
        ${runLog.length > 0 && html`
          <pre class="run-log"><samp>${runLog.slice(-12).join("\n")}</samp></pre>
        `}
        ${!runState && html`<p class="hint">Press Run to build, install, and launch the game with telemetry.</p>`}
      </section>

      <section class="debug-section">
        <h4 class="debug-heading">
          <span>Watches (${watches.length})</span>
        </h4>
        ${watches.length === 0 ? html`
          <p class="hint">Readings from <code>debugLogInt</code>, <code>debugLogFloat</code>, <code>debugCount</code>, and <code>debugTrace</code> in the scripts appear here.</p>
        ` : html`
          <div class="watch-list">
            ${watches.map((d) => html`
              <div key=${d.channel} class="watch-row">
                <span class="watch-name">${channelLabel(d.channel)}</span>
                <span class="watch-kind">${kindLabel[d.kind] ?? d.kind}</span>
                <code class="watch-value">${d.value}</code>
              </div>
            `)}
          </div>
          <div class="hud-actions">
            <select value=${channel} onChange=${(e) => setChannel(e.target.value)}>
              <option value="all">All Channels</option>
              ${watches.map((d) => html`<option key=${d.channel} value=${String(d.channel)}>${channelName(d.channel)}</option>`)}
            </select>
          </div>
          <div class="captures-list">
            ${logged.slice(0, 50).map((d, i) => html`
              <div key=${i} class="capture-entry">
                <div class="capture-time">${new Date(d.time).toLocaleTimeString()}</div>
                <div class="capture-coords">${channelLabel(d.channel)} = <code>${d.value}</code></div>
              </div>
            `)}
          </div>
        `}
      </section>

      <section class="debug-section">
        <h4 class="debug-heading">
          <span>Captures (${captures.length})</span>
        </h4>
        <div class="captures-list">
          ${captures.length === 0 ? html`<p class="hint">Press <kbd>F8</kbd> in-game to capture snapshots.</p>` : (
            captures.map((c, i) => html`
              <div key=${i} class="capture-entry">
                <div class="capture-time">${new Date(c.time || Date.now()).toLocaleTimeString()}</div>
                <code class="capture-coords">${c.pos.map((n) => n.toFixed(2)).join(", ")} (${c.heading?.toFixed(1)}°)</code>
                <div class="capture-actions">
                  <${CopyButton} text=${c.pos.map((n) => n.toFixed(2)).join(", ")} />
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
