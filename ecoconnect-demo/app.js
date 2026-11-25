/* EcoConnect — front-end-only demo. Mock interactions, no backend. */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const icons = () => window.lucide && lucide.createIcons();
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();

const state = {
  role: 'admin',
  page: 'dashboard',
  slot: 2,
  booking: null,
  online: true,
  queue: 0,
  scanIndex: 0,
  trekker: 'group',
  lastGroupSize: 8,
  calMonth: null,
  auth: { admin: false, gate: false },
  pendingPage: null,
  sos: null,
  history: [...MOCK.pastSos],
  syncTimer: null,
  guide: { loggedIn: false, tab: 'assignments' },
  notices: JSON.parse(JSON.stringify(MOCK.guideNotices)),
  sosHistory: JSON.parse(JSON.stringify(MOCK.sosHistory)),
  lostThreshold: MOCK.trailSettings.lostContact,
  mapGuideId: MOCK.trailGuides[0].id,
  editingNode: null,
  nodeSeq: 10,
  sosNodeIndex: 1,
  nodeUpdateIndex: 0,
  lostIndex: 0
};
const initialBookings = JSON.parse(JSON.stringify(MOCK.bookings));

const charts = {};

/* ---------------- helpers ---------------- */
function toast(msg, kind = 'ok') {
  const el = document.createElement('div');
  el.className = 'toast ' + (kind === 'warn' ? 'warn' : '');
  el.innerHTML = `<i data-lucide="${kind === 'warn' ? 'alert-triangle' : 'check-circle-2'}"></i><span>${msg}</span>`;
  $('#toasts').append(el);
  icons();
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 3200);
}

function badgeFor(status) {
  const map = {
    'Available': 'badge-green',
    'On trail': 'badge-slate',
    'Off duty': 'badge-slate',
    'Confirmed': 'badge-green',
    'Checked-in': 'badge-slate',
    'Pending': 'badge-amber',
    'Pending – Manual Review': 'badge-amber'
  };
  return `<span class="badge ${map[status] || 'badge-slate'}">${status}</span>`;
}

/* ---------------- guide helpers ---------------- */
const GUIDE_NAME = 'Kuya Ramil D.';

function todayISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function formatDate(iso) {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
}

function bookingISO(b) { return b.date || todayISO(); }

function approvedNotices(guideName) {
  return state.notices.filter(n => n.guide === guideName && n.status === 'Approved');
}

function isGuideUnavailable(guideName, iso) {
  return approvedNotices(guideName).some(n => n.date === iso);
}

