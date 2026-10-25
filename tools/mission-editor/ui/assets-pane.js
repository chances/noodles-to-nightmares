// deno-fmt-ignore-file
import { html, useEffect, useRef, useState } from "/vendor/preact.js";
import { FilterIcon } from "./icons.js";
import { Overlay } from "./overlay.js";

const KNOWN_DISTRICTS = ["Portland", "Staunton Island", "Shoreside Vale"];

const ACRONYMS = new Set(["npc", "poi", "hud", "id", "fsm", "gta", "lod"]);

export function toTitleCase(str) {
  if (!str) return "";
  return String(str)
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .map((word) => ACRONYMS.has(word.toLowerCase()) ? word.toUpperCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
const STORAGE_PREFIX = "mission-editor.asset-filters";
const storageKey = (project) => `${STORAGE_PREFIX}.${project ?? "default"}`;

function loadFilters(project) {
  try {
    const raw = localStorage.getItem(storageKey(project));
    if (!raw) return { districts: [], categories: [], proximity: { enabled: false, radius: 200 } };
    const parsed = JSON.parse(raw);
    return {
      districts: Array.isArray(parsed.districts) ? parsed.districts : [],
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
      proximity: {
        enabled: Boolean(parsed.proximity?.enabled),
        radius: Number.isFinite(parsed.proximity?.radius) ? parsed.proximity.radius : 200,
      },
    };
  } catch {
    return { districts: [], categories: [], proximity: { enabled: false, radius: 200 } };
  }
}

function saveFilters(project, filters) {
  try {
    localStorage.setItem(storageKey(project), JSON.stringify(filters));
  } catch { /* ignore */ }
}

/** Hook managing asset catalog filters with localStorage persistence. */
export function useAssetFilters(project) {
  const [filters, setFiltersState] = useState(() => loadFilters(project));

  const setFilters = (updater) => {
    setFiltersState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveFilters(project, next);
      return next;
    });
  };

  const clearAll = () => setFilters({ districts: [], categories: [], proximity: { enabled: false, radius: 200 } });

  const toggleDistrict = (district) => {
    setFilters((prev) => {
      const exists = prev.districts.includes(district);
      const districts = exists ? prev.districts.filter((d) => d !== district) : [...prev.districts, district];
      return { ...prev, districts };
    });
  };

  const removeDistrict = (district) => {
    setFilters((prev) => ({ ...prev, districts: prev.districts.filter((d) => d !== district) }));
  };

  const toggleCategory = (cat) => {
    setFilters((prev) => {
      const exists = prev.categories.includes(cat);
      const categories = exists ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat];
      return { ...prev, categories };
    });
  };

  const removeCategory = (cat) => {
    setFilters((prev) => ({ ...prev, categories: prev.categories.filter((c) => c !== cat) }));
  };

  const toggleProximity = () => {
    setFilters((prev) => ({
      ...prev,
      proximity: { ...prev.proximity, enabled: !prev.proximity.enabled },
    }));
  };

  const setProximityRadius = (radius) => {
    setFilters((prev) => ({
      ...prev,
      proximity: { ...prev.proximity, radius: Number(radius) },
    }));
  };

  const resetProximity = () => {
    setFilters((prev) => ({
      ...prev,
      proximity: { ...prev.proximity, enabled: false },
    }));
  };

  return {
    filters,
    setFilters,
    clearAll,
    toggleDistrict,
    removeDistrict,
    toggleCategory,
    removeCategory,
    toggleProximity,
    setProximityRadius,
    resetProximity,
  };
}

