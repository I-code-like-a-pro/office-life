/* OfficeLife 3D asset library: detailed procedural models built with three.js.
   Every factory returns a THREE.Group (or an object holding one) with shadows enabled. */
(function () {
'use strict';
const T = THREE;

/* ---------- helpers ---------- */
const matCache = new Map();
function M(color, o) {
  o = o || {};
  const k = color + JSON.stringify(o);
  if (!matCache.has(k)) { const mm = Object.assign({ color, roughness: 0.7, metalness: 0.05 }, o); mm.metalness = Math.min(mm.metalness, 0.25); matCache.set(k, new T.MeshStandardMaterial(mm)); }   // no env map, so high metalness renders black
  return matCache.get(k);
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); t.anisotropy = 4; return t;
}
function B(w, h, d, m, x, y, z, parent) {
  const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m);
  mesh.position.set(x || 0, y || 0, z || 0);
  if (parent) parent.add(mesh);
  return mesh;
}
function cyl(rt, rb, h, m, x, y, z, parent, seg) {
  const mesh = new T.Mesh(new T.CylinderGeometry(rt, rb, h, seg || 20), m);
  mesh.position.set(x || 0, y || 0, z || 0);
  if (parent) parent.add(mesh);
  return mesh;
}
function rrect(w, h, r) {
  const s = new T.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/* rounded slab: w x d footprint, h tall, corner radius r, with a small bevel */
function slab(w, d, h, r, m) {
  const g = new T.ExtrudeGeometry(rrect(w, d, r), { depth: h, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2, curveSegments: 6 });
  g.translate(0, 0, -h / 2); g.rotateX(-Math.PI / 2);
  return new T.Mesh(g, m);
}
/* rounded panel: w x h face, d thick, faces +z */
function panel(w, h, d, r, m) {
  const g = new T.ExtrudeGeometry(rrect(w, h, r), { depth: d, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, -d / 2);
  return new T.Mesh(g, m);
}
function finish(obj) {
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return obj;
}
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- textures ---------- */
function screenTex(mine) {
  return canvasTex(256, 160, (g, w, h) => {
    g.fillStyle = mine ? '#0d2a1b' : '#0f1626'; g.fillRect(0, 0, w, h);
    g.fillStyle = mine ? '#166534' : '#1e293b'; g.fillRect(0, 0, w, 14);
    g.fillStyle = '#f87171'; g.fillRect(6, 4, 6, 6);
    g.fillStyle = '#fbbf24'; g.fillRect(16, 4, 6, 6);
    g.fillStyle = '#4ade80'; g.fillRect(26, 4, 6, 6);
    if (mine) {
      g.fillStyle = '#4ade80'; g.font = 'bold 16px monospace'; g.fillText('TICKETS (3)', 14, 36);
      g.fillStyle = '#86efac'; g.font = '12px monospace';
      g.fillText('BUG-101  cart total', 14, 60); g.fillText('BUG-114  admin panel', 14, 78); g.fillText('FEAT-120 getPrices()', 14, 96);
      g.fillStyle = '#4ade80'; g.fillRect(14, 116, 90, 18);
      return;
    }
    const cols = ['#7dd3fc', '#fca5a5', '#86efac', '#fde68a', '#c4b5fd', '#94a3b8'];
    let y = 26;
    while (y < h - 10) {
      const indent = 10 + Math.floor(Math.random() * 3) * 14;
      g.fillStyle = pick(cols); g.fillRect(indent, y, 20 + Math.random() * 120, 5);
      y += 12;
    }
  });
}
/* a monitor that really "types": tick() adds a character, flush() redraws if needed */
const SNIPPETS = ['const total = items.reduce((a, b) => a + b.price, 0);', 'function fetchUser(id) {', '  return db.users.find(u => u.id === id);', '}',
  'if (!user) throw new Error("not found");', 'export default function App() {', '  const [count, setCount] = useState(0);',
  'await api.post("/orders", payload);', 'for (const row of rows) {', '  console.log(row.name);', '// TODO: handle edge cases',
  'return res.status(200).json(data);', 'test("adds numbers", () => {', '  expect(add(1, 2)).toBe(3);', '});', 'import { useState } from "react";'];
function codeScreen() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 160;
  const g = c.getContext('2d'), tex = new T.CanvasTexture(c);
  const lines = []; let cur = '', target = pick(SNIPPETS), pos = 0, dirty = true;
  const KW = /^(\s*)(const|let|function|export|return|await|if|for|import|test)\b/;
  function line(s, y) {
    if (/^\s*\/\//.test(s)) { g.fillStyle = '#6b7a99'; g.fillText(s, 8, y); return; }
    const m = s.match(KW);
    if (m) { g.fillStyle = '#c4b5fd'; g.fillText(m[1] + m[2], 8, y); g.fillStyle = '#e2e8f0'; g.fillText(s.slice(m[0].length), 8 + g.measureText(m[0]).width, y); }
    else { g.fillStyle = '#e2e8f0'; g.fillText(s, 8, y); }
  }
  function draw() {
    g.fillStyle = '#0f1626'; g.fillRect(0, 0, 256, 160);
    g.fillStyle = '#1e293b'; g.fillRect(0, 0, 256, 14);
    g.fillStyle = '#f87171'; g.fillRect(6, 4, 6, 6); g.fillStyle = '#fbbf24'; g.fillRect(16, 4, 6, 6); g.fillStyle = '#4ade80'; g.fillRect(26, 4, 6, 6);
    g.font = '9px monospace'; let y = 26;
    lines.forEach(s => { line(s, y); y += 12; });
    line(cur + (Math.floor(Date.now() / 450) % 2 ? '▌' : ''), y);
  }
  function tick() {
    if (pos < target.length) cur += target[pos++];
    else { lines.push(cur); if (lines.length > 10) lines.shift(); cur = ''; target = pick(SNIPPETS); pos = 0; }
    dirty = true;
  }
  for (let i = 0; i < 6; i++) { cur = pick(SNIPPETS); lines.push(cur); } cur = '';
  return { tex, tick, flush() { if (dirty) { draw(); tex.needsUpdate = true; dirty = false; } }, mark() { dirty = true; } };
}
function keyTex() {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#2b2f3a'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#454b5c';
    for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(6 + c * 16.2, 6 + r * 17.5, 13, 13);
  });
}
function floorMaterial(w, d) {
  const t = canvasTex(256, 256, (g, s) => {
    g.fillStyle = '#4a5a78'; g.fillRect(0, 0, s, s);
    for (let i = 0; i < 5000; i++) { g.fillStyle = 'rgba(' + (Math.random() < .5 ? '255,255,255' : '0,0,0') + ',' + (Math.random() * .06) + ')'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
    g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(s / 2, 0, s / 2, s / 2); g.fillRect(0, s / 2, s / 2, s / 2);
  });
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(w / 2, d / 2);
  return new T.MeshStandardMaterial({ map: t, roughness: 0.95 });
}
function skylineTex() {
  return canvasTex(1024, 128, (g, w, h) => {
    const s = g.createLinearGradient(0, 0, 0, h);
    s.addColorStop(0, '#5aa2ee'); s.addColorStop(1, '#d6ecff');
    g.fillStyle = s; g.fillRect(0, 0, w, h);
    for (let layer = 0; layer < 2; layer++) {
      let x = 0;
      while (x < w) {
        const bw = 30 + Math.random() * 60, bh = 25 + Math.random() * (layer ? 50 : 80);
        g.fillStyle = layer ? '#8aa3c2' : '#5f7ba0'; g.fillRect(x, h - bh, bw, bh);
        g.fillStyle = 'rgba(255,255,255,.35)';
        for (let wy = h - bh + 6; wy < h - 4; wy += 9) for (let wx = x + 5; wx < x + bw - 5; wx += 9) if (Math.random() < .5) g.fillRect(wx, wy, 4, 5);
        x += bw + 4;
      }
    }
  });
}
function whiteboardTex() {
  return canvasTex(512, 300, (g, w, h) => {
    g.fillStyle = '#f8fafc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0f172a'; g.font = 'bold 22px sans-serif'; g.textAlign = 'center';
    g.fillText('SPRINT BOARD', w / 2, 32);
    const names = ['TO DO', 'DOING', 'DONE'], cols = ['#fde68a', '#bae6fd', '#bbf7d0'];
    names.forEach((n, i) => {
      const x = 14 + i * 165;
      g.fillStyle = '#e2e8f0'; g.fillRect(x, 48, 150, 240);
      g.fillStyle = '#334155'; g.font = 'bold 14px sans-serif'; g.fillText(n, x + 75, 66);
      for (let k = 0; k < 3 - (i === 1 ? 1 : 0); k++) {
        g.fillStyle = cols[(i + k) % 3]; g.fillRect(x + 12, 80 + k * 66, 126, 56);
        g.fillStyle = '#475569'; g.fillRect(x + 20, 92 + k * 66, 90, 4); g.fillRect(x + 20, 104 + k * 66, 70, 4); g.fillRect(x + 20, 116 + k * 66, 100, 4);
      }
    });
  });
}
function exitTex() {
  return canvasTex(256, 96, (g, w, h) => {
    g.fillStyle = '#15803d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.font = 'bold 56px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXIT', w / 2, h / 2 + 3);
  });
}

/* ---------- desk ---------- */
function desk(o) {
  o = o || {};
  const g = new T.Group();
  const wood = M(o.mine ? 0xc99a62 : 0xb58b5b, { roughness: 0.5 });
  const metal = M(0x2f3747, { metalness: 0.5, roughness: 0.4 });
  const top = slab(2.2, 1.1, 0.05, 0.05, wood); top.position.y = 0.76; g.add(top);
  B(0.05, 0.74, 0.9, metal, -1.03, 0.37, 0, g);
  B(2.0, 0.4, 0.03, M(0x3c4658), 0, 0.5, -0.45, g);                     // modesty panel
  // drawer pedestal
  const ped = B(0.5, 0.7, 0.85, M(0x3c4658), 0.78, 0.35, 0, g);
  for (let i = 0; i < 3; i++) {
    B(0.44, 0.2, 0.02, M(0x4a5670), 0.78, 0.13 + i * 0.22, 0.43, g);
    B(0.16, 0.025, 0.03, M(0xcbd5e1, { metalness: 0.7, roughness: 0.3 }), 0.78, 0.2 + i * 0.22, 0.45, g);
  }
  // monitor
  const mon = new T.Group(); mon.position.set(0, 0.785, -0.28); g.add(mon);
  cyl(0.13, 0.15, 0.02, M(0x1b1f2a, { metalness: 0.4 }), 0, 0.01, 0, mon);
  B(0.05, 0.22, 0.04, M(0x1b1f2a, { metalness: 0.4 }), 0, 0.12, -0.02, mon);
  const bezel = panel(0.98, 0.58, 0.04, 0.025, M(0x161a24, { roughness: 0.4 })); bezel.position.set(0, 0.5, -0.02); bezel.rotation.x = -0.06; mon.add(bezel);
  const cs = o.mine ? null : codeScreen();
  const screen = new T.Mesh(new T.PlaneGeometry(0.9, 0.5), new T.MeshBasicMaterial({ map: cs ? cs.tex : screenTex(true) }));
  screen.position.set(0, 0.5, 0.004); screen.rotation.x = -0.06; mon.add(screen);
  // keyboard, mouse
  const kb = B(0.46, 0.022, 0.17, M(0x2b2f3a), 0, 0.79, 0.28, g);
  const kbTop = new T.Mesh(new T.PlaneGeometry(0.44, 0.15), new T.MeshBasicMaterial({ map: keyTex() }));
  kbTop.rotation.x = -Math.PI / 2; kbTop.position.set(0, 0.802, 0.28); g.add(kbTop);
  const mouse = new T.Mesh(new T.SphereGeometry(0.035, 12, 8), M(0x2b2f3a)); mouse.scale.set(0.8, 0.5, 1.2); mouse.position.set(0.4, 0.808, 0.3); g.add(mouse);
  const pad = slab(0.28, 0.24, 0.006, 0.03, M(o.mine ? 0x166534 : 0x334155, { roughness: 0.95 })); pad.position.set(0.4, 0.789, 0.3); g.add(pad);   // mouse pad
  // mug
  const mug = new T.Group(); mug.position.set(-0.8, 0.8, 0.1); g.add(mug);
  cyl(0.04, 0.04, 0.09, M(o.mine ? 0x4ade80 : pick([0xf87171, 0x60a5fa, 0xfbbf24, 0xffffff])), 0, 0.045, 0, mug);
  const handle = new T.Mesh(new T.TorusGeometry(0.025, 0.007, 6, 12), M(0xffffff)); handle.position.set(0.045, 0.045, 0); mug.add(handle);
  cyl(0.034, 0.034, 0.004, M(0x3b2314), 0, 0.088, 0, mug);
  // papers + notebook
  const p1 = B(0.21, 0.012, 0.3, M(0xf8fafc), -0.65, 0.787, 0.2, g); p1.rotation.y = 0.2;
  const p2 = B(0.21, 0.008, 0.3, M(0xe2e8f0), -0.62, 0.8, 0.22, g); p2.rotation.y = -0.1;
  // lamp
  const lamp = new T.Group(); lamp.position.set(-0.9, 0.785, -0.35); g.add(lamp);
  cyl(0.07, 0.08, 0.02, metal, 0, 0.01, 0, lamp);
  cyl(0.012, 0.012, 0.32, metal, 0, 0.18, 0, lamp);
  const arm = cyl(0.01, 0.01, 0.25, metal, 0.07, 0.34, 0, lamp); arm.rotation.z = -1.0;
  const head = cyl(0.03, 0.07, 0.08, M(0xe2e8f0), 0.17, 0.42, 0, lamp); head.rotation.z = -0.4;
  const bulb = new T.Mesh(new T.SphereGeometry(0.02, 8, 6), new T.MeshBasicMaterial({ color: 0xfff3c4 })); bulb.position.set(0.19, 0.39, 0); lamp.add(bulb);
  if (o.mine) {
    const strip = new T.Mesh(new T.BoxGeometry(2.2, 0.025, 0.02), new T.MeshBasicMaterial({ color: 0x4ade80 }));
    strip.position.set(0, 0.75, 0.56); g.add(strip);
  }
  finish(g);
  screen.castShadow = false; kbTop.castShadow = false; bulb.castShadow = false;
  if (cs) cs.flush();
  return { group: g, screen, tick: cs ? cs.tick : () => {}, flush: cs ? cs.flush : () => {}, mark: cs ? cs.mark : () => {} };
}

/* ---------- chair ---------- */
function chair(o) {
  o = o || {};
  const g = new T.Group();
  const fab = M(o.color || 0x2d3a52, { roughness: 0.9 });
  const plastic = M(0x15181f, { roughness: 0.5 });
  const metal = M(0x8b93a5, { metalness: 0.7, roughness: 0.3 });
  const seat = slab(0.52, 0.5, 0.08, 0.09, fab); seat.position.y = 0.52; g.add(seat);
  const back = panel(0.48, 0.56, 0.07, 0.12, fab); back.position.set(0, 0.88, 0.26); back.rotation.x = -0.12; g.add(back);
  B(0.06, 0.2, 0.05, plastic, 0, 0.64, 0.24, g);
  cyl(0.035, 0.035, 0.28, metal, 0, 0.35, 0, g);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2, leg = B(0.3, 0.035, 0.05, plastic, Math.cos(a) * 0.15, 0.1, Math.sin(a) * 0.15, g);
    leg.rotation.y = -a;
    const wh = new T.Mesh(new T.SphereGeometry(0.03, 8, 6), plastic); wh.position.set(Math.cos(a) * 0.29, 0.04, Math.sin(a) * 0.29); g.add(wh);
  }
  [-1, 1].forEach(s => { B(0.04, 0.03, 0.26, plastic, s * 0.28, 0.67, 0.02, g); B(0.03, 0.14, 0.03, plastic, s * 0.28, 0.6, 0.02, g); });
  return finish(g);
}