function gateTime(slot) {
  const m = slot.match(/(\d+):(\d+) (AM|PM)/);
  if (!m) return '—';
  let h = (+m[1] % 12) + (m[3] === 'PM' ? 12 : 0);
  let mins = +m[2] - 30;
  if (mins < 0) { mins += 60; h = (h + 23) % 24; }
  return `${h % 12 || 12}:${String(mins).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

/* ---------------- navigation ---------------- */
const ADMIN_PAGES = ['dashboard', 'trailmap', 'sos', 'scheduling', 'metrics', 'settings'];

function showPage(id) {
  if (ADMIN_PAGES.includes(id) && !state.auth.admin) {
    state.pendingPage = id;
    id = 'adminlogin';
  } else if (id === 'gate' && !state.auth.gate) {
    state.pendingPage = 'gate';
    id = 'gatelogin';
  }
  state.page = id;
  $$('.page').forEach(p => p.classList.toggle('active', p.id === 'page-' + id));
  $$('#mainNav button').forEach(b => b.classList.toggle('active', b.dataset.page === id));
  window.scrollTo({ top: 0, behavior: 'smooth' });
  icons();
  setTimeout(() => {
    if (id === 'dashboard') { charts.bookings?.resize(); charts.guideStatus?.resize(); }
    if (id === 'scheduling') charts.guide?.resize();
    if (id === 'metrics') { charts.lora?.resize(); charts.rssi?.resize(); }
  }, 80);
  if (id === 'guide') renderGuide();
  if (id === 'trailmap') renderTrailMap();
  if (id === 'sos') renderSosPage();
  if (id === 'settings') renderSettings();
}

function updateAuthUI() {
  const show = (state.role === 'admin' && state.auth.admin) || (state.role === 'gate' && state.auth.gate);
  $('#signOutBtn').classList.toggle('hidden', !show);
}

function loginStaff(role) {
  state.auth[role] = true;
  const valid = role === 'admin' ? ADMIN_PAGES : ['gate'];
  const next = valid.includes(state.pendingPage) ? state.pendingPage : (role === 'admin' ? 'dashboard' : 'gate');
  state.pendingPage = null;
  updateAuthUI();
  if (state.role !== role) setRole(role);
  showPage(next);
  toast(role === 'admin' ? 'Signed in as admin' : 'Signed in as gate staff');
}

function tryLogin(role, user, pass, errorEl) {
  const creds = {
    admin: { user: 'admin@ecoconnect.demo', pass: 'ridge2026' },
    gate: { user: 'gate.01', pass: '2468' }
  }[role];
  const ok = user.trim().toLowerCase() === creds.user && pass === creds.pass;
  errorEl.classList.toggle('hidden', ok);
  if (!ok) { errorEl.textContent = 'Wrong demo credentials — check the hint below, or continue as demo ' + (role === 'admin' ? 'admin' : 'gate staff') + '.'; return; }
  loginStaff(role);
}

function signOut() {
  const role = state.role;
  if (role !== 'admin' && role !== 'gate') return;
  state.auth[role] = false;
  state.pendingPage = null;
  updateAuthUI();
  showPage(role === 'admin' ? 'adminlogin' : 'gatelogin');
  toast('Signed out');
}

function setRole(role) {
  state.role = role;
  $$('.role-switch button').forEach(b => b.classList.toggle('active', b.dataset.role === role));
  $$('#mainNav button').forEach(b => {
    b.style.display = b.dataset.roles.split(' ').includes(role) ? '' : 'none';
  });
  updateAuthUI();
  const fallback = { visitor: 'register', gate: 'gate', admin: 'dashboard', guide: 'guide' }[role];
  const current = $$('#mainNav button[data-page="' + state.page + '"]')[0];
  const allowed = current && current.dataset.roles.split(' ').includes(role);
  showPage(allowed ? state.page : fallback);
}

/* ---------------- visitor registration ---------------- */
function setDates() {
  const d = new Date();
  const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  $('#visitDate').min = iso;
  let pick = new Date(d);
  while (dayAvailability(pick).pct >= 100) pick.setDate(pick.getDate() + 1);
  $('#visitDate').value = isoDay(pick);
  const dash = $('#dashDate');
  if (dash) dash.textContent = d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function dayAvailability(d) {
  const cap = MOCK.calendar.capPerDay;
  const pct = Math.max(6, Math.min(100, MOCK.calendar.loadByWeekday[d.getDay()] + ((d.getDate() * 5) % 11) - 5));
  const booked = Math.round(cap * pct / 100);
  return { cap, booked, pct: Math.round(booked / cap * 100) };
}

function isoDay(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function renderCalendar() {
  const sel = $('#visitDate').value || todayISO();
  const selected = new Date(sel + 'T00:00:00');
  if (!state.calMonth) state.calMonth = new Date(selected.getFullYear(), selected.getMonth(), 1);
  const first = state.calMonth;
  const today = todayISO();
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const cells = ['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => `<span class="cal-dow">${d}</span>`);
  const pad = first.getDay();
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  for (let i = 0; i < pad; i++) cells.push('<span class="cal-pad"></span>');
  for (let day = 1; day <= days; day++) {
    const d = new Date(first.getFullYear(), first.getMonth(), day);
    const iso = isoDay(d);
    const a = dayAvailability(d);
    const key = a.pct >= 100 ? 'full' : a.pct >= 80 ? 'almost' : 'open';
    const past = iso < today;
    const tip = key === 'full' ? 'Full' : key === 'almost' ? 'Almost full' : 'Plenty of slots';
    cells.push(`<button type="button" class="cal-day ${key}${iso === sel ? ' selected' : ''}${past ? ' past' : ''}"
      data-date="${iso}" ${past || key === 'full' ? 'disabled' : ''} title="${d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })} · ${tip}">
      <span class="cal-num">${day}</span><span class="cal-dot"></span>
    </button>`);
  }
  $('#calMonth').textContent = first.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  $('#trailCalendar').innerHTML = cells.join('');
  $('#calSaved').textContent = MOCK.bookings.length;
  $('#calSelectedDate').textContent = selected.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  $('#calPrev').disabled = first <= currentMonth;
}

function shiftMonth(delta) {
  const base = state.calMonth || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  state.calMonth = new Date(base.getFullYear(), base.getMonth() + delta, 1);
  renderCalendar();
}

function setTrekker(type) {
  state.trekker = type;
  $$('#trekkerToggle .type-btn').forEach(b => b.classList.toggle('active', b.dataset.trekker === type));
  const solo = type === 'solo';
  const size = $('#groupSize');
  if (solo) {
    state.lastGroupSize = +size.value || 8;
    size.value = 1;
    size.disabled = true;
  } else {
    size.disabled = false;
    size.value = state.lastGroupSize || 8;
  }
  $('#memberNamesWrap').classList.toggle('hidden', solo);
  updateFormSummary();
}

function updateFormSummary() {
  const s = MOCK.slots[state.slot];
  const solo = state.trekker === 'solo';
  const size = solo ? 1 : Math.max(1, +$('#groupSize').value || 1);
  const date = $('#visitDate').value;
  const label = date ? new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '';
  $('#formSummary').textContent = `${label} · ${s.time} · ${s.cap - s.booked} seats left · ${solo ? 'solo trekker' : 'group of ' + size}`;
}

function pickGuide(heavy) {
  const today = todayISO();
  let pool = MOCK.guides.filter(g => g.status === 'Available' && !isGuideUnavailable(g.name, today));
  if (heavy) {
    const strong = pool.filter(g => g.strong);
    if (strong.length) pool = strong;
  }
  return pool.sort((a, b) => a.week - b.week)[0] || MOCK.guides[0];
}

function buildRules(b) {
  const s = MOCK.slots[state.slot];
  return [
    { ok: true, name: 'R1 · Capacity passed', note: `${s.booked} / ${s.cap} seats after this booking` },
    { ok: true, name: 'R2 · Guide availability passed', note: `${b.guide.name} is on duty and not on trail` },
    { ok: b.size <= 12, name: 'R3 · Group-to-guide ratio', note: b.size <= 12 ? `${b.size} pax ≤ 12 per guide` : `${b.size} pax exceeds 1:12 — second guide requested` },
    b.heavy
      ? { ok: true, name: 'R4 · Heavy baggage passed', note: `Senior certified guide assigned (${b.guide.cert})` }
      : { ok: true, name: 'R4 · Heavy baggage not triggered', note: 'Standard guide is enough for this group' },
    { ok: true, name: 'R5 · Fair rotation passed', note: `${b.guide.name} has the fewest assignments (${b.guide.week})` },
    { ok: true, name: 'R6 · Overflow not triggered', note: 'Slot is within limits — no waitlist' }
  ];
}

function onSubmit(e) {
  e.preventDefault();
  const leader = $('#leaderName').value.trim();
  const contact = $('#contact').value.trim();
  const emergency = $('#emergency').value.trim();
  const solo = state.trekker === 'solo';
  const size = solo ? 1 : Math.max(1, +$('#groupSize').value || 1);
  const members = solo ? '' : $('#memberNames').value.trim();
  const heavy = $('#heavyBaggage').checked;
  const slot = MOCK.slots[state.slot];
  if (!leader || !contact || !emergency) { toast('Please complete the required fields', 'warn'); return; }
  const date = $('#visitDate').value || new Date().toISOString().slice(0, 10);
  if (date < todayISO()) { toast('Pick an upcoming trek date', 'warn'); return; }
  if (dayAvailability(new Date(date + 'T00:00:00')).pct >= 100) { toast('That date is fully booked — pick another', 'warn'); return; }
  if (slot.booked + size > slot.cap) { toast(`${slot.time} only has ${slot.cap - slot.booked} seats left`, 'warn'); return; }

  const guide = pickGuide(heavy);
  const code = `EC-${date.slice(5, 7)}${date.slice(8, 10)}-${100 + Math.floor(Math.random() * 899)}`;
  slot.booked += size;
  guide.week += 1;
  MOCK.stats.visitorsToday += size;
  state.booking = { code, leader, size, heavy, slot: slot.time, date, guide, type: state.trekker, members };
  MOCK.bookings.unshift({ code, leader, pax: size, slot: slot.time, guide: guide.name, status: 'Confirmed', date, trekker: state.trekker, members });
  MOCK.checkins.unshift({ time: 'just now', leader, pax: size, guide: guide.name });

  renderCalendar();
  renderBookings();
  renderDashboard();
  updateGuideChart();
  showConfirmation();
  toast('Slot reserved — booking code ' + code);
}

function showConfirmation() {
  const b = state.booking;
  $('#bookingFormWrap').classList.add('hidden');
  $('#confirmation').classList.remove('hidden');
  $('#confirmCode').textContent = b.code;
  $('#confirmDate').textContent = new Date(b.date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  $('#confirmSlot').textContent = b.slot;
  $('#confirmGroup').textContent = `${b.type === 'solo' ? 'Solo trekker' : 'Group trekker · ' + b.size + ' pax'} · ${b.heavy ? 'heavy baggage' : 'standard bags'}`;
  $('#confirmGuide').textContent = b.guide.name;
  $('#confirmGuideMeta').textContent = `${b.guide.cert} · ${b.guide.week} assignments this week`;
  $('#whyGuide').innerHTML = buildRules(b).map(r =>
    `<div class="rule-why ${r.ok ? '' : 'warn'}"><i data-lucide="${r.ok ? 'check-circle-2' : 'alert-triangle'}"></i><div><div class="text-[12.5px] font-semibold">${r.name}</div><div class="text-[11px] text-slate-500">${r.note}</div></div></div>`).join('');
  drawQR(b.code);
  $('#confirmation').scrollIntoView({ behavior: 'smooth', block: 'start' });
  icons();
}

function resetBooking() {
  $('#bookingForm').reset();
  setDates();
  state.slot = 2;
  state.calMonth = null;
  setTrekker('group');
  renderCalendar();
  $('#confirmation').classList.add('hidden');
  $('#bookingFormWrap').classList.remove('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  icons();
}

function drawQR(text) {
  const canvas = $('#qrCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const n = 25, size = canvas.width / n;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  let h = 0;
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const rnd = () => { h = (h * 1664525 + 1013904223) >>> 0; return h / 4294967296; };
  const finder = (fx, fy) => {
    ctx.fillStyle = '#14532d'; ctx.fillRect(fx * size, fy * size, 7 * size, 7 * size);
    ctx.fillStyle = '#fff'; ctx.fillRect((fx + 1) * size, (fy + 1) * size, 5 * size, 5 * size);
    ctx.fillStyle = '#14532d'; ctx.fillRect((fx + 2) * size, (fy + 2) * size, 3 * size, 3 * size);
  };
  ctx.fillStyle = '#14532d';
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const inFinder = (x < 8 && y < 8) || (x > n - 9 && y < 8) || (x < 8 && y > n - 9);
      if (!inFinder && rnd() > 0.52) ctx.fillRect(x * size, y * size, size, size);
    }
  }
  finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
}

/* ---------------- trail helpers ---------------- */
function trailPoint(id) { return MOCK.trailNodes.find(n => n.id === id) || MOCK.trailNodes[0]; }

function guideOffset(g) {
  const same = MOCK.trailGuides.filter(x => x.pointId === g.pointId);
  if (same.length === 1) return [-26, -12];
  const k = same.findIndex(x => x.id === g.id);
  return [[-26, -12], [26, -12], [0, 24], [-42, 8], [42, 8]][k % 5];
}

function clockAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

function lastSeenLabel(g) { return `${trailPoint(g.pointId).name}, ${clockAgo(g.minutesAgo)}`; }
function isLost(g) { return g.minutesAgo >= state.lostThreshold; }
function fmtCoord(lat, lng) { return `${Math.abs(lat).toFixed(4)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(4)}° ${lng >= 0 ? 'E' : 'W'}`; }

/* ---------------- dashboard ---------------- */
function renderDashboard() {
  const booked = MOCK.slots.reduce((s, x) => s + x.booked, 0);
  const cap = MOCK.slots.reduce((s, x) => s + x.cap, 0);
  $('#kpiVisitors').textContent = MOCK.stats.visitorsToday.toLocaleString();
  $('#kpiCapacity').textContent = Math.round(booked / cap * 100) + '%';
  $('#kpiCapacitySub').textContent = `${booked} / ${cap} pre-booked seats`;
  $('#kpiGroups').textContent = MOCK.stats.activeGroups;
  $('#kpiSos').textContent = state.sos ? '1' : '0';
  $('#kpiSosSub').textContent = state.sos ? `${state.sos.nodeArea} · ${state.sos.time}` : 'All trekkers accounted for';
  renderDashTrailStatus();
  renderGuideTable();
  renderHistory();
  renderSosBanner();
  updateGuideStatusChart();
}

function renderDashTrailStatus() {
  const lost = MOCK.trailGuides.filter(isLost).length;
  $('#dashTrailStatus').innerHTML = `
    <div class="gw-row"><span class="gw-dot"></span><span class="font-semibold">${trailPoint('gw').name}</span><span class="ml-auto text-xs text-slate-500">elevated · online</span></div>
    ${MOCK.trailNodes.filter(n => n.type === 'node').map(n => `<div class="gw-row">
      <span class="gw-dot" style="${n.radius < 90 ? 'background:#d97706' : ''}"></span>
      <span class="font-semibold">${n.name}</span>
      <span class="ml-auto text-xs text-slate-500">${n.radius} m coverage</span>
    </div>`).join('')}
    <div class="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-100">
      <span class="text-[11px] text-slate-500">${MOCK.trailGuides.length} guides · ${lost} lost contact</span>
      <button class="btn btn-ghost btn-sm" data-goto="trailmap">Open trail map</button>
    </div>`;
}

function renderTrailMap() {
  const coverage = MOCK.trailNodes.filter(n => n.type === 'node').map(n => {
    const r = Math.max(22, n.radius * 0.55);
    const op = n.radius >= 140 ? 0.06 : n.radius >= 90 ? 0.11 : 0.18;
    return `<circle cx="${n.x}" cy="${n.y}" r="${r}" fill="#16a34a" fill-opacity="${op}" stroke="#15803d" stroke-opacity=".3" stroke-dasharray="4 5"/>`;
  }).join('');
  $('#coverageLayer').innerHTML = coverage;

  $('#nodeLayer').innerHTML = MOCK.trailNodes.map(n => {
    const isGw = n.type === 'gateway';
    const inner = isGw
      ? `<path d="M${n.x} ${n.y - 7} L${n.x - 6} ${n.y + 6} L${n.x + 6} ${n.y + 6} Z" fill="#b45309"/><line x1="${n.x}" y1="${n.y - 12}" x2="${n.x}" y2="${n.y - 17}" stroke="#b45309" stroke-width="2"/>`
      : `<circle cx="${n.x}" cy="${n.y}" r="4" fill="#15803d"/>`;
    return `<g>
      <circle cx="${n.x}" cy="${n.y}" r="13" fill="#fff" stroke="${isGw ? '#b45309' : '#14532d'}" stroke-width="3"/>
      ${inner}
      <text x="${n.x}" y="${n.y + 27}" fill="#3c5244" font-size="10" font-weight="700" text-anchor="middle">${n.name}</text>
    </g>`;
  }).join('');

  const sosId = state.sos && state.sos.guideId;
  $('#guideLayer').innerHTML = MOCK.trailGuides.map(g => {
    const p = trailPoint(g.pointId);
    const [dx, dy] = guideOffset(g);
    const sos = g.id === sosId;
    const x = sos && state.sos.gps ? state.sos.gps.x : p.x + dx;
    const y = sos && state.sos.gps ? state.sos.gps.y : p.y + dy;
    const lost = isLost(g) && !sos;
    return `<g class="guide-marker ${lost ? 'lost' : ''} ${sos ? 'sos' : ''}" data-map-guide="${g.id}" role="button" tabindex="0" aria-label="${g.name} at ${p.name}${sos ? ' · SOS active' : ''}">
      ${sos ? `<circle class="ping" cx="${x}" cy="${y}" r="16" fill="none" stroke="#dc2626" stroke-width="2.5"/>` : ''}
      ${lost ? `<circle class="halo" cx="${x}" cy="${y}" r="16" fill="none" stroke="#d97706" stroke-width="2"/>` : ''}
      <circle class="core" cx="${x}" cy="${y}" r="13" fill="${sos ? '#dc2626' : '#14532d'}" stroke="#fff" stroke-width="2.5"/>
      <text x="${x}" y="${y + 2.5}" fill="#fff" font-size="7.5" font-weight="800" text-anchor="middle">${g.initials}</text>
      ${lost ? `<circle cx="${x + 10}" cy="${y - 10}" r="5" fill="#d97706" stroke="#fff" stroke-width="1.5"/>` : ''}
    </g>`;
  }).join('');

  $('#sosLayer').innerHTML = '';

  renderMapSosPanel();
  renderMapDetails();
  renderMapGuideList();
}

function renderMapSosPanel() {
  const box = $('#mapSosPanel');
  const s = state.sos;
  if (!s) {
    box.innerHTML = `<div class="hint" style="margin-top:0">No active SOS. Use “Simulate SOS” above.</div>`;
    return;
  }
  const gps = s.gpsState === 'acquired' && s.gps
    ? `<b>${s.gps.coords}</b><div class="sub">${s.gps.fix} · ${s.gps.age}</div>`
    : s.gpsState === 'unavailable'
      ? `<b>GPS unavailable</b><div class="sub">Node area retained</div>`
      : `<b>Waiting for fix…</b><div class="sub">Node area is known</div>`;
  box.innerHTML = `
    <div class="flex items-center gap-2">
      <span class="badge badge-sos"><span class="dot"></span>SOS ACTIVE</span>
      <span class="text-[11px] text-slate-500">${s.id} · ${s.time}</span>
      <span class="badge badge-amber ml-auto">${s.status}</span>
    </div>
    <div class="font-bold text-[13px] mt-1">${s.guide} · ${s.nodeArea}</div>
    <div class="map-sos-parts">
      <div class="sos-part"><span class="tag">1 · Node area</span><b>${s.nodeArea}</b></div>
      <div class="sos-part ${s.gpsState === 'acquired' ? '' : 'muted'}"><span class="tag">2 · GPS point</span>${gps}</div>
    </div>
    <div class="map-sos-parts">
      <div class="sos-part"><span class="tag">Nearest checkpoint</span><b>${s.pastM} m past ${trailPoint(s.nodeId).name}</b></div>
      <div class="sos-part"><span class="tag">From start</span><b>${s.fromStart} km</b></div>
    </div>
    ${sosStepper(s)}
    <div class="tracker-line"><i data-lucide="${s.tracker ? 'check-circle-2' : 'clock'}"></i>${s.tracker ? 'Tracker: confirmation received' : 'Tracker: awaiting acknowledgement'}</div>
    <button class="btn btn-ghost btn-sm mt-2" data-goto="sos"><i data-lucide="arrow-right"></i>Open SOS alerts</button>`;
  icons();
}

function renderMapDetails() {
  const g = MOCK.trailGuides.find(x => x.id === state.mapGuideId) || MOCK.trailGuides[0];
  if (!g) return;
  const p = trailPoint(g.pointId);
  const sos = state.sos && state.sos.guideId === g.id;
  const lost = isLost(g) && !sos;
  $('#mapDetailSub').textContent = g.name;
  $('#mapDetails').innerHTML = `
    <div class="map-detail-top">
      <span class="avatar">${g.initials}</span>
      <div><div class="font-bold text-[13px]">${g.name}</div><div class="text-[11px] text-slate-500">Tracker ${g.id.toUpperCase()}</div></div>
      <span class="badge ${sos ? 'badge-sos' : lost ? 'badge-amber' : 'badge-green'} ml-auto">${sos ? 'SOS active' : lost ? 'Lost contact' : 'Heard'}</span>
    </div>
    <div class="map-detail-grid">
      <div class="detail"><span>Last node</span><b>${p.name}</b></div>
      <div class="detail"><span>Last update</span><b>${clockAgo(g.minutesAgo)}</b></div>
      <div class="detail"><span>Silent for</span><b>${g.minutesAgo} min</b></div>
      <div class="detail"><span>Threshold</span><b>${state.lostThreshold} min</b></div>
    </div>
    ${lost ? `<div class="form-summary mt-3" style="background:#fffbeb;border-color:#fde68a;color:#92400e"><i data-lucide="alert-triangle"></i><span>Last seen: ${p.name}, ${clockAgo(g.minutesAgo)} · above threshold</span></div>` : `<div class="hint">Last seen: ${p.name}, ${clockAgo(g.minutesAgo)}</div>`}`;
  icons();
}

function renderMapGuideList() {
  const sosId = state.sos && state.sos.guideId;
  const lostCount = MOCK.trailGuides.filter(g => isLost(g) && g.id !== sosId).length;
  $('#mapLostCount').textContent = `${lostCount} lost`;
  $('#mapLostCount').className = 'badge ' + (lostCount ? 'badge-amber' : 'badge-slate');
  $('#mapGuideList').innerHTML = MOCK.trailGuides.map(g => {
    const sos = g.id === sosId;
    const lost = isLost(g) && !sos;
    return `<button class="map-guide-row ${lost ? 'lost' : ''}" data-map-guide="${g.id}">
      <span class="avatar">${g.initials}</span>
      <div class="min-w-0">
        <div class="who">${g.name}</div>
        <div class="seen">Last seen: ${lastSeenLabel(g)}</div>
      </div>
      ${sos ? '<span class="badge badge-sos ml-auto">SOS active</span>' : lost ? '<span class="flag">⚠ Lost contact</span>' : '<span class="badge badge-green ml-auto">Heard</span>'}
    </button>`;
  }).join('');
}

function simulateNodeUpdate() {
  const g = MOCK.trailGuides[state.nodeUpdateIndex % MOCK.trailGuides.length];
  state.nodeUpdateIndex++;
  const i = MOCK.trailNodes.findIndex(n => n.id === g.pointId);
  const next = MOCK.trailNodes[(i + 1) % MOCK.trailNodes.length];
  g.pointId = next.id;
  g.minutesAgo = 0;
  state.mapGuideId = g.id;
  renderTrailMap();
  renderDashTrailStatus();
  toast(`${g.name} heard at ${next.name} · ${clockAgo(0)}`);
}

function simulateLostContact() {
  const eligible = MOCK.trailGuides.filter(g => !isLost(g));
  const g = eligible[state.lostIndex % Math.max(1, eligible.length)] || MOCK.trailGuides[0];
  g.minutesAgo = state.lostThreshold + 5 + (state.lostIndex % 10);
  state.lostIndex++;
  state.mapGuideId = g.id;
  renderTrailMap();
  renderDashTrailStatus();
  toast(`${g.name} flagged · no node contact for ${g.minutesAgo} min`, 'warn');
}

function renderGuideTable() {
  $('#guideTableBody').innerHTML = MOCK.guides.map(g => {
    const leave = approvedNotices(g.name)[0];
    return `<tr>
    <td><div class="flex items-center gap-2"><span class="avatar">${g.initials}</span>
      <div><div class="font-semibold text-[12.5px]">${g.name}</div><div class="text-[11px] text-slate-500">${g.cert}</div></div></div></td>
    <td>${leave
      ? `<span class="badge badge-amber">Unavailable</span>
         <div class="text-[10px] text-slate-500 mt-1">${formatDate(leave.date)} · Excluded from auto-assignment (Rule R2: Availability)</div>`
      : badgeFor(g.status)}</td>
    <td class="font-semibold">${g.week}</td>
    <td>${g.strong ? '<span class="badge badge-amber">Porter-capable</span>' : '<span class="text-[11px] text-slate-400">Standard</span>'}</td>
  </tr>`;
  }).join('');
}

function renderHistory() {
  const count = $('#alertHistoryCount');
  if (count) count.textContent = `${state.history.length} events`;
  $('#alertHistoryBody').innerHTML = state.history.map(s => `<tr>
    <td><div class="mono font-semibold">${s.id}</div><div class="text-[10.5px] text-slate-400">${s.date}</div></td>
    <td><div class="text-[12px] font-medium">${s.location}</div><div class="text-[10.5px] text-slate-400">${s.person}</div></td>
    <td><span class="badge badge-green">${s.response}</span></td>
  </tr>`).join('');
}

const SOS_STEPS = ['Received', 'Acknowledged', 'Resolved'];

function sosStepper(s) {
  return `<div class="stepper">
    ${SOS_STEPS.map((label, i) => `${i ? `<span class="step-line ${i <= s.step ? 'done' : ''}"></span>` : ''}
      <button class="step ${i < s.step ? 'done' : ''} ${i === s.step ? 'current' : ''}" data-step="${i}" ${i < s.step || i > s.step + 1 ? 'disabled' : ''}>
        <span class="num">${i < s.step ? '✓' : i + 1}</span><span>${label}</span>
      </button>`).join('')}
  </div>`;
}

function gpsSummary(s) {
  if (s.gpsState === 'acquired' && s.gps) return s.gps.coords;
  if (s.gpsState === 'unavailable') return 'GPS unavailable';
  return 'Waiting for fix…';
}

function renderSosBanner() {
  const box = $('#sosBanner');
  if (!state.sos) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  const s = state.sos;
  box.classList.remove('hidden');
  box.innerHTML = `
    <div class="sos-banner-head">
      <div class="flex items-center gap-3">
        <div class="sos-icon"><i data-lucide="siren"></i></div>
        <div><div class="flex items-center gap-2"><span class="badge badge-sos"><span class="dot"></span>SOS ACTIVE</span><span class="text-[11px] text-slate-500">${s.id} · ${s.time}</span></div>
          <div class="text-lg font-extrabold text-[#3b1d1d] mt-1">${s.guide} · ${s.nodeArea}</div></div>
      </div>
      <span class="badge badge-amber">${s.status}</span>
    </div>
    <div class="sos-meta">
      <div><span>Node area</span><b>${s.nodeArea}</b></div>
      <div><span>GPS</span><b>${gpsSummary(s)}</b></div>
      <div><span>Guide</span><b>${s.guide}</b></div>
      <div><span>Distance</span><b>${s.pastM} m past ${trailPoint(s.nodeId).name}</b></div>
    </div>
    <div class="flex items-center justify-between gap-2 mt-3 flex-wrap">
      <span class="text-[11px] text-slate-500">GPS stays off until SOS. Node area arrives first.</span>
      <button class="btn btn-danger btn-sm" data-goto="sos"><i data-lucide="arrow-right"></i>Open SOS alerts</button>
    </div>`;
  icons();
}

function renderSosPage() {
  const s = state.sos;
  const active = $('#sosActiveCard');
  if (!s) {
    active.innerHTML = `<div class="card"><div class="empty-state">
      <div class="empty-icon"><i data-lucide="shield-check"></i></div>
      <div class="font-semibold">No active SOS</div>
      <div class="text-xs text-slate-500 mt-1">Use “Simulate SOS” to create an alert. It arrives with the node area first.</div>
    </div></div>`;
    $('#sosLocation').innerHTML = `<div class="empty-state text-[12px]">Location details appear when an alert is active.</div>`;
    $('#sosResponse').innerHTML = `<div class="empty-state text-[12px]">Response status appears when an alert is active.</div>`;
  } else {
    active.innerHTML = `<div class="sos-banner">
      <div class="sos-banner-head">
        <div class="flex items-center gap-3">
          <div class="sos-icon"><i data-lucide="siren"></i></div>
          <div><div class="flex items-center gap-2"><span class="badge badge-sos"><span class="dot"></span>SOS ACTIVE</span><span class="text-[11px] text-slate-500">${s.id} · ${s.time}</span></div>
            <div class="text-lg font-extrabold text-[#3b1d1d] mt-1">${s.guide} · ${s.nodeArea}</div></div>
        </div>
        <span class="badge badge-amber">${s.status}</span>
      </div>
      <div class="sos-meta">
        <div><span>Node area</span><b>${s.nodeArea}</b></div>
        <div><span>GPS fix</span><b>${s.gpsState === 'acquired' ? 'Fix acquired' : s.gpsState === 'unavailable' ? 'Unavailable' : 'Pending'}</b></div>
        <div><span>Nearest checkpoint</span><b>${s.pastM} m past ${trailPoint(s.nodeId).name}</b></div>
        <div><span>From start</span><b>${s.fromStart} km</b></div>
      </div>
    </div>`;

    const gpsBlock = s.gpsState === 'acquired' && s.gps
      ? `<b>${s.gps.coords}</b><div class="sub">${s.gps.fix} · ${s.gps.age}</div>`
      : s.gpsState === 'unavailable'
        ? `<b>GPS unavailable</b><div class="sub">No fix received · node area retained</div>`
        : `<b>Waiting for GPS point…</b><div class="sub">Node area is already known</div>`;
    $('#sosLocation').innerHTML = `<div class="sos-location-grid">
      <div class="sos-part">
        <span class="tag">1 · Node area</span>
        <b>${s.nodeArea}</b><div class="sub">Received instantly over LoRa</div>
      </div>
      <div class="sos-part ${s.gpsState === 'acquired' ? '' : 'muted'}">
        <span class="tag">2 · GPS point</span>
        ${gpsBlock}
      </div>
    </div>
    <div class="sos-location-grid mt-3">
      <div class="sos-part"><span class="tag">Nearest checkpoint</span><b>${s.pastM} m past ${trailPoint(s.nodeId).name}</b></div>
      <div class="sos-part"><span class="tag">Distance from start</span><b>${s.fromStart} km</b></div>
    </div>`;

    $('#sosResponse').innerHTML = `${sosStepper(s)}
      <div class="tracker-line"><i data-lucide="${s.tracker ? 'check-circle-2' : 'clock'}"></i>${s.tracker ? 'Tracker: confirmation received' : 'Tracker: awaiting acknowledgement'}</div>
      <p class="text-[11px] text-slate-500 mt-2">Acknowledging sends a confirmation to the guide's tracker. Resolving logs the alert with its GPS status.</p>`;
  }
  renderSosHistory();
  icons();
}

