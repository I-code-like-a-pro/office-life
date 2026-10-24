/* OfficeLife main: a full workday life sim. Wake up, get ready, commute, clock in, work, go home, sleep.
   Models: assets.js + props.js. World layout: world.js. Data: content.js. Sound: audio.js. */
(() => {
'use strict';
const A = window.Assets, C = window.Content, W = window.World, Sfx = window.Sfx;
const $ = id => document.getElementById(id);
const fmt = m => {
  m = ((Math.floor(m) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60), mm = m % 60;
  return ((h % 12) || 12) + ':' + String(mm).padStart(2, '0') + ' ' + (h >= 12 ? 'PM' : 'AM');
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const START = 540, END = 1020, WAKE = 390;
const MEET = { x0: -11.2, x1: -6.3, z0: 4.8, z1: 8.4 };
const CATS = [['tech', 'Technical quality', 0.28], ['comm', 'Communication', 0.22], ['rel', 'Reliability', 0.20], ['prob', 'Problem solving', 0.12], ['prof', 'Professionalism', 0.10], ['well', 'Wellbeing', 0.08]];
const SAVE_KEY = 'officelife.save.v2', HIST_KEY = 'officelife.history.v1', SENS_KEY = 'officelife.sens';
const Profile = window.Profile, Convo = window.Convo;
const cozy = () => !!G && G.style !== 'career';          // cozy = no failing, no deadline pressure
const LOC_NAMES = { apartment: 'Your apartment', street: 'Commute', lobby: 'OfficeLife lobby', office: 'Office, 4th floor' };
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} },
};

/* ================================================================ renderer + scene */
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fb4cf);
const fog = new THREE.Fog(0x9fb4cf, 30, 140);
const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 220);
camera.rotation.order = 'YXZ';
const player = { x: 0, z: 8, yaw: 0, pitch: 0, eye: 1.65, lying: false, moving: false, moveAng: 0 };
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const hemi = new THREE.HemisphereLight(0xffffff, 0x8892a8, 0.85); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff3dd, 0.6); scene.add(sun); scene.add(sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0004;
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 16, bottom: -16, near: 1, far: 60 });

const built = W.build(scene);
const LOCS = built.locs, SKY = built.skyMats;
Object.values(LOCS).forEach(l => l.lights.forEach(p => { p.userData.base = p.intensity; }));
const OFF = LOCS.office.dyn, APT = LOCS.apartment.dyn, LOB = LOCS.lobby.dyn;
const coworkers = OFF.coworkers, danaNpc = OFF.dana, dana = danaNpc.g, myDesk = OFF.myDesk, ring = OFF.ring, wallClock = OFF.wallClock;
const MY_DESK = OFF.MY_DESK;
let loc = null;

/* ================================================================ time of day */
const KEYS = [[0, 0x0b1026], [300, 0x151c3a], [375, 0xe9a27a], [450, 0xa9c9ee], [600, 0x8fc0f5], [960, 0x9cc3ee], [1095, 0xf0a46c], [1170, 0x40386a], [1260, 0x0e1230], [1440, 0x0b1026]];
const _a = new THREE.Color(), _b = new THREE.Color(), _sky = new THREE.Color(), _tint = new THREE.Color(), _dark = new THREE.Color(0x1b2448), _white = new THREE.Color(0xffffff), _warm = new THREE.Color(0xffc48a), _noon = new THREE.Color(0xfff6e8);
const _grey = new THREE.Color(0x8c93a3);
const smooth = x => x * x * (3 - 2 * x);
function dayFactor(min) {
  const m = ((min % 1440) + 1440) % 1440;
  return smooth(clamp((m - 330) / 90, 0, 1)) * (1 - smooth(clamp((m - 1080) / 120, 0, 1)));
}
function skyColor(min) {
  const m = ((min % 1440) + 1440) % 1440;
  for (let i = 0; i < KEYS.length - 1; i++) if (m <= KEYS[i + 1][0]) { const t = (m - KEYS[i][0]) / (KEYS[i + 1][0] - KEYS[i][0]); return _sky.copy(_a.set(KEYS[i][1])).lerp(_b.set(KEYS[i + 1][1]), t); }
  return _sky.set(KEYS[0][1]);
}
function applyEnv() {
  if (!loc) return;
  const df = dayFactor(simMin), interior = loc.interior;
  const sk = skyColor(simMin);
  if (D && D.weather && D.weather !== 'sunny') sk.lerp(_grey, D.weather === 'rain' ? 0.55 : 0.3);
  if (interior) { scene.fog = null; scene.background.set(0x1a2030); } else { scene.fog = fog; fog.color.copy(sk); scene.background.copy(sk); }
  hemi.intensity = interior ? 0.4 + 0.3 * df : 0.22 + 0.7 * df;
  hemi.color.copy(_white).lerp(_warm, 0.35 * (1 - Math.abs(df - 0.5) * 2) * 0 + 0);
  const t = clamp((simMin - 360) / 780, 0, 1);
  sun.color.copy(t < 0.2 || t > 0.8 ? _warm : _noon);
  sun.intensity = interior ? 0.15 + 0.45 * df : 0.04 + 0.8 * df;
  loc.lights.forEach(p => { p.intensity = (p.userData.base || 0) * (0.6 + 0.8 * (1 - df)); });
  _tint.copy(_dark).lerp(_white, df);
  SKY.forEach(m => m.color.copy(_tint));
  A.nightMats.forEach(m => { m.emissiveIntensity = (1 - df) * 0.95; });
}

/* ================================================================ location management */
function setLoc(id, spawnKey) {
  if (loc) { loc.group.visible = false; loc.lights.forEach(l => { l.visible = false; }); }
  loc = LOCS[id]; loc.group.visible = true; loc.lights.forEach(l => { l.visible = true; });
  const sp = loc.spawns[spawnKey] || { x: 0, z: 0, yaw: 0 };
  player.x = sp.x; player.z = sp.z; player.yaw = sp.yaw; player.pitch = 0; meFace = sp.yaw + Math.PI;
  $('locName').textContent = LOC_NAMES[id];
  applyEnv(); buildMapStatic(); updateGate(); Sfx.scene(id); applyWeather();
}

/* ================================================================ input */
const keys = {};
let locked = false, wasLocked = false, modalOpen = false, paused = false, busy = false;
let sens = store.get(SENS_KEY) || 1;
function requestLock() { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) {} }
const canAct = () => phase === 'play' && !modalOpen && !paused && !busy;
canvas.addEventListener('click', () => { if (canAct() && !locked) requestLock(); });
document.addEventListener('pointerlockchange', () => {
  locked = document.pointerLockElement === canvas;
  if (locked) wasLocked = true;
  else if (wasLocked && phase === 'play' && !modalOpen && !paused && !busy) { wasLocked = false; openPause(); }
});
document.addEventListener('mousemove', e => {
  if (!locked) return;
  player.yaw -= e.movementX * 0.0022 * sens; player.pitch = clamp(player.pitch - e.movementY * 0.0022 * sens, -1.3, 1.3);
});
let drag = null;
canvas.addEventListener('pointerdown', e => { if (!locked) drag = { x: e.clientX, y: e.clientY }; });
addEventListener('pointerup', () => { drag = null; });
addEventListener('pointermove', e => {
  if (!drag || locked || phase !== 'play' || modalOpen || paused) return;
  player.yaw -= (e.clientX - drag.x) * 0.005 * sens; player.pitch = clamp(player.pitch - (e.clientY - drag.y) * 0.005 * sens, -1.3, 1.3);
  drag.x = e.clientX; drag.y = e.clientY;
});
const stickVec = { x: 0, y: 0 };
(function () {
  const base = $('stick'), knob = $('knob'); let id = null; const R = 55;
  function setFrom(e) {
    const r = base.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy); if (d > R) { dx = dx / d * R; dy = dy / d * R; }
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)'; stickVec.x = dx / R; stickVec.y = dy / R;
  }
  function release() { id = null; stickVec.x = stickVec.y = 0; knob.style.transform = ''; base.classList.remove('on'); }
  base.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); id = e.pointerId; try { base.setPointerCapture(id); } catch (err) {} base.classList.add('on'); setFrom(e); });
  base.addEventListener('pointermove', e => { if (e.pointerId === id) setFrom(e); });
  base.addEventListener('pointerup', e => { if (e.pointerId === id) release(); });
  base.addEventListener('pointercancel', release);
})();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
  keys[e.code] = true;
  if (e.code === 'KeyM') { Sfx.toggleMute(); $('muteBtn').textContent = Sfx.muted ? 'Unmute' : 'Mute'; }
  if (phase !== 'play') return;
  if (e.code === 'Escape' && modalOpen) { if (!$('shop').classList.contains('hidden')) closeShop(); else if (!$('convo').classList.contains('hidden')) $('convoLeave').click(); else closeComputer(); return; }
  if (e.code === 'KeyV') { toggleView(); return; }
  if (e.code === 'KeyP' && !modalOpen && !busy) { paused ? closePause() : openPause(); return; }
  if (paused) return;
  if (['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'].includes(e.code)) answerChat(+e.code.slice(5) - 1);
  if (e.code === 'KeyE' && canAct()) interact();
});
addEventListener('keyup', e => { keys[e.code] = false; });

function tryMove(dx, dz) {
  const r = 0.4, b = loc.bounds, nx = player.x + dx, nz = player.z + dz;
  if (nx < b.x0 + r || nx > b.x1 - r || nz < b.z0 + r || nz > b.z1 - r) return;
  for (const c of loc.colliders) { if (c.off) continue; if (nx > c.x0 - r && nx < c.x1 + r && nz > c.z0 - r && nz < c.z1 + r) return; }
  player.x = nx; player.z = nz;
}
let stepT = 0;
function move(dt) {
  player.moving = false;
  if (!canAct() || player.lying) return;
  if (keys.KeyQ || keys.ArrowLeft) player.yaw += 1.9 * dt;
  if (keys.KeyZ || keys.ArrowRight) player.yaw -= 1.9 * dt;
  let fx = 0, fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz -= 1;
  if (keys.KeyS || keys.ArrowDown) fz += 1;
  if (keys.KeyA) fx -= 1;
  if (keys.KeyD) fx += 1;
  let speed = (keys.ShiftLeft ? 6 : 3.6) * dt;
  if (fx || fz) { const n = Math.hypot(fx, fz); fx /= n; fz /= n; }
  else {
    const mag = Math.hypot(stickVec.x, stickVec.y);
    if (mag < 0.12) { stepT = 0; return; }
    fx = stickVec.x / mag; fz = stickVec.y / mag; speed = 5.2 * Math.min(1, (mag - 0.12) / 0.88) * dt;
  }
  const s = Math.sin(player.yaw), c = Math.cos(player.yaw), ox = player.x, oz = player.z;
  tryMove((fx * c + fz * s) * speed, 0); tryMove(0, (-fx * s + fz * c) * speed);
  const mvx = player.x - ox, mvz = player.z - oz;
  if (Math.hypot(mvx, mvz) > 1e-4) { player.moving = true; player.moveAng = Math.atan2(mvx, mvz); }
  stepT -= Math.hypot(mvx, mvz);
  if (stepT <= 0) { Sfx.step(); stepT = 1.1; }
}

/* ================================================================ session state */
let phase = 'title';            // title | play | daysum | report
let G = null, D = null;
let simMin = WAKE;
let chat = null, chatQueue = [];
let coActive = false;
const ST = { energy: 75, mood: 60 };
const newScores = () => ({ tech: [], comm: [], rel: [], prob: [], prof: [], well: [] });
const add = (cat, v) => D.sc[cat].push(clamp(cozy() ? Math.max(v, 55) : v, 0, 100));
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0;
const energyAdd = v => { ST.energy = clamp(ST.energy + v, 0, 100); };
const moodAdd = v => { ST.mood = clamp(ST.mood + v, 0, 100); };
const L = () => D.life;
let hasCup = false;

function newDay(idx) {
  const def = C.DAYS[idx];
  const events = def.events.map(e => Object.assign({ done: false }, e));
  events.push({ at: C.m(16), done: false, from: 'Dana (Manager)', text: 'Please post your end-of-day status update at your computer before you leave.', deadline: 30,
    opts: [{ label: 'Will do.', s: { comm: 90, prof: 90 } }, { label: 'Sure, give me a few minutes to finish my ticket.', s: { comm: 85, prof: 85 } }, { label: "Can't it wait till tomorrow?", s: { comm: 20, prof: 10 } }] });
  return {
    idx, def, sc: newScores(), statusDone: false, clockIn: null, clockOut: null, hints: 0, noShow: false, freeRetry: 0,
    tickets: def.tickets.map(t => Object.assign({ state: 'locked', mistakes: 0, stage: 1 }, t)),
    events, meet: def.meeting ? { state: 'pending', toast: false, attended: false, asked: false } : null, touched: false,
    life: { up: false, outfit: null, washed: null, ate: null, badge: null, left: false, warned: {}, coffee: 0, lastCoffee: -999, lunch: null, kiosk: false, greeted: {}, dinner: false, exercised: false, studied: false, tv: 0, bedMade: false, snoozes: 0, home: false, nudged: false, lowWarned: false, arrived: null },
  };
}

