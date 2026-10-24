/* OfficeLife props: apartment, street, lobby and break-room models. Extends window.Assets.
   Convention: everything faces +z unless noted, origin at floor level, centered on x/z. */
(function () {
'use strict';
const T = THREE, A = window.Assets;
const { M, B, cyl, finish, slab, panel, canvasTex, pick } = A;
const nightMats = [];          // materials whose emissive turns on at night (windows, street lamps)

const glass = () => M(0xbfe3ff, { transparent: true, opacity: 0.28, roughness: 0.05, metalness: 0.1 });
function bevelBox(w, h, d, m, x, y, z, parent) { return B(w, h, d, m, x, y, z, parent); }

/* ---------------------------------------------------------------- apartment */
function bed() {
  const g = new T.Group();
  const wood = M(0x8b6b4a, { roughness: 0.6 }), sheet = M(0xe8eef7, { roughness: 0.95 }), blanket = M(0x4f7bd9, { roughness: 0.95 }), pillow = M(0xffffff, { roughness: 0.95 });
  B(1.7, 0.3, 2.2, wood, 0, 0.2, 0, g);
  const mt = slab(1.55, 2.05, 0.22, 0.08, sheet); mt.position.set(0, 0.46, 0); g.add(mt);
  const bl = slab(1.58, 1.4, 0.1, 0.06, blanket); bl.position.set(0, 0.62, 0.34); g.add(bl);
  [-0.4, 0.4].forEach(x => { const p = slab(0.6, 0.38, 0.13, 0.08, pillow); p.position.set(x, 0.64, -0.8); g.add(p); });
  const hb = panel(1.8, 1.1, 0.1, 0.08, wood); hb.position.set(0, 0.75, -1.12); g.add(hb);
  return finish(g);
}
function wardrobe() {
  const g = new T.Group(), wood = M(0xd9c7a8, { roughness: 0.6 }), dark = M(0xb9a57f, { roughness: 0.6 });
  B(1.6, 2.1, 0.6, wood, 0, 1.05, 0, g);
  [-0.4, 0.4].forEach(x => { const d = panel(0.76, 1.95, 0.03, 0.03, dark); d.position.set(x, 1.05, 0.31); g.add(d); });
  B(0.03, 0.3, 0.04, M(0x555555, { metalness: 0.6 }), -0.06, 1.05, 0.34, g); B(0.03, 0.3, 0.04, M(0x555555, { metalness: 0.6 }), 0.06, 1.05, 0.34, g);
  return finish(g);
}
function alarmClock() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const tex = new T.CanvasTexture(c);
  function set(min, ringing) {
    const g = c.getContext('2d'), h = Math.floor(min / 60) % 24, m = Math.floor(min % 60);
    g.fillStyle = '#080a0d'; g.fillRect(0, 0, 128, 64);
    g.fillStyle = ringing ? '#ff5a5a' : '#ff3b3b'; g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'), 64, 34);
    tex.needsUpdate = true;
  }
  const g = new T.Group();
  B(0.22, 0.12, 0.1, M(0x22262e), 0, 0.06, 0, g);
  const face = new T.Mesh(new T.PlaneGeometry(0.18, 0.09), new T.MeshBasicMaterial({ map: tex })); face.position.set(0, 0.065, 0.052); g.add(face);
  set(390);
  return { group: g, set };
}
function nightstand() {
  const g = new T.Group(), wood = M(0x8b6b4a, { roughness: 0.6 });
  B(0.5, 0.5, 0.42, wood, 0, 0.25, 0, g); B(0.44, 0.18, 0.02, M(0xa07c58), 0, 0.3, 0.22, g); B(0.1, 0.02, 0.03, M(0xddd), 0, 0.3, 0.24, g);
  // small lamp
  cyl(0.08, 0.1, 0.03, M(0xeeeeee), -0.12, 0.515, 0, g);
  cyl(0.015, 0.015, 0.22, M(0xcccccc), -0.12, 0.63, 0, g);
  const sh = cyl(0.07, 0.12, 0.14, M(0xfff0c8, { emissive: 0x554422 }), -0.12, 0.78, 0, g);
  return finish(g);
}
function counter(len, opts) {
  opts = opts || {};
  const g = new T.Group();
  B(len, 0.88, 0.6, M(opts.body || 0xf1f5f9, { roughness: 0.5 }), 0, 0.44, 0, g);
  const top = slab(len + 0.04, 0.64, 0.05, 0.02, M(opts.top || 0x6b7280, { roughness: 0.3 })); top.position.set(0, 0.9, 0.01); g.add(top);
  for (let x = -len / 2 + 0.4; x < len / 2 - 0.2; x += 0.6) B(0.03, 0.5, 0.02, M(0xb0b8c4), x, 0.45, 0.31, g);
  return finish(g);
}
function stove() {
  const g = counter(0.7, { top: 0x2a2f3a });
  [[-0.17, -0.1], [0.17, -0.1], [-0.17, 0.12], [0.17, 0.12]].forEach(([x, z]) => cyl(0.08, 0.08, 0.012, M(0x111418), x, 0.935, z, g));
  B(0.5, 0.05, 0.02, M(0x888c94, { metalness: 0.7 }), 0, 0.76, 0.31, g);
  return g;
}
function fridge() {
  const g = new T.Group(), w = M(0xe9eef5, { roughness: 0.35, metalness: 0.2 });
  B(0.75, 1.85, 0.7, w, 0, 0.925, 0, g);
  B(0.75, 0.02, 0.02, M(0x9aa3b0), 0, 1.25, 0.36, g);
  B(0.03, 0.5, 0.04, M(0xaab2be, { metalness: 0.8 }), 0.3, 1.55, 0.37, g); B(0.03, 0.4, 0.04, M(0xaab2be, { metalness: 0.8 }), 0.3, 0.8, 0.37, g);
  return finish(g);
}
function coffeeMaker() {
  const g = new T.Group(), dk = M(0x20242c, { roughness: 0.4 });
  B(0.26, 0.34, 0.24, dk, 0, 0.17, 0, g); B(0.26, 0.05, 0.2, dk, 0, 0.36, 0.02, g);
  cyl(0.035, 0.035, 0.1, M(0x9ca3af, { metalness: 0.8 }), 0, 0.16, 0.14, g);
  cyl(0.045, 0.04, 0.09, M(0xffffff), 0, 0.045, 0.12, g);
  const led = new T.Mesh(new T.BoxGeometry(0.03, 0.02, 0.01), new T.MeshBasicMaterial({ color: 0x4ade80 })); led.position.set(0.07, 0.28, 0.125); g.add(led);
  return finish(g);
}
function simpleChair(color) {
  const g = new T.Group(), m = M(color || 0xa5865f, { roughness: 0.6 });
  B(0.42, 0.05, 0.42, m, 0, 0.45, 0, g); B(0.42, 0.5, 0.04, m, 0, 0.72, 0.2, g);
  [[-0.18, -0.18], [0.18, -0.18], [-0.18, 0.18], [0.18, 0.18]].forEach(([x, z]) => B(0.04, 0.45, 0.04, m, x, 0.225, z, g));
  return finish(g);
}
function diningTable(w, d) {
  const g = new T.Group(), m = M(0xb58b5b, { roughness: 0.5 });
  const top = slab(w, d, 0.05, 0.04, m); top.position.y = 0.74; g.add(top);
  [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => B(0.06, 0.72, 0.06, M(0x444b58), sx * (w / 2 - 0.08), 0.36, sz * (d / 2 - 0.08), g));
  return finish(g);
}
function laptop() {
  const g = new T.Group();
  B(0.34, 0.02, 0.24, M(0xaab2be, { metalness: 0.7, roughness: 0.3 }), 0, 0.01, 0, g);
  const scr = panel(0.34, 0.22, 0.015, 0.01, M(0xaab2be, { metalness: 0.7 })); scr.position.set(0, 0.13, -0.11); scr.rotation.x = -0.25; g.add(scr);
  const face = new T.Mesh(new T.PlaneGeometry(0.31, 0.19), new T.MeshBasicMaterial({ color: 0x1d4ed8 })); face.position.set(0, 0.13, -0.102); face.rotation.x = -0.25; g.add(face);
  return finish(g);
}
function sofa(w) {
  w = w || 2.1;
  const g = new T.Group(), fab = M(0x5b6b8a, { roughness: 0.95 }), dk = M(0x4b5a78, { roughness: 0.95 });
  const base = slab(w, 0.9, 0.35, 0.1, dk); base.position.y = 0.28; g.add(base);
  [-1, 1].forEach(s => { const c = slab(w / 2 - 0.12, 0.72, 0.16, 0.08, fab); c.position.set(s * (w / 4 - 0.04), 0.54, 0.08); g.add(c); });
  const back = panel(w, 0.55, 0.22, 0.1, fab); back.position.set(0, 0.78, -0.36); g.add(back);
  [-1, 1].forEach(s => { const a = slab(0.2, 0.9, 0.3, 0.08, dk); a.position.set(s * (w / 2 - 0.1), 0.58, 0); g.add(a); });
  [-1, 1].forEach(s => B(0.06, 0.12, 0.06, M(0x2a2f3a), s * (w / 2 - 0.12), 0.06, 0.38, g));
  return finish(g);
}
function tvUnit() {
  const g = new T.Group();
  B(1.7, 0.45, 0.42, M(0x2f3747, { roughness: 0.5 }), 0, 0.225, 0, g);
  const tv = panel(1.35, 0.78, 0.05, 0.02, M(0x0b0d12, { roughness: 0.3 })); tv.position.set(0, 0.88, 0); g.add(tv);
  const c = document.createElement('canvas'); c.width = 128; c.height = 72;
  const x = c.getContext('2d'), gr = x.createLinearGradient(0, 0, 128, 72); gr.addColorStop(0, '#1e3a8a'); gr.addColorStop(1, '#7c3aed'); x.fillStyle = gr; x.fillRect(0, 0, 128, 72);
  x.fillStyle = 'rgba(255,255,255,.7)'; x.font = 'bold 14px sans-serif'; x.fillText('NOW PLAYING', 10, 40);
  const scr = new T.Mesh(new T.PlaneGeometry(1.27, 0.71), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) })); scr.position.set(0, 0.88, 0.028); g.add(scr);
  return finish(g);
}
function rug(w, d, color) {
  const r = slab(w, d, 0.02, 0.15, M(color || 0x7c8db5, { roughness: 1 })); r.position.y = 0.012; r.castShadow = false; r.receiveShadow = true; return r;
}
function yogaMat() { const m = slab(0.65, 1.7, 0.03, 0.03, M(0x14b8a6, { roughness: 0.9 })); m.position.y = 0.02; m.receiveShadow = true; return m; }
function sink() {
  const g = new T.Group();
  B(0.7, 0.8, 0.45, M(0xe5e7eb, { roughness: 0.4 }), 0, 0.4, 0, g);
  const basin = slab(0.5, 0.35, 0.1, 0.1, M(0xffffff, { roughness: 0.2 })); basin.position.set(0, 0.82, 0.02); g.add(basin);
  cyl(0.015, 0.015, 0.2, M(0xc0c6d0, { metalness: 0.9, roughness: 0.2 }), 0, 0.95, -0.12, g);
  const mir = panel(0.6, 0.8, 0.02, 0.03, M(0xcfe6f5, { roughness: 0.05, metalness: 0.8 })); mir.position.set(0, 1.6, -0.2); g.add(mir);
  return finish(g);
}
function toilet() {
  const g = new T.Group(), w = M(0xffffff, { roughness: 0.25 });
  B(0.38, 0.38, 0.28, w, 0, 0.19, 0.12, g); B(0.4, 0.4, 0.16, w, 0, 0.6, -0.14, g);
  const bowl = slab(0.36, 0.45, 0.08, 0.15, w); bowl.position.set(0, 0.42, 0.1); g.add(bowl);
  return finish(g);
}
function shower() {
  const g = new T.Group();
  const tray = slab(1.1, 1.1, 0.06, 0.06, M(0xe5e7eb, { roughness: 0.3 })); tray.position.y = 0.03; g.add(tray);
  B(1.1, 2.0, 0.03, glass(), 0, 1.0, 0.55, g); B(0.03, 2.0, 1.1, glass(), -0.55, 1.0, 0, g);
  cyl(0.02, 0.02, 0.5, M(0xc0c6d0, { metalness: 0.9 }), 0.3, 1.9, -0.5, g); cyl(0.1, 0.1, 0.02, M(0xc0c6d0, { metalness: 0.9 }), 0.3, 1.65, -0.35, g);
  return finish(g);
}
function badgeRack() {
  const g = new T.Group();
  B(0.8, 0.35, 0.04, M(0x8b6b4a), 0, 1.5, 0, g);
  const bag = new T.Mesh(new T.CapsuleGeometry(0.17, 0.2, 4, 10), M(0x2d3a52, { roughness: 0.8 })); bag.scale.set(1, 1, 0.55); bag.position.set(-0.15, 1.2, 0.16); g.add(bag);
  B(0.12, 0.02, 0.16, M(0x4a5a78), -0.15, 1.38, 0.2, g);
  const card = new T.Mesh(new T.BoxGeometry(0.08, 0.11, 0.01), new T.MeshBasicMaterial({ color: 0x4ade80 })); card.position.set(0.22, 1.35, 0.05); g.add(card);
  B(0.012, 0.18, 0.006, M(0x4ade80), 0.22, 1.5, 0.045, g);
  g.userData.card = card; g.userData.bag = bag;
  return finish(g);
}
function wallArt(c1, c2) {
  const g = new T.Group();
  B(0.9, 0.62, 0.04, M(0x2a2f3a), 0, 0, 0, g);
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 90; const x = cv.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 128, 90); gr.addColorStop(0, c1 || '#f59e0b'); gr.addColorStop(1, c2 || '#ef4444'); x.fillStyle = gr; x.fillRect(0, 0, 128, 90);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(90, 30, 18, 0, 7); x.fill(); x.fillStyle = 'rgba(0,0,0,.25)'; x.beginPath(); x.moveTo(0, 90); x.lineTo(50, 40); x.lineTo(110, 90); x.fill();
  const p = new T.Mesh(new T.PlaneGeometry(0.82, 0.54), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) })); p.position.z = 0.022; g.add(p);
  return g;
}
function woodFloorMaterial(w, d) {
  const t = canvasTex(256, 256, (g, s) => {
    for (let i = 0; i < 8; i++) { g.fillStyle = ['#b98d5f', '#c2976a', '#ae8458', '#bd9163'][i % 4]; g.fillRect(0, i * 32, s, 32); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, i * 32, s, 2);
      const off = (i % 2) * 120 + 20; g.fillRect(off, i * 32, 2, 32); }
    for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * 0.05 + ')'; g.fillRect(Math.random() * s, Math.random() * s, 20, 1); }
  });
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(w / 2.5, d / 2.5);
  return new T.MeshStandardMaterial({ map: t, roughness: 0.6 });
}
function marbleMaterial(w, d) {
  const t = canvasTex(256, 256, (g, s) => {
    g.fillStyle = '#e4e6ea'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 30; i++) { g.strokeStyle = 'rgba(120,130,150,' + (0.08 + Math.random() * 0.12) + ')'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); g.moveTo(Math.random() * s, 0); g.bezierCurveTo(Math.random() * s, s * .3, Math.random() * s, s * .6, Math.random() * s, s); g.stroke(); }
    g.strokeStyle = 'rgba(80,90,110,.5)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s);
  });
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(w / 2.5, d / 2.5);
  return new T.MeshStandardMaterial({ map: t, roughness: 0.25, metalness: 0.1 });
}
function wallMaterial(color) { return new T.MeshStandardMaterial({ color: color, roughness: 0.95 }); }