function renderSosHistory() {
  $('#sosHistoryCount').textContent = `${state.sosHistory.length} events`;
  $('#sosHistoryBody').innerHTML = state.sosHistory.map(h => `<tr>
    <td class="text-[12px]">${h.time}</td>
    <td class="text-[12px] font-semibold">${h.guide}</td>
    <td class="text-[12px]">${h.node}</td>
    <td>${h.gps === 'Yes' ? '<span class="badge badge-green">Yes</span>' : '<span class="badge badge-slate">No – unavailable</span>'}</td>
    <td><span class="badge badge-green">${h.status}</span></td>
  </tr>`).join('');
}

function onSosStep(e) {
  const btn = e.target.closest('[data-step]');
  if (!btn || !state.sos || btn.disabled) return;
  const step = +btn.dataset.step;
  if (step === state.sos.step) return;
  if (step === 2) { resolveSos(); return; }
  state.sos.step = step;
  state.sos.status = SOS_STEPS[step];
  if (step === 1) state.sos.tracker = true;
  renderSosBanner();
  renderSosPage();
  renderTrailMap();
  if (step === 1) toast("Confirmation sent to guide's tracker");
}

function simulateSos() {
  if (state.sos) { toast('An SOS is already active — resolve it first', 'warn'); return; }
  const guide = MOCK.trailGuides[state.sosNodeIndex % MOCK.trailGuides.length];
  state.sosNodeIndex++;
  const node = trailPoint(guide.pointId);
  const id = 'SOS-' + String(100 + state.sosHistory.length + 1);
  const noGps = !!($('#noGpsFix') && $('#noGpsFix').checked);
  state.sos = {
    id, guide: guide.name, guideId: guide.id, nodeId: node.id, nodeArea: 'Near ' + node.name,
    status: 'Received', step: 0, gpsState: 'pending', gps: null, noGps,
    tracker: false, time: nowClock(), startedAt: Date.now(),
    pastM: 500, fromStart: (node.km + 0.5).toFixed(1)
  };
  renderDashboard();
  renderSosPage();
  renderTrailMap();
  toast(`SOS from ${guide.name} · ${state.sos.nodeArea}`, 'warn');
  const sosId = id;
  setTimeout(() => {
    const s = state.sos;
    if (!s || s.id !== sosId) return;
    const p = trailPoint(s.nodeId);
    if (s.noGps) {
      s.gpsState = 'unavailable';
    } else {
      s.gpsState = 'acquired';
      s.gps = {
        coords: fmtCoord(p.lat + 0.0008, p.lng + 0.0004),
        fix: 'Fix acquired', age: '12 s ago', x: p.x + 28, y: p.y - 26
      };
    }
    renderDashboard();
    renderSosPage();
    renderTrailMap();
    toast(s.noGps ? 'No GPS fix — node area retained' : 'GPS fix acquired · point added', s.noGps ? 'warn' : 'ok');
  }, 3000);
}

