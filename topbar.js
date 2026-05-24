// =============================================================
// Persistent dashboard top bar + bottom tab bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from localStorage,
// and renders the water +1 button in the top bar plus the
// Main/Health/Nutrition/Fitness bottom tabs. Skips chrome on finance.html
// and inside iframes (so the water tracker can embed cleanly).
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (replace with your own project URL + publishable key) --------
  const TOPBAR_SUPABASE_URL = 'https://zwpipvyaydrgbuvsmblk.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_oelEu8ooKls7yo3MQG8T6g_aI3AHwn2';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top)) 14px 8px;
  background: #0a0a0b;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.topbar-water-wrap { display: flex; align-items: stretch; }
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-right: none;
  border-radius: 12px 0 0 12px;
  text-decoration: none; color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7DD3FC; flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-water-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700; color: #FAFAFA;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.topbar-water-add {
  width: 44px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.28), rgba(110, 231, 183, 0.28));
  color: #FFFFFF; font-family: inherit;
  font-size: 20px; font-weight: 700; line-height: 1;
  cursor: pointer; border-radius: 0 12px 12px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.7), rgba(110, 231, 183, 0.7));
}
.topbar-finance-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px; text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
}
.topbar-finance-btn:hover { background: rgba(255, 255, 255, 0.08); }
.topbar-finance-icon {
  font-size: 20px; line-height: 1;
  filter: grayscale(100%) brightness(1.4); opacity: 0.85;
}
.topbar-notify-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  color: #FAFAFA;
  border-radius: 12px;
  font-size: 18px; line-height: 1;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, border-color 0.15s;
}
.topbar-notify-btn:hover { background: rgba(255, 255, 255, 0.08); }
.topbar-notify-btn.is-on {
  border-color: rgba(107, 227, 164, 0.25);
  background: rgba(107, 227, 164, 0.10);
}
.topbar-notify-btn.is-blocked {
  border-color: rgba(255, 107, 107, 0.25);
  background: rgba(255, 107, 107, 0.08);
}
.notify-modal-bg {
  position: fixed; inset: 0; z-index: 80;
  display: none; align-items: center; justify-content: center;
  padding: 18px;
  background: rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}