/* ================================================================ messages */
function say(from, text, opts, deadline, extra) {
  chatQueue.push(Object.assign({ from, text, opts, deadline: deadline || 40, sent: null }, extra || {}));
  pump();
}
const menu = (from, text, opts) => say(from, text, opts, 60, { menu: true });
function pump() {
  if (chat || !chatQueue.length) return;
  chat = chatQueue.shift(); chat.sent = simMin; renderChat();
  chat.urgent ? Sfx.urgent() : chat.menu ? Sfx.click() : Sfx.ping();
}
function renderChat() {
  const el = $('chat');
  if (!chat) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden'); el.classList.toggle('urgent', !!chat.urgent);
  el.innerHTML = '<div class="from">' + (chat.menu ? '' : '\u{1F4F1} ') + chat.from + '</div><div>' + chat.text + '</div>' +
    chat.opts.map((o, i) => '<div class="opt"><b>[' + (i + 1) + ']</b> ' + o.label + '</div>').join('') +
    '<div class="tmr">Press ' + chat.opts.map((_, i) => i + 1).join(', ') + (chat.menu ? '' : ' &middot; respond within ' + chat.deadline + ' min') + '</div>';
}
function answerChat(i) {
  if (!chat || !chat.opts[i]) return;
  const o = chat.opts[i], cur = chat;
  Sfx.click();
  const bonus = Math.round((ST.mood - 50) / 10);
  if (o.s) for (const k in o.s) add(k, o.s[k] + (k === 'comm' || k === 'prof' ? bonus : 0));
  if (!cur.menu) add('rel', Math.max(60, 100 - (simMin - cur.sent) * 1.2));
  chat = null; renderChat();
  if (o.fn) o.fn();
  later(pump, 700);
}
function expireChat() {
  if (!chat) return;
  if (chat.menu) { if (simMin - chat.sent > 30) { chat = null; renderChat(); later(pump, 400); } return; }
  if (simMin - chat.sent > chat.deadline) {
    add('comm', 0); add('rel', 0); add('prof', 20); moodAdd(-5);
    notify('You missed a message from ' + chat.from + '.');
    chat = null; renderChat(); later(pump, 800);
  }
}
let toastT = 0;
function notify(text) { const t = $('toast'); t.textContent = text; t.classList.remove('hidden'); toastT = 6; Sfx.ping(); }

/* ================================================================ fades and time-skipping activities */
const fadeEl = $('fade'), fadeTxt = $('fadeTxt');
const later = (fn, ms) => window.__fast ? fn() : setTimeout(fn, ms);      // __fast: instant fades/timers for automated tests
function fadeOut(text, cb) { fadeTxt.textContent = text || ''; fadeEl.classList.add('on'); later(cb, 420); }
function fadeIn(cb) { fadeEl.classList.remove('on'); later(() => cb && cb(), 420); }
function advance(min) {
  simMin += min; if (chat && !chat.menu) chat.sent += min;
  drain(min); applyEnv();
}
function activity(label, minutes, effect, after) {
  if (busy) return; busy = true;
  fadeOut(label + (minutes ? ' (' + minutes + ' min)' : '...'), () => {
    if (minutes) advance(minutes);
    if (effect) effect();
    later(() => fadeIn(() => { busy = false; if (after) after(); }), 300);
  });
}
function travel(label, id, spawn, after) {
  if (busy) return; busy = true;
  fadeOut(label, () => { setLoc(id, spawn); later(() => fadeIn(() => { busy = false; if (after) after(); }), 250); });
}
function drain(min) {
  const rate = loc && loc.id === 'office' ? 0.075 : loc && loc.id === 'street' ? 0.05 : 0.03;
  energyAdd(-min * rate);
  if (ST.energy < 25) moodAdd(-min * 0.02);
}

/* ================================================================ interactions */
let target = null;
function actLabel(id) {
  const l = D.life, hr = simMin;
  switch (id) {
    case 'bed': return player.lying ? null : hr < 660 ? (l.bedMade ? null : 'Make the bed') : hr >= 1200 || ST.energy < 25 ? 'Go to sleep' : null;
    case 'wardrobe': return l.outfit ? null : 'Get dressed';
    case 'sink': return l.washed ? null : 'Wash up';
    case 'shower': return l.washed ? null : 'Take a shower';
    case 'fridge': return hr < 660 ? (l.ate ? null : 'Make breakfast') : hr >= 1020 ? (l.dinner ? null : 'Make dinner') : null;
    case 'coffee_home': return hr < 900 && l.coffee < 2 ? 'Make coffee' : null;
    case 'badge': return l.badge ? null : 'Take your badge and bag';
    case 'door': return D.clockIn === null && !l.left ? 'Leave for work' : null;
    case 'laptop': return 'Use your laptop';
    case 'cat': return 'Pet ' + Profile.data.catName;
    case 'treats': return D.vigOn ? (D.vignette === 'cake' ? 'Have a slice of cake' : 'Take a donut') : null;
    case 'sofa': return hr >= 1020 && l.tv < 2 ? 'Relax and watch a show' : null;
    case 'mat': return hr >= 1020 && !l.exercised ? 'Exercise on the mat' : null;
    case 'home_door': return D.clockIn === null && l.left ? 'Go back home' : D.clockOut !== null || D.noShow ? 'Go home' : null;
    case 'office_door': return D.clockOut === null && !D.noShow ? 'Enter OfficeLife Inc.' : null;
    case 'kiosk': return null;
    case 'gate': return D.clockIn === null ? 'Tap your badge (clock in)' : D.clockOut === null ? (simMin >= END - 10 ? 'Tap out (clock out)' : 'Badge reader') : null;
    case 'elevator_up': return D.clockOut !== null ? null : 'Take the elevator up';
    case 'street_door': return 'Go outside';
    case 'desk': return 'Use your computer';
    case 'elevator_down': return 'Take the elevator down';
    case 'coffee': return 'Make a coffee';
    case 'lunch': return !l.lunch ? 'Have lunch' : null;
  }
  return null;
}
function npcLabel(n) {
  if (n.id === 'barista') return D.life.kiosk ? null : 'Buy a coffee from the barista';
  return n.greeted ? 'Talk to ' + n.name : 'Greet ' + n.name;
}
function findTarget() {
  if (!loc || !D) return null;
  let best = null, bs = 1e9;
  loc.acts.forEach(a => {
    const d = Math.hypot(player.x - a.x, player.z - a.z);
    if (d <= a.r) { const lb = actLabel(a.id); if (lb && d / a.r < bs) { bs = d / a.r; best = { kind: 'act', id: a.id, label: lb }; } }
  });
  loc.npcs.forEach(n => {
    const p = n.g.position, d = Math.hypot(player.x - p.x, player.z - p.z);
    if (d <= 2.3) { const lb = npcLabel(n); const s = d / 2.3 * 0.9; if (lb && s < bs) { bs = s; best = { kind: 'npc', npc: n, label: lb }; } }
  });
  return best;
}
function interact() {
  if (!target) return;
  if (chat) { notify('Answer the message first (press its number).'); return; }
  Sfx.click();
  if (target.kind === 'act') { const h = HANDLERS[target.id]; if (h) h(); }
  else talkTo(target.npc);
}

/* ---- apartment ---- */
function wakeMenu() {
  menu('⏰ Alarm', fmt(simMin) + '. Beep beep beep... Your alarm is ringing.', [
    { label: 'Get up', fn: getUp },
    { label: 'Snooze (10 more minutes)', fn: () => { L().snoozes++; activity('Snoozing', 10, () => { moodAdd(-2); energyAdd(3); }); } },
  ]);
}
function getUp() {
  player.lying = false; L().up = true; Sfx.click();
  player.x = -1.8; player.z = -2.4; player.yaw = 0.9;
  setTimeout(() => notify('Tip: walk up to glowing objects and press E. Follow the checklist on the right.'), 600);
}
const OUTFITS = { smart: ['Smart: shirt and trousers', 100], casual: ['Casual: jeans and a tee', 70], gym: ['Gym clothes (comfy!)', 25] };
const HANDLERS = {
  bed() {
    if (simMin < 660) { activity('Making the bed', 2, () => { L().bedMade = true; moodAdd(2); }); return; }
    menu('Bed', 'Go to sleep now? Your day ends here.', [{ label: 'Yes, good night', fn: goToSleep }, { label: 'Not yet', fn: null }]);
  },
  wardrobe() {
    menu('Wardrobe', 'What will you wear to work?', Object.keys(OUTFITS).map(k => ({ label: OUTFITS[k][0], fn: () => activity('Getting dressed', 5, () => { L().outfit = k; }) })));
  },
  sink() { activity('Washing up and brushing teeth', 5, () => { L().washed = 'quick'; moodAdd(2); }); },
  shower() { activity('Taking a shower', 15, () => { L().washed = 'shower'; energyAdd(8); moodAdd(6); }); },
  fridge() {
    if (simMin < 660) {
      menu('Breakfast', 'What are you having?', [
        { label: 'Cook a proper breakfast (25 min)', fn: () => activity('Cooking breakfast', 25, () => { L().ate = 'cooked'; energyAdd(25); moodAdd(5); add('well', 100); }) },
        { label: 'Cereal and toast (10 min)', fn: () => activity('Having cereal', 10, () => { L().ate = 'cereal'; energyAdd(15); add('well', 75); }) },
        { label: 'Skip breakfast', fn: () => { L().ate = 'skipped'; add('well', 25); notify('Your stomach rumbles. You might feel it later.'); } },
      ]);
    } else {
      menu('Dinner', 'What\'s for dinner?', [
        { label: 'Cook a proper dinner (35 min)', fn: () => activity('Cooking dinner', 35, () => { L().dinner = true; energyAdd(15); moodAdd(6); add('well', 100); }) },
        { label: 'Order takeaway (10 min)', fn: () => activity('Ordering takeaway', 10, () => { L().dinner = true; energyAdd(10); moodAdd(3); add('well', 70); }) },
        { label: 'Skip dinner', fn: () => { L().dinner = true; add('well', 20); } },
      ]);
    }
  },
  coffee_home() { activity('Making coffee', 5, () => { L().coffee++; energyAdd(10); moodAdd(L().coffee > 1 ? 0 : 3); }); },
  badge() {
    L().badge = 'own'; APT.rack.userData.card.visible = false; APT.rack.userData.bag.visible = false;
    notify('You grab your work badge and bag.'); Sfx.good();
  },
  door() {
    const l = L(), go = () => {
      add('prof', OUTFITS[l.outfit][1]); add('prof', l.washed ? 100 : 30);
      l.left = true; travel('Heading to work...', 'street', 'apartment', () => notify(D.weather === 'rain' ? 'Rain pitter-patters around you. Walk to the OfficeLife building at the end of the street.' : 'Walk to the OfficeLife building at the end of the street.'));
    };
    if (!l.outfit) { notify('You are not dressed for work yet. Check the wardrobe.'); return; }
    if (!l.washed && !l.warned.wash) { l.warned.wash = true; menu('Front door', 'You haven\'t washed up yet. Leave anyway?', [{ label: 'Yes, I\'m late', fn: go }, { label: 'Let me freshen up', fn: null }]); return; }
    if (!l.badge && !l.warned.badge) { l.warned.badge = true; menu('Front door', 'Your work badge is still on the rack by the door. Leave without it?', [{ label: 'Leave anyway', fn: go }, { label: 'Go back for it', fn: null }]); return; }
    go();
  },
  laptop() { menu('Laptop', 'What would you like to do?', [
    { label: 'Shop for decor (' + Profile.data.coins + ' coins)', fn: openShop },
    { label: L().studied ? 'Study (done for today)' : 'Study: practise coding problems (30 min)', fn: () => { if (L().studied) return; activity('Studying', 30, () => { L().studied = true; energyAdd(-4); moodAdd(-1); notify('Studied! You earned a free retry on a ticket tomorrow.'); }); } },
    { label: 'Not now', fn: null }]); },
  cat() {
    const c = APT.cat;
    activity('Petting ' + Profile.data.catName, 3, () => { moodAdd(8); Sfx.purr(); c.pet = 4; if (!L().pet) { L().pet = true; earn(2, 'cuddles'); add('well', 100); D.moments.push('Cuddled ' + Profile.data.catName + '.'); } });
  },
  treats() {
    if (!D.vigOn) return;
    activity('Enjoying a treat', 5, () => {
      D.vigOn = false; cakeM.visible = donutM.visible = false; energyAdd(6); moodAdd(10); earn(4, 'a sweet moment');
      D.moments.push(D.vignette === 'cake' ? 'Shared cake in the break room.' : 'Grabbed a donut with the team.');
      ['priya', 'sam', 'leo', 'mei', 'omar'].forEach(id => friend(id, 1));
    });
  },
  sofa() { activity('Watching a show', 30, () => { L().tv++; moodAdd(12); energyAdd(3); }); },
  mat() { activity('Exercising', 30, () => { L().exercised = true; energyAdd(-6); moodAdd(10); add('well', 100); notify('Great workout. You will sleep well.'); }); },
  /* ---- street ---- */
  home_door() {
    const l = L();
    if (D.clockIn === null && !D.noShow) { travel('Going back home...', 'apartment', 'street', () => {}); return; }
    l.home = true; travel('Home at last...', 'apartment', 'street', () => notify('You are home. Eat, relax, study, exercise, then sleep.'));
  },
  office_door() { travel('Entering the building...', 'lobby', 'street', () => { if (!L().arrived) L().arrived = simMin; }); },
  /* ---- lobby ---- */
  gate() {
    const l = L(), rd = LOB.reader;
    if (D.noShow) { notify('Access denied. You missed your shift today.'); return; }
    if (D.clockIn === null) {
      if (!l.badge) { rd.set('NO\nBADGE', '#f87171'); notify('No badge! Ask Hana at reception for a temporary one, or go home for yours.'); return; }
      tapIn(); return;
    }
    if (D.clockOut === null) {
      if (simMin >= END - 10) tapOut(); else notify('You are clocked in. It is not time to leave yet.');
      return;
    }
    notify('You are already clocked out.');
  },
  elevator_up() {
    if (D.noShow) { notify('The elevator is locked for you today.'); return; }
    if (D.clockIn === null) { notify('The elevator needs a badge tap. Use the reader at the gate first.'); return; }
    if (D.clockOut !== null) { notify('You are done for the day.'); return; }
    travel('Going up to the 4th floor...', 'office', 'elevator', () => {});
  },
  street_door() {
    if (D.clockIn !== null && D.clockOut === null) { notify('You cannot leave mid-shift. Wait until 5 PM and tap out at the gate.'); return; }
    if (D.clockOut !== null && !L().home) { travel('Heading home...', 'street', 'office', () => notify('Walk back to your apartment (south end of the street).')); return; }
    travel('Heading outside...', 'street', 'office', () => {});
  },
  /* ---- office ---- */
  desk() { openComputer(); },
  elevator_down() {
    if (simMin < END - 10) { notify('Dana expects you at your desk until 5 PM.'); return; }
    travel('Going down to the lobby...', 'lobby', 'elevator', () => notify('Tap out at the badge reader, then head home.'));
  },
  coffee() {
    const l = L();
    if (simMin - l.lastCoffee < 90) { notify('You have just had a coffee. Maybe a glass of water?'); return; }
    activity('Making a coffee', 3, () => { l.lastCoffee = simMin; energyAdd(12); moodAdd(3); hasCup = true; notify('Fresh cup! You can offer a coffee to a coworker if you like.'); });
  },
  lunch() {
    const l = L();
    if (simMin < 690 || simMin > 900) { notify('Lunch is between 11:30 AM and 3:00 PM.'); return; }
    menu('Lunch break', 'Where will you eat?', [
      { label: 'Join the team at the big table (30 min)', fn: () => activity('Lunch with the team', 30, () => { l.lunch = 'team'; energyAdd(25); moodAdd(8); add('well', 100); add('comm', 100); add('prof', 95); }) },
      { label: 'Eat quietly at a small table (25 min)', fn: () => activity('Quiet lunch', 25, () => { l.lunch = 'alone'; energyAdd(20); moodAdd(3); add('well', 85); }) },
      { label: 'Skip lunch and keep working', fn: () => { l.lunch = 'skipped'; energyAdd(-5); add('well', 25); notify('Skipping meals catches up with you.'); } },
    ]);
  },
};