function nowClock() {
  return new Date().toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

function resolveSos() {
  const s = state.sos;
  if (!s) return;
  const elapsed = Math.max(120, Math.round((Date.now() - s.startedAt) / 1000));
  state.sosHistory.unshift({
    id: s.id, time: 'Today · ' + s.time, guide: s.guide, node: s.nodeArea,
    gps: s.gpsState === 'acquired' ? 'Yes' : 'No – unavailable',
    status: 'Resolved', responseSec: elapsed
  });
  state.sos = null;
  renderDashboard();
  renderSosPage();
  renderTrailMap();
  renderReportStats();
  toast('SOS resolved — added to alert history');
}

/* ---------------- trail & node settings ---------------- */
function renderSettings() {
  $('#settingsNodeCount').textContent = `${MOCK.trailNodes.length} points`;
  $('#settingsTableBody').innerHTML = MOCK.trailNodes.map(n => {
    if (state.editingNode === n.id) {
      return `<tr>
        <td><input data-node-field="name" value="${n.name}"></td>
        <td><span class="badge ${n.type === 'gateway' ? 'badge-amber' : 'badge-green'}">${n.type}</span></td>
        <td><input data-node-field="lat" type="number" step="0.0001" value="${n.lat}"></td>
        <td><input data-node-field="lng" type="number" step="0.0001" value="${n.lng}"></td>
        <td><input data-node-field="radius" type="number" min="0" step="10" value="${n.radius}"></td>
        <td><div class="actions">
          <button class="btn btn-primary btn-sm" data-node-save="${n.id}"><i data-lucide="check"></i>Save</button>
          <button class="btn btn-ghost btn-sm" data-node-cancel="${n.id}">Cancel</button>
        </div></td>
      </tr>`;
    }
    return `<tr>
      <td><div class="font-semibold text-[12.5px]">${n.name}</div></td>
      <td><span class="badge ${n.type === 'gateway' ? 'badge-amber' : 'badge-green'}">${n.type === 'gateway' ? 'Gateway' : 'Node'}</span></td>
      <td class="mono">${n.lat.toFixed(4)}</td>
      <td class="mono">${n.lng.toFixed(4)}</td>
      <td>${n.radius ? n.radius + ' m' : '<span class="text-[11px] text-slate-400">—</span>'}</td>
      <td><button class="btn btn-ghost btn-sm" data-node-edit="${n.id}"><i data-lucide="pencil"></i>Edit</button></td>
    </tr>`;
  }).join('');
  icons();
}

function onSettingsAction(e) {
  const edit = e.target.closest('[data-node-edit]');
  const cancel = e.target.closest('[data-node-cancel]');
  const save = e.target.closest('[data-node-save]');
  if (edit) { state.editingNode = edit.dataset.nodeEdit; renderSettings(); return; }
  if (cancel) { state.editingNode = null; renderSettings(); return; }
  if (!save) return;
  const node = MOCK.trailNodes.find(n => n.id === save.dataset.nodeSave);
  const row = save.closest('tr');
  if (!node) return;
  const value = f => row.querySelector(`[data-node-field="${f}"]`).value;
  node.name = value('name').trim() || node.name;
  node.lat = +value('lat') || node.lat;
  node.lng = +value('lng') || node.lng;
  node.radius = Math.max(0, +value('radius') || 0);
  state.editingNode = null;
  renderSettings();
  renderTrailMap();
  renderDashTrailStatus();
  toast(`${node.name} updated — coverage circle resized`);
}

function addTrailNode() {
  const count = MOCK.trailNodes.filter(n => n.type === 'node').length + 1;
  const idx = MOCK.trailNodes.length;
  const node = {
    id: 'n' + (++state.nodeSeq), type: 'node', name: 'Node ' + count,
    lat: +(8.279 + idx * 0.0014).toFixed(4), lng: +(125.028 + idx * 0.0014).toFixed(4),
    radius: 90, x: 120 + ((idx * 83) % 430), y: 300 - ((idx * 47) % 190),
    km: +(1.0 + idx * 0.6).toFixed(1)
  };
  MOCK.trailNodes.push(node);
  state.editingNode = node.id;
  renderSettings();
  renderTrailMap();
  renderDashTrailStatus();
  toast(`${node.name} added — set its coverage radius`);
}

function renderReportStats() {
  const rows = state.sosHistory;
  const yes = rows.filter(h => h.gps === 'Yes').length;
  const rate = rows.length ? Math.round(yes / rows.length * 100) : 0;
  const avg = rows.length ? Math.round(rows.reduce((s, h) => s + (h.responseSec || 0), 0) / rows.length) : 0;
  $('#reportGpsFix').textContent = rate + '%';
  $('#reportResponse').textContent = `${Math.floor(avg / 60)} min ${avg % 60} s`;
}

/* ---------------- gate terminal ---------------- */
function renderGateRecent() {
  $('#gateRecent').innerHTML = MOCK.checkins.slice(0, 5).map(c => `<div class="checkin-row">
    <span class="dot"></span>
    <div class="min-w-0 flex-1">
      <div class="text-[12.5px] font-semibold truncate">${c.leader}</div>
      <div class="text-[11px] text-slate-500">${c.pax} pax · ${c.guide}</div>
    </div>
    <span class="text-[10.5px] text-slate-400">${c.time}</span>
  </div>`).join('');
}

function lookup(code) {
  const booking = MOCK.bookings.find(b => b.code.toLowerCase() === code.toLowerCase());
  if (!booking) return { type: 'missing', code };
  if (booking.status === 'Checked-in') return { type: 'used', code, booking };
  return { type: 'valid', code, booking };
}

function scan(input) {
  let result;
  if (input === 'cycle') {
    const codes = ['EC-2407-118', 'EC-2407-092', 'EC-9999-001'];
    result = lookup(codes[state.scanIndex % codes.length]);
    state.scanIndex++;
  } else {
    result = lookup(input);
  }
  if (!state.online) {
    state.queue++;
    updateQueueUI();
    showScanResult({ ...result, type: 'queued' });
    return;
  }
  showScanResult(result);
  if (result.type === 'valid') {
    result.booking.status = 'Checked-in';
    renderBookings();
    MOCK.checkins.unshift({ time: 'just now', leader: result.booking.leader, pax: result.booking.pax, guide: result.booking.guide });
    renderGateRecent();
    renderDashboard();
    toast(`${result.booking.leader} checked in · ${result.booking.pax} pax`);
  }
}

function showScanResult(r) {
  const meta = {
    valid: { cls: 'valid', icon: 'check-circle-2', title: 'VALID', msg: 'Entry allowed. Visitor marked as checked-in.' },
    used: { cls: 'used', icon: 'alert-triangle', title: 'ALREADY USED', msg: 'This code was already scanned at the gate.' },
    missing: { cls: 'missing', icon: 'x-circle', title: 'NOT FOUND', msg: 'No booking matches this code.' },
    queued: { cls: 'queued', icon: 'cloud-off', title: 'QUEUED OFFLINE', msg: 'Saved to local cache. It will sync when the connection returns.' }
  }[r.type];
  const b = r.booking;
  const badge = $('#scanBadge');
  badge.textContent = meta.title;
  badge.className = 'badge ' + (r.type === 'valid' ? 'badge-green' : r.type === 'missing' ? 'badge-sos' : 'badge-amber');
  $('#scanResult').innerHTML = `<div class="scan-result ${meta.cls}">
    <div class="scan-icon"><i data-lucide="${meta.icon}"></i></div>
    <div class="min-w-0">
      <div class="scan-title">${meta.title}</div>
      <div class="text-[12px] opacity-80">${meta.msg}</div>
      <div class="scan-meta">
        <div><span>Code</span><b>${b ? b.code : r.code}</b></div>
        ${b ? `<div><span>Group leader</span><b>${b.leader}</b></div>
        <div><span>Group</span><b>${b.pax} pax · ${b.slot}</b></div>
        <div><span>Guide</span><b>${b.guide || 'Unassigned'}</b></div>` : ''}
      </div>
    </div>
  </div>`;
  icons();
}

function updateQueueUI() {
  const el = $('#queueCount');
  if (el) el.textContent = state.queue;
}

function setOnline(on) {
  state.online = on;
  const badge = $('#netBadge');
  badge.className = 'badge ' + (on ? 'badge-green' : 'badge-amber');
  badge.innerHTML = `<span class="dot"></span>${on ? 'ONLINE' : 'OFFLINE'}`;
  $('#onlineToggle').checked = on;
  $('#offlineBanner').classList.toggle('hidden', on);
  if (!on) {
    clearInterval(state.syncTimer);
    state.queue = Math.max(state.queue, 5);
    updateQueueUI();
    $('#syncCard').classList.add('hidden');
    toast('Outage simulated — check-ins are queued locally', 'warn');
  } else {
    if (state.queue > 0) runSync();
    toast('Connection restored — syncing local cache');
  }
}

function runSync() {
  const n = Math.max(state.queue, 1);
  const card = $('#syncCard');
  card.classList.remove('hidden');
  const bar = $('#syncBar'), status = $('#syncStatus');
  $('#syncTitle').textContent = 'Syncing queued check-ins…';
  $('#syncLog').innerHTML = '';
  bar.style.width = '0%';
  let i = 0;
  clearInterval(state.syncTimer);
  state.syncTimer = setInterval(() => {
    i++;
    status.className = 'badge badge-amber';
    status.textContent = `${i} of ${n}`;
    bar.style.width = Math.round(i / n * 100) + '%';
    if (i >= n) {
      clearInterval(state.syncTimer);
      state.queue = 0;
      updateQueueUI();
      status.className = 'badge badge-green';
      status.textContent = 'Complete';
      $('#syncTitle').textContent = 'Sync complete';
      $('#syncLog').innerHTML = buildSyncRows(n);
      toast(`Synced ${n} check-ins · 1 duplicate flagged`, 'warn');
    }
  }, 420);
}

function buildSyncRows(n) {
  const rows = [];
  for (let i = 0; i < n; i++) {
    const extra = MOCK.bookings[(i * 3) % MOCK.bookings.length];
    const base = MOCK.syncLog[i] || { time: `12:43:${10 + i}`, code: extra.code, leader: extra.leader };
    rows.push({ ...base, duplicate: i === 1 });
  }
  return `<div class="table-scroll"><table class="data-table">
    <thead><tr><th>Time</th><th>Code</th><th>Group leader</th><th>Result</th></tr></thead>
    <tbody>${rows.map(r => `<tr class="${r.duplicate ? 'conflict' : ''}">
      <td>${r.time}</td><td class="mono">${r.code}</td><td>${r.leader}</td>
      <td>${r.duplicate ? '<span class="badge badge-amber">Duplicate – flagged</span>' : '<span class="badge badge-green">Synced</span>'}</td>
    </tr>`).join('')}</tbody></table></div>`;
}

function resetGate() {
  clearInterval(state.syncTimer);
  MOCK.bookings.forEach(b => {
    const init = initialBookings.find(x => x.code === b.code);
    if (init) b.status = init.status;
  });
  state.scanIndex = 0;
  state.queue = 0;
  updateQueueUI();
  $('#syncCard').classList.add('hidden');
  const badge = $('#scanBadge');
  badge.textContent = 'Ready';
  badge.className = 'badge badge-slate';
  $('#scanResult').innerHTML = `<div class="empty-state">
    <div class="empty-icon"><i data-lucide="scan-line"></i></div>
    <div class="font-semibold">Awaiting scan</div>
    <div class="text-xs text-slate-500 mt-1">Simulate a QR scan or type a booking code.</div>
  </div>`;
  renderBookings();
  renderDashboard();
  icons();
  toast('Gate demo reset');
}

/* ---------------- scheduling ---------------- */
function renderBookings() {
  const pending = MOCK.bookings.filter(b => b.status.startsWith('Pending')).length;
  $('#bookingCount').textContent = `${MOCK.bookings.length} bookings · ${pending} need attention`;
  const badge = $('#pendingBadge');
  badge.textContent = `${pending} need attention`;
  badge.className = 'badge ' + (pending ? 'badge-amber' : 'badge-green');
  $('#bookingsBody').innerHTML = MOCK.bookings.map(b => `<tr data-code="${b.code}" class="${b.status.startsWith('Pending') ? 'pending-row' : ''}">
    <td class="mono font-semibold">${b.code}</td>
    <td><div class="font-semibold text-[12.5px]">${b.leader}</div><div class="text-[11px] text-slate-500">${b.pax} pax · ${b.slot}</div></td>
    <td>${b.guide || '<span class="text-[11px] font-semibold text-amber-700">Unassigned</span>'}</td>
    <td>${badgeFor(b.status)}</td>
  </tr>`).join('');
  if (state.guide.loggedIn) { renderGuideAssignments(); renderGuideWeek(); }
}

/* ---------------- tour guide app ---------------- */
function renderGuide() {
  const on = state.guide.loggedIn;
  $('#guideLogin').classList.toggle('hidden', on);
  $('#guideApp').classList.toggle('hidden', !on);
  if (!on) return;
  $('#guideDate').textContent = 'Today · ' + formatDate(todayISO());
  $('#guideTodayDate').textContent = formatDate(todayISO());
  setGuideTab(state.guide.tab);
  renderGuideAssignments();
  renderGuideWeek();
  renderGuideNotices();
  icons();
}

function renderGuideAssignments() {
  const today = todayISO();
  const mine = MOCK.bookings.filter(b => b.guide === GUIDE_NAME && b.status === 'Confirmed');
  const todays = mine.filter(b => bookingISO(b) === today);
  const upcoming = mine.filter(b => bookingISO(b) > today).sort((a, b) => bookingISO(a).localeCompare(bookingISO(b)));

  $('#guideToday').innerHTML = todays.length
    ? `<div class="guide-list">${todays.map(current => `<div class="guide-feature">
        <div class="flex items-center justify-between gap-2">
          <span class="badge badge-green"><span class="dot"></span>Today</span>
          <span class="mono text-[10px] text-slate-400">${current.code}</span>
        </div>
        <div class="name">${current.leader}</div>
        <div class="meta">${current.pax} pax · ${current.slot}</div>
        <div class="guide-tags">
          <span class="chip"><i data-lucide="users"></i>${current.pax} trekkers</span>
          <span class="chip"><i data-lucide="clock"></i>${current.slot}</span>
          ${current.heavy ? '<span class="chip"><i data-lucide="backpack"></i>Heavy baggage</span>' : ''}
        </div>
        <div class="guide-meet"><i data-lucide="map-pin"></i><span>Meeting point: <b>Gate 1 · Registration desk</b></span></div>
        <div class="guide-meet"><i data-lucide="alarm-clock"></i><span>Gate time: <b>${gateTime(current.slot)}</b> · 30 min before slot</span></div>
      </div>`).join('')}</div>`
    : `<div class="guide-empty">No group assigned today. Check your schedule or wait for an admin assignment.</div>`;

  $('#guideUpcoming').innerHTML = upcoming.length
    ? upcoming.map(b => `<div class="guide-item">
        <div class="datebox"><b>${new Date(bookingISO(b) + 'T00:00:00').getDate()}</b>${new Date(bookingISO(b) + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short' })}</div>
        <div class="min-w-0 flex-1">
          <div class="title">${b.leader}</div>
          <div class="sub">${b.pax} pax · ${b.slot}${b.heavy ? ' · heavy baggage' : ''}</div>
        </div>
        <span class="badge badge-slate">${b.code}</span>
      </div>`).join('')
    : `<div class="guide-empty">No upcoming assignments yet.</div>`;
}

function renderGuideWeek() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  const approved = approvedNotices(GUIDE_NAME);
  const days = MOCK.guideWeek.map((d, i) => {
    const dt = new Date(start);
    dt.setDate(start.getDate() + i);
    const iso = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    const onLeave = approved.some(n => n.date === iso);
    return { ...d, status: onLeave ? 'leave' : d.status };
  });
  const assigned = days.filter(d => d.status === 'assigned').length;
  $('#guideWeekCount').textContent = `${assigned} assignment${assigned === 1 ? '' : 's'}`;
  $('#guideWeek').innerHTML = days.map(d => `<div class="guide-day ${d.status}">
    <div class="d">${d.day}</div>
    <div class="dot"></div>
    <div class="s">${d.status === 'assigned' ? 'Assigned' : d.status === 'leave' ? 'Leave' : 'Off'}</div>
  </div>`).join('');
}