/* ---------- people ---------- */
function limb(len, r, m) {
  const mesh = new T.Mesh(new T.CapsuleGeometry(r, Math.max(0.001, len - 2 * r), 4, 10), m);
  mesh.position.y = -len / 2; return mesh;
}
function person(o) {
  o = o || {};
  // unique: own (recolourable) materials, used for the player's avatar so recolouring never affects other people
  const mk = (c, r) => o.unique ? new T.MeshStandardMaterial({ color: c, roughness: r, metalness: 0.05 }) : M(c, { roughness: r });
  const skin = mk(o.skin || 0xf1c9a5, 0.6), shirt = mk(o.shirt || 0x3b82f6, 0.8);
  const pants = mk(o.pants || 0x2b3245, 0.85), hairM = mk(o.hair || 0x2b1d14, 0.9);
  const shoeM = M(0x15171d, { roughness: 0.5 });
  const root = new T.Group(), body = new T.Group(); root.add(body);

  const pelvis = new T.Mesh(new T.CapsuleGeometry(0.14, 0.12, 4, 12), pants); pelvis.rotation.z = Math.PI / 2; pelvis.scale.set(1, 1, 0.78); pelvis.position.y = 0.95; body.add(pelvis);
  const torso = new T.Mesh(new T.CapsuleGeometry(0.16, 0.3, 6, 14), shirt); torso.scale.set(1.3, 1, 0.8); torso.position.y = 1.23; body.add(torso);
  cyl(0.05, 0.055, 0.1, skin, 0, 1.56, 0, body, 10);
  // lanyard + badge
  const cord = B(0.02, 0.3, 0.006, M(o.lanyard || 0x4ade80), 0, 1.38, 0.13, body);
  B(0.085, 0.11, 0.01, M(0xffffff), 0, 1.2, 0.14, body);
  B(0.05, 0.015, 0.012, M(0x64748b), 0, 1.22, 0.145, body);

  // head
  const head = new T.Group(); head.position.y = 1.6; body.add(head);
  const skull = new T.Mesh(new T.SphereGeometry(0.115, 24, 18), skin); skull.scale.set(0.92, 1.12, 1); skull.position.y = 0.1; head.add(skull);
  const eyes = [];
  [-1, 1].forEach(s => {
    const eye = new T.Mesh(new T.SphereGeometry(0.014, 8, 6), M(0x111111)); eye.position.set(s * 0.04, 0.115, 0.1); head.add(eye); eyes.push(eye);
    const ear = new T.Mesh(new T.SphereGeometry(0.025, 8, 6), skin); ear.scale.set(0.5, 1, 0.8); ear.position.set(s * 0.105, 0.1, 0); head.add(ear);
  });
  const nose = new T.Mesh(new T.SphereGeometry(0.016, 8, 6), skin); nose.position.set(0, 0.09, 0.11); head.add(nose);
  const mouth = B(0.045, 0.007, 0.008, M(0x8b3a3a), 0, 0.045, 0.105, head);
  // hair: a short fringe on the front (so the eyes stay visible) and fuller coverage at the back
  const hairG = new T.Group(); hairG.scale.set(0.95, 1.14, 1.04); hairG.position.set(0, 0.105, -0.005); hairG.rotation.x = -0.18; head.add(hairG);
  hairG.add(new T.Mesh(new T.SphereGeometry(0.124, 24, 12, 0, Math.PI, 0, Math.PI * 0.4), hairM));
  hairG.add(new T.Mesh(new T.SphereGeometry(0.124, 24, 14, Math.PI, Math.PI, 0, Math.PI * 0.66), hairM));
  if (o.style === 'long') { const back = new T.Mesh(new T.CapsuleGeometry(0.1, 0.2, 4, 10), hairM); back.scale.set(1.1, 1, 0.6); back.position.set(0, 0.0, -0.075); head.add(back); }
  if (o.style === 'bun') { const bun = new T.Mesh(new T.SphereGeometry(0.06, 12, 10), hairM); bun.position.set(0, 0.22, -0.07); head.add(bun); }

  // arms
  const arms = [], elbows = [];
  [-1, 1].forEach(s => {
    const sh = new T.Group(); sh.position.set(s * 0.25, 1.45, 0); body.add(sh);
    sh.add(limb(0.3, 0.052, shirt));
    const el = new T.Group(); el.position.y = -0.3; sh.add(el);
    el.add(limb(0.27, 0.042, skin));
    const hand = new T.Mesh(new T.SphereGeometry(0.047, 10, 8), skin); hand.position.y = -0.3; el.add(hand);
    arms.push(sh); elbows.push(el);
  });
  // legs
  const legs = [], knees = [];
  [-1, 1].forEach(s => {
    const hip = new T.Group(); hip.position.set(s * 0.09, 0.93, 0); body.add(hip);
    hip.add(limb(0.46, 0.075, pants));
    const kn = new T.Group(); kn.position.y = -0.46; hip.add(kn);
    kn.add(limb(0.44, 0.06, pants));
    const shoe = new T.Mesh(new T.CapsuleGeometry(0.045, 0.1, 4, 8), shoeM); shoe.rotation.x = Math.PI / 2; shoe.scale.set(1.1, 1, 0.8); shoe.position.set(0, -0.46, 0.06); kn.add(shoe);
    legs.push(hip); knees.push(kn);
  });
  root.userData = { body, head, armL: arms[0], armR: arms[1], elbowL: elbows[0], elbowR: elbows[1], legL: legs[0], legR: legs[1], kneeL: knees[0], kneeR: knees[1], seated: !!o.seated, ph: Math.random() * 6, eyes, mouth, waveUntil: 0, mats: { skin, shirt, pants, hair: hairM } };
  return finish(root);
}
/* two-bone arm IK: points the upper arm / forearm so the hand reaches `target` (body space) */
const _d = new T.Vector3(), _dir = new T.Vector3(), _pole = new T.Vector3(), _n = new T.Vector3(), _u = new T.Vector3(),
      _e = new T.Vector3(), _f = new T.Vector3(), _down = new T.Vector3(0, -1, 0), _q1 = new T.Quaternion(), _q2 = new T.Quaternion();
