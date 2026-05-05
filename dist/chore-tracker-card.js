/**
 * Chore Tracker Card — Home Assistant Lovelace Custom Card
 * Fetches state from the Chore Tracker add-on API (cross-device sync).
 * Records completions as the currently logged-in HA user automatically.
 *
 * Config options:
 *   title: "Chores"   — card heading (optional)
 */

const VERSION = "1.4.1";
const ADDON_SLUG = "chore_tracker";
const MS_DAY = 86_400_000;

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
    transition: opacity 0.25s; position: relative;
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
  .status-bar-loading {
    display: flex; align-items: center; gap: 8px; padding: 12px 0;
    font-size: 13px; color: var(--secondary-text-color);
  }
  .spinner {
    width: 14px; height: 14px;
    border: 2px solid var(--divider-color, #ccc);
    border-top-color: var(--primary-color, #03a9f4);
    border-radius: 50%; animation: spin 0.7s linear infinite; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .error-msg {
    font-size: 12px; color: var(--c-over); padding: 8px 10px;
    background: var(--c-over-bg); border-radius: 6px; margin-bottom: 8px;
  }
  .empty { text-align: center; font-size: 13px; color: var(--secondary-text-color); padding: 16px 0; }
`;

// ── Custom Element ─────────────────────────────────────────────────────────────
class ChoreTrackerCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._state = { chores: [] };
    this._currentUser = null;
    this._loading = true;
    this._error = null;
    this._refreshTimer = null;
    this._busy = new Set();
    this._initialFetchDone = false;
    this._ingressUrl = null;  // fetched dynamically from Supervisor on first use
  }

  connectedCallback() {
    // Don't fetch here — hass (and its auth token) isn't set yet.
    // _fetchState() is triggered from the hass setter on first assignment.
    this._refreshTimer = setInterval(() => {
      if (this._hass) this._fetchState();
    }, 30_000);
  }

  disconnectedCallback() {
    clearInterval(this._refreshTimer);
  }

  set hass(hass) {
    this._hass = hass;
    // hass.user is the currently logged-in HA user — always current
    if (!this._currentUser && hass.user?.name) {
      this._currentUser = hass.user.name;
    }
    // Trigger first fetch once hass (and its token) is available
    if (!this._initialFetchDone) {
      this._initialFetchDone = true;
      this._fetchState();
    }
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    this._config = config;
    this._render();
  }

  static getStubConfig() {
    return { title: "Chores" };
  }

  getCardSize() {
    return Math.max(3, Math.ceil(this._state.chores.length / 2) + 3);
  }

  // ── API ───────────────────────────────────────────────────────────────────────
  // The Ingress URL is a dynamic token fetched from the Supervisor once and cached.
  // We use hass.callApi() which correctly routes through the HA proxy with the
  // right auth — a raw Bearer token doesn't work for Supervisor API calls.
  async _getIngressUrl() {
    if (this._ingressUrl) return this._ingressUrl;
    let data;
    try {
      data = await this._hass.callApi("GET", `hassio/addons/${ADDON_SLUG}/info`);
    } catch (e) {
      throw new Error(`Could not get add-on info. Is the Chore Tracker add-on installed and running? (${e.message})`);
    }
    const ingressUrl = data?.ingress_url;
    if (!ingressUrl) throw new Error("Add-on has no ingress_url — is Ingress enabled in the add-on config?");
    this._ingressUrl = ingressUrl.replace(/\/$/, "");
    return this._ingressUrl;
  }

  async _apiFetch(path, options = {}) {
    const base = await this._getIngressUrl();
    const headers = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this._hass.auth.data.access_token}`,
      ...(options.headers || {}),
    };
    const resp = await fetch(`${base}${path}`, { ...options, headers, credentials: "same-origin" });
    if (!resp.ok) throw new Error(`API ${resp.status}: ${await resp.text().catch(() => "")}`);
    if (resp.status === 204) return null;
    return resp.json();
  }

  async _fetchState() {
    try {
      this._state = await this._apiFetch("/api/chores");
      this._error = null;
    } catch (e) {
      this._error = `Could not reach the Chore Tracker add-on. Is it running? ${e.message}`;
    } finally {
      this._loading = false;
      this._render();
    }
  }

  async _markDone(id) {
    if (this._busy.has(id)) return;
    this._busy.add(id);
    this._render();
    try {
      const updated = await this._apiFetch(`/api/chores/${id}/complete`, {
        method: "POST",
        body: JSON.stringify({ user: this._currentUser || "Unknown" }),
      });
      const idx = this._state.chores.findIndex(c => c.id === id);
      if (idx !== -1) this._state.chores[idx] = updated;
      this._error = null;
    } catch (e) {
      this._error = `Failed to complete chore: ${e.message}`;
    } finally {
      this._busy.delete(id);
      this._render();
    }
  }

  async _undo(id) {
    if (this._busy.has(id)) return;
    this._busy.add(id);
    this._render();
    try {
      const updated = await this._apiFetch(`/api/chores/${id}/undo`, { method: "POST" });
      const idx = this._state.chores.findIndex(c => c.id === id);
      if (idx !== -1) this._state.chores[idx] = updated;
      this._error = null;
    } catch (e) {
      this._error = `Failed to undo: ${e.message}`;
    } finally {
      this._busy.delete(id);
      this._render();
    }
  }

  async _addChore(name, freqDays) {
    if (!name.trim()) return;
    try {
      const created = await this._apiFetch("/api/chores", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), freqDays }),
      });
      this._state.chores.push(created);
      this._error = null;
    } catch (e) {
      this._error = `Failed to add chore: ${e.message}`;
    }
    this._render();
  }

  async _deleteChore(id) {
    try {
      await this._apiFetch(`/api/chores/${id}`, { method: "DELETE" });
      this._state.chores = this._state.chores.filter(c => c.id !== id);
      this._error = null;
    } catch (e) {
      this._error = `Failed to delete chore: ${e.message}`;
    }
    this._render();
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  _render() {
    const { chores } = this._state;
    const title = this._config.title || "Chores";
    const currentUser = this._currentUser;
    const ORDER = { overdue: 0, due: 1, ok: 2 };
    const sorted = [...chores].sort((a, b) => ORDER[getStatus(a)] - ORDER[getStatus(b)]);

    const root = this.shadowRoot;
    root.innerHTML = `
      <style>${STYLES}</style>
      <ha-card class="card">
        <div class="card-header">
          <span class="card-title">${title}</span>
          ${currentUser
            ? `<span class="current-user">${currentUser}</span>`
            : ""}
        </div>

        ${this._error ? `<div class="error-msg">${this._error}</div>` : ""}

        ${this._loading
          ? `<div class="status-bar-loading"><div class="spinner"></div> Loading chores…</div>`
          : `
          <div class="legend">
            <span class="leg"><span class="leg-dot" style="background:var(--c-bar-ok)"></span>On time</span>
            <span class="leg"><span class="leg-dot" style="background:var(--c-bar-due)"></span>Overdue</span>
            <span class="leg"><span class="leg-dot" style="background:var(--c-bar-over)"></span>Way overdue</span>
          </div>
          <div class="chore-list">
            ${sorted.length === 0
              ? '<div class="empty">No chores yet — add one below.</div>'
              : sorted.map(c => {
                  const s = getStatus(c);
                  const barCls  = { ok:"bar-ok", due:"bar-due", overdue:"bar-over" }[s];
                  const pillCls = { ok:"pill-ok", due:"pill-due", overdue:"pill-over" }[s];
                  const justDone = c.lastDone && (Date.now() - c.lastDone) < 90_000;
                  const busy = this._busy.has(c.id);
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
                        ${c.history && c.history.length > 0
                          ? `<button class="undo-btn" data-undo="${c.id}" ${busy ? "disabled" : ""}>↩</button>`
                          : ""}
                        <button class="check-btn ${justDone ? "done" : ""}"
                                data-check="${c.id}"
                                title="Mark done"
                                ${busy ? "disabled" : ""}></button>
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
          </div>`}
      </ha-card>
    `;

    root.querySelectorAll("[data-check]").forEach(btn =>
      btn.addEventListener("click", () => this._markDone(Number(btn.dataset.check)))
    );
    root.querySelectorAll("[data-undo]").forEach(btn =>
      btn.addEventListener("click", () => this._undo(Number(btn.dataset.undo)))
    );
    root.querySelectorAll("[data-del]").forEach(btn =>
      btn.addEventListener("click", () => {
        if (confirm(`Delete "${chores.find(c => c.id === Number(btn.dataset.del))?.name}"?`)) {
          this._deleteChore(Number(btn.dataset.del));
        }
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
}

customElements.define("chore-tracker-card", ChoreTrackerCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "chore-tracker-card",
  name: "Chore Tracker",
  description: "Track household chores with color-coded urgency. Completions recorded as the logged-in HA user.",
  preview: true,
  documentationURL: "https://github.com/somethingp/chore-tracker-card",
});

console.info(
  `%c CHORE-TRACKER-CARD %c v${VERSION} `,
  "color:#fff;background:#639922;padding:2px 4px;border-radius:3px 0 0 3px",
  "color:#639922;background:#eaf3de;padding:2px 4px;border-radius:0 3px 3px 0"
);