function renderGuideNotices() {
  const mine = state.notices.filter(n => n.guide === GUIDE_NAME);
  $('#guideNotices').innerHTML = mine.length
    ? mine.map(n => `<div class="guide-notice">
        <div class="top"><span class="type">${n.type}</span>${noticeBadge(n.status)}</div>
        <div class="meta">${formatDate(n.date)} · ${n.reason}</div>
      </div>`).join('')
    : `<div class="guide-empty">No notices filed yet.</div>`;
}

function noticeBadge(status) {
  const cls = status === 'Approved' ? 'badge-green' : status === 'Declined' ? 'badge-slate' : 'badge-amber';
  return `<span class="badge ${cls}">${status}</span>`;
}

function renderGuideNoticesAdmin() {
  const pending = state.notices.filter(n => n.status === 'Pending').length;
  const badge = $('#noticeCount');
  if (badge) {
    badge.textContent = `${pending} pending`;
    badge.className = 'badge ' + (pending ? 'badge-amber' : 'badge-green');
  }
  const list = $('#guideNoticesAdmin');
  if (!list) return;
  const sorted = [...state.notices].sort((a, b) => (a.status === 'Pending' ? 0 : 1) - (b.status === 'Pending' ? 0 : 1));
  list.innerHTML = sorted.length
    ? sorted.map(n => `<div class="guide-notice-row">
        <div class="min-w-0">
          <div class="who">${n.guide}</div>
          <div class="detail">${n.type} · ${formatDate(n.date)} · ${n.reason}</div>
        </div>
        <div class="actions">
          ${n.status === 'Pending'
            ? `<button class="btn btn-ghost btn-sm" data-notice="${n.id}" data-notice-action="approve"><i data-lucide="check"></i>Approve</button>
               <button class="btn btn-ghost btn-sm" data-notice="${n.id}" data-notice-action="decline"><i data-lucide="x"></i>Decline</button>`
            : noticeBadge(n.status)}
        </div>
      </div>`).join('')
    : `<div class="empty-state">No guide notices yet.</div>`;
  icons();
}