function solveArm(sh, el, target, side) {
  const L1 = 0.3, L2 = 0.3, S = sh.position;
  _d.copy(target).sub(S);
  let D = _d.length(); const maxD = L1 + L2 - 0.004;
  if (D > maxD) { _d.multiplyScalar(maxD / D); D = maxD; }
  _dir.copy(_d).normalize();
  const cosA = (L1 * L1 + D * D - L2 * L2) / (2 * L1 * D);
  const alpha = Math.acos(Math.max(-1, Math.min(1, cosA)));
  _pole.set(side * 0.35, -1, -0.25).normalize();
  _n.crossVectors(_dir, _pole).normalize();
  _u.copy(_dir).applyAxisAngle(_n, alpha);
  _q1.setFromUnitVectors(_down, _u); sh.quaternion.copy(_q1);
  _e.copy(S).addScaledVector(_u, L1);
  _f.copy(S).add(_d).sub(_e).normalize();
  _q2.setFromUnitVectors(_down, _f);
  el.quaternion.copy(_q1).invert().multiply(_q2);
}
const _tgt = new T.Vector3();
/* animate: seated typing (returns true on a key tap), walking, or standing idle.
   o.typing 0..1 = how busy the hands are; o.moving = walking */
function animate(p, t, o) {
  o = o || {};
  const u = p.userData, ph = u.ph;
  let tapped = false;
  const bl = ((t * 0.33 + ph) % 1) < 0.035 ? 0.1 : 1;               // blink every few seconds
  u.eyes[0].scale.y = u.eyes[1].scale.y = bl;
  if (u.seated) {
    u.body.position.y = -0.41;
    u.legL.rotation.set(-Math.PI / 2, 0, 0.04); u.legR.rotation.set(-Math.PI / 2, 0, -0.04);
    u.kneeL.rotation.set(Math.PI / 2 * 0.97, 0, 0); u.kneeR.rotation.set(Math.PI / 2 * 0.97, 0, 0);
    const ty = o.typing || 0;
    const dipL = ty * Math.pow(Math.max(0, Math.sin(t * 13.3 + ph)), 3), dipR = ty * Math.pow(Math.max(0, Math.sin(t * 11.1 + ph * 1.7 + 1)), 3);
    [[u.armL, u.elbowL, -1, dipL, 0], [u.armR, u.elbowR, 1, dipR, 1]].forEach(([sh, el, s, dip, i]) => {
      _tgt.set(s * (0.11 + Math.sin(t * 2.3 + ph + i) * 0.02 * ty), 1.262 - dip * 0.02 + Math.sin(t * 1.1 + ph) * 0.002, 0.5 + Math.sin(t * 3 + i) * 0.015 * ty);
      solveArm(sh, el, _tgt, s);
      if (dip > 0.55 && !(u['hit' + i])) { u['hit' + i] = true; tapped = true; } else if (dip < 0.3) u['hit' + i] = false;
    });
    const look = Math.sin(t * 0.17 + ph * 3) > 0.92;                    // occasionally glance around
    u.head.rotation.y += ((look ? 0.7 : Math.sin(t * 0.4 + ph) * 0.06) - u.head.rotation.y) * 0.05;
    u.head.rotation.x = 0.12 + Math.sin(t * 0.7 + ph) * 0.03;
  } else if (o.moving) {
    const s = Math.sin(t * 7);
    u.body.position.y = Math.abs(Math.cos(t * 7)) * 0.025;
    u.legL.rotation.set(s * 0.6, 0, 0); u.legR.rotation.set(-s * 0.6, 0, 0);
    u.kneeL.rotation.set(Math.max(0, -s) * 0.8, 0, 0); u.kneeR.rotation.set(Math.max(0, s) * 0.8, 0, 0);
    u.armL.rotation.set(-s * 0.5, 0, 0.05); u.armR.rotation.set(s * 0.5, 0, -0.05);
    u.elbowL.rotation.set(-0.3, 0, 0); u.elbowR.rotation.set(-0.3, 0, 0);
    u.head.rotation.set(0, 0, 0);
  } else {
    u.body.position.y = Math.sin(t * 1.6 + ph) * 0.008;
    u.legL.rotation.set(0, 0, 0.02); u.legR.rotation.set(0, 0, -0.02);
    u.kneeL.rotation.set(0, 0, 0); u.kneeR.rotation.set(0, 0, 0);
    u.armL.rotation.set(0, 0, 0.05); u.armR.rotation.set(0, 0, -0.05);
    u.elbowL.rotation.set(-0.15, 0, 0); u.elbowR.rotation.set(-0.15, 0, 0);
    u.head.rotation.set(0, Math.sin(t * 0.5 + ph) * 0.15, 0);
  }
  if (t < u.waveUntil) {                                                // friendly wave
    u.armR.rotation.set(-2.7, 0, -0.25); u.elbowR.rotation.set(-0.5 + Math.sin(t * 11) * 0.45, 0, 0);
    u.mouth.scale.set(1.5, 2, 1);
  } else u.mouth.scale.set(1, 1, 1);
  return tapped;
}