/* ---- badge reader ---- */
function updateGate() {
  if (!D) return;
  const open = D.clockIn !== null && !D.noShow || D.clockOut !== null;
  LOB.arm.visible = !open; LOB.gateCol.off = open;
}
function tapIn() {
  D.clockIn = simMin; Sfx.clockIn();
  const late = cozy() ? 0 : Math.max(0, simMin - START);
  add('rel', 100 - late * 4);
  if (late) moodAdd(-8);
  LOB.reader.set('WELCOME\n' + fmt(simMin).replace(' ', ''), '#4ade80'); updateGate();
  notify('Clocked in at ' + fmt(simMin) + (late ? ' (' + Math.round(late) + ' min late).' : '. On time!'));
}
function tapOut() {
  D.clockOut = simMin; Sfx.clockIn();
  add('rel', 100 - Math.max(0, simMin - END) * 3);
  add('well', ST.energy);
  LOB.reader.set('SEE YOU\nTOMORROW', '#38bdf8'); updateGate(); coActive = false; showBanner(false);
  notify('Clocked out at ' + fmt(simMin) + '. Time to head home.');
}
function showBanner(on) { $('clockout').classList.toggle('hidden', !on); }

/* ---- people ---- */
const TOD = () => simMin < 720 ? 'morning' : simMin < 1020 ? 'afternoon' : 'evening';
const GREET = {
  priya: 'Morning! Settling in okay? Shout if you need anything.', sam: 'Hey! Coffee is strong today, be warned.', leo: "Oh, hi! Don't mind me, trying to fix a flaky test.",
  mei: 'Hello! Nice to see a friendly face.', omar: 'Hey! You are doing the deploy thing today, right?', dana: 'Good to see you. Standup is soon, grab your coffee and settle in.',
  hana: 'Welcome in! Have a lovely day. Remember to tap your badge at the gate.', okafor: 'Morning. Gate is on your right. Badge in before you head up.',
  barista: 'Hi there! What can I get you?', ped1: 'Oh, hello!', ped2: 'Good day to you.', ped3: '(panting) Morning!',
};
function talkTo(n) {
  if (n.id === 'barista') { kioskMenu(); return; }
  if (n.id === 'hana' && !L().badge && D.clockIn === null && !n.badgeAsked) { n.badgeAsked = true; hanaBadge(n); return; }
  if (n.kind === 'ped') n.ped && (n.ped.pause = 3);
  if (!n.greeted) { greet(n); return; }
  if (n.kind === 'coworker' || n.kind === 'manager') { peopleTalk(n); return; }
  notify(n.name + ': ' + (n.id === 'okafor' ? 'Have a good shift!' : n.id === 'hana' ? 'Let me know if you need anything.' : 'Take care!'));
}
function greet(n) {
  n.greeted = true; L().greeted[n.id] = true; wave(n); meWave();
  const tod = TOD(), team = n.kind === 'coworker' || n.kind === 'manager', lvl = team ? Profile.level(n.id) : 0;
  const line = (lvl >= 2 ? 'Hey, you! ' : '') + (GREET[n.id] || 'Hello!');
  menu(n.name + (team ? '  ' + Profile.heartString(n.id) : ''), line, [
    { label: 'Good ' + tod + ', ' + n.name + '! How are you?', s: { comm: 100, prof: 100 }, fn: () => { moodAdd(4); earn(2, 'kind hello'); if (team) friend(n.id, 5); } },
    { label: tod === 'morning' ? 'Morning.' : 'Hi.', s: { comm: 60, prof: 60 }, fn: () => { moodAdd(1); if (team) friend(n.id, 2); } },
    { label: '(nod and keep walking)', s: { comm: 15, prof: 25 }, fn: () => moodAdd(-1) },
  ]);
}
function hanaBadge(n) {
  menu('Hana', 'Good morning! May I see your badge?', [
    { label: 'I forgot it at home. Could I get a temporary one? Sorry!', s: { comm: 90, prof: 60 }, fn: () => { L().badge = 'temp'; add('rel', 70); notify('Hana prints you a temporary badge.'); } },
    { label: "I'll go back and get mine.", fn: null },
  ]);
}
function giveHint(c) {
  const t = D.tickets.find(t => !['done', 'late', 'failed'].includes(t.state) && simMin >= t.avail);
  if (!t) { notify(c.name + ": You're all caught up. Nice work!"); return; }
  D.hints++; add('comm', 95); add('prof', 90); friend(c.id, 2);
  menu(c.name, 'Happy to help with ' + t.id + '. ' + t.hint, [{ label: 'Thanks, that helps!', s: { comm: 100, prof: 100 }, fn: () => moodAdd(2) }, { label: 'Got it.', fn: null }]);
}
function kioskMenu() {
  if (simMin > 1080) { notify('The kiosk is closed for the evening.'); return; }
  menu('Barista', 'What can I get you?', [
    { label: 'A flat white (3 min)', fn: () => activity('Buying a coffee', 3, () => { L().kiosk = true; energyAdd(12); moodAdd(5); }) },
    { label: 'A herbal tea (3 min)', fn: () => activity('Buying a tea', 3, () => { L().kiosk = true; energyAdd(6); moodAdd(5); }) },
    { label: 'Nothing, thanks!', fn: null },
  ]);
}

/* ================================================================ cozy systems: coins, friends, stories, shop, cat, weather */
let popT = 0;
function pop(text) { const p = $('pop'); p.textContent = text; p.classList.remove('hidden'); popT = 3.2; }
function updateCoins() { $('coinTxt').textContent = Profile.data.coins; }
function earn(n, why) {
  if (!n) return;
  Profile.addCoins(n); D.coinsToday = (D.coinsToday || 0) + n; Sfx.coin(); pop('+' + n + ' coins' + (why ? ' · ' + why : '')); updateCoins(); Profile.save();
}
const NAMES = { priya: 'Priya', sam: 'Sam', leo: 'Leo', mei: 'Mei', omar: 'Omar', dana: 'Dana' };
function friend(id, pts) {
  const r = Profile.addHearts(id, pts);
  if (r.after > r.before) { pop((NAMES[id] || id) + ' is a closer friend now ' + Profile.heartString(id)); D.moments.push('Grew closer to ' + (NAMES[id] || id) + '.'); Sfx.good(); }
  Profile.save();
}
function wave(n) { n.g.userData.waveUntil = clockT + 1.8; }
function nextStory(id) { return (C.STORIES[id] || []).find(s => s.lvl <= Profile.level(id) && !Profile.data.stories[id + s.lvl]) || null; }
function playStory(n, s, i) {
  i = i || 0;
  if (i >= s.lines.length) {
    Profile.data.stories[n.id + s.lvl] = true; earn(s.reward.coins, 'friendship'); moodAdd(s.reward.mood); friend(n.id, 5);
    D.moments.push(n.name + ' shared something about ' + s.topic + '.'); return;
  }
  menu(n.name, s.lines[i], [{ label: i < s.lines.length - 1 ? 'Go on...' : 'Thanks for telling me', fn: () => playStory(n, s, i + 1) }]);
}
function giftCoffee(n) {
  hasCup = false; wave(n); friend(n.id, 8); moodAdd(3); earn(3, 'kindness'); D.moments.push('Brought ' + n.name + ' a coffee.');
  menu(n.name, "Oh, you made me a coffee? That is so thoughtful, thank you!", [{ label: "My pleasure!", fn: null }]);
}
function startConvo(n) {
  modalOpen = true; if (locked) document.exitPointerLock(); $('hud').classList.add('modal'); $('prompt').classList.add('hidden'); wave(n);
  let warm = 0;
  Convo.open({
    npc: n,
    ctx: () => ({ dayLabel: 'day ' + (D.idx + 1), time: fmt(simMin), hearts: Profile.level(n.id) }),
    onTurn: tone => {
      if (tone > 0) { add('comm', 95); add('prof', 92); moodAdd(1); if (warm < 3) { warm++; friend(n.id, 2); } }
      else if (tone < 0) { add('comm', 30); add('prof', 25); moodAdd(-2); }
      else { add('comm', 75); add('prof', 78); }
    },
    onClose: turns => {
      modalOpen = false; $('hud').classList.remove('modal');
      if (turns > 0) { D.moments.push('Had a proper chat with ' + n.name + '.'); advance(Math.min(10, turns * 2)); if (turns >= 3) earn(3, 'good conversation'); }
    },
  });
}
function peopleTalk(n) {
  if (simMin < n.cd) { notify(n.name + ' is busy right now.'); return; }
  n.cd = simMin + 20;
  const opts = [{ label: 'Have a proper chat (type)', fn: () => startConvo(n) }];
  const st = nextStory(n.id);
  if (st) opts.push({ label: 'Ask about ' + st.topic + ' ♥', fn: () => playStory(n, st) });
  else { const tk = C.TALK[Math.floor(Math.random() * C.TALK.length)]; opts.push({ label: 'Chat for a minute', fn: () => say(n.name, tk.text, tk.opts, 40, {}) }); }
  if (hasCup) opts.push({ label: 'Offer your coffee ☕', fn: () => giftCoffee(n) });
  if (n.kind === 'coworker') opts.push({ label: 'Ask for advice on my current ticket', fn: () => giveHint(n) });
  else opts.push({ label: 'Ask for feedback on my work so far', s: { comm: 100, prof: 100 }, fn: () => { friend(n.id, 3); notify('Dana: You ask good questions. Keep communicating early.'); } });
  opts.push({ label: 'Back to work', fn: null });
  menu(n.name + '  ' + Profile.heartString(n.id), "Hi! What's up?", opts.slice(0, 5));
}

