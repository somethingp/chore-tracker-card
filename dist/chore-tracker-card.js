/**
 * Chore Tracker Card — Home Assistant Lovelace Custom Card
 *
 * Stores all chore data in a single HA input_text helper as JSON.
 * No add-on, no API calls, no auth issues — uses hass.callService()
 * which works natively in any Lovelace card.
 *
 * Setup:
 *   1. Create a Helper: Settings → Devices & Services → Helpers → + Add → Text
 *      Name it "Chore Tracker Data", entity ID will be input_text.chore_tracker_data
 *      Set max length to 255 — then go to configuration.yaml and set it to 10000
 *      (see README for the configuration.yaml snippet)
 *   2. Add the card:
 *        type: custom:chore-tracker-card
 *        title: Chores
 *        entity: input_text.chore_tracker_data
 */

const VERSION = "2.0.0";
const MS_DAY = 86_400_000;

const DEFAULT_CHORES = [
  { id: 1, name: "Vacuum living room",  freqDays: 7,  lastDone: null, lastBy: null, history: [] },
  { id: 2, name: "Take out trash",      freqDays: 3,  lastDone: null, lastBy: null, history: [] },
  { id: 3, name: "Clean kitchen",       freqDays: 2,  lastDone: null, lastBy: null, history: [] },
  { id: 4, name: "Wipe bathroom",       freqDays: 7,  lastDone: null, lastBy: null, history: [] },
  { id: 5, name: "Mop floors",          freqDays: 14, lastDone: null, lastBy: null, history: [] },
  { id: 6, name: "Change bed sheets",   freqDays: 7,  lastDone: null, lastBy: null, history: [] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function daysAgo(ts) {
  return ts == null ? Infinity : (Date.now() - ts) / MS_DAY;
}
function getStatus(chore) {
  const ago = daysAgo(chore.lastDone);
  if (ago < chore.freqDays)     return "ok";
  if (ago < chore.freqDays * 2) return "due";
  return "overdue";
}
function freqLabel(d) {
  if (d === 1)  return "daily";
  if (d === 7)  return "weekly";
  if (d === 14) return "bi-weekly";
  if (d === 30) return "monthly";
  return `every ${d}d`;
}
function timeLabel(chore) {
  if (!chore.lastDone) return "never done";
  const ago = daysAgo(chore.lastDone);
  if (ago < 1 / 24) return "just now";
  if (ago < 1)      return `${Math.round(ago * 24)}h ago`;
  if (ago < 2)      return "yesterday";
  return `${Math.floor(ago)}d ago`;
}
function statusText(chore) {
  const s = getStatus(chore);
  const t = timeLabel(chore);
  if (s === "ok")  return t;
  if (s === "due") return `overdue · ${t}`;
  return `way overdue · ${t}`;
}

// ── Styles ────────────────────────────────────────────────────────────────────
const STYLES = `
  :host {
    --c-ok:       #4a7c3f;
    --c-ok-bg:    #eaf3de;
    --c-due:      #7c5a1a;
    --c-due-bg:   #fdf3dc;
    --c-over:     #8b2a2a;
    --c-over-bg:  #fdeaea;
    --c-bar-ok:   #639922;
    --c-bar-due:  #d4850a;
    --c-bar-over: #d94040;
    font-family: var(--primary-font-family, sans-serif);
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  .card { padding: 16px; }
  .card-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 12px; flex-wrap: wrap; gap: 8px;
  }
  .card-title { font-size: 16px; font-weight: 500; color: var(--primary-text-color); }
  .current-user {
    font-size: 12px; color: var(--secondary-text-color);
    background: var(--secondary-background-color, #f5f5f5);
    padding: 3px 10px; border-radius: 14px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }
  .legend { display: flex; gap: 12px; margin-bottom: 10px; flex-wrap: wrap; }
  .leg { display: flex; align-items: center; gap: 4px; font-size: 11px; color: var(--secondary-text-color); }
  .leg-dot { width: 7px; height: 7px; border-radius: 50%; }
  .chore-list { display: flex; flex-direction: column; gap: 5px; }
  .chore-row {
    display: flex; align-items: center; gap: 10px; padding: 9px 12px;
    border-radius: 8px; background: var(--secondary-background-color, #f5f5f5);
    transition: opacity 0.25s;
  }
  .chore-row.just-done { opacity: 0.5; }
  .status-bar { width: 3px; height: 36px; border-radius: 2px; flex-shrink: 0; }
  .bar-ok   { background: var(--c-bar-ok); }
  .bar-due  { background: var(--c-bar-due); }
  .bar-over { background: var(--c-bar-over); }
  .chore-info { flex: 1; min-width: 0; }
  .chore-name {
    font-size: 13px; font-weight: 500; color: var(--primary-text-color);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .chore-sub { font-size: 11px; color: var(--secondary-text-color); margin-top: 1px; }
  .status-pill {
    font-size: 11px; font-weight: 500; padding: 2px 8px;
    border-radius: 10px; flex-shrink: 0; white-space: nowrap;
  }
  .pill-ok   { background: var(--c-ok-bg);   color: var(--c-ok);   }
  .pill-due  { background: var(--c-due-bg);  color: var(--c-due);  }
  .pill-over { background: var(--c-over-bg); color: var(--c-over); }
  .row-actions { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }
  .undo-btn {
    background: transparent; border: 1px solid var(--divider-color, #e0e0e0);
    border-radius: 6px; padding: 2px 7px; font-size: 13px; cursor: pointer;
    color: var(--secondary-text-color); font-family: inherit; line-height: 1.6;
  }
  .undo-btn:hover { background: var(--divider-color, #e0e0e0); }
  .del-btn {
    background: transparent; border: none; cursor: pointer;
    color: var(--secondary-text-color); font-size: 15px;
    padding: 2px 4px; border-radius: 4px; line-height: 1;
    opacity: 0; transition: opacity 0.15s;
  }
  .chore-row:hover .del-btn { opacity: 1; }
  .del-btn:hover { color: var(--c-over); }
  .check-btn {
    width: 28px; height: 28px; border-radius: 50%;
    border: 1.5px solid var(--divider-color, #ccc);
    background: transparent; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; transition: background 0.15s, border-color 0.15s;
    color: transparent; font-size: 14px;
  }
  .check-btn:hover { border-color: var(--c-bar-ok); color: var(--c-bar-ok); }
  .check-btn.done { background: var(--c-bar-ok); border-color: var(--c-bar-ok); color: #fff; }
  .check-btn::after { content: "✓"; }
  .divider { height: 1px; background: var(--divider-color, #e0e0e0); margin: 12px 0 10px; }
  .add-label {
    font-size: 11px; font-weight: 500; color: var(--secondary-text-color);
    text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 7px;
  }
  .add-section { display: flex; gap: 6px; flex-wrap: wrap; }
  .add-section input, .add-section select {
    padding: 6px 9px; border-radius: 7px;
    border: 1px solid var(--divider-color, #ccc);
    background: var(--secondary-background-color, #f5f5f5);
    color: var(--primary-text-color); font-size: 12px; font-family: inherit; outline: none;
  }
  .add-section input { flex: 1; min-width: 110px; }
  .add-section input:focus, .add-section select:focus { border-color: var(--primary-color, #03a9f4); }
  .add-btn {
    padding: 6px 12px; border-radius: 7px; border: none;
    background: var(--primary-color, #03a9f4); color: #fff;
    font-size: 12px; font-weight: 500; cursor: pointer; font-family: inherit;
  }
  .add-btn:hover { opacity: 0.88; }
  .error-msg {
    font-size: 12px; color: var(--c-over); padding: 8px 10px;
    background: var(--c-over-bg); border-radius: 6px; margin-bottom: 8px;
  }
  .setup-msg {
    font-size: 13px; color: var(--secondary-text-color);
    padding: 12px; background: var(--secondary-background-color, #f5f5f5);
    border-radius: 8px; line-height: 1.6;
  }
  .setup-msg code {
    background: var(--primary-background-color, #fff);
    padding: 1px 5px; border-radius: 4px; font-size: 12px;
    border: 1px solid var(--divider-color, #e0e0e0);
  }
  .empty { text-align: center; font-size: 13px; color: var(--secondary-text-color); padding: 16px 0; }
`;

// ── Custom Element ─────────────────────────────────────────────────────────────
class ChoreTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._state = null;       // loaded from input_text entity
    this._hass = null;
    this._currentUser = null;
    this._refreshTimer = null;
  }

  connectedCallback() {
    // Re-render every minute so time labels stay fresh
    this._refreshTimer = setInterval(() => this._render(), 60_000);
  }

  disconnectedCallback() {
    clearInterval(this._refreshTimer);
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._currentUser && hass.user?.name) {
      this._currentUser = hass.user.name;
    }
    // State lives in the HA entity — read it on every hass update
    this._loadFromEntity();
    this._render();
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = config;
    this._render();
  }

  static getStubConfig() {
    return { title: "Chores", entity: "input_text.chore_tracker_data" };
  }

  getCardSize() {
    return Math.max(3, Math.ceil((this._state?.chores?.length || 0) / 2) + 3);
  }

  // ── State management via input_text entity ────────────────────────────────────
  _entityId() {
    return this._config.entity || "input_text.chore_tracker_data";
  }

  _loadFromEntity() {
    if (!this._hass) return;
    const entity = this._hass.states[this._entityId()];
    if (!entity) return; // entity not found yet

    const raw = entity.state;
    if (!raw || raw === "unknown" || raw === "unavailable" || raw.trim() === "") {
      // First run — initialise with defaults
      this._state = { chores: DEFAULT_CHORES, nextId: DEFAULT_CHORES.length + 1 };
      this._persist();
      return;
    }
    try {
      this._state = JSON.parse(raw);
    } catch (_) {
      this._state = { chores: DEFAULT_CHORES, nextId: DEFAULT_CHORES.length + 1 };
    }
  }

  _persist() {
    if (!this._hass || !this._state) return;
    const json = JSON.stringify(this._state);
    this._hass.callService("input_text", "set_value", {
      entity_id: this._entityId(),
      value: json,
    });
  }

  // ── Mutations ─────────────────────────────────────────────────────────────────
  _markDone(id) {
    const chore = this._state.chores.find(c => c.id === id);
    if (!chore) return;
    chore.history = [...(chore.history || []), { ts: chore.lastDone, by: chore.lastBy }].slice(-20);
    chore.lastDone = Date.now();
    chore.lastBy = this._currentUser || "Unknown";
    this._persist();
    this._render();
  }

  _undo(id) {
    const chore = this._state.chores.find(c => c.id === id);
    if (!chore || !chore.history?.length) return;
    const prev = chore.history.pop();
    chore.lastDone = prev.ts;
    chore.lastBy = prev.by;
    this._persist();
    this._render();
  }

  _addChore(name, freqDays) {
    if (!name.trim()) return;
    this._state.chores.push({
      id: this._state.nextId++,
      name: name.trim(),
      freqDays,
      lastDone: null,
      lastBy: null,
      history: [],
    });
    this._persist();
    this._render();
  }

  _deleteChore(id) {
    this._state.chores = this._state.chores.filter(c => c.id !== id);
    this._persist();
    this._render();
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  _render() {
    const root = this.shadowRoot;
    const title = this._config.title || "Chores";
    const entityId = this._entityId();
    const entityExists = this._hass && !!this._hass.states[entityId];

    root.innerHTML = `<style>${STYLES}</style><ha-card class="card">
      <div class="card-header">
        <span class="card-title">${title}</span>
        ${this._currentUser ? `<span class="current-user">${this._currentUser}</span>` : ""}
      </div>
      ${!entityExists ? `
        <div class="setup-msg">
          Entity <code>${entityId}</code> not found.<br><br>
          Create it: <strong>Settings → Devices &amp; Services → Helpers → + Add → Text</strong><br>
          Name: <code>Chore Tracker Data</code><br><br>
          Then add this to <code>configuration.yaml</code> and restart HA:<br>
          <code>input_text:<br>&nbsp;&nbsp;chore_tracker_data:<br>&nbsp;&nbsp;&nbsp;&nbsp;max: 10000</code>
        </div>` : this._renderChores()}
    </ha-card>`;

    if (!entityExists) return;

    root.querySelectorAll("[data-check]").forEach(btn =>
      btn.addEventListener("click", () => this._markDone(Number(btn.dataset.check)))
    );
    root.querySelectorAll("[data-undo]").forEach(btn =>
      btn.addEventListener("click", () => this._undo(Number(btn.dataset.undo)))
    );
    root.querySelectorAll("[data-del]").forEach(btn =>
      btn.addEventListener("click", () => {
        const chore = this._state.chores.find(c => c.id === Number(btn.dataset.del));
        if (chore && confirm(`Delete "${chore.name}"?`)) this._deleteChore(chore.id);
      })
    );
    const addBtn = root.getElementById("addBtn");
    const nameInput = root.getElementById("newName");
    if (addBtn && nameInput) {
      const doAdd = () => {
        const freq = parseInt(root.getElementById("newFreq").value, 10);
        this._addChore(nameInput.value, freq);
        nameInput.value = "";
      };
      addBtn.addEventListener("click", doAdd);
      nameInput.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
    }
  }

  _renderChores() {
    if (!this._state) return `<div class="empty">Loading…</div>`;
    const chores = this._state.chores || [];
    const ORDER = { overdue: 0, due: 1, ok: 2 };
    const sorted = [...chores].sort((a, b) => ORDER[getStatus(a)] - ORDER[getStatus(b)]);
    return `
      <div class="legend">
        <span class="leg"><span class="leg-dot" style="background:var(--c-bar-ok)"></span>On time</span>
        <span class="leg"><span class="leg-dot" style="background:var(--c-bar-due)"></span>Overdue</span>
        <span class="leg"><span class="leg-dot" style="background:var(--c-bar-over)"></span>Way overdue</span>
      </div>
      <div class="chore-list">
        ${sorted.length === 0 ? '<div class="empty">No chores yet — add one below.</div>' : sorted.map(c => {
          const s = getStatus(c);
          const barCls  = { ok:"bar-ok", due:"bar-due", overdue:"bar-over" }[s];
          const pillCls = { ok:"pill-ok", due:"pill-due", overdue:"pill-over" }[s];
          const justDone = c.lastDone && (Date.now() - c.lastDone) < 90_000;
          const byLine = c.lastBy ? ` · ${c.lastBy}` : "";
          return `
            <div class="chore-row ${justDone ? "just-done" : ""}">
              <div class="status-bar ${barCls}"></div>
              <div class="chore-info">
                <div class="chore-name">${c.name}</div>
                <div class="chore-sub">${freqLabel(c.freqDays)}${byLine}</div>
              </div>
              <span class="status-pill ${pillCls}">${statusText(c)}</span>
              <div class="row-actions">
                <button class="del-btn" data-del="${c.id}" title="Delete chore">✕</button>
                ${c.history?.length > 0
                  ? `<button class="undo-btn" data-undo="${c.id}">↩</button>` : ""}
                <button class="check-btn ${justDone ? "done" : ""}"
                        data-check="${c.id}" title="Mark done"></button>
              </div>
            </div>`;
        }).join("")}
      </div>
      <div class="divider"></div>
      <div class="add-label">Add chore</div>
      <div class="add-section">
        <input id="newName" type="text" placeholder="Chore name" maxlength="60" />
        <select id="newFreq">
          <option value="1">Daily</option>
          <option value="2">Every 2 days</option>
          <option value="3">Every 3 days</option>
          <option value="7" selected>Weekly</option>
          <option value="14">Bi-weekly</option>
          <option value="30">Monthly</option>
        </select>
        <button class="add-btn" id="addBtn">+ Add</button>
      </div>`;
  }
}

customElements.define("chore-tracker-card", ChoreTrackerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "chore-tracker-card",
  name: "Chore Tracker",
  description: "Track household chores. Stores data in a HA input_text helper — no add-on required.",
  preview: true,
  documentationURL: "https://github.com/somethingp/chore-tracker-card",
});

console.info(
  `%c CHORE-TRACKER-CARD %c v${VERSION} `,
  "color:#fff;background:#639922;padding:2px 4px;border-radius:3px 0 0 3px",
  "color:#639922;background:#eaf3de;padding:2px 4px;border-radius:0 3px 3px 0"
);