/* ---------- plants, cooler, shelves, printer, board ---------- */
function plant(scale) {
  const g = new T.Group(), s = scale || 1;
  const pot = cyl(0.28, 0.2, 0.45, M(0xf1f5f9, { roughness: 0.4 }), 0, 0.225, 0, g, 24);
  cyl(0.29, 0.29, 0.04, M(0xe2e8f0), 0, 0.46, 0, g, 24);
  cyl(0.25, 0.25, 0.02, M(0x3b2314, { roughness: 1 }), 0, 0.46, 0, g, 16);
  const leafM = [M(0x2f8f4e), M(0x3ca55f), M(0x277a42)];
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2 + Math.random() * 0.4, tilt = 0.35 + Math.random() * 0.7, len = 0.45 + Math.random() * 0.5;
    const stem = new T.Group(); stem.rotation.y = a; stem.rotation.z = tilt; stem.position.y = 0.47; g.add(stem);
    cyl(0.01, 0.014, len, M(0x2d6a3e), 0, len / 2, 0, stem, 5);
    const leaf = new T.Mesh(new T.SphereGeometry(1, 10, 8), pick(leafM)); leaf.scale.set(0.09, 0.19 + Math.random() * 0.08, 0.025); leaf.position.y = len; stem.add(leaf);
  }
  g.scale.setScalar(s);
  return finish(g);
}
function cooler() {
  const g = new T.Group();
  B(0.42, 0.95, 0.4, M(0xe8edf5, { roughness: 0.4 }), 0, 0.475, 0, g);
  B(0.3, 0.03, 0.02, M(0x94a3b8), 0, 0.72, 0.205, g);
  B(0.05, 0.05, 0.05, M(0x3b82f6), -0.07, 0.68, 0.22, g); B(0.05, 0.05, 0.05, M(0xef4444), 0.07, 0.68, 0.22, g);
  B(0.12, 0.02, 0.1, M(0x64748b), 0, 0.55, 0.22, g);
  const bottle = cyl(0.17, 0.17, 0.42, M(0x7cc4ff, { transparent: true, opacity: 0.55, roughness: 0.1 }), 0, 1.18, 0, g, 20);
  const dome = new T.Mesh(new T.SphereGeometry(0.17, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x7cc4ff, { transparent: true, opacity: 0.55, roughness: 0.1 })); dome.position.y = 1.39; g.add(dome);
  cyl(0.15, 0.15, 0.28, M(0x38bdf8, { transparent: true, opacity: 0.5 }), 0, 1.08, 0, g, 20);
  return finish(g);
}
function bookshelf() {
  const g = new T.Group(), wood = M(0x7c5a3a, { roughness: 0.6 });
  B(0.04, 2.0, 0.34, wood, -0.8, 1.0, 0, g); B(0.04, 2.0, 0.34, wood, 0.8, 1.0, 0, g);
  B(1.64, 2.0, 0.02, M(0x5b4128), 0, 1.0, -0.16, g);
  const cols = [0xef4444, 0x3b82f6, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0x14b8a6, 0xec4899, 0xe2e8f0, 0x64748b];
  for (let i = 0; i < 5; i++) {
    const y = 0.02 + i * 0.49;
    B(1.6, 0.04, 0.34, wood, 0, y, 0, g);
    if (i === 4) break;
    let x = -0.74;
    while (x < 0.72) {
      const w = 0.03 + Math.random() * 0.04, h = 0.22 + Math.random() * 0.16;
      if (Math.random() < 0.1) { x += 0.12; continue; }
      const book = B(w, h, 0.22, M(pick(cols), { roughness: 0.8 }), x + w / 2, y + 0.02 + h / 2, 0, g);
      if (Math.random() < 0.08) book.rotation.z = 0.2;
      x += w + 0.004;
    }
  }
  return finish(g);
}
function printer() {
  const g = new T.Group();
  B(0.85, 0.7, 0.6, M(0x475569), 0, 0.35, 0, g);
  B(0.8, 0.28, 0.55, M(0xe5e7eb, { roughness: 0.4 }), 0, 0.84, 0, g);
  const lid = B(0.78, 0.04, 0.5, M(0xcbd5e1), 0, 1.0, 0, g);
  B(0.3, 0.015, 0.2, M(0x0f172a), 0.2, 0.86, 0.32, g);
  const led = new T.Mesh(new T.BoxGeometry(0.03, 0.02, 0.02), new T.MeshBasicMaterial({ color: 0x4ade80 })); led.position.set(-0.2, 0.92, 0.29); g.add(led);
  B(0.5, 0.012, 0.3, M(0xf8fafc), 0, 0.74, 0.35, g);
  return finish(g);
}
function whiteboard() {
  const g = new T.Group();
  B(2.9, 1.7, 0.05, M(0x94a3b8, { metalness: 0.5, roughness: 0.4 }), 0, 0, 0, g);
  const face = new T.Mesh(new T.PlaneGeometry(2.76, 1.56), new T.MeshBasicMaterial({ map: whiteboardTex() })); face.position.z = 0.028; g.add(face);
  B(2.0, 0.04, 0.08, M(0x94a3b8), 0, -0.88, 0.04, g);
  return finish(g);
}
function wallClock() {
  const g = new T.Group(), c = document.createElement('canvas'); c.width = c.height = 256;
  const tex = new T.CanvasTexture(c);
  function set(min) {
    const x = c.getContext('2d'); x.clearRect(0, 0, 256, 256);
    x.fillStyle = '#f8fafc'; x.beginPath(); x.arc(128, 128, 122, 0, 7); x.fill();
    x.fillStyle = '#0f172a';
    for (let i = 0; i < 12; i++) { const a = i / 12 * 6.283; x.fillRect(128 + Math.sin(a) * 104 - 3, 128 - Math.cos(a) * 104 - 3, 6, 6); }
    const h = (min / 60) % 12, m = min % 60;
    const hand = (a, l, w) => { x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(128, 128); x.lineTo(128 + Math.sin(a) * l, 128 - Math.cos(a) * l); x.stroke(); };
    x.strokeStyle = '#0f172a'; hand(h / 12 * 6.283, 62, 9); hand(m / 60 * 6.283, 92, 5);
    x.fillStyle = '#ef4444'; x.beginPath(); x.arc(128, 128, 7, 0, 7); x.fill();
    tex.needsUpdate = true;
  }
  const rim = cyl(0.36, 0.36, 0.05, M(0x1f2937), 0, 0, 0, g, 32); rim.rotation.x = Math.PI / 2;
  const face = new T.Mesh(new T.CircleGeometry(0.33, 32), new T.MeshBasicMaterial({ map: tex, transparent: true })); face.position.z = 0.03; g.add(face);
  set(9 * 60);
  return { group: g, set };
}
function ceilingLight() {
  const g = new T.Group();
  B(2.3, 0.05, 0.75, M(0xcbd5e1), 0, 0, 0, g);
  const p = new T.Mesh(new T.PlaneGeometry(2.1, 0.55), new T.MeshBasicMaterial({ color: 0xffffff })); p.rotation.x = Math.PI / 2; p.position.y = -0.03; g.add(p);
  return g;
}
function door() {
  const g = new T.Group(), frame = M(0x475569);
  B(0.15, 2.6, 0.35, frame, -2.05, 1.3, 0, g); B(0.15, 2.6, 0.35, frame, 2.05, 1.3, 0, g); B(4.25, 0.15, 0.35, frame, 0, 2.65, 0, g);
  const pivot = new T.Group(); pivot.position.set(-1.95, 0, -0.05); pivot.rotation.y = 1.15; g.add(pivot);
  const leaf = B(1.95, 2.5, 0.06, M(0x8b6b4a, { roughness: 0.5 }), 0.975, 1.25, 0, pivot);
  B(0.06, 0.06, 0.12, M(0xcbd5e1, { metalness: 0.8 }), 1.75, 1.05, 0, pivot);
  const sign = new T.Mesh(new T.PlaneGeometry(0.7, 0.26), new T.MeshBasicMaterial({ map: exitTex() })); sign.position.set(0, 2.95, -0.2); sign.rotation.y = Math.PI; g.add(sign);
  return finish(g);
}
function windowStrip(w, h) {
  const g = new T.Group();
  const sky = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: skylineTex() })); g.add(sky);
  const fm = M(0x44506a);
  B(w, 0.1, 0.08, fm, 0, h / 2, 0.03, g); B(w, 0.1, 0.08, fm, 0, -h / 2, 0.03, g);
  for (let x = -w / 2; x <= w / 2 + 0.01; x += 3.6) B(0.1, h, 0.08, fm, x, 0, 0.03, g);
  B(w, 0.12, 0.3, M(0xdfe6f2), 0, -h / 2 - 0.06, 0.12, g);                // sill
  return g;
}

window.Assets = { desk, chair, person, animate, plant, cooler, bookshelf, printer, whiteboard, wallClock, ceilingLight, door, windowStrip, floorMaterial, M, B, cyl, finish, slab, panel, canvasTex, pick, rrect };
})();