/* ---- shop (laptop at home) ---- */
function openShop() {
  modalOpen = true; if (locked) document.exitPointerLock(); $('hud').classList.add('modal'); $('shop').classList.remove('hidden');
  renderShop();
}
function closeShop() { modalOpen = false; $('shop').classList.add('hidden'); $('hud').classList.remove('modal'); }
function renderShop() {
  $('shopBody').innerHTML = '<h2>Cozy shop</h2><p>You have <b style="color:var(--text)">' + Profile.data.coins + '</b> coins. Earn more by helping, greeting, chatting and finishing tasks.</p>' +
    C.DECOR.map(d => {
      const owned = Profile.owns(d.id), can = Profile.data.coins >= d.price;
      return '<div class="ticket' + (owned ? ' disabled' : '') + '"><div><b>' + d.name + '</b> <span style="color:var(--dim)">&middot; ' + d.where + '. ' + d.desc + '</span></div><div>' +
        (owned ? '<span class="done">Owned</span>' : '<button data-buy="' + d.id + '"' + (can ? '' : ' disabled') + '>' + d.price + ' coins</button>') + '</div></div>';
    }).join('') + '<div class="row"><button class="alt" id="shopClose">Close</button></div>';
  $('shopClose').onclick = closeShop;
  document.querySelectorAll('#shopBody [data-buy]').forEach(b => b.onclick = () => {
    const item = C.DECOR.find(d => d.id === b.dataset.buy);
    if (Profile.buy(item)) { Sfx.coin(); syncDecor(); updateCoins(); D.moments.push('Bought a ' + item.name.toLowerCase() + '.'); renderShop(); }
  });
}
const placedDecor = {};
function syncDecor() {
  Profile.data.owned.forEach(id => {
    if (placedDecor[id]) return;
    const d = A.decorItem(id, MY_DESK); LOCS[d.loc].group.add(d.group); placedDecor[id] = d.group;
  });
}

/* ---- little surprises: cake / donuts in the break room ---- */
const cakeM = A.cake(), donutM = A.donuts();
[cakeM, donutM].forEach(m => { m.position.set(8.0, 0.77, -5.6); m.visible = false; LOCS.office.group.add(m); });
LOCS.office.acts.push({ id: 'treats', x: 8.0, z: -5.6, r: 1.8 });
const pickVignette = idx => { const r = (idx + Profile.data.days * 2) % 3; return r === 1 ? 'cake' : r === 2 ? 'donuts' : null; };

/* ---- weather: rain on the commute ---- */
const pickWeather = idx => { const r = (idx * 7 + Profile.data.days * 3 + 1) % 6; return r < 3 ? 'sunny' : r < 5 ? 'rain' : 'cloudy'; };
const RAIN_N = 650, rainPos = new Float32Array(RAIN_N * 6), drops = Array.from({ length: RAIN_N }, () => ({ x: (Math.random() - 0.5) * 28, y: Math.random() * 10, z: (Math.random() - 0.5) * 28 }));
const rainGeo = new THREE.BufferGeometry(); rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0xcfe0ff, transparent: true, opacity: 0.5 })); rain.frustumCulled = false; rain.visible = false; scene.add(rain);
function updateRain(dt) {
  if (!rain.visible) return;
  for (let i = 0; i < RAIN_N; i++) {
    const d = drops[i]; d.y -= 16 * dt; if (d.y < 0) { d.y = 10; d.x = (Math.random() - 0.5) * 28; d.z = (Math.random() - 0.5) * 28; }
    const x = player.x + d.x, z = player.z + d.z, o = i * 6;
    rainPos[o] = x; rainPos[o + 1] = d.y; rainPos[o + 2] = z; rainPos[o + 3] = x + 0.03; rainPos[o + 4] = d.y + 0.45; rainPos[o + 5] = z + 0.05;
  }
  rainGeo.attributes.position.needsUpdate = true;
}
function applyWeather() {
  if (!D || !loc) return;
  rain.visible = D.weather === 'rain' && loc.id === 'street';
  Sfx.rain(D.weather === 'rain', loc.interior ? 0.35 : 1);
}

/* ---- the cat ---- */
const CATW = [[-1.2, -1.4], [0.2, 0.3], [0.6, 2.8], [-1.2, 1.2], [1.0, -2.8], [-0.5, 3.0], [3.4, 1.6]];
function updateCat(dt, tt) {
  const c = APT.cat, g = c.g, u = g.userData;
  if (c.pet > 0) c.pet -= dt;
  if (c.state === 'idle') {
    c.t -= dt;
    if (c.t <= 0) {
      if (Math.random() < 0.3) { c.nap = Math.random() < 0.5 ? { x: -2.5, y: 0.55, z: 2.6 } : { x: -3.3, y: 0.72, z: -1.95 }; c.tx = c.nap.x; c.tz = c.nap.z; }
      else { const p = CATW[Math.floor(Math.random() * CATW.length)]; c.tx = p[0]; c.tz = p[1]; c.nap = null; }
      c.state = 'walk';
    }
  } else if (c.state === 'walk') {
    const dx = c.tx - g.position.x, dz = c.tz - g.position.z, d = Math.hypot(dx, dz);
    if (d < 0.08) { if (c.nap) { c.state = 'nap'; c.t = 22; g.position.y = c.nap.y; g.scale.y = 0.72; } else { c.state = 'idle'; c.t = 3 + Math.random() * 6; } }
    else { const st = Math.min(d, 0.8 * dt); g.position.x += dx / d * st; g.position.z += dz / d * st; g.rotation.y = Math.atan2(dx, dz); g.position.y = c.nap && d < 0.5 ? c.nap.y * (1 - d / 0.5) : 0; g.position.y += Math.abs(Math.sin(tt * 9)) * 0.012; }
  } else if (c.state === 'nap') {
    c.t -= dt; g.scale.y = 0.72 + Math.sin(tt * 1.6) * 0.02;
    if (c.t <= 0) { g.position.y = 0; g.scale.y = 1; c.state = 'idle'; c.t = 1; }
  }
  u.tail.rotation.y = Math.sin(tt * (c.pet > 0 ? 6 : 2.2)) * 0.5; u.head.rotation.y = Math.sin(tt * 0.7) * 0.2;
  c.act.x = g.position.x; c.act.z = g.position.z;
}

/* ================================================================ computer + tickets */
function openComputer() {
  modalOpen = true; if (locked) document.exitPointerLock();
  $('computer').classList.remove('hidden'); $('prompt').classList.add('hidden'); $('hud').classList.add('modal');
  D.touched = true; renderInbox();
}
function closeComputer() { modalOpen = false; $('computer').classList.add('hidden'); $('hud').classList.remove('modal'); }
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>');
function ticketStatus(t) {
  if (t.state === 'done') return '<span class="done">Done</span>';
  if (t.state === 'late') return '<span class="late">Done (late)</span>';
  if (t.state === 'failed') return '<span class="fail">Failed</span>';
  if (simMin < t.avail) return '<span class="lock">Opens ' + fmt(t.avail) + '</span>';
  return cozy() || t.optional ? '<span class="lock">No rush</span>' : 'Due ' + fmt(t.due);
}
let compView = 'inbox', compMin = -1;
function renderInbox() {
  compView = 'inbox'; compMin = Math.floor(simMin);
  const stOpen = simMin >= C.m(16) && !D.statusDone;
  const tired = ST.energy < 45 ? '<div class="fb" style="margin:0 0 8px">You feel ' + (ST.energy < 25 ? 'exhausted' : 'tired') + '. Mistakes are more likely. A coffee or lunch would help.</div>' : '';
  $('compBody').innerHTML = '<h2>Workstation</h2><p>' + D.def.title + ' &middot; ' + fmt(simMin) + '. Pick a task.</p>' + tired +
    D.tickets.map((t, i) => {
      const open = simMin >= t.avail && !['done', 'late', 'failed'].includes(t.state);
      return '<div class="ticket' + (open ? '' : ' disabled') + '" data-i="' + i + '"><div><b>' + t.id + '</b> ' + t.title + '</div><div>' + ticketStatus(t) + '</div></div>';
    }).join('') +
    '<div class="ticket' + (stOpen ? '' : ' disabled') + '" data-s="1"><div><b>STATUS</b> End-of-day status update</div><div>' +
    (D.statusDone ? '<span class="done">Posted</span>' : simMin < C.m(16) ? '<span class="lock">Opens 4:00 PM</span>' : 'Due before 5:00 PM') + '</div></div>' +
    '<div class="row"><button class="alt" id="closeComp">Back to the office</button></div>';
  $('closeComp').onclick = closeComputer;
  document.querySelectorAll('#compBody .ticket').forEach(el => el.onclick = () => {
    if (el.classList.contains('disabled')) return;
    Sfx.click();
    if (el.dataset.s) renderStatus(); else renderTicket(+el.dataset.i);
  });
}
function codeBlock(t, clickable, wrongLine) {
  if (!t.code) return '';
  return '<pre>' + t.code.split('\n').map((l, n) => '<span class="cl' + (clickable ? ' click' : '') + (wrongLine === n + 1 ? ' wrong' : '') + '" data-n="' + (n + 1) + '"><i>' + (n + 1) + '</i>' + esc(l) + '</span>').join('') + '</pre>';
}
function renderTicket(i, fb) {
  compView = 'ticket';
  const t = D.tickets[i];
  let h = '<h2>' + t.id + ': ' + t.title + '</h2><p>' + t.spec + '</p>';
  if (t.type === 'code') {
    h += codeEditorHtml(t, fb);
  } else if (t.type === 'text') {
    h += codeBlock(t) + '<p>' + t.prompt + '</p><textarea id="ticketTxt" placeholder="Write here..."></textarea>' + (fb ? '<div class="fb">' + fb + '</div>' : '') +
      '<div class="row"><button id="submitTxt">Submit</button><button class="alt" id="backInbox">Back</button></div>';
  } else if (t.type === 'line' && t.stage === 1) {
    h += codeBlock(t, true, t.wrongLine) + '<p>Click the line that contains the bug.' + (t.mistakes ? ' (one mistake so far)' : '') + '</p>' + (fb ? '<div class="fb">' + fb + '</div>' : '') +
      '<div class="row"><button class="alt" id="backInbox">Back</button></div>';
  } else {
    h += codeBlock(t) + '<p>Which fix do you ship?' + (t.mistakes ? ' (one mistake so far)' : '') + '</p>' +
      t.opts.map((o, k) => '<button class="opt-btn" data-k="' + k + '">' + String.fromCharCode(65 + k) + '. ' + inline(o) + '</button>').join('') +
      (fb ? '<div class="fb">Tests failed. ' + fb + '</div>' : '') + '<div class="row"><button class="alt" id="backInbox">Back</button></div>';
  }
  $('compBody').innerHTML = h;
  $('backInbox').onclick = renderInbox;
  if ($('runCode')) bindCode(i);
  document.querySelectorAll('#compBody .opt-btn').forEach(b => b.onclick = () => submitChoice(i, +b.dataset.k));
  document.querySelectorAll('#compBody .cl.click').forEach(el => el.onclick = () => submitLine(i, +el.dataset.n));
  if ($('submitTxt')) $('submitTxt').onclick = () => submitText(i);
}
const tiredFactor = () => ST.energy < 25 ? 0.85 : ST.energy < 45 ? 0.93 : 1;
function completeTicket(i, score) {
  const t = D.tickets[i], late = !cozy() && !t.optional && simMin > t.due, cats = t.award || ['tech'];
  const s = Math.round(score * tiredFactor()) - (late ? 15 : 0);
  cats.forEach(c => add(c, s));
  if (t.prob && !cats.includes('prob')) add('prob', s);
  if (!t.optional) add('rel', late ? 50 : 100);
  moodAdd(3); earn(t.coins || (t.mistakes === 0 ? 15 : 10), t.id);
  t.state = late ? 'late' : 'done'; Sfx.good(); renderInbox();
}
function failTicket(i) {
  if (cozy()) { learnTicket(i); return; }
  const t = D.tickets[i];
  (t.award || ['tech']).forEach(c => add(c, 0));
  if (t.prob && !(t.award || []).includes('prob')) add('prob', 0);
  add('rel', 0); moodAdd(-8); t.state = 'failed'; Sfx.bad(); renderInbox();
}

/* cozy mode: instead of failing, walk through the answer together */
function learnTicket(i) {
  const t = D.tickets[i];
  const ans = t.type === 'line' && t.stage === 1 ? 'The bug is on line ' + t.bugLine + '. Then the fix: ' + inline(t.opts[t.ok]) : 'The best fix: ' + inline(t.opts[t.ok]);
  $('compBody').innerHTML = '<h2>Let us walk through it together</h2><p>No pressure. Dana pulls up a chair and talks it through with you.</p><div class="tip">' + ans + '</div>' +
    '<div class="row"><button id="learnOk">Got it, thank you!</button></div>';
  $('learnOk').onclick = () => { t.mistakes = 2; completeTicket(i, 55); notify('Nice. Next time it will click even faster.'); };
}