/* ---------------------------------------------------------------- street */
const facadeCache = {};
function facadeTex(color, lit) {
  const k = color + (lit ? 'L' : 'D');
  if (facadeCache[k]) return facadeCache[k];
  const t = canvasTex(128, 128, (g, s) => {
    if (lit) { g.fillStyle = '#000'; g.fillRect(0, 0, s, s); }
    else { g.fillStyle = color; g.fillRect(0, 0, s, s); }
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const x = 6 + c * 31, y = 6 + r * 31;
      if (lit) { if (Math.random() < 0.45) { g.fillStyle = '#ffe3a6'; g.fillRect(x, y, 22, 22); } }
      else { const gr = g.createLinearGradient(x, y, x + 22, y + 22); gr.addColorStop(0, '#7fa6d6'); gr.addColorStop(1, '#3b5a88'); g.fillStyle = gr; g.fillRect(x, y, 22, 22); g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x, y, 22, 6); }
    }
  });
  t.wrapS = t.wrapT = T.RepeatWrapping;
  return (facadeCache[k] = t);
}
function building(w, h, d, color) {
  const mk = (rx, ry) => {
    const a = facadeTex(color, false).clone(), b = facadeTex(color, true).clone();
    a.repeat.set(rx, ry); b.repeat.set(rx, ry); a.needsUpdate = b.needsUpdate = true;
    const m = new T.MeshStandardMaterial({ map: a, emissiveMap: b, emissive: new T.Color(0xffe9b0), emissiveIntensity: 0, roughness: 0.8 });
    nightMats.push(m); return m;
  };
  const sx = mk(Math.max(1, d / 6), Math.max(1, h / 6)), sz = mk(Math.max(1, w / 6), Math.max(1, h / 6));
  const roof = new T.MeshStandardMaterial({ color: 0x6b7280, roughness: 1 });
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), [sx, sx, roof, roof, sz, sz]);
  mesh.position.y = h / 2; mesh.castShadow = true; mesh.receiveShadow = true;
  const g = new T.Group(); g.add(mesh); return g;
}
function tree() {
  const g = new T.Group();
  cyl(0.12, 0.17, 1.8, M(0x6b4a2b, { roughness: 1 }), 0, 0.9, 0, g, 8);
  [[0, 2.5, 0, 1.0], [0.5, 2.2, 0.2, 0.7], [-0.45, 2.3, -0.2, 0.75], [0, 3.1, 0, 0.7]].forEach(([x, y, z, r]) => {
    const s = new T.Mesh(new T.SphereGeometry(r, 12, 10), M(pick([0x3f9b5a, 0x358a4f, 0x4aa868]), { roughness: 0.9 })); s.position.set(x, y, z); g.add(s);
  });
  return finish(g);
}
function lamppost() {
  const g = new T.Group(), m = M(0x2a2f3a, { metalness: 0.5, roughness: 0.5 });
  cyl(0.06, 0.09, 4.2, m, 0, 2.1, 0, g, 8); const arm = B(0.9, 0.06, 0.06, m, 0.4, 4.2, 0, g);
  const head = new T.Mesh(new T.SphereGeometry(0.16, 10, 8), new T.MeshStandardMaterial({ color: 0xfff1c9, emissive: 0xffd88a, emissiveIntensity: 0 }));
  head.position.set(0.85, 4.12, 0); g.add(head); nightMats.push(head.material);
  return finish(g);
}
function car(color) {
  const g = new T.Group(), body = M(color || 0xdc2626, { roughness: 0.35, metalness: 0.4 });
  const lower = slab(1.8, 4.2, 0.55, 0.25, body); lower.position.y = 0.6; g.add(lower);
  const cab = slab(1.6, 2.2, 0.45, 0.2, body); cab.position.set(0, 1.05, 0.1); g.add(cab);
  const win = M(0x223044, { roughness: 0.1, metalness: 0.6 });
  B(1.62, 0.3, 1.9, win, 0, 1.08, 0.1, g);
  [[-0.9, -1.3], [0.9, -1.3], [-0.9, 1.3], [0.9, 1.3]].forEach(([x, z]) => { const w = cyl(0.33, 0.33, 0.25, M(0x14161a), x, 0.33, z, g, 14); w.rotation.z = Math.PI / 2; });
  [-0.6, 0.6].forEach(x => { B(0.3, 0.12, 0.05, new T.MeshBasicMaterial({ color: 0xfff6c8 }), x, 0.7, 2.1, g); B(0.3, 0.12, 0.05, new T.MeshBasicMaterial({ color: 0xff3030 }), x, 0.7, -2.1, g); });
  return finish(g);
}
function bench() {
  const g = new T.Group(), w = M(0x8b6b4a), m = M(0x2a2f3a, { metalness: 0.5 });
  B(1.6, 0.06, 0.4, w, 0, 0.45, 0, g); B(1.6, 0.4, 0.05, w, 0, 0.75, -0.2, g);
  [-0.7, 0.7].forEach(x => B(0.05, 0.45, 0.4, m, x, 0.22, 0, g));
  return finish(g);
}
function kiosk() {
  const g = new T.Group();
  B(2.6, 1.0, 1.2, M(0x7c4a2a, { roughness: 0.6 }), 0, 0.5, 0, g);
  const top = slab(2.7, 1.3, 0.06, 0.03, M(0xe5e7eb)); top.position.set(0, 1.02, 0.05); g.add(top);
  [-1.2, 1.2].forEach(x => B(0.06, 2.4, 0.06, M(0x2a2f3a), x, 1.2, 0.55, g));
  const aw = slab(2.9, 1.5, 0.06, 0.02, M(0xe11d48)); aw.position.set(0, 2.45, 0.15); aw.rotation.x = 0.12; g.add(aw);
  for (let i = -2; i <= 2; i += 2) { const st = slab(0.3, 1.5, 0.062, 0.01, M(0xffffff)); st.position.set(i * 0.5, 2.455, 0.15); st.rotation.x = 0.12; g.add(st); }
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.fillStyle = '#2a1a10'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#fbbf24'; x.font = 'bold 34px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('MORNING BREW', 128, 34);
  const sign = new T.Mesh(new T.PlaneGeometry(1.6, 0.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) })); sign.position.set(0, 1.95, 0.62); g.add(sign);
  [-0.6, 0.6].forEach(xx => cyl(0.045, 0.04, 0.09, M(0xffffff), xx, 1.09, 0.2, g));
  B(0.5, 0.35, 0.3, M(0x20242c), 0.9, 1.22, 0, g);
  return finish(g);
}
function officeFacade() {
  const g = new T.Group();
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d');
  const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, '#7fb2e5'); gr.addColorStop(1, '#2d4f7c'); x.fillStyle = gr; x.fillRect(0, 0, 512, 256);
  x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3;
  for (let i = 0; i <= 512; i += 64) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); }
  for (let j = 0; j <= 256; j += 48) { x.beginPath(); x.moveTo(0, j); x.lineTo(512, j); x.stroke(); }
  x.fillStyle = 'rgba(255,255,255,.15)'; x.beginPath(); x.moveTo(0, 256); x.lineTo(180, 0); x.lineTo(260, 0); x.lineTo(60, 256); x.fill();
  const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(2, 3);
  const mat = new T.MeshStandardMaterial({ map: t, roughness: 0.15, metalness: 0.5 });
  const tower = new T.Mesh(new T.BoxGeometry(26, 34, 14), mat); tower.position.set(0, 17, -7); tower.castShadow = true; g.add(tower);
  // entrance canopy + doors
  B(8, 0.3, 3, M(0x2f3747), 0, 4.2, 1.4, g);
  B(5, 3.8, 0.12, glass(), 0, 1.9, 0.04, g);
  B(0.1, 3.8, 0.14, M(0x1f2937), 0, 1.9, 0.05, g); B(5.1, 0.1, 0.14, M(0x1f2937), 0, 3.85, 0.05, g);
  [-2.5, 2.5].forEach(xx => B(0.12, 3.9, 0.16, M(0x1f2937), xx, 1.95, 0.05, g));
  const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96; const y = cv.getContext('2d');
  y.fillStyle = '#0f172a'; y.fillRect(0, 0, 512, 96); y.fillStyle = '#4ade80'; y.font = 'bold 54px sans-serif'; y.textAlign = 'center'; y.textBaseline = 'middle'; y.fillText('OfficeLife Inc.', 256, 50);
  const sign = new T.Mesh(new T.PlaneGeometry(9, 1.7), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) })); sign.position.set(0, 6.4, 0.06); g.add(sign);
  return g;
}
function apartmentFacade() {
  const g = building(14, 22, 12, '#b08968'); g.children[0].position.z = -6;
  const door = B(1.4, 2.4, 0.12, M(0x3b2a1e), 0, 1.2, 0.04, g);
  B(2.4, 0.2, 1.0, M(0x2f3747), 0, 2.6, 0.5, g);
  return g;
}