.notify-modal-bg.show { display: flex; }
.notify-modal {
  width: min(430px, 100%);
  padding: 18px;
  border-radius: 16px;
  background: rgba(12, 12, 14, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.56);
  color: #FAFAFA;
}
.notify-modal-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; margin-bottom: 14px;
}
.notify-modal-title {
  margin: 0;
  font-size: 17px; font-weight: 750;
  letter-spacing: 0;
}
.notify-close {
  display: inline-flex; align-items: center; justify-content: center;
  width: 34px; height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  color: #FAFAFA;
  font-size: 22px; line-height: 1;
  cursor: pointer;
}
.notify-status {
  min-height: 18px;
  margin: 0 0 12px;
  color: rgba(250, 250, 250, 0.68);
  font-size: 12px;
  line-height: 1.4;
}
.notify-row {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.notify-label {
  display: grid;
  gap: 3px;
  font-size: 14px;
  color: #FAFAFA;
}
.notify-label small {
  color: rgba(250, 250, 250, 0.55);
  font-size: 11px;
}
.notify-switch {
  appearance: none;
  width: 46px; height: 26px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.16);
  position: relative;
  cursor: pointer;
  transition: background 0.16s;
}
.notify-switch::after {
  content: '';
  position: absolute; top: 3px; left: 3px;
  width: 20px; height: 20px;
  border-radius: 50%;
  background: #FFFFFF;
  transition: transform 0.16s;
}
.notify-switch:checked { background: rgba(107, 227, 164, 0.58); }
.notify-switch:checked::after { transform: translateX(20px); }
.notify-input {
  width: 112px;
  min-height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.26);
  color: #FAFAFA;
  padding: 0 10px;
  font: inherit;
  font-size: 13px;
}
.notify-actions {
  display: flex; gap: 8px; justify-content: flex-end;
  padding-top: 14px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.notify-action {
  min-height: 38px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: #FAFAFA;
  padding: 0 13px;
  font: inherit;
  font-size: 13px;
  font-weight: 650;
  cursor: pointer;
}
.notify-action.primary {
  border-color: rgba(107, 227, 164, 0.24);
  background: rgba(107, 227, 164, 0.16);
}
.bottombar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-around; align-items: stretch;
  padding: 6px 0 calc(6px + env(safe-area-inset-bottom));
  background: #0a0a0b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 6px 0 4px; text-decoration: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 10px; font-weight: 600; letter-spacing: 0.04em;
  -webkit-tap-highlight-color: transparent; transition: color 0.15s;
}
.bottombar-tab-icon {
  font-size: 24px; line-height: 1;
  filter: grayscale(100%) brightness(1.2); opacity: 0.55;
  transition: opacity 0.15s, filter 0.15s, transform 0.10s;
}
.bottombar-tab-letter {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.18);
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px; font-weight: 850;
  filter: none;
}
.bottombar-tab.active { color: #FAFAFA; }
.bottombar-tab.active .bottombar-tab-icon {
  filter: grayscale(100%) brightness(1.6); opacity: 1;
}
.bottombar-tab.active .bottombar-tab-letter {
  border-color: rgba(125, 211, 252, 0.42);
  background: rgba(125, 211, 252, 0.12);
  filter: none;
}
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.92); }
body.has-bottombar {
  padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
}
@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .topbar-water-pill { padding: 8px 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 40px; font-size: 18px; }
  .topbar-finance-btn { width: 40px; height: 38px; }
  .topbar-finance-icon { font-size: 18px; }
  .topbar-notify-btn { width: 40px; height: 38px; font-size: 17px; }
  .bottombar-tab-icon { font-size: 22px; }
  .bottombar-tab { font-size: 10px; }
}
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open { overflow: hidden; touch-action: none; }
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important; overscroll-behavior: contain;
  }
}
`;

  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick actions">
  <div class="topbar-water-wrap">
    <a href="health.html#water" class="topbar-water-pill" id="topbarWater" aria-label="Water progress">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
  </div>
  <a href="finance.html" class="topbar-finance-btn" id="topbarFinance" aria-label="Finance">
    <span class="topbar-finance-icon">📊</span>
  </a>
  <button class="topbar-notify-btn" id="topbarNotify" aria-label="Notifications" type="button">🔔</button>
</header>`;

  const notifyModalHtml = `
<div class="notify-modal-bg" id="notifyModal" aria-hidden="true">
  <section class="notify-modal" role="dialog" aria-modal="true" aria-labelledby="notifyTitle">
    <div class="notify-modal-head">
      <h2 class="notify-modal-title" id="notifyTitle">Notifications</h2>
      <button class="notify-close" id="notifyClose" type="button" aria-label="Close">×</button>
    </div>
    <p class="notify-status" id="notifyStatus"></p>
    <label class="notify-row">
      <span class="notify-label">Enable notifications<small>Stored only in this browser</small></span>
      <input class="notify-switch" id="notifyEnabled" type="checkbox">
    </label>
    <label class="notify-row">
      <span class="notify-label">Water reminders<small>Only while the dashboard is running</small></span>
      <input class="notify-switch" id="notifyWater" type="checkbox">
    </label>
    <label class="notify-row">
      <span class="notify-label">Water interval<small>Minutes between reminders</small></span>
      <input class="notify-input" id="notifyWaterMinutes" type="number" min="30" max="360" step="15">
    </label>
    <label class="notify-row">
      <span class="notify-label">Daily check-in<small>Goals, health, and fitness</small></span>
      <input class="notify-switch" id="notifyDaily" type="checkbox">
    </label>
    <label class="notify-row">
      <span class="notify-label">Check-in time<small>Your device time</small></span>
      <input class="notify-input" id="notifyDailyTime" type="time">
    </label>
    <div class="notify-actions">
      <button class="notify-action" id="notifyTest" type="button">Test</button>
      <button class="notify-action primary" id="notifySave" type="button">Save</button>
    </div>
  </section>
</div>`;

  const bottombarHtml = `
<nav class="bottombar" id="bottombar" role="navigation" aria-label="Main tabs">
  <a href="index.html" class="bottombar-tab" data-page="main">
    <span class="bottombar-tab-icon">🏠</span><span>Main</span>
  </a>
  <a href="health.html" class="bottombar-tab" data-page="health">
    <span class="bottombar-tab-icon">💊</span><span>Health</span>
  </a>
  <a href="nutrition.html" class="bottombar-tab" data-page="nutrition">
    <span class="bottombar-tab-icon bottombar-tab-letter">N</span><span>Nutrition</span>
  </a>
  <a href="gym.html" class="bottombar-tab" data-page="fitness">
    <span class="bottombar-tab-icon">💪</span><span>Fitness</span>
  </a>
</nav>`;

  function isFinancePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function shouldShowChrome() { return !isFinancePage() && !isEmbedded(); }
  function currentPageKey() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('health.html')) return 'health';
    if (p.endsWith('nutrition.html') || p.endsWith('/nutrition')) return 'nutrition';
    if (p.endsWith('gym.html')) return 'fitness';
    return 'main';
  }

  function injectStyleAndHTML() {
    if (document.getElementById('topbar') || document.getElementById('bottombar')) return;
    if (!shouldShowChrome()) return;
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);
    const topWrap = document.createElement('div');
    topWrap.innerHTML = topbarHtml.trim();
    document.body.insertBefore(topWrap.firstChild, document.body.firstChild);
    const bottomWrap = document.createElement('div');
    bottomWrap.innerHTML = bottombarHtml.trim();
    document.body.appendChild(bottomWrap.firstChild);
    const modalWrap = document.createElement('div');
    modalWrap.innerHTML = notifyModalHtml.trim();
    document.body.appendChild(modalWrap.firstChild);
    const active = currentPageKey();
    document.querySelectorAll('.bottombar-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-page') === active);
    });
    document.body.classList.add('has-bottombar');
  }

  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }
  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }
  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return;
    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }
  async function pushWaterMergedToSupabase(localWater) {
    if (window.location.pathname.endsWith('/health.html') ||
        window.location.pathname.endsWith('health.html')) return;
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;
    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { po_water_v1: localWater });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
  }
  async function pushNotifyMergedToSupabase(localNotify) {
    if (!window.supabase || !TOPBAR_SUPABASE_URL || !TOPBAR_SUPABASE_KEY) return;
    if (TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return;
    try {
      const supa = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY);
      const { data } = await supa
        .from('app_state').select('data').eq('key', 'health').maybeSingle();
      const current = (data && data.data) || {};
      const merged = Object.assign({}, current, { [NOTIFY_KEY]: localNotify });
      await supa.from('app_state').upsert(
        { key: 'health', data: merged, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch (e) {}
  }
  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
    pushWaterMergedToSupabase(state);
  }

  const NOTIFY_KEY = 'private_dashboard_notifications_v1';
  let notifyTimer = null;

  function defaultNotifyState() {
    return {
      enabled: false,
      water: true,
      waterMinutes: 120,
      daily: true,
      dailyTime: '20:30',
      lastWaterAt: 0,
      dailySentKey: ''
    };
  }
  function getNotifyState() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem(NOTIFY_KEY)); } catch (e) {}
    return Object.assign(defaultNotifyState(), state && typeof state === 'object' ? state : {});
  }
  function saveNotifyState(next) {
    const state = Object.assign(getNotifyState(), next || {});
    state.waterMinutes = Math.min(360, Math.max(30, Number(state.waterMinutes) || 120));
    try { localStorage.setItem(NOTIFY_KEY, JSON.stringify(state)); } catch (e) {}
    pushNotifyMergedToSupabase(state);
    syncNotifyButton();
    startNotificationLoop();
    return state;
  }
  function notificationStatusText() {
    if (!('Notification' in window)) return 'Notifications are not available in this browser.';
    if (Notification.permission === 'denied') return 'Notifications are blocked in browser settings.';
    if (!window.RowPWA || !window.RowPWA.isInstallableContext) {
      return 'Run from localhost or a private HTTPS link for app install and service worker notifications.';
    }
    if (Notification.permission === 'granted') return 'Notifications are ready.';
    return 'Tap Save to allow notifications.';
  }
  function syncNotifyButton() {
    const btn = document.getElementById('topbarNotify');
    if (!btn) return;
    const state = getNotifyState();
    btn.classList.toggle('is-on', !!state.enabled && 'Notification' in window && Notification.permission === 'granted');
    btn.classList.toggle('is-blocked', 'Notification' in window && Notification.permission === 'denied');
  }
  function fillNotifyForm() {
    const state = getNotifyState();
    const enabled = document.getElementById('notifyEnabled');
    const water = document.getElementById('notifyWater');
    const waterMinutes = document.getElementById('notifyWaterMinutes');
    const daily = document.getElementById('notifyDaily');
    const dailyTime = document.getElementById('notifyDailyTime');
    const status = document.getElementById('notifyStatus');
    if (enabled) enabled.checked = !!state.enabled;
    if (water) water.checked = !!state.water;
    if (waterMinutes) waterMinutes.value = state.waterMinutes;
    if (daily) daily.checked = !!state.daily;
    if (dailyTime) dailyTime.value = state.dailyTime;
    if (status) status.textContent = notificationStatusText();
  }
  function setNotifyModal(open) {
    const modal = document.getElementById('notifyModal');
    if (!modal) return;
    modal.classList.toggle('show', !!open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.body.classList.toggle('topbar-modal-open', !!open);
    if (open) fillNotifyForm();
  }
  async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') return false;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  function sendPrivateNotification(title, body, tag) {
    if (!window.RowPWA || typeof window.RowPWA.showNotification !== 'function') {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body, icon: 'icon-192.png', tag: tag || 'private-dashboard' });
        return true;
      }
      return false;
    }
    window.RowPWA.showNotification(title, {
      body,
      tag: tag || 'private-dashboard',
      data: { url: 'index.html' }
    });
    return true;
  }
  function minutesSinceMidnight(d) {
    return d.getHours() * 60 + d.getMinutes();
  }
  function timeToMinutes(value) {
    const parts = String(value || '20:30').split(':');
    return (Number(parts[0]) || 0) * 60 + (Number(parts[1]) || 0);
  }
  function checkNotificationReminders() {
    const state = getNotifyState();
    if (!state.enabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const now = new Date();
    const hour = now.getHours();
    const todayKey = calendarDateKey();

    if (state.water && hour >= 8 && hour <= 22) {
      const w = getWaterProgress();
      const due = !state.lastWaterAt || Date.now() - state.lastWaterAt >= state.waterMinutes * 60 * 1000;
      if (w.total && w.done < w.total && due) {
        sendPrivateNotification('Water check', w.done + '/' + w.total + ' logged today.', 'private-dashboard-water');
        saveNotifyState({ lastWaterAt: Date.now() });
      }
    }

    if (state.daily && state.dailySentKey !== todayKey && minutesSinceMidnight(now) >= timeToMinutes(state.dailyTime)) {
      sendPrivateNotification('Daily check-in', 'Review goals, health, and training for today.', 'private-dashboard-daily');
      saveNotifyState({ dailySentKey: todayKey });
    }
  }
  function startNotificationLoop() {
    if (notifyTimer) clearInterval(notifyTimer);
    notifyTimer = setInterval(checkNotificationReminders, 60 * 1000);
    checkNotificationReminders();
  }
  async function saveNotifyForm() {
    const wantsEnabled = !!(document.getElementById('notifyEnabled') || {}).checked;
    let enabled = wantsEnabled;
    if (wantsEnabled) enabled = await requestNotificationPermission();
    saveNotifyState({
      enabled,
      water: !!(document.getElementById('notifyWater') || {}).checked,
      waterMinutes: (document.getElementById('notifyWaterMinutes') || {}).value,
      daily: !!(document.getElementById('notifyDaily') || {}).checked,
      dailyTime: (document.getElementById('notifyDailyTime') || {}).value || '20:30'
    });
    fillNotifyForm();
  }
  async function sendTestNotification() {
    const ok = await requestNotificationPermission();
    if (!ok) {
      fillNotifyForm();
      return;
    }
    saveNotifyState({ enabled: true });
    sendPrivateNotification('Private Dashboard', 'Notifications are working.', 'private-dashboard-test');
    fillNotifyForm();
  }
  function bindNotifyControls() {
    const btn = document.getElementById('topbarNotify');
    const close = document.getElementById('notifyClose');
    const save = document.getElementById('notifySave');
    const test = document.getElementById('notifyTest');
    const modal = document.getElementById('notifyModal');
    if (btn) btn.addEventListener('click', () => setNotifyModal(true));
    if (close) close.addEventListener('click', () => setNotifyModal(false));
    if (save) save.addEventListener('click', saveNotifyForm);
    if (test) test.addEventListener('click', sendTestNotification);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) setNotifyModal(false);
      });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setNotifyModal(false);
    });
    syncNotifyButton();
    startNotificationLoop();
  }

  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
  function startModalLock() {
    const MODAL_SELECTORS = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam', '.notify-modal-bg'];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    function sync() { document.body.classList.toggle('topbar-modal-open', anyOpen()); }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    sync();
  }

  function boot() {
    injectStyleAndHTML();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    bindNotifyControls();
    render();
    lockGestures();
    startModalLock();
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    setInterval(render, 30 * 1000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