/* ---- bonus coding tasks: real code, real tests, run in a sandboxed worker ---- */
function codeEditorHtml(t, fb) {
  return '<textarea id="codeBox" spellcheck="false" style="font:13px/1.5 Consolas,monospace;min-height:170px;background:#0b1120;color:#b9f3c9">' + esc(t.draft || t.starter) + '</textarea>' +
    '<div class="row"><button id="runCode">Run tests</button><button class="alt" id="backInbox">Back</button></div><div id="codeOut"></div>' + (fb ? '<div class="fb">' + fb + '</div>' : '');
}
function workerMain() {
  self.onmessage = e => {
    const d = e.data; let res;
    try {
      const f = new Function(d.code + '\nreturn typeof ' + d.fn + ' === "function" ? ' + d.fn + ' : null;')();
      if (!f) throw new Error('Define a function named ' + d.fn);
      res = d.tests.map(t => { try { const out = f(...JSON.parse(JSON.stringify(t.args))); return { ok: JSON.stringify(out) === JSON.stringify(t.expect), got: out }; } catch (err) { return { ok: false, err: String(err) }; } });
    } catch (err) { res = [{ ok: false, err: String(err) }]; }
    self.postMessage(res);
  };
}
function runInWorker(code, fn, tests) {
  return new Promise(resolve => {
    let w;
    try { w = new Worker(URL.createObjectURL(new Blob(['(' + workerMain.toString() + ')()'], { type: 'text/javascript' }))); } catch (e) { resolve([{ ok: false, err: 'The code runner is not available in this browser.' }]); return; }
    const timer = setTimeout(() => { w.terminate(); resolve([{ ok: false, err: 'Your code took too long. Is there an endless loop?' }]); }, 2500);
    w.onmessage = e => { clearTimeout(timer); w.terminate(); resolve(e.data); };
    w.onerror = e => { clearTimeout(timer); w.terminate(); resolve([{ ok: false, err: String(e.message || 'Error') }]); };
    w.postMessage({ code, fn, tests });
  });
}
function bindCode(i) {
  const t = D.tickets[i];
  $('runCode').onclick = async () => {
    t.draft = $('codeBox').value; $('runCode').disabled = true; $('codeOut').innerHTML = '<p>Running...</p>';
    const res = await runInWorker(t.draft, t.fn, t.tests);
    $('runCode').disabled = false;
    const pass = res.length === t.tests.length && res.every(r => r.ok);
    $('codeOut').innerHTML = res.map((r, k) => '<div class="' + (r.ok ? 'done' : 'fail') + '">' + (r.ok ? '✓ ' : '✗ ') + (t.tests[k] ? t.fn + '(' + t.tests[k].args.map(a => JSON.stringify(a)).join(', ') + ') should be ' + JSON.stringify(t.tests[k].expect) : '') + (r.ok ? '' : (r.err ? ' - ' + esc(r.err) : ' - got ' + esc(String(JSON.stringify(r.got))))) + '</div>').join('');
    if (pass) { t.mistakes = t.fails || 0; completeTicket(i, Math.max(60, 100 - (t.fails || 0) * 10)); return; }
    t.fails = (t.fails || 0) + 1; Sfx.bad();
    if (t.fails >= 2) $('codeOut').innerHTML += '<div class="tip">Hint: ' + esc(t.hint) + '</div>';
  };
}

function mistake(i) {   // returns true if ticket should fail
  const t = D.tickets[i];
  if (D.freeRetry > 0) { D.freeRetry--; notify('Your study session paid off: free retry!'); return false; }
  t.mistakes++; return t.mistakes >= 2;
}
function submitChoice(i, k) {
  const t = D.tickets[i];
  if (k === t.ok) { completeTicket(i, t.mistakes === 0 ? 100 : 65); return; }
  if (mistake(i)) { failTicket(i); return; }
  Sfx.bad(); renderTicket(i, t.why[k]);
}
function submitLine(i, n) {
  const t = D.tickets[i];
  if (n === t.bugLine) { t.stage = 2; Sfx.good(); renderTicket(i); return; }
  t.wrongLine = n;
  if (mistake(i)) { failTicket(i); return; }
  Sfx.bad(); renderTicket(i, t.lineWhy);
}
function submitText(i) {
  const t = D.tickets[i], txt = $('ticketTxt').value.trim(), l = txt.toLowerCase();
  if (txt.length < 15) { renderTicket(i, 'Write a little more before submitting.'); return; }
  const hits = t.groups.filter(g => g.some(w => l.includes(w))).length;
  const score = Math.round(hits / t.groups.length * 75 + (txt.length >= t.minLen ? 25 : txt.length / t.minLen * 15));
  if (score < 60 && t.mistakes < 1) {
    t.mistakes++; Sfx.bad();
    const missing = t.groups.length - hits;
    renderTicket(i, 'This is missing ' + missing + ' key point' + (missing > 1 ? 's' : '') + '. Re-read the task and add detail' + (txt.length < t.minLen ? ' (a bit longer would help)' : '') + '. One more try.');
    return;
  }
  completeTicket(i, score);
}
function renderStatus() {
  compView = 'status';
  $('compBody').innerHTML = '<h2>End-of-day status update</h2><p>Write a short update for your manager: what you finished, any blockers or risks, and what you plan next.</p>' +
    '<textarea id="statusTxt" placeholder="Today I completed..."></textarea><div class="row"><button id="postStatus">Post update</button><button class="alt" id="backInbox">Back</button></div>';
  $('backInbox').onclick = renderInbox;
  $('postStatus').onclick = () => {
    const txt = $('statusTxt').value.trim(); if (txt.length < 10) return;
    const l = txt.toLowerCase();
    let sc = Math.min(40, txt.length * 0.4);
    if (/(done|complet|finish|fixed|shipped|resolved)/.test(l)) sc += 20;
    if (/(block|risk|issue|concern|stuck|none)/.test(l)) sc += 20;
    if (/(next|tomorrow|plan|will|follow)/.test(l)) sc += 20;
    add('comm', sc); add('prof', sc + 10); add('rel', 100);
    D.statusDone = true; Sfx.good(); renderStatus.done = true; renderInbox();
  };
}

/* ================================================================ day flow */
function showScreen(id, on) { $(id).classList.toggle('hidden', !on); }
function resetWorld() {
  coworkers.forEach(c => {
    c.state = 'sit'; c.path = null; c.timer = 30 + Math.random() * 60; c.cd = 0; c.greeted = false;
    c.g.position.set(c.x, 0, c.z + 0.78); c.g.rotation.y = Math.PI; c.g.userData.seated = true;
  });
  Object.values(LOCS).forEach(l => l.npcs.forEach(n => { n.greeted = false; n.cd = 0; n.badgeAsked = false; }));
  dana.position.set(HOME[0], 0, HOME[1]); danaAt = 'home'; danaPath = null; patrolT = 80; danaWait = 0;
  APT.rack.userData.card.visible = true; APT.rack.userData.bag.visible = true;
  LOB.reader.set('TAP\nBADGE');
}
function startDay(idx) {
  D = newDay(idx); chat = null; chatQueue = []; coActive = false; paused = false; modalOpen = false; busy = false; lastTasks = '';
  D.freeRetry = G.freeRetry ? 1 : 0; G.freeRetry = false;
  ST.energy = G.nextEnergy != null ? G.nextEnergy : 78; ST.mood = clamp((G.nextMood != null ? G.nextMood : 60), 20, 100);
  simMin = WAKE; phase = 'play';
  D.weather = pickWeather(idx); D.vignette = pickVignette(idx); D.coinsToday = 0; D.moments = []; hasCup = false; cakeM.visible = donutM.visible = false;
  resetWorld(); syncDecor(); updateCoins();
  ['title', 'daySum', 'report', 'pause', 'computer'].forEach(id => showScreen(id, false)); showBanner(false);
  showScreen('hud', true); $('hud').classList.remove('modal');
  buildMe(); setLoc('apartment', 'bed'); applyWeather();
  player.lying = true; player.x = -3.3; player.z = -2.6; player.yaw = 0; player.pitch = 0.15; player.eye = 0.75;
  fadeEl.classList.add('on'); fadeTxt.textContent = D.def.title; later(() => fadeIn(() => {}), 700);
  Sfx.init();
  if (D.freeRetry) setTimeout(() => notify('You studied last night: one free retry on a ticket today.'), 2500);
  setTimeout(() => { if (phase === 'play' && D.weather === 'rain') pop('Rain on the window. Cozy.'); }, 3500);
}
function goToSleep() {
  const l = L(), late = simMin;
  const q = late <= 1350 ? 100 : late <= 1410 ? 65 : 30;
  add('well', q);
  G.nextEnergy = (late <= 1350 ? 92 : late <= 1410 ? 78 : 58) + (l.exercised ? 4 : 0);
  G.nextMood = ST.mood > 60 ? 62 : 55; G.freeRetry = !!l.studied;
  if (busy) return; busy = true;
  fadeOut('Sleeping...', () => { busy = false; endDay(); });
}
const dayAverages = sc => { const r = {}; CATS.forEach(([k]) => r[k] = sc[k].length ? Math.round(avg(sc[k])) : null); return r; };
const weighted = av => { let s = 0, w = 0; CATS.forEach(([k, , wt]) => { if (av[k] !== null) { s += av[k] * wt; w += wt; } }); return w ? Math.round(s / w) : 0; };
const show = v => v === null ? 'n/a' : v;
function endDay() {
  closeComputer(); showScreen('hud', false); showBanner(false); if (locked) document.exitPointerLock();
  const l = L();
  if (D.clockIn === null && !D.noShow) { D.noShow = true; add('rel', 0); }
  D.tickets.forEach(t => { if (!t.optional && !['done', 'late', 'failed'].includes(t.state)) { (t.award || ['tech']).forEach(c => add(c, 0)); add('rel', 0); } });
  if (!D.statusDone && !D.noShow) { add('comm', 0); add('prof', 30); }
  const team = Object.keys(l.greeted).length;
  if (!D.noShow) { const gs = team >= 5 ? 100 : team >= 3 ? 75 : team >= 1 ? 45 : 15; add('comm', gs); add('prof', gs); }
  if (!l.lunch && !D.noShow) add('well', 40);
  const av = dayAverages(D.sc), total = weighted(av);
  earn(20 + Math.round(total / 10), 'day complete'); Profile.data.rep += cozy() ? 3 : Math.max(0, Math.round((total - 50) / 10)); Profile.data.days++; Profile.save();
  G.days.push({ coins: D.coinsToday, moments: D.moments.slice(0, 8), weather: D.weather, snoozes: l.snoozes, sc: D.sc, av, total, clockIn: D.clockIn, clockOut: D.clockOut, hints: D.hints, title: D.def.title, greets: team, outfit: l.outfit, ate: l.ate, lunch: l.lunch });
  G.dayIdx++;
  const mode = C.MODES.find(m => m.id === G.modeId);
  if (G.dayIdx < mode.days) { store.set(SAVE_KEY, G); phase = 'daysum'; showDaySummary(av, total, l); fadeIn(() => {}); }
  else { store.del(SAVE_KEY); showReport(); fadeIn(() => {}); }
}
function bars(av) {
  return CATS.map(([k, name]) => '<div class="cat"><b>' + name + '</b> <span>' + (av[k] === null ? 'not tested today' : av[k] + '/100') + '</span><div class="bar"><i style="width:' + (av[k] || 0) + '%"></i></div></div>').join('');
}
const starsFor = total => total >= 85 ? 3 : total >= 65 ? 2 : 1;
const starStr = n => '\u2605'.repeat(n) + '\u2606'.repeat(3 - n);
function journalHtml(l) {
  const lines = [];
  lines.push(l.snoozes ? 'I snoozed ' + l.snoozes + ' time' + (l.snoozes > 1 ? 's' : '') + ', as one does.' : 'I got up on the first alarm. Look at me go.');
  lines.push(D.weather === 'rain' ? 'It rained on the way in. I kind of loved the sound.' : D.weather === 'cloudy' ? 'A soft grey sky on the walk to work.' : 'Sunshine on the commute. Lovely.');
  const b = { cooked: 'a proper cooked breakfast', cereal: 'cereal and toast', skipped: 'no breakfast (oops)' }[l.ate];
  if (b) lines.push('Breakfast was ' + b + '.');
  const g = Object.keys(l.greeted).length; if (g) lines.push('I said hello to ' + g + ' ' + (g === 1 ? 'person' : 'people') + '.');
  (D.moments || []).slice(0, 5).forEach(m => lines.push(m));
  lines.push(ST.mood >= 60 ? 'Overall, a good day. I feel settled.' : 'A tougher day, but I got through it. Tomorrow is fresh.');
  return lines.map(x => '<p style="color:var(--text);margin:4px 0">\u2022 ' + x + '</p>').join('');
}
function showDaySummary(av, total, l) {
  Sfx.fanfare();
  if (cozy()) {
    const n = starsFor(total);
    $('daySumBody').innerHTML = '<h2>' + D.def.title + '</h2><div class="grade" style="font-size:34px;letter-spacing:4px">' + starStr(n) + '</div>' +
      '<h3>Dear diary...</h3>' + journalHtml(l) +
      '<p>Today you earned <b style="color:var(--text)">' + (D.coinsToday || 0) + ' coins</b> and finish with ' + Math.round(ST.energy) + '% energy and ' + Math.round(ST.mood) + '% mood. Your coin total is ' + Profile.data.coins + '.</p>' +
      '<p style="font-size:13px">Progress is saved. Close the tab any time and continue later.</p><div class="row"><button id="nextDay">Wake up for day ' + (G.dayIdx + 1) + '</button></div>';
  } else {
    const recap = D.noShow ? 'You missed work today.' : 'Clocked in ' + fmt(D.clockIn) + (D.clockOut !== null ? ' &middot; out ' + fmt(D.clockOut) : '') + ' &middot; breakfast: ' + (l.ate || 'none') + ' &middot; lunch: ' + (l.lunch || 'none') + ' &middot; greeted ' + Object.keys(l.greeted).length + ' people';
    $('daySumBody').innerHTML = '<h2>' + D.def.title + ' complete</h2><p>' + recap + '</p><p>Day score <b style="color:var(--text)">' + total + '/100</b> &middot; you finish the day with ' + Math.round(ST.energy) + '% energy and ' + Math.round(ST.mood) + '% mood.</p>' +
      bars(av) + '<p>Progress is saved. You can close the tab and continue later.</p><div class="row"><button id="nextDay">Wake up for day ' + (G.dayIdx + 1) + '</button></div>';
  }
  showScreen('daySum', true);
  $('nextDay').onclick = () => { Sfx.click(); startDay(G.dayIdx); };
}