/* ---------------------------------------------------------------- lobby */
function receptionDesk(len) {
  const g = new T.Group();
  const front = panel(len, 1.05, 0.12, 0.05, M(0x2d3a52, { roughness: 0.4 })); front.position.set(0, 0.52, 0.5); g.add(front);
  const top = slab(len + 0.1, 0.9, 0.06, 0.04, M(0xe5e7eb, { roughness: 0.25 })); top.position.set(0, 1.08, 0.12); g.add(top);
  B(len, 0.9, 0.05, M(0x2d3a52), 0, 0.5, -0.32, g);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const x = cv.getContext('2d');
  x.fillStyle = 'rgba(0,0,0,0)'; x.clearRect(0, 0, 256, 64); x.fillStyle = '#4ade80'; x.font = 'bold 30px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('RECEPTION', 128, 34);
  const lg = new T.Mesh(new T.PlaneGeometry(1.6, 0.4), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv), transparent: true })); lg.position.set(0, 0.62, 0.57); g.add(lg);
  const mon = new T.Group(); mon.position.set(len / 4, 1.11, -0.1); g.add(mon);
  B(0.5, 0.32, 0.03, M(0x111418), 0, 0.28, 0, mon); B(0.04, 0.16, 0.04, M(0x111418), 0, 0.08, 0, mon);
  return finish(g);
}
function badgeReader() {
  const g = new T.Group();
  B(0.32, 1.05, 0.32, M(0x2f3747, { metalness: 0.4, roughness: 0.4 }), 0, 0.525, 0, g);
  const c = document.createElement('canvas'); c.width = 128; c.height = 96; const tex = new T.CanvasTexture(c);
  function set(msg, color) { const x = c.getContext('2d'); x.fillStyle = '#05080c'; x.fillRect(0, 0, 128, 96); x.fillStyle = color || '#4ade80'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    const lines = msg.split('\n'); lines.forEach((l, i) => x.fillText(l, 64, 48 + (i - (lines.length - 1) / 2) * 26)); tex.needsUpdate = true; }
  set('TAP\nBADGE');
  const scr = new T.Mesh(new T.PlaneGeometry(0.24, 0.18), new T.MeshBasicMaterial({ map: tex })); scr.position.set(0, 0.95, 0.165); scr.rotation.x = -0.3; g.add(scr);
  const pad = new T.Mesh(new T.BoxGeometry(0.16, 0.02, 0.16), new T.MeshBasicMaterial({ color: 0x38bdf8 })); pad.position.set(0, 1.06, 0.04); g.add(pad);
  finish(g); scr.castShadow = false;
  return { group: g, set };
}
function gateArm() {
  const g = new T.Group();
  B(1.6, 0.06, 0.06, new T.MeshBasicMaterial({ color: 0xef4444 }), 0, 0.95, 0, g);
  return g;
}
function glassBarrier(len) {
  const g = new T.Group();
  B(len, 1.0, 0.04, glass(), 0, 0.55, 0, g);
  B(len, 0.06, 0.08, M(0x8a93a3, { metalness: 0.8 }), 0, 1.06, 0, g);
  B(0.08, 1.1, 0.12, M(0x8a93a3, { metalness: 0.8 }), -len / 2, 0.55, 0, g); B(0.08, 1.1, 0.12, M(0x8a93a3, { metalness: 0.8 }), len / 2, 0.55, 0, g);
  return g;
}
function elevator(width) {
  width = width || 2.6;
  const g = new T.Group(), steel = M(0xb7bfcc, { metalness: 0.8, roughness: 0.25 });
  B(width + 0.5, 3.0, 0.15, M(0x2f3747), 0, 1.5, 0, g);
  [-1, 1].forEach(s => B(width / 2 - 0.02, 2.5, 0.06, steel, s * (width / 4), 1.25, 0.1, g));
  B(0.03, 2.5, 0.08, M(0x333b4a), 0, 1.25, 0.11, g);
  const c = document.createElement('canvas'); c.width = 128; c.height = 48; const x = c.getContext('2d');
  x.fillStyle = '#05080c'; x.fillRect(0, 0, 128, 48); x.fillStyle = '#fbbf24'; x.font = 'bold 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('▲ ▼', 64, 26);
  const ind = new T.Mesh(new T.PlaneGeometry(0.5, 0.2), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) })); ind.position.set(0, 2.75, 0.1); g.add(ind);
  B(0.12, 0.2, 0.06, M(0x20242c), width / 2 + 0.55, 1.2, 0.08, g);
  const btn = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), new T.MeshBasicMaterial({ color: 0xfbbf24 })); btn.position.set(width / 2 + 0.55, 1.22, 0.12); g.add(btn);
  return finish(g);
}
function officeCoffeeMachine() {
  const g = new T.Group(), dk = M(0x20242c, { roughness: 0.35 });
  B(0.55, 0.62, 0.42, dk, 0, 0.31, 0, g); B(0.55, 0.08, 0.42, M(0x3a4150), 0, 0.66, 0, g);
  const c = document.createElement('canvas'); c.width = 96; c.height = 48; const x = c.getContext('2d'); x.fillStyle = '#05080c'; x.fillRect(0, 0, 96, 48); x.fillStyle = '#4ade80'; x.font = 'bold 20px sans-serif'; x.textAlign = 'center'; x.fillText('READY', 48, 30);
  const scr = new T.Mesh(new T.PlaneGeometry(0.2, 0.1), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c) })); scr.position.set(0, 0.5, 0.215); g.add(scr);
  cyl(0.03, 0.03, 0.1, M(0x9ca3af, { metalness: 0.8 }), 0, 0.3, 0.17, g);
  cyl(0.05, 0.04, 0.1, M(0xffffff), 0, 0.05, 0.16, g);
  return finish(g);
}
function microwave() {
  const g = new T.Group();
  B(0.5, 0.3, 0.38, M(0xcfd5df, { metalness: 0.4, roughness: 0.4 }), 0, 0.15, 0, g);
  B(0.3, 0.2, 0.01, M(0x10151c), -0.07, 0.15, 0.195, g); B(0.1, 0.22, 0.01, M(0x39414f), 0.17, 0.15, 0.195, g);
  return finish(g);
}

