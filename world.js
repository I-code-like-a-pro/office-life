/* OfficeLife world: builds the four locations (apartment, street, lobby, office).
   Each location is a THREE.Group with its own colliders, interactables, NPCs and spawn points. */
(function () {
'use strict';
const T = THREE, A = window.Assets;
const { M } = A;

function tagSprite(text, color, w) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(15,20,32,.8)'; g.fillRect(0, 0, 256, 64);
  g.fillStyle = color || '#fff'; g.font = 'bold 28px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 34);
  const s = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), depthTest: false }));
  s.scale.set(w || 1.4, (w || 1.4) / 4, 1); s.renderOrder = 10; return s;
}

function build(scene) {
  const locs = {};
  const skyMats = [];            // sky-plane materials tinted by the time of day
  const npcs = [];

  function newLoc(id, bounds, o) {
    o = o || {};
    const L = { id, bounds, group: new T.Group(), colliders: [], acts: [], npcs: [], spawns: {}, lights: [], interior: !!o.interior, update: null, dyn: {} };
    L.group.visible = false; scene.add(L.group);
    L.add = obj => { L.group.add(obj); return obj; };
    L.box = (w, h, d, m, x, y, z) => { const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), m); mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = !!o.wallShadows; L.group.add(mesh); return mesh; };
    L.solid = (w, d, x, z) => { const c = { x0: x - w / 2, x1: x + w / 2, z0: z - d / 2, z1: z + d / 2 }; L.colliders.push(c); return c; };
    L.act = a => { L.acts.push(a); return a; };
    L.place = (obj, x, y, z, ry) => { obj.position.set(x, y, z); if (ry) obj.rotation.y = ry; L.group.add(obj); return obj; };
    L.light = (color, intensity, dist, x, y, z) => { const p = new T.PointLight(color, intensity, dist, 1.6); p.position.set(x, y, z); p.visible = false; L.group.add(p); L.lights.push(p); return p; };
    L.npc = d => {
      const p = A.person({ shirt: d.shirt, skin: d.skin, hair: d.hair, style: d.style, lanyard: d.lanyard, seated: false });
      p.position.set(d.x, 0, d.z); p.rotation.y = d.yaw || 0;
      const t = tagSprite(d.name, d.tag || '#ffffff'); t.position.set(0, 2.0, 0); p.add(t);
      L.group.add(p);
      const n = { id: d.id, name: d.name, role: d.role || '', loc: id, g: p, x: d.x, z: d.z, yaw: d.yaw || 0, greeted: false, cd: 0, kind: d.kind || 'npc' };
      L.npcs.push(n); npcs.push(n); return n;
    };
    locs[id] = L; return L;
  }
  /* rectangular room shell with optional door gap on the front (+z) wall */
  function shell(L, hw, hd, h, wallMat, floorMat, gap) {
    const f = new T.Mesh(new T.PlaneGeometry(hw * 2, hd * 2), floorMat); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; L.add(f);
    const c = new T.Mesh(new T.PlaneGeometry(hw * 2, hd * 2), new T.MeshBasicMaterial({ color: 0xe6eaf1 })); c.rotation.x = Math.PI / 2; c.position.y = h; L.add(c);
    const t = 0.3;
    L.box(hw * 2 + t * 2, h, t, wallMat, 0, h / 2, -hd - t / 2);
    L.box(t, h, hd * 2, wallMat, -hw - t / 2, h / 2, 0);
    L.box(t, h, hd * 2, wallMat, hw + t / 2, h / 2, 0);
    if (gap) {
      const w1 = gap.x0 + hw, w2 = hw - gap.x1;
      L.box(w1, h, t, wallMat, -hw + w1 / 2, h / 2, hd + t / 2); L.box(w2, h, t, wallMat, hw - w2 / 2, h / 2, hd + t / 2);
      L.box(gap.x1 - gap.x0, h - gap.h, t, wallMat, (gap.x0 + gap.x1) / 2, gap.h + (h - gap.h) / 2, hd + t / 2);
    } else L.box(hw * 2 + t * 2, h, t, wallMat, 0, h / 2, hd + t / 2);
    const base = M(0x39425a);
    L.box(hw * 2, 0.1, 0.04, base, 0, 0.05, -hd + 0.02);
    L.box(0.04, 0.1, hd * 2, base, -hw + 0.02, 0.05, 0); L.box(0.04, 0.1, hd * 2, base, hw - 0.02, 0.05, 0);
  }
  const sky = (L, w, h, x, y, z) => { const s = A.windowStrip(w, h); s.position.set(x, y, z); L.add(s); skyMats.push(s.children[0].material); return s; };

  /* =============================================================== APARTMENT */
  const apt = newLoc('apartment', { x0: -5, x1: 5, z0: -4, z1: 4 }, { interior: true });
  shell(apt, 5, 4, 2.7, A.wallMaterial(0xf0e6d6), A.woodFloorMaterial(10, 8), { x0: 2.4, x1: 3.6, h: 2.15 });
  sky(apt, 2.6, 1.1, -3.3, 1.75, -3.84); sky(apt, 2.0, 1.1, 0.6, 1.75, -3.84);
  // front door
  apt.box(1.2, 2.15, 0.08, M(0x7c5a3a, { roughness: 0.5 }), 3.0, 1.075, 3.96);
  apt.box(1.36, 0.08, 0.12, M(0x3b2a1e), 3.0, 2.19, 3.98); apt.box(0.08, 2.2, 0.12, M(0x3b2a1e), 2.36, 1.1, 3.98); apt.box(0.08, 2.2, 0.12, M(0x3b2a1e), 3.64, 1.1, 3.98);
  apt.box(0.06, 0.06, 0.1, M(0xd4af37, { metalness: 0.8 }), 3.45, 1.05, 3.88);
  // bedroom
  apt.place(A.bed(), -3.3, 0, -2.85); apt.solid(1.8, 2.3, -3.3, -2.85);
  const ns = A.nightstand(); apt.place(ns, -4.55, 0, -3.7); apt.solid(0.5, 0.45, -4.55, -3.7);
  const alarm = A.alarmClock(); alarm.group.position.set(-4.45, 0.5, -3.65); apt.add(alarm.group);
  apt.place(A.wardrobe(), -4.7, 0, 0.6, Math.PI / 2); apt.solid(0.62, 1.65, -4.7, 0.6);
  // bathroom
  const tile = new T.Mesh(new T.PlaneGeometry(3, 2.5), new T.MeshStandardMaterial({ color: 0xcfe0ea, roughness: 0.3 })); tile.rotation.x = -Math.PI / 2; tile.position.set(3.5, 0.012, -2.75); tile.receiveShadow = true; apt.add(tile);
  apt.box(2.0, 2.7, 0.12, A.wallMaterial(0xdfe7ef), 4.0, 1.35, -1.5); apt.solid(2.0, 0.14, 4.0, -1.5);
  apt.box(0.12, 2.7, 2.5, A.wallMaterial(0xdfe7ef), 2.0, 1.35, -2.75); apt.solid(0.14, 2.5, 2.0, -2.75);
  apt.place(A.shower(), 4.4, 0, -3.35); apt.solid(1.1, 1.1, 4.4, -3.35);
  apt.place(A.sink(), 3.0, 0, -3.72); apt.solid(0.7, 0.45, 3.0, -3.72);
  apt.place(A.toilet(), 2.4, 0, -2.5, Math.PI / 2); apt.solid(0.5, 0.45, 2.4, -2.5);
  // kitchen
  apt.place(A.fridge(), 4.6, 0, -0.55, -Math.PI / 2);
  const cA = A.counter(1.0); apt.place(cA, 4.7, 0, 0.45, -Math.PI / 2);
  const cm = A.coffeeMaker(); cm.position.set(4.75, 0.92, 0.45); cm.rotation.y = -Math.PI / 2; apt.add(cm);
  apt.place(A.stove(), 4.7, 0, 1.3, -Math.PI / 2);
  apt.place(A.counter(1.2), 4.7, 0, 2.25, -Math.PI / 2);
  apt.solid(0.7, 3.9, 4.65, 1.0);
  const table = A.diningTable(1.4, 0.8); apt.place(table, 1.8, 0, 1.0); apt.solid(1.5, 0.9, 1.8, 1.0);
  apt.place(A.simpleChair(), 1.8, 0, 1.75); apt.place(A.simpleChair(), 1.8, 0, 0.25, Math.PI);
  const lp = A.laptop(); lp.position.set(1.5, 0.765, 1.05); apt.add(lp);
  const rack = A.badgeRack(); apt.place(rack, 4.4, 0, 3.92, Math.PI);
  // living area
  apt.place(A.rug(3.2, 2.3, 0x7c8db5), -3.5, 0, 2.6);
  apt.place(A.tvUnit(), -4.75, 0, 2.6, Math.PI / 2); apt.solid(0.5, 1.8, -4.75, 2.6);
  apt.place(A.sofa(2.1), -2.5, 0, 2.6, -Math.PI / 2); apt.solid(1.0, 2.2, -2.5, 2.6);
  apt.place(A.yogaMat(), -0.4, 0, 2.3);
  const art = A.wallArt(); art.position.set(-0.8, 1.7, 3.93); art.rotation.y = Math.PI; apt.add(art);
  apt.light(0xffe8c0, 0.45, 16, 0, 2.3, 0); apt.light(0xffd9a0, 0.3, 8, -3.3, 1.6, -2.4); apt.light(0xffe8c0, 0.3, 8, 3.2, 2.2, 2.5);
  apt.spawns.bed = { x: -1.8, z: -2.4, yaw: 0.9 }; apt.spawns.door = { x: 3.0, z: 3.0, yaw: Math.PI }; apt.spawns.street = { x: 3.0, z: 3.0, yaw: Math.PI };
  apt.act({ id: 'bed', x: -2.1, z: -2.55, r: 1.5 }); apt.act({ id: 'wardrobe', x: -3.9, z: 0.6, r: 1.3 });
  apt.act({ id: 'sink', x: 3.0, z: -3.0, r: 1.0 }); apt.act({ id: 'shower', x: 4.2, z: -2.4, r: 0.9 });
  apt.act({ id: 'fridge', x: 3.9, z: -0.4, r: 1.0 }); apt.act({ id: 'coffee_home', x: 3.95, z: 0.55, r: 0.8 });
  apt.act({ id: 'laptop', x: 1.8, z: 1.0, r: 1.3 }); apt.act({ id: 'badge', x: 4.4, z: 3.2, r: 1.0 });
  apt.act({ id: 'door', x: 3.0, z: 3.3, r: 1.0 }); apt.act({ id: 'sofa', x: -1.6, z: 2.6, r: 1.3 }); apt.act({ id: 'mat', x: -0.4, z: 2.3, r: 1.0 });
  const catG = A.cat(0xe58a3a); catG.position.set(-1.2, 0, 0.5); apt.add(catG);
  const catAct = apt.act({ id: 'cat', x: -1.2, z: 0.5, r: 1.3 });
  apt.dyn = { alarm, rack, doorBox: null, cat: { g: catG, act: catAct, state: 'idle', t: 2, tx: -1.2, tz: 0.5, nap: null } };

  /* =============================================================== STREET */
  const st = newLoc('street', { x0: -3.1, x1: 3.1, z0: -78.5, z1: 7 });
  const ground = new T.Mesh(new T.PlaneGeometry(260, 260), new T.MeshStandardMaterial({ color: 0x59606e, roughness: 1 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.03; ground.receiveShadow = true; st.add(ground);
  const swTex = A.canvasTex(128, 128, (g, s) => { g.fillStyle = '#a4a9b3'; g.fillRect(0, 0, s, s); g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 3; g.strokeRect(0, 0, s, s); for (let i = 0; i < 400; i++) { g.fillStyle = 'rgba(0,0,0,' + Math.random() * .05 + ')'; g.fillRect(Math.random() * s, Math.random() * s, 2, 2); } });
  swTex.wrapS = swTex.wrapT = T.RepeatWrapping;
  function strip(x0, x1, z0, z1, tex, y) {
    const t = tex.clone(); t.needsUpdate = true; t.repeat.set((x1 - x0) / 2, (z1 - z0) / 2);
    const m = new T.Mesh(new T.PlaneGeometry(x1 - x0, z1 - z0), new T.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; st.add(m); return m;
  }
  strip(-3.4, 3.2, -84, 9, swTex, 0.002); strip(10.5, 14.5, -84, 9, swTex, 0.002);
  const roadTex = A.canvasTex(128, 256, (g, w, h) => { g.fillStyle = '#2c3038'; g.fillRect(0, 0, w, h); for (let i = 0; i < 1500; i++) { g.fillStyle = 'rgba(255,255,255,' + Math.random() * .04 + ')'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    g.fillStyle = '#e8e2b0'; g.fillRect(w / 2 - 2, 0, 4, 90); g.fillRect(w / 2 - 2, 128, 4, 90); g.fillStyle = 'rgba(255,255,255,.7)'; g.fillRect(4, 0, 3, h); g.fillRect(w - 7, 0, 3, h); });
  roadTex.wrapS = roadTex.wrapT = T.RepeatWrapping; roadTex.repeat.set(1, 28);
  const road = new T.Mesh(new T.PlaneGeometry(7.3, 105), new T.MeshStandardMaterial({ map: roadTex, roughness: 0.95 })); road.rotation.x = -Math.PI / 2; road.position.set(6.85, 0.001, -38); road.receiveShadow = true; st.add(road);
  // curb
  st.box(0.25, 0.14, 100, M(0x8d929c), 3.3, 0.07, -38);
  // buildings left and right
  const bcol = ['#9b8a7a', '#7d8aa0', '#a5826b', '#6f7f8f', '#8a7a96', '#b09a7a'];
  let z = 3; let k = 0;
  while (z - 9 > -78) { const w = 9 + (k * 5) % 6, h = 12 + (k * 7) % 14; const b = A.building(10, h, w, bcol[k % 6]); st.place(b, -3.6 - 5, 0, z - w / 2); z -= w + 0.6; k++; }
  z = 20; k = 2;
  while (z > -96) { const w = 10 + (k * 3) % 5, h = 14 + (k * 5) % 20; const b = A.building(10, h, w, bcol[(k + 2) % 6]); st.place(b, 14.9 + 5, 0, z - w / 2); z -= w + 1.0; k++; }
  // buildings behind the start and the office
  const home = A.apartmentFacade(); st.place(home, 0, 0, 6, Math.PI);
  const off = A.officeFacade(); st.place(off, 0, 0, -80);
  // trees, lamps, benches
  [-5, -19, -33, -47, -61, -73].forEach((zz, i) => { const t = A.tree(); st.place(t, 2.7, 0, zz); st.solid(0.5, 0.5, 2.7, zz); const t2 = A.tree(); st.place(t2, 12.7, 0, zz - 5); });
  [-11, -26, -41, -56, -70].forEach(zz => { st.place(A.lamppost(), 3.0, 0, zz, Math.PI); });
  [-12, -50, -64].forEach(zz => { st.place(A.bench(), -2.5, 0, zz, Math.PI / 2); st.solid(0.5, 1.6, -2.5, zz); });
  // coffee kiosk
  const kiosk = A.kiosk(); st.place(kiosk, -2.45, 0, -30, Math.PI / 2); st.solid(1.4, 2.8, -2.4, -30);
  st.npc({ id: 'barista', name: 'Barista', role: 'Morning Brew', x: -2.45, z: -30, yaw: Math.PI / 2, shirt: 0x78350f, skin: 0xe0ac69, hair: 0x2a1a10, style: 'bun', tag: '#fbbf24' });
  // traffic
  const cars = [];
  [[5.1, -1, 0xdc2626, 8], [5.1, -1, 0x2563eb, 9.5], [5.1, -1, 0xe5e7eb, 7.5], [8.7, 1, 0xfbbf24, 8.5], [8.7, 1, 0x16a34a, 7], [8.7, 1, 0x111827, 10]].forEach(([x, dir, col, sp], i) => {
    const c = A.car(col); c.position.set(x, 0, dir < 0 ? -10 - i * 28 : 10 - (i - 3) * 30 ); c.rotation.y = dir < 0 ? Math.PI : 0; st.add(c); cars.push({ g: c, dir, sp });
  });
  // pedestrians
  const peds = [];
  [['ped1', 'Rosa', 0xf59e0b, 0xc68642, 0x1a1210, 'long', -1.6, [-70, -4], 1.1], ['ped2', 'Mr. Chen', 0x475569, 0xf1c9a5, 0x444444, 'short', 1.4, [-65, -6], 0.9], ['ped3', 'Jo (jogger)', 0x22c55e, 0x8d5524, 0x111111, 'short', 0.2, [-72, -3], 2.8]].forEach(([id, name, shirt, skin, hair, style, x, rng, sp], i) => {
    const n = st.npc({ id, name, role: 'pedestrian', x, z: rng[0] + (rng[1] - rng[0]) * (0.3 + 0.25 * i), yaw: Math.PI, shirt, skin, hair, style, kind: 'ped' });
    peds.push({ n, rng, sp, dir: i % 2 ? 1 : -1, pause: 0 });
  });
  st.dyn = { cars, peds };
  st.update = (dt, t) => {
    cars.forEach(c => { c.g.position.z += c.dir * c.sp * dt; if (c.dir < 0 && c.g.position.z < -100) c.g.position.z = 20; if (c.dir > 0 && c.g.position.z > 20) c.g.position.z = -100; });
    peds.forEach(p => {
      const g = p.n.g;
      if (p.pause > 0) { p.pause -= dt; A.animate(g, t, {}); return; }
      g.position.z += p.dir * p.sp * dt;
      if (g.position.z < p.rng[0]) p.dir = 1; if (g.position.z > p.rng[1]) p.dir = -1;
      g.rotation.y = p.dir > 0 ? 0 : Math.PI; A.animate(g, t * (p.sp > 2 ? 1.7 : 1), { moving: true });
    });
  };
  st.light(0xffffff, 0, 1, 0, 0, 0);
  st.spawns.apartment = { x: 0, z: 4.6, yaw: 0 }; st.spawns.office = { x: 0, z: -76.5, yaw: Math.PI };
  st.act({ id: 'home_door', x: 0, z: 5.4, r: 2.0 }); st.act({ id: 'office_door', x: 0, z: -77.4, r: 2.4 }); st.act({ id: 'kiosk', x: -0.9, z: -30, r: 1.8 });

  /* =============================================================== LOBBY */
  const lb = newLoc('lobby', { x0: -7, x1: 7, z0: -5, z1: 5 }, { interior: true });
  shell(lb, 7, 5, 4.2, A.wallMaterial(0xdfe3ea), A.marbleMaterial(14, 10), { x0: -1.6, x1: 1.6, h: 3.0 });
  lb.box(0.1, 3.0, 0.08, M(0x1f2937), -1.6, 1.5, 5.0); lb.box(0.1, 3.0, 0.08, M(0x1f2937), 1.6, 1.5, 5.0); lb.box(3.2, 0.1, 0.08, M(0x1f2937), 0, 2.98, 5.0);
  lb.box(3.1, 3.0, 0.04, A.glass(), 0, 1.5, 5.02);
  lb.box(14, 4.2, 0.05, M(0x2f3747), 0, 2.1, -4.95); lb.box(5.5, 0.2, 0.3, M(0x39425a), 0, 3.9, -4.85);
  const elev = A.elevator(2.6); lb.place(elev, 0, 0, -4.85); lb.solid(3.2, 0.3, 0, -4.85);
  const lg = tagSprite('OfficeLife Inc.', '#4ade80', 3.2); lg.position.set(-4.5, 2.9, -4.7); lb.add(lg);
  const wl = A.wallArt('#38bdf8', '#6366f1'); wl.position.set(5, 2.2, -4.9); lb.add(wl);
  const rdesk = A.receptionDesk(3.2); lb.place(rdesk, -5.6, 0, 1.5, Math.PI / 2); lb.solid(1.4, 3.3, -5.6, 1.5);
  lb.npc({ id: 'hana', name: 'Hana', role: 'Receptionist', x: -6.5, z: 1.5, yaw: Math.PI / 2, shirt: 0x6d28d9, skin: 0xf1c9a5, hair: 0x1a1210, style: 'bun', tag: '#c4b5fd', lanyard: 0x6d28d9 });
  lb.npc({ id: 'okafor', name: 'Mr. Okafor', role: 'Security', x: 2.9, z: 0.4, yaw: Math.PI, shirt: 0x1f2937, skin: 0x8d5524, hair: 0x111111, style: 'short', tag: '#93c5fd', lanyard: 0xfbbf24 });
  // access barrier
  const gl = A.glassBarrier(6.2); lb.place(gl, -3.9, 0, -1.2); lb.solid(6.2, 0.2, -3.9, -1.2);
  const gr = A.glassBarrier(5.0); lb.place(gr, 4.5, 0, -1.2); lb.solid(5.0, 0.2, 4.5, -1.2);
  const reader = A.badgeReader(); lb.place(reader.group, 1.45, 0, -1.2); lb.solid(0.4, 0.4, 1.45, -1.2);
  const arm = A.gateArm(); arm.position.set(0.1, 0, -1.2); lb.add(arm);
  const gateCol = { x0: -0.8, x1: 1.0, z0: -1.3, z1: -1.1, dynamic: true }; lb.colliders.push(gateCol);
  [[-4.8, 3.9], [5.2, 3.6]].forEach(([x, zz]) => { const sf = A.sofa(2.1); lb.place(sf, x, 0, zz, x < 0 ? 0 : Math.PI); lb.solid(2.2, 1.0, x, zz); });
  [[-6.3, 4.3], [6.3, 4.3], [-6.3, -3.6], [6.3, -3.6], [-3.2, -4.2]].forEach(([x, zz]) => { const p = A.plant(1.3); lb.place(p, x, 0, zz); lb.solid(0.7, 0.7, x, zz); });
  lb.light(0xffffff, 0.4, 20, 0, 3.8, 1.5); lb.light(0xffffff, 0.3, 18, 0, 3.8, -3);
  lb.spawns.street = { x: 0, z: 3.6, yaw: 0 }; lb.spawns.elevator = { x: 0, z: -3.3, yaw: Math.PI };
  lb.act({ id: 'gate', x: 1.45, z: -0.2, r: 1.5 }); lb.act({ id: 'elevator_up', x: 0, z: -3.6, r: 1.8 }); lb.act({ id: 'street_door', x: 0, z: 4.2, r: 1.6 });
  lb.dyn = { arm, gateCol, reader };

  /* =============================================================== OFFICE */
  const ROOM = { x: 14, z: 9 };
  const of = newLoc('office', { x0: -ROOM.x, x1: ROOM.x, z0: -ROOM.z, z1: ROOM.z }, { interior: true, wallShadows: false });
  const floor = new T.Mesh(new T.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), A.floorMaterial(ROOM.x * 2, ROOM.z * 2)); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; of.add(floor);
  const ceil = new T.Mesh(new T.PlaneGeometry(ROOM.x * 2, ROOM.z * 2), new T.MeshBasicMaterial({ color: 0xe6eaf1 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.4; of.add(ceil);
  const wallM = M(0xe9ecf2), baseM = M(0x39425a);
  of.box(ROOM.x * 2 + 0.6, 3.4, 0.3, wallM, 0, 1.7, -ROOM.z - 0.15); of.box(0.3, 3.4, ROOM.z * 2, wallM, -ROOM.x - 0.15, 1.7, 0); of.box(0.3, 3.4, ROOM.z * 2, wallM, ROOM.x + 0.15, 1.7, 0); of.box(ROOM.x * 2 + 0.6, 3.4, 0.3, wallM, 0, 1.7, ROOM.z + 0.15);
  of.box(ROOM.x * 2, 0.12, 0.05, baseM, 0, 0.06, -ROOM.z + 0.03); of.box(0.05, 0.12, ROOM.z * 2, baseM, -ROOM.x + 0.03, 0.06, 0); of.box(0.05, 0.12, ROOM.z * 2, baseM, ROOM.x - 0.03, 0.06, 0); of.box(ROOM.x * 2, 0.12, 0.05, baseM, 0, 0.06, ROOM.z - 0.03);
  const win = A.windowStrip(ROOM.x * 2 - 1, 1.9); win.position.set(0, 1.9, -ROOM.z + 0.02); of.add(win); skyMats.push(win.children[0].material);
  const ev = A.elevator(2.6); of.place(ev, 0, 0, ROOM.z - 0.02, Math.PI); of.solid(3.4, 0.4, 0, ROOM.z - 0.1);
  const logo = tagSprite('OfficeLife Inc.', '#4ade80', 3); logo.position.set(-8, 2.5, ROOM.z - 0.3); of.add(logo);
  for (let x = -9; x <= 9; x += 6) for (let zz = -5; zz <= 5; zz += 5) { const l = A.ceilingLight(); l.position.set(x, 3.36, zz); of.add(l); }
  // desks + coworkers
  const MY_DESK = { x: 3, z: 4 };
  const deskSpots = [];
  [-9, -3, 3, 9].forEach(x => [-2, 4].forEach(zz => deskSpots.push([x, zz])));
  const roster = {
    '-9,-2': { color: 0xd97706, name: 'Priya', style: 'long', hair: 0x3b2a1e, skin: 0xf1c9a5 },
    '-3,4': { color: 0x7c3aed, name: 'Sam', style: 'short', hair: 0x1b1410, skin: 0xc68642 },
    '9,-2': { color: 0xdb2777, name: 'Leo', style: 'short', hair: 0x6b4a2b, skin: 0x8d5524, wander: [[9, -0.4], [5.8, -0.4], [5.8, -5.3], [6.9, -7.2]] },
    '-3,-2': { color: 0x0891b2, name: 'Mei', style: 'bun', hair: 0x111111, skin: 0xe0ac69 },
    '9,4': { color: 0x65a30d, name: 'Omar', style: 'short', hair: 0x2a1a10, skin: 0xf1c9a5, wander: [[9, 5.7], [5.8, 5.7], [5.8, -5.3], [7.2, -7.2]] },
  };
  const coworkers = []; let myDesk = null;
  deskSpots.forEach(([x, zz]) => {
    const mine = x === MY_DESK.x && zz === MY_DESK.z;
    const d = A.desk({ mine }); d.group.position.set(x, 0, zz); of.add(d.group); of.solid(2.3, 1.2, x, zz);
    const ch = A.chair({ color: mine ? 0x1f6f43 : 0x2d3a52 }); ch.position.set(x, 0, zz + (mine ? 1.15 : 0.82)); ch.rotation.y = mine ? 0.15 : 0; of.add(ch);
    if (mine) myDesk = d;
    const info = roster[x + ',' + zz];
    if (info) {
      const p = A.person({ shirt: info.color, style: info.style, hair: info.hair, skin: info.skin, seated: true });
      p.position.set(x, 0, zz + 0.78); p.rotation.y = Math.PI; of.add(p);
      const t = tagSprite(info.name); t.position.set(0, 1.95, 0); p.add(t);
      const n = { id: info.name.toLowerCase(), name: info.name, role: 'Colleague', loc: 'office', g: p, x, z: zz, yaw: Math.PI, greeted: false, cd: 0, kind: 'coworker' };
      of.npcs.push(n); npcs.push(n);
      coworkers.push(Object.assign(n, { d, wander: info.wander || null, state: 'sit', timer: 30 + Math.random() * 60, path: null, ph: p.userData.ph, flushT: 0, drink: 0 }));
    }
  });
  const myTag = tagSprite('YOUR DESK', '#4ade80'); myTag.position.set(MY_DESK.x, 2.1, MY_DESK.z); of.add(myTag);
  const ring = new T.Mesh(new T.TorusGeometry(0.7, 0.05, 8, 32), new T.MeshBasicMaterial({ color: 0x4ade80 })); ring.rotation.x = Math.PI / 2; ring.position.set(MY_DESK.x, 0.05, MY_DESK.z + 1.7); of.add(ring);
  // decor
  [[-12.5, 7.5, 1.2], [12.5, 7.5, 1.2], [-12.5, -7.8, 1.3], [12.9, -7.8, 1.3], [0, -7.8, 1.5], [6.8, 1, 0.9]].forEach(([x, zz, s]) => { const p = A.plant(s); of.place(p, x, 0, zz); of.solid(0.7, 0.7, x, zz); });
  [-4.6, -2.8].forEach(zz => { const b = A.bookshelf(); of.place(b, -ROOM.x + 0.35, 0, zz, Math.PI / 2); of.solid(0.5, 1.7, -ROOM.x + 0.4, zz); });
  const wb = A.whiteboard(); of.place(wb, ROOM.x - 0.2, 1.9, -3.5, -Math.PI / 2);
  const wallClock = A.wallClock(); of.place(wallClock.group, -ROOM.x + 0.2, 2.6, 2.5, Math.PI / 2);
  const prn = A.printer(); of.place(prn, ROOM.x - 0.7, 0, 6, -Math.PI / 2); of.solid(0.9, 1.0, ROOM.x - 0.75, 6);
  // meeting corner
  const rug = new T.Mesh(new T.CircleGeometry(2.4, 40), new T.MeshStandardMaterial({ color: 0x3b4a6b, roughness: 1 })); rug.rotation.x = -Math.PI / 2; rug.position.set(-9, 0.012, 6); rug.receiveShadow = true; of.add(rug);
  const mtable = new T.Group(); mtable.add(A.cyl(1.0, 1.0, 0.06, M(0xa87b4f, { roughness: 0.45 }), 0, 0.76, 0, null, 36)); A.cyl(0.12, 0.2, 0.74, M(0x2f3747, { metalness: 0.5 }), 0, 0.37, 0, mtable); mtable.position.set(-9, 0, 6); A.finish(mtable); of.add(mtable); of.solid(2.2, 2.2, -9, 6);
  for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3, c = A.chair({ color: 0x7c3aed }); c.position.set(-9 + Math.cos(a) * 1.5, 0, 6 + Math.sin(a) * 1.5); c.rotation.y = Math.PI / 2 - a; of.add(c); }
  const meetTag = tagSprite('MEETING CORNER', '#c4b5fd'); meetTag.position.set(-9, 2.3, 6); of.add(meetTag);
  // break room (back right)
  of.place(A.counter(5.5, { top: 0xd1d5db }), 8.2, 0, -8.45); of.solid(5.5, 0.6, 8.2, -8.45);
  const cmach = A.officeCoffeeMachine(); cmach.position.set(6.8, 0.92, -8.45); of.add(cmach);
  const mw = A.microwave(); mw.position.set(8.9, 0.92, -8.45); of.add(mw);
  const fr = A.fridge(); of.place(fr, 11.7, 0, -8.4); of.solid(0.8, 0.8, 11.7, -8.4);
  const bTag = tagSprite('BREAK ROOM', '#fbbf24'); bTag.position.set(8.4, 2.5, -8.3); of.add(bTag);
  [[8.0, -5.6], [11.0, -5.2]].forEach(([x, zz]) => {
    const tb = new T.Group(); tb.add(A.cyl(0.8, 0.8, 0.05, M(0xe7dcc8, { roughness: 0.5 }), 0, 0.74, 0, null, 24)); A.cyl(0.06, 0.1, 0.72, M(0x3a4150), 0, 0.36, 0, tb); tb.position.set(x, 0, zz); A.finish(tb); of.add(tb); of.solid(1.5, 1.5, x, zz);
    for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2 + 0.6, c = A.simpleChair(0xc9a063); c.position.set(x + Math.cos(a) * 1.1, 0, zz + Math.sin(a) * 1.1); c.rotation.y = Math.PI / 2 - a + Math.PI; of.add(c); }
  });
  of.light(0xffffff, 0.0, 1, 0, 3, 0);
  of.spawns.elevator = { x: 0, z: 7.6, yaw: 0 };
  of.act({ id: 'desk', x: 3, z: 5.4, r: 2.1 }); of.act({ id: 'elevator_down', x: 0, z: 7.7, r: 2.0 });
  of.act({ id: 'coffee', x: 6.8, z: -7.4, r: 1.5 }); of.act({ id: 'lunch', x: 9.6, z: -5.4, r: 2.4 });
  of.dyn = { coworkers, myDesk, ring, wallClock, deskSpots, ROOM, MY_DESK };
  // manager
  const dana = of.npc({ id: 'dana', name: 'Dana', role: 'Manager', x: 0, z: -5.5, yaw: 0, shirt: 0xe11d48, skin: 0xc68642, hair: 0x1a1210, style: 'long', tag: '#fda4af', lanyard: 0xfbbf24, kind: 'manager' });
  of.dyn.dana = dana;

  return { locs, npcs, skyMats };
}

window.World = { build, tagSprite };
})();