/* ---- title ---- */
let selMode = 'sprint', selStyle = 'cozy';
function renderTitle() {
  $('modes').innerHTML = C.MODES.map(m => '<div class="mode' + (m.id === selMode ? ' sel' : '') + '" data-id="' + m.id + '"><b>' + m.label + '</b><span>' + m.blurb + '</span></div>').join('');
  document.querySelectorAll('#modes .mode').forEach(el => el.onclick = () => { selMode = el.dataset.id; Sfx.click(); renderTitle(); });
  $('speedSel').innerHTML = C.SPEEDS.map(s => '<option value="' + s.id + '">' + s.label + '</option>').join('');
  const saved = store.get('officelife.speed'); if (saved) $('speedSel').value = saved;
  const s = store.get(SAVE_KEY), sv = s && s.dayIdx < C.MODES.find(m => m.id === s.modeId).days ? s : null;
  $('styles').innerHTML = C.STYLES.map(s => '<div class="mode' + (s.id === selStyle ? ' sel' : '') + '" data-id="' + s.id + '"><b>' + s.label + '</b><span>' + s.blurb + '</span></div>').join('');
  document.querySelectorAll('#styles .mode').forEach(el => el.onclick = () => { selStyle = el.dataset.id; Sfx.click(); renderTitle(); });
  renderAvatarPicker(); $('catName').value = Profile.data.catName; $('aiKey').value = Profile.aiKey;
  $('profileInfo').textContent = Profile.title + ' \u00b7 ' + Profile.data.coins + ' coins \u00b7 ' + Profile.data.owned.length + ' decor items';
  $('contBtn').classList.toggle('hidden', !sv);
  $('saveInfo').textContent = sv ? 'Saved: ' + sv.name + ', next is day ' + (sv.dayIdx + 1) : '';
  const hist = store.get(HIST_KEY) || [];
  $('histWrap').classList.toggle('hidden', !hist.length);
  $('hist').innerHTML = hist.map(h => '<div><span>' + h.name + ' &middot; ' + h.mode + '</span><span>' + h.total + '/100 (' + h.grade + ') &middot; ' + h.date + '</span></div>').join('');
}
$('beginBtn').onclick = () => {
  Sfx.init();
  const sp = C.SPEEDS.find(s => s.id === $('speedSel').value) || C.SPEEDS[0];
  store.set('officelife.speed', sp.id);
  Profile.data.catName = $('catName').value.trim() || 'Miso'; Profile.aiKey = $('aiKey').value.trim(); Profile.save();
  G = { name: $('nameIn').value.trim() || 'Anonymous Graduate', style: selStyle, modeId: selMode, speedId: sp.id, secPerMin: sp.secPerMin, dayIdx: 0, days: [], nextEnergy: null, nextMood: null, freeRetry: false };
  store.del(SAVE_KEY); startDay(0);
};
$('contBtn').onclick = () => { Sfx.init(); G = store.get(SAVE_KEY); startDay(G.dayIdx); };

/* ---- pause ---- */
function openPause() {
  if (phase !== 'play') return;
  paused = true; if (locked) document.exitPointerLock();
  $('volRange').value = Math.round(Sfx.volume * 100); $('musicRange').value = Math.round(Sfx.musicVolume * 100); $('sensRange').value = Math.round(sens * 100);
  $('muteBtn').textContent = Sfx.muted ? 'Unmute' : 'Mute';
  showScreen('pause', true);
}
function closePause() { paused = false; showScreen('pause', false); if (!modalOpen) requestLock(); }
$('resumeBtn').onclick = closePause;
$('muteBtn').onclick = () => { Sfx.toggleMute(); $('muteBtn').textContent = Sfx.muted ? 'Unmute' : 'Mute'; };
$('volRange').oninput = e => Sfx.setVolume(e.target.value / 100);
$('musicRange').oninput = e => { Sfx.setMusicVolume(e.target.value / 100); if (!Sfx.musicOn && e.target.value > 0) Sfx.music(true); };
$('sensRange').oninput = e => { sens = e.target.value / 100; store.set(SENS_KEY, sens); };
$('quitBtn').onclick = () => { if (G && G.days.length) store.set(SAVE_KEY, G); location.reload(); };

/* ---- report + certificate ---- */
const TIPS = {
  tech: ['Review loop bounds, comparison operators, async/await, caching and common security mistakes.', 'Solid engineering on your tickets.'],
  comm: ['Greet people, reply with more detail and write complete status updates.', 'Clear, friendly communication.'],
  rel: ['Be on time, respond to messages quickly and finish tickets before their deadlines.', 'Dependable: on time and on deadline.'],
  prob: ['When requirements change or things break, confirm scope and communicate a plan.', 'You handled changes and incidents well.'],
  prof: ['Dress for the job, stay positive and keep a helpful tone.', 'Great presence with teammates.'],
  well: ['Look after yourself: eat breakfast and lunch, rest and sleep on time.', 'You looked after yourself well.'],
};
function danaLetter(av) {
  const have = CATS.filter(([k]) => av[k] !== null);
  const best = have.reduce((a, b) => av[b[0]] > av[a[0]] ? b : a), low = have.reduce((a, b) => av[b[0]] < av[a[0]] ? b : a);
  return 'Dear ' + G.name + ', watching you settle in has been a joy. I especially loved your ' + best[1].toLowerCase() + '. If you would like something to try next: ' + TIPS[low[0]][0].charAt(0).toLowerCase() + TIPS[low[0]].slice(0, 1)[0].slice(1) + ' Whatever you choose, you belong here. Dana';
}
function showReport() {
  phase = 'report'; modalOpen = true; Sfx.fanfare();
  const all = newScores(); G.days.forEach(d => CATS.forEach(([k]) => all[k].push(...d.sc[k])));
  const av = dayAverages(all), total = weighted(av);
  const grade = total >= 90 ? 'A' : total >= 80 ? 'B' : total >= 70 ? 'C' : total >= 60 ? 'D' : 'F';
  const pass = total >= 60, mode = C.MODES.find(m => m.id === G.modeId), cz = cozy();
  const code = (Math.abs([...(G.name + total + G.days.length + Date.now())].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7)).toString(36) + 'XQ7KP2').slice(0, 8).toUpperCase();
  const hist = store.get(HIST_KEY) || [];
  hist.unshift({ name: G.name, mode: mode.label + (cz ? ' (cozy)' : ''), total, grade: cz ? starStr(starsFor(total)) : grade, date: new Date().toLocaleDateString() }); store.set(HIST_KEY, hist.slice(0, 8));
  const hints = G.days.reduce((a, d) => a + d.hints, 0), coins = G.days.reduce((a, d) => a + (d.coins || 0), 0);
  const moments = []; G.days.forEach(d => (d.moments || []).forEach(m => { if (moments.length < 8 && !moments.includes(m)) moments.push(m); }));
  const friends = ['priya', 'sam', 'leo', 'mei', 'omar', 'dana'].map(id => NAMES[id] + ' ' + Profile.heartString(id)).join(' &nbsp;&middot;&nbsp; ');
  $('repBody').innerHTML =
    '<div style="display:flex;gap:24px;align-items:center;flex-wrap:wrap"><div class="grade">' + (cz ? starStr(starsFor(total)) : grade) + '</div><div><h2 style="margin:0">' + G.name + '</h2>' +
    '<p style="margin:2px 0">' + Profile.title + ' &middot; ' + mode.label + (cz ? ' &middot; Cozy' : '') + '</p><p style="margin:2px 0">' + (cz ? 'Coins earned ' + coins + ' &middot; ' : 'Overall score ' + total + '/100 &middot; ') + (hints ? 'asked for advice ' + hints + ' time' + (hints > 1 ? 's' : '') + ' (good habit!)' : '') + '</p></div></div>' +
    (cz ? '<h3>A note from Dana</h3><p style="color:var(--text)">' + danaLetter(av) + '</p><h3>Friends</h3><p>' + friends + '</p><h3>Moments to remember</h3>' + moments.map(m => '<p style="color:var(--text);margin:3px 0">\u2022 ' + m + '</p>').join('') : '') +
    '<h3>By day</h3><div class="days">' + G.days.map((d, i) => '<span>Day ' + (i + 1) + '<br><b>' + (cz ? starStr(starsFor(d.total)) : d.total) + '</b></span>').join('') + '</div>' +
    CATS.map(([k, name]) => '<div class="cat"><b>' + name + '</b> <span>' + (av[k] === null ? 'not tested' : av[k] + '/100') + ' &middot; ' + TIPS[k][(av[k] || 0) >= 70 ? 1 : 0] + '</span><div class="bar"><i style="width:' + (av[k] || 0) + '%"></i></div></div>').join('') +
    '<p>' + (cz ? 'Thank you for spending the week at OfficeLife. Download your keepsake below.' : pass ? 'You passed. Download your certificate below.' : 'Not a pass this time (60 needed). Run it again and apply the feedback above.') + '</p>' +
    '<div class="row">' + (pass ? '<button id="dlCert">' + (cz ? 'Download keepsake' : 'Download certificate') + '</button>' : '') + '<button class="alt" onclick="location.reload()">Play again</button></div>';
  showScreen('report', true);
  if (pass) $('dlCert').onclick = () => downloadCert(total, grade, code, av, mode);
}
function downloadCert(total, grade, code, av, mode) {
  const c = document.createElement('canvas'); c.width = 1400; c.height = 990;
  const g = c.getContext('2d');
  g.fillStyle = '#fbfaf5'; g.fillRect(0, 0, 1400, 990);
  g.strokeStyle = '#1f6f43'; g.lineWidth = 10; g.strokeRect(30, 30, 1340, 930); g.lineWidth = 2; g.strokeRect(50, 50, 1300, 890);
  g.textAlign = 'center'; g.fillStyle = '#1f6f43'; g.font = 'bold 28px Georgia'; g.fillText('OFFICELIFE SIMULATED WORK PROGRAM', 700, 150);
  g.fillStyle = '#222'; g.font = 'bold 72px Georgia'; g.fillText(cozy() ? 'Keepsake of a Great Week' : 'Certificate of Completion', 700, 260);
  g.font = '28px Georgia'; g.fillText('This certifies that', 700, 340);
  g.font = 'italic bold 66px Georgia'; g.fillStyle = '#1f6f43'; g.fillText(G.name, 700, 430);
  g.fillStyle = '#222'; g.font = '28px Georgia';
  g.fillText('completed the ' + mode.label + ' simulation as a Junior Software Engineer', 700, 500);
  g.fillText(cozy() ? 'and made friends, earned ' + Profile.data.coins + ' coins and had a lovely time' : 'with an overall performance score of ' + total + '/100 (Grade ' + grade + ')', 700, 545);
  g.font = '22px Georgia';
  CATS.forEach(([k, n], i) => g.fillText(n + ': ' + show(av[k]), 160 + i * 216, 650));
  g.font = '20px Georgia'; g.fillStyle = '#555';
  g.fillText('Date: ' + new Date().toLocaleDateString(), 400, 820); g.fillText('Reference code: ' + code, 1000, 820);
  g.font = 'italic 18px Georgia'; g.fillText('A simulated-experience certificate of skills demonstrated. It is not employment history.', 700, 900);
  const a = document.createElement('a'); a.download = 'OfficeLife-certificate.png'; a.href = c.toDataURL('image/png'); a.click();
}