function setGuideTab(tab) {
  state.guide.tab = tab;
  $$('[data-guide-tab]').forEach(b => b.classList.toggle('active', b.dataset.guideTab === tab));
  $$('.guide-tab').forEach(p => p.classList.toggle('hidden', p.id !== 'guideTab-' + tab));
}

function onNoticeAction(e) {
  const btn = e.target.closest('[data-notice-action]');
  if (!btn) return;
  const notice = state.notices.find(n => n.id === btn.dataset.notice);
  if (!notice) return;
  notice.status = btn.dataset.noticeAction === 'approve' ? 'Approved' : 'Declined';
  renderGuideNoticesAdmin();
  renderGuideNotices();
  renderGuideTable();
  renderGuideWeek();
  toast(`${notice.guide}'s ${notice.type.toLowerCase()} notice ${notice.status.toLowerCase()}`);
}

function submitLeave(e) {
  e.preventDefault();
  const date = $('#leaveDate').value;
  const type = $('#leaveType').value;
  const reason = $('#leaveReason').value.trim();
  if (!date || !reason) { toast('Add a date and reason for your notice', 'warn'); return; }
  state.notices.unshift({ id: 'N-' + String(state.notices.length + 1).padStart(3, '0'), guide: GUIDE_NAME, date, type, reason, status: 'Pending' });
  $('#leaveReason').value = '';
  const confirm = $('#leaveConfirm');
  confirm.classList.remove('hidden');
  setTimeout(() => confirm.classList.add('hidden'), 3200);
  renderGuideNotices();
  renderGuideNoticesAdmin();
  renderGuideWeek();
  toast('Notice sent to admin');
  icons();
}