/** The "Choose Filters" icon button and its popover. */
export function AssetsFilterButton({ filterState, telemetry, projectQuery }) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const hostRef = useRef(null);
  const [availableCategories, setAvailableCategories] = useState([]);

  useEffect(() => {
    fetch(`/api/geography${projectQuery ? `?${projectQuery}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        const spots = Object.values(data);
        const cats = Array.from(new Set(spots.map((s) => s.category ?? s.group).filter(Boolean))).sort();
        setAvailableCategories(cats);
      })
      .catch(() => {});
  }, [projectQuery]);

  useEffect(() => {
    if (!open) return;
    const outside = (e) => {
      if (buttonRef.current?.contains(e.target)) return;
      if (hostRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const esc = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const { filters, clearAll, toggleDistrict, toggleCategory, toggleProximity, setProximityRadius } = filterState;
  const hasActive = filters.districts.length > 0 || filters.categories.length > 0 || filters.proximity.enabled;

  return html`
    <div class="menu-anchor">
      <button
        ref=${buttonRef}
        class="icon ${hasActive ? "active" : ""}"
        title="Choose Filters"
        aria-label="Choose Filters"
        aria-haspopup="dialog"
        aria-expanded=${open}
        onClick=${() => setOpen(!open)}
      >
        <${FilterIcon} />
      </button>
      ${open && html`
        <${Overlay} hostRef=${hostRef} align="end">
          <div class="filter-popover" role="dialog" aria-label="Asset Filters">
            <div class="filter-popover-header">
              <h4>Filters</h4>
              <button class="link filter-clear-btn" disabled=${!hasActive} onClick=${clearAll}>Clear all</button>
            </div>
            <div class="filter-section">
              <span class="filter-section-title">Districts</span>
              <div class="filter-chips-row">
                ${KNOWN_DISTRICTS.map((d) => html`
                  <button type="button" key=${d} class="chip toggle-chip ${filters.districts.includes(d) ? "selected" : ""}" aria-pressed=${filters.districts.includes(d)} onClick=${() => toggleDistrict(d)}>${d}</button>

                      




                  
                `)}
              </div>
            </div>
            ${availableCategories.length > 0 && html`
              <div class="filter-section">
                <span class="filter-section-title">Categories</span>
                <div class="filter-chips-row scrollable">
                  ${availableCategories.map((c) => html`
                    <button type="button" key=${c} class="chip toggle-chip ${filters.categories.includes(c) ? "selected" : ""}" aria-pressed=${filters.categories.includes(c)} onClick=${() => toggleCategory(c)}>${toTitleCase(c)}</button>
  
                        


  
  
                    
                  `)}
                </div>
              </div>
            `}
            <div class="filter-section">
              <span class="filter-section-title">Proximity</span>
              <div class="filter-chips-row">
                <button
                  type="button"
                  class="chip toggle-chip ${filters.proximity.enabled ? "selected" : ""}"
                  aria-pressed=${filters.proximity.enabled}
                  onClick=${toggleProximity}
                >
                  Filter by Radius
                </button>
              </div>

                  




              
              ${filters.proximity.enabled && html`
                <div class="proximity-slider-row">
  
                    <input
                      type="range"
                    min="25"
                    max="1000"
                    step="25"
                    value=${filters.proximity.radius}
                    onInput=${(e) => setProximityRadius(e.currentTarget.value)}
                  />
  
                  <span class="proximity-readout">${filters.proximity.radius}m</span>
                </div>
              `}
              <p class="hint proximity-hint">
                ${telemetry?.pos ? "Relative to live player position." : "Relative to world origin [0,0,0] (game offline)."}
              </p>
            </div>
          </div>
        <//>
      `}
    </div>
  `;
}

/** Active dismissible chips grouped by row, rendered below hgroup in pane-bar. */
export function AssetsFilterBar({ filterState, telemetry }) {
  const { filters, removeDistrict, removeCategory, resetProximity } = filterState;
  const hasDistricts = filters.districts.length > 0;
  const hasCategories = filters.categories.length > 0;
  const hasProximity = filters.proximity.enabled;

  if (!hasDistricts && !hasCategories && !hasProximity) return null;

  return html`
    <div class="filter-chips-container" role="region" aria-label="Active Filters">
      ${hasDistricts && html`
        <div class="filter-chips-row">
          ${filters.districts.map((d) => html`
            <span key=${d} class="filter-chip">
              <span>${d}</span>
              <button class="filter-chip-remove" title="Remove ${d}" onClick=${() => removeDistrict(d)}>×</button>
            </span>
          `)}
        </div>
      `}
      ${hasCategories && html`
        <div class="filter-chips-row">
          ${filters.categories.map((c) => html`
            <span key=${c} class="filter-chip">
              <span>${toTitleCase(c)}</span>
              <button class="filter-chip-remove" title="Remove ${toTitleCase(c)}" onClick=${() => removeCategory(c)}>×</button>
            </span>
          `)}
        </div>
      `}
      ${hasProximity && html`
        <div class="filter-chips-row">
          <span class="filter-chip">
            <span>≤ ${filters.proximity.radius}m (${telemetry?.pos ? "Player" : "Origin"})</span>
            <button class="filter-chip-remove" title="Remove proximity filter" onClick=${resetProximity}>×</button>
          </span>
        </div>
      `}
    </div>
  `;
}

/** Displays filtered POI catalog spots and live player coordinates. */
export function AssetsPane({ telemetry, filterState, projectQuery }) {
  const [spots, setSpots] = useState([]);

  useEffect(() => {
    fetch(`/api/geography${projectQuery ? `?${projectQuery}` : ""}`)
      .then((r) => r.json())
      .then((data) => setSpots(Object.values(data)))
      .catch(() => setSpots([]));
  }, [projectQuery]);

  const filters = filterState?.filters ?? { districts: [], categories: [], proximity: { enabled: false, radius: 200 } };
  const center = telemetry?.pos ? telemetry.pos : [0, 0, 0];

  const filteredSpots = spots.filter((s) => {
    if (filters.districts.length > 0 && !filters.districts.includes(s.district)) {
      return false;
    }
    const cat = s.category ?? s.group;
    if (filters.categories.length > 0 && !filters.categories.includes(cat)) {
      return false;
    }
    if (filters.proximity.enabled) {
      const dist = Math.hypot(s.pos[0] - center[0], s.pos[1] - center[1], s.pos[2] - center[2]);
      if (dist > filters.proximity.radius) return false;
    }
    return true;
  });

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
        <h4 class="spots-heading">Spots (${filteredSpots.length}${filteredSpots.length !== spots.length ? ` of ${spots.length}` : ""})</h4>
        <p class="hint">Also known as a <abbr title="Point of Interest">POI</abbr>.</p>
        ${filteredSpots.length === 0 ? html`
          <div class="empty-spots-hint">
            <p>No spots match the selected filters.</p>
            ${filterState?.clearAll && html`
              <button class="link" onClick=${filterState.clearAll}>Clear Filters</button>
            `}
          </div>
        ` : filteredSpots.map((s) => html`
          <div key=${s.id} class="spot-item" title=${`ID: ${s.id}\nPos: [${s.pos.join(", ")}]\nDistrict: ${s.district}`}>
            <div class="spot-meta">
              <span class="spot-id">${s.id}</span>
              <span class="spot-cat">${toTitleCase(s.category ?? s.group)}</span>
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