/* ================================================================ manager + coworker movement */
const HOME = [0, -5.5];
const PATHS = {
  player: [[0, -5.5], [0, 1.2], [0, 5.9], [1.4, 6.0]],
  meeting: [[0, -5.5], [0, 1.2], [-6, 1.2], [-6, 6.2], [-7.0, 6.2]],
  priya: [[0, -5.5], [0, 1.2], [-7.3, 1.2], [-7.3, -0.8]],
  mei: [[0, -5.5], [0, 1.2], [-1.2, 1.2], [-1.2, -0.8]],
};
let danaAt = 'home', danaPath = null, danaWait = 0, patrolT = 80;
function follow(obj, path, speed, dt) {
  if (!path || !path.length) return false;
  const tg = path[0], dx = tg[0] - obj.position.x, dz = tg[1] - obj.position.z, d = Math.hypot(dx, dz);
  if (d < 0.08) { path.shift(); return path.length > 0; }
  const st = Math.min(d, speed * dt);
  obj.position.x += dx / d * st; obj.position.z += dz / d * st; obj.rotation.y = Math.atan2(dx, dz);
  return true;
}
function danaGo(dest) {
  if (danaAt === dest) return;
  const back = danaAt === 'home' ? [] : PATHS[danaAt].slice().reverse();
  const fwd = dest === 'home' ? [] : PATHS[dest].slice();
  danaPath = back.concat(fwd).map(p => p.slice());
  if (!danaPath.length) danaPath = [HOME.slice()];
  danaAt = dest;
}
function danaVisit(dest, seconds) { danaGo(dest); danaWait = seconds; }

/* ================================================================ per-frame game logic */
function tickGame(dt) {
  const l = L();
  if (D.vignette && !D.vigDone && !D.vigOn && D.clockIn !== null && simMin >= 870 && simMin < 1020) { D.vigOn = true; D.vigDone = true; (D.vignette === 'cake' ? cakeM : donutM).visible = true; notify(D.vignette === 'cake' ? 'Someone left a birthday cake in the break room!' : 'Someone brought donuts to the break room!'); }
  if (D.vigOn && simMin >= 1020) { D.vigOn = false; cakeM.visible = donutM.visible = false; }
  if (player.lying && !chat && !busy && !paused) wakeMenu();
  D.events.forEach(e => {
    if (!e.done && simMin >= e.at) { e.done = true; say(e.from, e.text, e.opts, e.deadline, { urgent: e.urgent }); if (e.from.startsWith('Dana') && loc.id === 'office' && /Standup|Morning|Last day|Quieter|Deploy is/.test(e.text)) danaVisit('player', 20); }
  });
  D.tickets.forEach(t => { if (t.state === 'locked' && simMin >= t.avail) { t.state = 'open'; if (loc.id === 'office' && !t.optional) notify('New ticket: ' + t.id); } });
  expireChat();
  if (modalOpen && compView === 'inbox' && Math.floor(simMin) !== compMin) renderInbox();
  if (D.clockIn !== null && D.clockOut === null) tickMeeting();
  // missed the whole morning
  if (!cozy() && D.clockIn === null && !D.noShow && simMin >= 13 * 60) { D.noShow = true; add('rel', 0); notify('You missed your shift. Dana has noted your absence.'); updateGate(); }
  // lunch nudge and energy warning
  if (!l.nudged && simMin >= 12 * 60 + 15 && D.clockIn !== null && D.clockOut === null) { l.nudged = true; if (!l.lunch) notify('Lunchtime! The break room is in the back right corner.'); }
  if (!l.lowWarned && ST.energy < 30) { l.lowWarned = true; notify('You are running on empty. Grab a coffee or something to eat.'); }
  // end of the shift
  if (!coActive && D.clockIn !== null && D.clockOut === null && simMin >= END) { coActive = true; $('coText').textContent = 'Time to go home: take the elevator down and tap out at the gate reader.'; showBanner(true); Sfx.alarm(); }
  if (coActive && simMin >= END + 40) { D.clockOut = simMin; add('rel', 20); coActive = false; showBanner(false); updateGate(); notify('Security logged you out automatically.'); }
  // forced bedtime
  if (simMin >= 1440 && !busy) { add('well', 20); G.nextEnergy = 45; G.nextMood = 45; G.freeRetry = false; busy = true; fadeOut('You fall asleep exhausted...', () => { busy = false; endDay(); }); }
  if (toastT > 0 && (toastT -= dt) <= 0) $('toast').classList.add('hidden');
  if (danaAt === 'home' && !danaPath && D.clockIn !== null && (patrolT -= dt) <= 0) { patrolT = 90 + Math.random() * 60; danaVisit(Math.random() < 0.5 ? 'priya' : 'mei', 14); }
  if (danaWait > 0 && !danaPath && (danaWait -= dt) <= 0) danaGo('home');
  drain(dt / G.secPerMin);
}
function tickMeeting() {
  const M = D.meet; if (!M) return;
  const mt = D.def.meeting;
  if (M.state === 'pending') {
    if (!M.toast && simMin >= mt.at - 15) { M.toast = true; notify(mt.label + ' at ' + fmt(mt.at) + '. Head to the meeting corner (purple chairs).'); }
    if (simMin >= mt.at) { M.state = 'running'; danaGo('meeting'); danaWait = 0; }
  } else if (M.state === 'running') {
    if (loc.id === 'office' && player.x > MEET.x0 && player.x < MEET.x1 && player.z > MEET.z0 && player.z < MEET.z1) M.attended = true;
    if (!M.checked && simMin >= mt.at + 8) {
      M.checked = true;
      if (M.attended) { add('rel', 100); add('prof', 100); notify('Attendance noted. Thanks for joining ' + mt.label + '.'); }
      else { add('rel', 0); add('prof', 30); moodAdd(-6); notify('You missed ' + mt.label + '. Dana noticed.'); }
    }
    if (M.checked && M.attended && !M.asked && simMin >= mt.at + 10) { M.asked = true; say(mt.q.from, mt.q.text, mt.q.opts, mt.q.deadline); }
    if (simMin >= mt.at + mt.len) { M.state = 'done'; danaGo('home'); }
  }
}

/* ---- HUD ---- */
let lastTasks = '';
function row(done, text, cls) { return '<div class="' + (done ? 'done' : cls || '') + '">' + (done ? '✓ ' : '• ') + text + '</div>'; }
function tasksHtml() {
  const l = L(), r = []; let title = '';
  if (D.clockIn === null && !D.noShow && !l.left) {
    title = 'Morning routine';
    r.push(row(l.up, 'Get up'), row(l.outfit, 'Get dressed (wardrobe)'), row(l.washed, 'Wash up (sink or shower)'), row(l.ate, 'Eat breakfast (fridge)'), row(l.badge, 'Take your badge and bag'), row(false, 'Leave for work (front door)'));
    r.push('<div class="lock">Be at the office by 9:00 AM</div>');
  } else if (D.clockIn === null && !D.noShow) {
    title = 'Getting to work';
    if (loc.id === 'street') { const d = Math.max(0, Math.round(player.z + 77)); r.push(row(false, 'Walk to the OfficeLife building (' + d + ' m)')); r.push(row(l.kiosk, 'Optional: coffee at Morning Brew')); }
    else { r.push(row(!!l.greeted.hana, 'Greet reception')); r.push(row(false, 'Tap your badge at the gate reader')); r.push(row(false, 'Take the elevator up')); }
  } else if (D.clockOut === null && !D.noShow) {
    title = 'Workday';
    const team = ['priya', 'sam', 'leo', 'mei', 'omar', 'dana'].filter(k => l.greeted[k]).length;
    if (team < 6 && simMin < 12 * 60) r.push(row(team >= 6, 'Greet the team (' + team + '/6)'));
    const M = D.meet, mt = D.def.meeting;
    if (M && M.state === 'running' && !M.attended) r.push('<div class="late">→ Meeting now: go to the meeting corner</div>');
    else if (M && M.state === 'pending' && simMin >= mt.at - 15) r.push('<div class="late">• ' + mt.label + ' at ' + fmt(mt.at) + '</div>');
    else if (M && M.state === 'pending') r.push('<div class="lock">• ' + mt.label + ' (' + fmt(mt.at) + ')</div>');
    else if (M && M.attended) r.push(row(true, mt.label));
    D.tickets.forEach(t => {
      const open = simMin >= t.avail, st = t.state;
      r.push('<div class="' + (st === 'done' ? 'done' : st === 'late' ? 'late' : st === 'failed' ? 'fail' : !open ? 'lock' : '') + '">' + (st === 'done' || st === 'late' ? '✓ ' : st === 'failed' ? '✗ ' : '• ') + t.id + ' ' + (st === 'failed' ? '' : open ? '(due ' + fmt(t.due) + ')' : '(' + fmt(t.avail) + ')') + '</div>');
    });
    r.push(row(!!l.lunch, 'Lunch break (break room)', simMin > 720 ? 'late' : 'lock'));
    r.push('<div class="' + (D.statusDone ? 'done' : simMin >= C.m(16) ? '' : 'lock') + '">' + (D.statusDone ? '✓ ' : '• ') + 'Status update (4:00 PM)</div>');
    if (coActive) r.unshift('<div class="late">→ Elevator down, then tap out at the gate</div>');
  } else {
    title = 'Evening';
    if (!l.home) r.push(row(false, loc.id === 'lobby' ? 'Head outside and walk home' : 'Walk home (south end of the street)'));
    r.push(row(l.dinner, 'Eat dinner (fridge)'), row(l.exercised, 'Optional: exercise (mat)', 'lock'), row(l.studied, 'Optional: study (laptop)', 'lock'), row(l.tv > 0, 'Optional: relax (sofa)', 'lock'));
    r.push(row(false, simMin >= 1200 ? 'Go to sleep (bed)' : 'Sleep after 8:00 PM (bed)'));
  }
  return '<h4>' + title + '</h4>' + r.join('');
}
function updateHud() {
  $('clockTxt').textContent = fmt(simMin);
  $('clockSub').textContent = D.def.title.split(':')[0] + ' · ' + LOC_NAMES[loc.id];
  updateCoins(); if (popT > 0 && (popT -= 0.016) <= 0) $('pop').classList.add('hidden');
  $('enBar').style.width = ST.energy + '%'; $('enBar').style.background = ST.energy < 25 ? '#f87171' : ST.energy < 45 ? '#fbbf24' : '#4ade80';
  $('moodBar').style.width = ST.mood + '%'; $('moodBar').style.background = ST.mood < 30 ? '#f87171' : ST.mood < 50 ? '#fbbf24' : '#60a5fa';
  const html = tasksHtml();
  if (html !== lastTasks) { lastTasks = html; $('taskList').innerHTML = html; }
  target = canAct() && !player.lying ? findTarget() : null;
  const p = $('prompt');
  if (target) { p.innerHTML = 'Press <b>E</b> &middot; ' + target.label; p.classList.remove('hidden'); } else p.classList.add('hidden');
  ring.visible = !modalOpen && !(target && target.id === 'desk') && D.clockIn !== null;
  $('minimap').classList.toggle('hidden', loc.id === 'street');
}

/* ---- minimap (generic per location) ---- */
const mapCv = $('mapCv'), mapG = mapCv.getContext('2d');
let mapStatic = null, mapScale = 1, mapOX = 0, mapOZ = 0;
function buildMapStatic() {
  mapStatic = document.createElement('canvas'); mapStatic.width = mapCv.width; mapStatic.height = mapCv.height;
  const g = mapStatic.getContext('2d'), b = loc.bounds, w = b.x1 - b.x0, d = b.z1 - b.z0;
  mapScale = Math.min((mapCv.width - 16) / w, (mapCv.height - 16) / d);
  mapOX = (mapCv.width - w * mapScale) / 2 - b.x0 * mapScale; mapOZ = (mapCv.height - d * mapScale) / 2 - b.z0 * mapScale;
  g.fillStyle = '#1b2438'; g.fillRect(0, 0, mapStatic.width, mapStatic.height);
  g.fillStyle = '#26314d'; g.fillRect(b.x0 * mapScale + mapOX, b.z0 * mapScale + mapOZ, w * mapScale, d * mapScale);
  g.fillStyle = '#8a7a5a';
  loc.colliders.forEach(c => { if (!c.dynamic) g.fillRect(c.x0 * mapScale + mapOX, c.z0 * mapScale + mapOZ, (c.x1 - c.x0) * mapScale, (c.z1 - c.z0) * mapScale); });
  if (loc.id === 'office') { g.fillStyle = '#3b4a6b'; g.beginPath(); g.arc(-9 * mapScale + mapOX, 6 * mapScale + mapOZ, 2.4 * mapScale, 0, 7); g.fill(); g.fillStyle = '#4ade80'; g.fillRect((MY_DESK.x - 1.1) * mapScale + mapOX, (MY_DESK.z - 0.55) * mapScale + mapOZ, 2.2 * mapScale, 1.1 * mapScale); }
  g.strokeStyle = '#44506a'; g.lineWidth = 2; g.strokeRect(1, 1, mapStatic.width - 2, mapStatic.height - 2);
}
function drawMap() {
  if (!mapStatic || loc.id === 'street') return;
  mapG.drawImage(mapStatic, 0, 0);
  const px = x => x * mapScale + mapOX, pz = z => z * mapScale + mapOZ;
  const dot = (x, z, col, r) => { mapG.fillStyle = col; mapG.beginPath(); mapG.arc(px(x), pz(z), r, 0, 7); mapG.fill(); };
  // highlight things worth visiting
  loc.acts.forEach(a => { if (actLabel(a.id)) dot(a.x, a.z, 'rgba(251,191,36,.9)', 4); });
  loc.npcs.forEach(n => dot(n.g.position.x, n.g.position.z, n.kind === 'manager' ? '#fb7185' : '#8fa0c0', n.kind === 'manager' ? 7 : 5));
  mapG.save(); mapG.translate(px(player.x), pz(player.z)); mapG.rotate(-player.yaw);
  mapG.fillStyle = '#fff'; mapG.beginPath(); mapG.moveTo(0, -11); mapG.lineTo(7, 8); mapG.lineTo(-7, 8); mapG.closePath(); mapG.fill(); mapG.restore();
}