function renderRules() {
  $('#rulesList').innerHTML = MOCK.rules.map(r => `<div class="rule-row" data-rule="${r.id}">
    <div class="flex items-start justify-between gap-3">
      <div class="flex gap-2.5 min-w-0">
        <span class="rule-code">${r.id}</span>
        <div><div class="text-[12.5px] font-bold">${r.name}</div><div class="text-[11px] text-slate-500">${r.desc}</div></div>
      </div>
      <label class="switch" aria-label="${r.name}">
        <input type="checkbox" ${r.on ? 'checked' : ''} data-rule-toggle="${r.id}">
        <span class="track"></span>
      </label>
    </div>
    ${r.threshold != null ? `<div class="rule-threshold"><label>Threshold</label>
      <input type="number" value="${r.threshold}" data-rule-threshold="${r.id}"><span>${r.unit}</span></div>` : ''}
  </div>`).join('');

  $$('[data-rule-toggle]').forEach(input => input.addEventListener('change', () => {
    const rule = MOCK.rules.find(r => r.id === input.dataset.ruleToggle);
    rule.on = input.checked;
    toast(`${rule.id} ${rule.on ? 'enabled' : 'disabled'}`, rule.on ? 'ok' : 'warn');
  }));
  $$('[data-rule-threshold]').forEach(input => input.addEventListener('change', () => {
    const rule = MOCK.rules.find(r => r.id === input.dataset.ruleThreshold);
    rule.threshold = +input.value;
    toast(`${rule.id} threshold updated`);
  }));
}

async function runAutoAssign() {
  const btn = $('#autoAssignBtn');
  if (btn.disabled) return;
  const pending = MOCK.bookings.filter(b => b.status === 'Pending');
  if (!pending.length) { toast('No pending bookings to assign', 'warn'); return; }
  btn.disabled = true;
  const original = btn.innerHTML;
  btn.innerHTML = '<i data-lucide="loader-2" class="spin"></i>Assigning…';
  icons();
  for (const b of pending) {
    await wait(650);
    const guide = pickGuide(false);
    guide.week += 1;
    b.guide = guide.name;
    b.status = 'Confirmed';
    renderBookings();
    renderDashboard();
    updateGuideChart();
    const row = $(`[data-code="${b.code}"]`);
    if (row) {
      row.classList.add('flash');
      setTimeout(() => row.classList.remove('flash'), 1200);
    }
  }
  btn.disabled = false;
  btn.innerHTML = original;
  icons();
  toast(`${pending.length} bookings assigned · 1 kept for manual review`);
}

function updateGuideChart() {
  if (!charts.guide) return;
  charts.guide.data.datasets[0].data = MOCK.guides.map(g => g.week);
  charts.guide.update();
}

/* ---------------- static mock stats ---------------- */
function renderStats() {
  const l = MOCK.lora, m = MOCK.metrics;
  $('#loraGateway').textContent = l.gateway;
  $('#loraNodes').textContent = l.nodes;
  $('#loraDelivery').textContent = l.delivery + '%';
  $('#loraLatency').textContent = l.latency + ' s';
  $('#loraUptime').textContent = l.uptime;
  $('#loraPackets').textContent = l.packets.toLocaleString();
  $('#metricDispatch').textContent = m.dispatch + '%';
  $('#metricSync').textContent = m.sync + '%';
  $('#metricLora').textContent = l.delivery + '%';
  $('#metricLoraNote').textContent = l.packets.toLocaleString() + ' packets today';
  $('#metricLatency').textContent = l.latency + ' s';
  $('#metricResponse').textContent = m.dashboardMs + ' ms';
  $('#healthList').innerHTML = m.health.map(h => `<div class="health-row">
    <span><span class="health-dot ${h.ok ? '' : 'warn'}"></span> ${h.name}</span><b>${h.value}</b>
  </div>`).join('');
}

/* ---------------- charts ---------------- */
function updateGuideStatusChart() {
  if (!charts.guideStatus) return;
  const count = { 'On trail': 0, 'Available': 0, 'Off duty': 0 };
  MOCK.guides.forEach(g => count[g.status]++);
  charts.guideStatus.data.datasets[0].data = [count['On trail'], count['Available'], count['Off duty']];
  charts.guideStatus.update();
}