/* ---------------------------------------------------------------- cozy extras: cat, decor, treats */
function cat(color) {
  const g = new T.Group(), fur = M(color || 0xe58a3a, { roughness: 0.95 }), white = M(0xfff4e6, { roughness: 0.95 });
  const body = new T.Mesh(new T.CapsuleGeometry(0.085, 0.24, 4, 10), fur); body.rotation.x = Math.PI / 2; body.position.set(0, 0.14, 0); g.add(body);
  const chest = new T.Mesh(new T.SphereGeometry(0.075, 10, 8), white); chest.position.set(0, 0.12, 0.13); g.add(chest);
  const head = new T.Group(); head.position.set(0, 0.2, 0.24); g.add(head);
  const sk = new T.Mesh(new T.SphereGeometry(0.075, 12, 10), fur); sk.scale.set(1.1, 0.95, 1); head.add(sk);
  [-1, 1].forEach(s => {
    const ear = new T.Mesh(new T.ConeGeometry(0.028, 0.055, 4), fur); ear.position.set(s * 0.048, 0.07, -0.01); ear.rotation.z = -s * 0.2; head.add(ear);
    const eye = new T.Mesh(new T.SphereGeometry(0.01, 6, 5), M(0x1a1a1a)); eye.position.set(s * 0.03, 0.015, 0.065); head.add(eye);
  });
  const nose = new T.Mesh(new T.SphereGeometry(0.009, 6, 5), M(0xf08a8a)); nose.position.set(0, -0.012, 0.075); head.add(nose);
  [[-0.05, -0.05], [0.05, -0.05], [-0.05, 0.1], [0.05, 0.1]].forEach(([x, z]) => { const l = new T.Mesh(new T.CapsuleGeometry(0.022, 0.07, 3, 6), z > 0 ? white : fur); l.position.set(x, 0.05, z); g.add(l); });
  const tail = new T.Group(); tail.position.set(0, 0.16, -0.18); g.add(tail);
  const t1 = new T.Mesh(new T.CapsuleGeometry(0.018, 0.2, 3, 6), fur); t1.position.set(0, 0.1, -0.03); t1.rotation.x = -0.5; tail.add(t1);
  g.userData = { head, tail, body };
  return finish(g);
}
function cake() {
  const g = new T.Group();
  cyl(0.28, 0.3, 0.02, M(0xffffff), 0, 0.01, 0, g, 20);
  cyl(0.2, 0.2, 0.1, M(0xf9d7a1), 0, 0.07, 0, g, 20); cyl(0.2, 0.2, 0.01, M(0xf9a8c9), 0, 0.125, 0, g, 20);
  cyl(0.15, 0.15, 0.09, M(0xf9d7a1), 0, 0.17, 0, g, 20); cyl(0.15, 0.15, 0.012, M(0xf9a8c9), 0, 0.22, 0, g, 20);
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1;
    cyl(0.008, 0.008, 0.06, M(0x7dd3fc), Math.cos(a) * 0.07, 0.255, Math.sin(a) * 0.07, g, 6);
    const f = new T.Mesh(new T.SphereGeometry(0.012, 6, 5), new T.MeshBasicMaterial({ color: 0xffd45a })); f.position.set(Math.cos(a) * 0.07, 0.295, Math.sin(a) * 0.07); g.add(f);
  }
  return finish(g);
}
function donuts() {
  const g = new T.Group();
  B(0.42, 0.06, 0.3, M(0xf1d6a8), 0, 0.03, 0, g);
  [[-0.12, -0.06], [0.12, -0.06], [0, 0.08], [-0.12, 0.08], [0.12, 0.08]].forEach(([x, z], i) => {
    const d = new T.Mesh(new T.TorusGeometry(0.05, 0.02, 8, 14), M(pick([0xf9a8c9, 0x8b5a3c, 0xfde68a, 0xa7f3d0]), { roughness: 0.6 })); d.rotation.x = Math.PI / 2; d.position.set(x, 0.08 + (z > 0 ? 0 : 0.0), z); g.add(d);
  });
  return finish(g);
}
/* decor: returns { group, loc, x, y, z, ry } positioned in world coordinates for that location */
function decorItem(id, desk) {
  const g = new T.Group(); let loc = 'office', x = desk.x, y = 0.785, z = desk.z, ry = 0;
  if (id === 'cactus') {
    cyl(0.06, 0.05, 0.08, M(0xe2725b), 0, 0.04, 0, g, 10); cyl(0.04, 0.04, 0.16, M(0x4a9d5b), 0, 0.16, 0, g, 10);
    const a = cyl(0.02, 0.02, 0.08, M(0x4a9d5b), 0.05, 0.18, 0, g, 8); a.rotation.z = -0.8;
    x += 0.82; z += -0.36;
  } else if (id === 'frame') {
    const f = panel(0.2, 0.15, 0.015, 0.01, M(0xf8f1e5)); f.position.set(0, 0.1, 0); f.rotation.x = -0.2; g.add(f);
    const cv = document.createElement('canvas'); cv.width = 80; cv.height = 60; const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 80, 60); gr.addColorStop(0, '#fcd5ce'); gr.addColorStop(1, '#a5d8ff'); c.fillStyle = gr; c.fillRect(0, 0, 80, 60);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(28, 28, 10, 0, 7); c.arc(52, 30, 10, 0, 7); c.fill(); c.fillStyle = '#f9a8c9'; c.beginPath(); c.arc(40, 44, 6, 0, 7); c.fill();
    const p = new T.Mesh(new T.PlaneGeometry(0.17, 0.12), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) })); p.position.set(0, 0.1, 0.011); p.rotation.x = -0.2; g.add(p);
    x += -0.5; z += -0.4;
  } else if (id === 'robot') {
    B(0.08, 0.08, 0.07, M(0x8ecae6), 0, 0.05, 0, g); B(0.06, 0.06, 0.06, M(0xffb703), 0, 0.12, 0, g);
    cyl(0.004, 0.004, 0.05, M(0x333), 0, 0.18, 0, g, 4); const b = new T.Mesh(new T.SphereGeometry(0.01, 6, 5), new T.MeshBasicMaterial({ color: 0xff6b6b })); b.position.set(0, 0.21, 0); g.add(b);
    [-1, 1].forEach(s => B(0.012, 0.012, 0.01, new T.MeshBasicMaterial({ color: 0x222 }), s * 0.016, 0.125, 0.032, g));
    x += 0.5; z += -0.42; ry = 0.3;
  } else if (id === 'lights') {
    const m = new T.MeshBasicMaterial({ color: 0xffe2a8 });
    for (let i = 0; i < 15; i++) { const u = i / 14, s = new T.Mesh(new T.SphereGeometry(0.014, 6, 5), m); s.position.set(-0.85 + u * 1.7, 0.82 - Math.sin(u * Math.PI) * 0.06 + 0.0, 0); g.add(s); }
    x += 0; y = 0.9; z += -0.3;
  } else if (id === 'rug_pink') {
    loc = 'apartment'; const r = slab(2.6, 1.8, 0.02, 0.2, M(0xf6b6cf, { roughness: 1 })); r.position.y = 0.014; r.castShadow = false; g.add(r); x = 0.3; y = 0; z = -0.3;
  } else if (id === 'poster') {
    loc = 'apartment'; const f = B(0.7, 0.95, 0.03, M(0x2a2f3a), 0, 0, 0, g);
    const cv = document.createElement('canvas'); cv.width = 70; cv.height = 95; const c = cv.getContext('2d');
    const gr = c.createLinearGradient(0, 0, 0, 95); gr.addColorStop(0, '#fbc2eb'); gr.addColorStop(1, '#a6c1ee'); c.fillStyle = gr; c.fillRect(0, 0, 70, 95);
    c.fillStyle = '#fff'; c.beginPath(); c.arc(35, 38, 16, 0, 7); c.fill(); c.fillStyle = 'rgba(80,60,140,.5)'; c.beginPath(); c.moveTo(0, 95); c.lineTo(30, 60); c.lineTo(70, 95); c.fill();
    const p = new T.Mesh(new T.PlaneGeometry(0.62, 0.87), new T.MeshBasicMaterial({ map: new T.CanvasTexture(cv) })); p.position.z = 0.017; g.add(p);
    x = -1.4; y = 1.55; z = -3.92;
  } else if (id === 'floor_lamp') {
    loc = 'apartment'; cyl(0.12, 0.14, 0.03, M(0x2a2f3a), 0, 0.015, 0, g, 12); cyl(0.015, 0.015, 1.5, M(0x2a2f3a), 0, 0.78, 0, g, 6);
    const sh = cyl(0.13, 0.2, 0.28, new T.MeshStandardMaterial({ color: 0xfff0c8, emissive: 0xffc977, emissiveIntensity: 0.9 }), 0, 1.6, 0, g, 14);
    x = -1.1; y = 0; z = 3.45;
  } else if (id === 'plant_big') {
    loc = 'apartment'; const p = A.plant(1.1); g.add(p); x = -4.55; y = 0; z = -1.0;
  }
  g.position.set(x, y, z); g.rotation.y = ry; finish(g);
  return { group: g, loc };
}

Object.assign(A, { bed, wardrobe, alarmClock, nightstand, counter, stove, fridge, coffeeMaker, simpleChair, diningTable, laptop, sofa, tvUnit, rug, yogaMat,
  sink, toilet, shower, badgeRack, wallArt, woodFloorMaterial, marbleMaterial, wallMaterial, building, tree, lamppost, car, bench, kiosk, officeFacade, apartmentFacade,
  receptionDesk, badgeReader, gateArm, glassBarrier, elevator, officeCoffeeMachine, microwave, nightMats, glass, cat, cake, donuts, decorItem });
})();