/* ================================================================ your character (avatar, camera, title preview) */
const LOOK = {
  skin: [0xf1c9a5, 0xe0ac69, 0xc68642, 0x8d5524, 0x5b3a29],
  hair: [0x2b1d14, 0x1a1210, 0x6b4a2b, 0xb5651d, 0xd9b36c, 0x7a3fa0],
  style: ['short', 'long', 'bun'],
};
const OUTFIT_LOOK = { pajamas: [0xb9c6ee, 0x9aa8d6], smart: [0x3a4a78, 0x2b2f3a], casual: [0xe9a23b, 0x3d5a8a], gym: [0x14b8a6, 0x374151] };
let me = null, meLook = '', view = store.get('officelife.view') || 'third', meFace = Math.PI;
function avatarLook() { const a = Profile.data.avatar || {}; return { skin: a.skin || 0xf1c9a5, hair: a.hair || 0x2b1d14, style: a.style || 'short' }; }
function buildMe() {
  if (me) scene.remove(me);
  const a = avatarLook();
  me = A.person({ shirt: 0xb9c6ee, pants: 0x9aa8d6, skin: a.skin, hair: a.hair, style: a.style, unique: true, lanyard: 0xffb38a });
  me.visible = false; scene.add(me); meLook = '';
}
function dressMe() {
  const key = D && D.life && D.life.outfit ? D.life.outfit : 'pajamas';
  if (key === meLook) return; meLook = key;
  const o = OUTFIT_LOOK[key], m = me.userData.mats; m.shirt.color.setHex(o[0]); m.pants.color.setHex(o[1]);
}
const angDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
function meWave() { if (me) me.userData.waveUntil = clockT + 1.8; }
function updateMe(dt, tt) {
  if (!me) return;
  dressMe();
  if (player.lying) { me.position.set(-3.3, 0.8, -1.95); me.rotation.set(-Math.PI / 2, 0, 0); A.animate(me, tt, {}); return; }
  if (player.moving) meFace += angDiff(meFace, player.moveAng) * Math.min(1, dt * 10);
  else meFace += angDiff(meFace, player.yaw + Math.PI) * Math.min(1, dt * 2.2);
  me.position.set(player.x, 0, player.z); me.rotation.set(0, meFace, 0);
  A.animate(me, tt, { moving: player.moving });
}
function camFree(x, y, z) {
  if (!loc.interior) return true;
  const b = loc.bounds;
  if (x < b.x0 + 0.2 || x > b.x1 - 0.2 || z < b.z0 + 0.2 || z > b.z1 - 0.2) return false;
  if (y < 1.3) for (const c of loc.colliders) { if (!c.off && x > c.x0 - 0.1 && x < c.x1 + 0.1 && z > c.z0 - 0.1 && z < c.z1 + 0.1) return false; }
  return true;
}
function placeCamera(dt) {
  const third = view === 'third' && phase === 'play' && loc && me;
  if (me) me.visible = !!third;
  $('cross').style.display = third ? 'none' : '';
  if (!third) {
    const eyeT = player.lying ? 0.75 : 1.65;
    player.eye += (eyeT - player.eye) * Math.min(1, dt * 5);
    camera.position.set(player.x, player.eye, player.z); camera.rotation.y = player.yaw; camera.rotation.x = player.pitch;
    return;
  }
  const hx = player.lying ? -3.3 : player.x, hz = player.lying ? -2.7 : player.z, hy = player.lying ? 0.95 : 1.4;
  const p = clamp(player.pitch - 0.12, -0.5, 0.75), cp = Math.cos(p), sp = Math.sin(p);
  const fx = -Math.sin(player.yaw) * cp, fz = -Math.cos(player.yaw) * cp;
  let d = loc.id === 'street' ? 3.3 : 2.7;
  for (; d > 0.5; d -= 0.15) if (camFree(hx - fx * d, hy - sp * d, hz - fz * d)) break;
  camera.position.set(hx - fx * d, clamp(hy - sp * d, 0.35, loc.interior ? 2.55 : 9), hz - fz * d);
  camera.lookAt(hx, hy, hz);
}
function toggleView() {
  view = view === 'third' ? 'first' : 'third'; store.set('officelife.view', view);
  pop(view === 'third' ? 'Third-person view (V to switch)' : 'First-person view (V to switch)');
}

/* title-screen preview: your character on a little stage */
const prevScene = new THREE.Scene(); prevScene.background = new THREE.Color(0x3a2c4a);
prevScene.add(new THREE.HemisphereLight(0xfff1e0, 0x6a5a8a, 1.05));
const prevLight = new THREE.DirectionalLight(0xfff0dd, 0.85); prevLight.position.set(2, 4, 3); prevScene.add(prevLight);
const prevStage = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.95, 0.06, 36), new THREE.MeshStandardMaterial({ color: 0xffb38a, roughness: 0.8 })); prevStage.position.y = -0.03; prevScene.add(prevStage);
const prevCam = new THREE.PerspectiveCamera(32, 1, 0.1, 50); prevCam.position.set(0, 1.2, 4.6);
let prevMe = null;
function buildPreview() {
  if (prevMe) prevScene.remove(prevMe);
  const a = avatarLook();
  prevMe = A.person({ shirt: 0x3a4a78, pants: 0x2b2f3a, skin: a.skin, hair: a.hair, style: a.style, unique: true, lanyard: 0xffb38a });
  prevScene.add(prevMe);
}
function fitPreview() {
  prevCam.aspect = innerWidth / innerHeight;
  if (innerWidth > 900) prevCam.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.2, 0, innerWidth, innerHeight); else prevCam.clearViewOffset();
  prevCam.lookAt(0, 0.95, 0); prevCam.updateProjectionMatrix();
}
function updatePreview(tt) {
  if (!prevMe) buildPreview();
  prevMe.rotation.y = Math.sin(tt * 0.45) * 0.55 + 0.25; prevMe.userData.waveUntil = (tt % 8) < 1.6 ? tt + 0.1 : 0;
  A.animate(prevMe, tt, {});
}
addEventListener('resize', fitPreview); fitPreview();
const hex = n => '#' + n.toString(16).padStart(6, '0');
function renderAvatarPicker() {
  const a = avatarLook();
  const sw = (list, key) => list.map(c => '<span class="sw' + (a[key] === c ? ' sel' : '') + '" data-k="' + key + '" data-v="' + c + '" style="background:' + hex(c) + '"></span>').join('');
  $('avSkin').innerHTML = '<small>Skin</small>' + sw(LOOK.skin, 'skin');
  $('avHair').innerHTML = '<small>Hair</small>' + sw(LOOK.hair, 'hair');
  $('avStyle').innerHTML = '<small>Style</small>' + LOOK.style.map(s => '<span class="chip' + (a.style === s ? ' sel' : '') + '" data-k="style" data-v="' + s + '">' + s + '</span>').join('');
  document.querySelectorAll('#avSkin .sw, #avHair .sw, #avStyle .chip').forEach(el => el.onclick = () => {
    Profile.data.avatar = Object.assign(avatarLook(), { [el.dataset.k]: el.dataset.k === 'style' ? el.dataset.v : +el.dataset.v });
    Profile.save(); Sfx.click(); buildPreview(); renderAvatarPicker();
  });
}

/* ================================================================ main loop */
let last = performance.now(), lastClockMin = -1, alarmT = 0;
function update(dt, tt) {
  const running = phase === 'play' && !paused && !busy;
  if (running) simMin += dt / G.secPerMin;
  if (phase === 'play') {
    if (running) tickGame(dt);
    updateHud();
    if (player.lying && !busy) { alarmT -= dt; if (alarmT <= 0) { Sfx.alarm(); alarmT = 4; } }
  }
  move(dt);

  updateMe(dt, tt); placeCamera(dt);
  if (loc) { sun.target.position.set(player.x, 0, player.z); const t = clamp((simMin - 360) / 780, 0, 1); sun.position.set(player.x - 14 + 28 * t, 15 + 3 * Math.sin(Math.PI * t), player.z + 7); }

  if (loc) {
    if (loc.update) loc.update(dt, tt);
    if (loc.id === 'office') {
      coworkers.forEach(c => {
        const u = c.g.userData;
        if (c.state === 'sit') {
          const lvl = 0.5 + 0.5 * Math.sin(tt * 0.35 + c.ph * 3), typing = (running ? 1 : 0) * clamp((lvl - 0.4) * 5, 0, 1);
          if (A.animate(c.g, tt, { typing })) {
            c.d.tick(); if (Math.random() < 0.5) c.d.tick();
            if (phase === 'play') Sfx.key(clamp(1 - Math.hypot(player.x - c.x, player.z - c.z) / 9, 0, 1));
          }
          c.flushT += dt; if (c.flushT > 0.1) { c.flushT = 0; c.d.flush(); }
          if (running && c.wander && D && D.clockIn !== null && (c.timer -= dt) <= 0) {
            c.state = 'out'; c.path = c.wander.map(p => p.slice()); u.seated = false;
            c.g.position.set(c.path[0][0], 0, c.path[0][1]); c.path.shift();
          }
        } else if (c.state === 'out') {
          const mv = running ? follow(c.g, c.path, 1.5, dt) : false; A.animate(c.g, tt, { moving: mv });
          if (running && !mv) { c.state = 'drink'; c.drink = 6; c.g.rotation.y = Math.PI; }
        } else if (c.state === 'drink') {
          A.animate(c.g, tt, {}); if (running && (c.drink -= dt) <= 0) { c.state = 'back'; c.path = c.wander.slice().reverse().map(p => p.slice()); }
        } else if (c.state === 'back') {
          const mv = running ? follow(c.g, c.path, 1.5, dt) : false; A.animate(c.g, tt, { moving: mv });
          if (running && !mv) { c.state = 'sit'; u.seated = true; c.g.position.set(c.x, 0, c.z + 0.78); c.g.rotation.y = Math.PI; c.timer = 50 + Math.random() * 80; }
        }
      });
      let dMove = false;
      if (running && danaPath) { dMove = follow(dana, danaPath, 1.6, dt); if (!dMove) danaPath = null; }
      if (!dMove) dana.rotation.y = Math.atan2(player.x - dana.position.x, player.z - dana.position.z);
      A.animate(dana, tt, { moving: dMove });
      ring.scale.setScalar(1 + Math.sin(tt * 3) * 0.08);
      if (myDesk) myDesk.screen.material.color.setScalar(0.9 + Math.sin(tt * 2) * 0.1);
    } else {
      loc.npcs.forEach(n => { if (n.kind !== 'ped') { n.g.rotation.y += (Math.atan2(player.x - n.g.position.x, player.z - n.g.position.z) - n.g.rotation.y) * 0.02; A.animate(n.g, tt, {}); } });
    }
    if (loc.id === 'apartment') { APT.alarm.set(simMin, player.lying); updateCat(dt, tt); }
    updateRain(dt);
    if (Math.floor(simMin) !== lastClockMin) { lastClockMin = Math.floor(simMin); wallClock.set(simMin); applyEnv(); }
    if (phase === 'play') drawMap();
  }
}
let clockT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; clockT += dt;
  update(dt, clockT);
  if (phase === 'title') { updatePreview(clockT); renderer.render(prevScene, prevCam); }
  else { if (!loc) scene.background.set(0x0f1420); renderer.render(scene, camera); }
  requestAnimationFrame(frame);
}

/* ================================================================ boot */
buildMe(); renderTitle();
// ped hooks so greeting can pause a pedestrian
LOCS.street.dyn.peds.forEach(p => { p.n.ped = p; });
requestAnimationFrame(frame);

window.__office = {
  get simMin() { return simMin; }, set simMin(v) { simMin = v; }, get phase() { return phase; }, get D() { return D; }, get G() { return G; }, get loc() { return loc; },
  player, ST, coworkers, dana, LOCS, HANDLERS, setLoc, Profile, earn, friend, openShop, startConvo, syncDecor, cakeM, tick(dt, n) { for (let i = 0; i < (n || 1); i++) { clockT += dt; update(dt, clockT); } }, get busy() { return busy; }, get chat() { return chat; }, get target() { return target; },
};
})();