function initCharts() {
  if (!window.Chart) return;
  Chart.defaults.font.family = 'ui-sans-serif, system-ui, "Segoe UI", Roboto, Arial, sans-serif';
  Chart.defaults.color = '#64748b';
  const grid = { color: 'rgba(20, 83, 45, .08)' };
  const noGrid = { display: false };

  charts.bookings = new Chart($('#bookingsChart'), {
    type: 'bar',
    data: {
      labels: MOCK.bookingsPerDay.labels,
      datasets: [{ data: MOCK.bookingsPerDay.data, backgroundColor: '#15803d', hoverBackgroundColor: '#166534', borderRadius: 7, maxBarThickness: 38 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} bookings` } } },
      scales: {
        y: { beginAtZero: true, grid, ticks: { font: { size: 11 } } },
        x: { grid: noGrid, ticks: { font: { size: 11 } } }
      }
    }
  });

  const guideCount = { 'On trail': 0, 'Available': 0, 'Off duty': 0 };
  MOCK.guides.forEach(g => guideCount[g.status]++);
  charts.guideStatus = new Chart($('#guideStatusChart'), {
    type: 'doughnut',
    data: {
      labels: ['On trail', 'Available', 'Off duty'],
      datasets: [{ data: [guideCount['On trail'], guideCount['Available'], guideCount['Off duty']], backgroundColor: ['#14532d', '#4ade80', '#cbd5e1'], borderWidth: 0, hoverOffset: 4 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '64%',
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 9, boxHeight: 9, font: { size: 11 }, padding: 12 } } }
    }
  });

  charts.guide = new Chart($('#guideChart'), {
    type: 'bar',
    data: {
      labels: MOCK.guides.map(g => g.short),
      datasets: [{ data: MOCK.guides.map(g => g.week), backgroundColor: '#15803d', borderRadius: 6, maxBarThickness: 30 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} assignments` } } },
      scales: {
        y: { beginAtZero: true, grid, ticks: { font: { size: 11 } } },
        x: { grid: noGrid, ticks: { font: { size: 11 } } }
      }
    }
  });

  charts.lora = new Chart($('#loraChart'), {
    type: 'bar',
    data: {
      labels: ['Gate', 'CP1', 'CP2', 'CP3', 'Ridge'],
      datasets: [{ data: MOCK.metrics.deliveryByCp, backgroundColor: MOCK.metrics.deliveryByCp.map(v => v < 90 ? '#d97706' : '#15803d'), borderRadius: 7, maxBarThickness: 46 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y}% delivered` } } },
      scales: {
        y: { min: 70, max: 100, grid, ticks: { callback: v => v + '%', font: { size: 11 } } },
        x: { grid: noGrid, ticks: { font: { size: 11 } } }
      }
    }
  });

  charts.rssi = new Chart($('#rssiChart'), {
    type: 'line',
    data: {
      labels: ['Gate', 'CP1', 'CP2', 'CP3', 'Ridge'],
      datasets: [{ data: MOCK.metrics.rssiByCp, borderColor: '#b45309', backgroundColor: 'rgba(180, 83, 9, .12)', fill: true, tension: .35, pointRadius: 4, pointBackgroundColor: '#92400e', borderWidth: 2 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.parsed.y} dBm` } } },
      scales: {
        y: { min: -100, max: -40, grid, ticks: { callback: v => v + ' dBm', font: { size: 11 } } },
        x: { grid: noGrid, ticks: { font: { size: 11 } } }
      }
    }
  });
}

/* ---------------- bindings & boot ---------------- */
function bind() {
  $('#mainNav').addEventListener('click', e => {
    const btn = e.target.closest('button[data-page]');
    if (btn) showPage(btn.dataset.page);
  });
  $$('.role-switch button').forEach(b => b.addEventListener('click', () => setRole(b.dataset.role)));
  document.addEventListener('click', e => {
    const target = e.target.closest('[data-goto]');
    if (!target) return;
    const pageRole = { register: 'visitor', gate: 'gate', guide: 'guide', dashboard: 'admin', trailmap: 'admin', sos: 'admin', scheduling: 'admin', metrics: 'admin', settings: 'admin' }[target.dataset.goto];
    if (pageRole && pageRole !== state.role) setRole(pageRole);
    else showPage(target.dataset.goto);
  });

  $('#groupSize').addEventListener('input', updateFormSummary);
  $('#bookingForm').addEventListener('submit', onSubmit);
  $('#newBookingBtn').addEventListener('click', resetBooking);

  $('#trekkerToggle').addEventListener('click', e => {
    const btn = e.target.closest('[data-trekker]');
    if (btn) setTrekker(btn.dataset.trekker);
  });
  $('#trailCalendar').addEventListener('click', e => {
    const btn = e.target.closest('.cal-day');
    if (!btn || btn.disabled) return;
    $('#visitDate').value = btn.dataset.date;
    const d = new Date(btn.dataset.date + 'T00:00:00');
    state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1);
    renderCalendar();
    updateFormSummary();
  });
  $('#calPrev').addEventListener('click', () => shiftMonth(-1));
  $('#calNext').addEventListener('click', () => shiftMonth(1));
  $('#visitDate').addEventListener('change', () => {
    const v = $('#visitDate').value;
    if (v) { const d = new Date(v + 'T00:00:00'); state.calMonth = new Date(d.getFullYear(), d.getMonth(), 1); }
    renderCalendar();
    updateFormSummary();
  });

  $('#adminLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    tryLogin('admin', $('#adminUser').value, $('#adminPass').value, $('#adminLoginError'));
  });
  $('#gateLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    tryLogin('gate', $('#gateUser').value, $('#gatePin').value, $('#gateLoginError'));
  });
  $('#adminSkip').addEventListener('click', () => loginStaff('admin'));
  $('#gateSkip').addEventListener('click', () => loginStaff('gate'));
  $('#signOutBtn').addEventListener('click', signOut);
  $$('[data-login-back]').forEach(b => b.addEventListener('click', () => setRole('visitor')));

  $('#scanBtn').addEventListener('click', () => scan('cycle'));
  $('#manualVerify').addEventListener('click', () => {
    const code = $('#manualCode').value.trim();
    if (code) scan(code); else toast('Enter a booking code first', 'warn');
  });
  $('#manualCode').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); $('#manualVerify').click(); }
  });
  $('#onlineToggle').addEventListener('change', e => setOnline(e.target.checked));
  $('#resetGateBtn').addEventListener('click', resetGate);

  $('#autoAssignBtn').addEventListener('click', runAutoAssign);
  $('#saveRulesBtn').addEventListener('click', () => toast('Rule set saved for this demo'));

  $('#simulateSosBtn').addEventListener('click', simulateSos);
  $('#sosPageSimBtn').addEventListener('click', simulateSos);
  $('#sosBanner').addEventListener('click', onSosStep);
  $('#sosActiveCard').addEventListener('click', onSosStep);
  $('#sosResponse').addEventListener('click', onSosStep);
  $('#openTrailMapBtn').addEventListener('click', () => showPage('trailmap'));
  $('#nodeUpdateBtn').addEventListener('click', simulateNodeUpdate);
  $('#lostContactBtn').addEventListener('click', simulateLostContact);
  $('#mapSimSosBtn').addEventListener('click', simulateSos);
  $('#mapSosPanel').addEventListener('click', onSosStep);
  document.addEventListener('click', e => {
    const marker = e.target.closest('[data-map-guide]');
    if (marker) { state.mapGuideId = marker.dataset.mapGuide; renderTrailMap(); }
  });
  $('#settingsTableBody').addEventListener('click', onSettingsAction);
  $('#addNodeBtn').addEventListener('click', addTrailNode);
  $('#lostThresholdInput').addEventListener('input', e => {
    state.lostThreshold = Math.max(5, Math.min(120, +e.target.value || 30));
    renderTrailMap();
    renderDashTrailStatus();
  });

  $('#guideLoginForm').addEventListener('submit', e => {
    e.preventDefault();
    state.guide.loggedIn = true;
    state.guide.tab = 'assignments';
    renderGuide();
    toast('Welcome back, Kuya Ramil');
  });
  $('#guideLogout').addEventListener('click', () => {
    state.guide.loggedIn = false;
    renderGuide();
    toast('Logged out');
  });
  $$('[data-guide-tab]').forEach(b => b.addEventListener('click', () => setGuideTab(b.dataset.guideTab)));
  $('#leaveForm').addEventListener('submit', submitLeave);
  $('#guideNoticesAdmin').addEventListener('click', onNoticeAction);
}

document.addEventListener('DOMContentLoaded', () => {
  setDates();
  renderStats();
  renderCalendar();
  setTrekker('group');
  renderBookings();
  renderRules();
  renderDashboard();
  renderGateRecent();
  const leaveDate = $('#leaveDate');
  if (leaveDate) {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    leaveDate.value = new Date(t.getTime() - t.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    leaveDate.min = todayISO();
  }
  renderGuide();
  renderGuideNoticesAdmin();
  $('#lostThresholdInput').value = state.lostThreshold;
  renderTrailMap();
  renderSosPage();
  renderSettings();
  renderReportStats();
  bind();
  initCharts();
  setRole('admin');
  icons();
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
});
