// The 3D behind the slides (three.js).
// Every scene is a little world parked at its own spot in space. Changing slides
// flies the camera from one world to the next, so the "transition" is a real flight.
// To add a scene: write a function that returns { group, cam, look, update }, add it
// to BUILDERS at the bottom, and use its name in a slide's data-scene.
import * as THREE from 'three';
import { STLLoader } from './vendor/STLLoader.js';

const C = { cyan: 0x3ad0ff, orange: 0xffb020, purple: 0xb07cff, green: 0x7ce07c, red: 0xff5a5a, white: 0xffffff, pcb: 0x0f2a1c, gold: 0xd9b45a, steel: 0xb8c2cc };

// ---------- small helpers ----------
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: .45, metalness: .1, ...o });
const glow = (color, o = {}) => new THREE.MeshBasicMaterial({ color, transparent: true, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (r1, r2, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg), m);
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// a text label that always faces the camera
function label(text, { color = '#eef3ff', size = .5, bg = 'rgba(6,9,20,.75)', bold = true } = {}) {
  const c = document.createElement('canvas'), x = c.getContext('2d');
  const font = `${bold ? 700 : 400} 64px Segoe UI, system-ui, sans-serif`;
  x.font = font;
  const w = Math.ceil(x.measureText(text).width) + 48;
  c.width = w; c.height = 96;
  x.font = font;
  if (bg) { x.fillStyle = bg; x.beginPath(); x.roundRect(0, 0, w, 96, 26); x.fill(); }
  x.fillStyle = color; x.textBaseline = 'middle'; x.fillText(text, 24, 50);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(size * w / 96, size, 1);
  return s;
}

// a canvas you paint on, used as a texture (fake web pages, code screens)
function paint(w, h, fn) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// a dot that rides along a curve, looping (signals on wires, bits on a cable)
function riders(curve, n, color, r = .05, speed = .25) {
  const g = new THREE.Group(), list = [];
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), glow(color));
    g.add(m); list.push({ m, o: i / n });
  }
  g.userData.tick = t => list.forEach(d => d.m.position.copy(curve.getPointAt((t * speed + d.o) % 1)));
  return g;
}

// ---------- reusable models ----------
// an ESP32 dev board: green board, silver shielded chip, gold antenna, pin rows, USB
function esp32({ w = 5.2, d = 2.8, color = C.pcb } = {}) {
  const g = new THREE.Group();
  g.add(box(w, .16, d, mat(color, { roughness: .6 })));
  const can = box(w * .42, .22, d * .58, mat(0xc9ced6, { metalness: .9, roughness: .25 }));
  can.position.set(w * .1, .19, 0); g.add(can);
  const ant = box(w * .16, .02, d * .62, mat(C.gold, { metalness: .8, roughness: .3 }));
  ant.position.set(w * .4, .09, 0); g.add(ant);
  const usb = box(.55, .3, .75, mat(0xdddddd, { metalness: .9, roughness: .2 }));
  usb.position.set(-w / 2 + .2, .2, 0); g.add(usb);
  const pin = new THREE.BoxGeometry(.1, .32, .1), pm = mat(C.gold, { metalness: .9, roughness: .3 });
  const n = Math.round(w / .26);
  for (let i = 0; i < n; i++) for (const s of [-1, 1]) {
    const p = new THREE.Mesh(pin, pm); p.position.set(-w / 2 + .3 + i * (w - .6) / (n - 1), -.2, s * (d / 2 - .14)); g.add(p);
  }
  const led = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 8), glow(C.cyan));
  led.position.set(-w * .28, .12, d * .3); g.add(led);
  g.userData.led = led;
  return g;
}

// a little DC motor with a 2-blade prop
function motor(color = C.orange) {
  const g = new THREE.Group();
  const can = cyl(.35, .35, 1, mat(0xaab4bf, { metalness: .8, roughness: .3 })); can.rotation.x = Math.PI / 2; g.add(can);
  const prop = new THREE.Group();
  for (const s of [0, 1]) {
    const b = box(2.4, .05, .3, mat(color, { roughness: .4 })); b.rotation.y = s * Math.PI; b.position.x = 0; prop.add(b);
  }
  prop.position.z = .62; g.add(prop);
  g.userData.prop = prop;
  return g;
}

// ---------- the scenes ----------
function sceneBrain() {
  const g = new THREE.Group();
  const board = esp32(); board.rotation.set(.5, -.5, .1); g.add(board);
  // a shell of "neurons" around the chip, wired to their neighbours, with pulses
  const pts = [], R = 4.2;
  for (let i = 0; i < 46; i++) {
    const y = 1 - (i / 45) * 2, r = Math.sqrt(1 - y * y), th = i * 2.399963;
    pts.push(new THREE.Vector3(Math.cos(th) * r * R, y * R * .8, Math.sin(th) * r * R));
  }
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(.09, 12, 12), glow(C.cyan), pts.length);
  pts.forEach((p, i) => nodes.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)));
  g.add(nodes);
  const spin = [nodes];
  const seg = [], curves = [];
  pts.forEach((a, i) => {
    pts.map((b, j) => [a.distanceTo(b), j]).filter(([, j]) => j > i).sort((p, q) => p[0] - q[0]).slice(0, 2)
      .forEach(([, j]) => { seg.push(a, pts[j]); curves.push(new THREE.LineCurve3(a, pts[j])); });
  });
  const web = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(seg), new THREE.LineBasicMaterial({ color: C.purple, transparent: true, opacity: .35 }));
  g.add(web); spin.push(web);
  const pulses = curves.filter((_, i) => i % 3 === 0).map((c, i) => { const r = riders(c, 1, i % 2 ? C.orange : C.cyan, .06, .4 + (i % 5) * .08); g.add(r); return r; });
  const light = new THREE.PointLight(C.cyan, 30, 14); light.position.set(0, 2, 2); g.add(light);
  return {
    group: g, cam: [0, 1.2, 10.5], look: [-3.2, 0, 0],
    update(t) {
      board.rotation.y = -.5 + t * .35; board.position.y = Math.sin(t * 1.2) * .15;
      board.userData.led.material.opacity = .4 + .6 * (Math.sin(t * 5) > 0);
      spin.forEach(o => (o.rotation.y = t * .06));
      pulses.forEach(p => { p.rotation.y = t * .06; p.userData.tick(t); });
    }
  };
}

function sceneAI() {
  const g = new THREE.Group();
  const layers = [5, 7, 7, 4], nodes = [];
  layers.forEach((n, L) => {
    nodes[L] = [];
    for (let i = 0; i < n; i++) {
      const p = new THREE.Vector3((L - 1.5) * 1.9, (i - (n - 1) / 2) * .9, 0);
      const m = new THREE.Mesh(new THREE.SphereGeometry(.17, 16, 16), glow(L === 3 ? C.orange : C.cyan));
      m.position.copy(p); g.add(m); nodes[L].push(m);
    }
  });
  const lines = [], pulses = [];
  for (let L = 0; L < 3; L++) for (const a of nodes[L]) for (const b of nodes[L + 1]) {
    lines.push(a.position, b.position);
    if (Math.random() < .25) { const r = riders(new THREE.LineCurve3(a.position, b.position), 1, C.purple, .05, .5 + Math.random() * .4); r.userData.L = L; g.add(r); pulses.push(r); }
  }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(lines), new THREE.LineBasicMaterial({ color: 0x5577cc, transparent: true, opacity: .22 })));
  ['fast', 'slow', 'sideways', 'banana'].forEach((w, i) => {
    const l = label(w, { color: i === 0 ? '#ffb020' : '#9aa6c4', size: .42 });
    l.position.copy(nodes[3][i].position).add(new THREE.Vector3(1.1, 0, 0)); g.add(l);
  });
  ['The', 'boat', 'goes', 'really', '?'].forEach((w, i) => {
    const l = label(w, { size: .36, bg: null, color: '#cfd8f2' });
    l.position.copy(nodes[0][i].position).add(new THREE.Vector3(-.9, 0, 0)); g.add(l);
  });
  return {
    group: g, cam: [1.5, .6, 11], look: [-4.2, 0, 0],
    update(t) {
      g.rotation.y = Math.sin(t * .3) * .25;
      pulses.forEach(p => p.userData.tick(t));
      nodes[3].forEach((m, i) => m.scale.setScalar(1 + (i === 0 ? .5 + .35 * Math.sin(t * 4) : 0)));
    }
  };
}

function boatModel() {
  const g = new THREE.Group();
  for (const s of [-1, 1]) {
    const p = cyl(.32, .32, 4.2, mat(0xcfe9ff, { transparent: true, opacity: .55, roughness: .1 })); p.rotation.z = Math.PI / 2; p.position.set(0, 0, s * .9); g.add(p);
    for (let i = 0; i < 5; i++) { const band = cyl(.335, .335, .25, mat(i % 2 ? 0x111111 : C.orange)); band.rotation.z = Math.PI / 2; band.position.set(-1.5 + i * .75, 0, s * .9); g.add(band); }
  }
  const deck = box(3.2, .08, 2.4, mat(0x2a4a8a)); deck.position.y = .38; g.add(deck);
  const brain = box(.9, .5, .7, mat(0xfff4e0)); brain.position.set(.3, .68, 0); g.add(brain);
  const fans = [];
  for (const s of [-1, 1]) { const m = motor(0x444444); m.scale.setScalar(.45); m.rotation.y = -Math.PI / 2; m.position.set(-1.7, .95, s * .7); g.add(m); fans.push(m.userData.prop); }
  g.userData.spin = t => fans.forEach(f => (f.rotation.z = t * 25));
  return g;
}

function planeModel(scale = .03) {
  // shape from data/plane.json "airframe": root 255 mm, half span 105, tip leading edge at 190
  const g = new THREE.Group(), s = scale;
  const half = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(105, -190), new THREE.Vector2(105, -255), new THREE.Vector2(0, -255)]);
  const wm = mat(0xf2f0ea, { side: THREE.DoubleSide, roughness: .8 });
  for (const side of [-1, 1]) {
    const wing = new THREE.Group(); wing.rotation.z = side * .1; g.add(wing); // a little dihedral
    const w = new THREE.Mesh(new THREE.ShapeGeometry(half), wm);
    w.scale.set(side * s, s, s); w.rotation.x = -Math.PI / 2; wing.add(w);
    const el = box(63 * s, .02, 15 * s, mat(C.orange)); el.position.set(side * (25 + 31.5) * s, .01, 247 * s); wing.add(el);
  }
  const keel = new THREE.Mesh(new THREE.PlaneGeometry(233 * s, 15 * s), mat(0xe6e2d8, { side: THREE.DoubleSide }));
  keel.rotation.y = Math.PI / 2; keel.position.set(0, -7.5 * s, 133 * s); g.add(keel);
  const stick = box(160 * s, 3 * s, 3 * s, mat(0xc89b5a)); stick.position.set(0, 3 * s, 60 * s); g.add(stick);
  const props = [];
  for (const side of [-1, 1]) {
    const m = motor(side < 0 ? C.cyan : C.purple); m.scale.setScalar(.38); m.rotation.y = Math.PI; m.position.set(side * 70 * s, 6 * s, 52 * s); g.add(m); props.push(m.userData.prop);
  }
  const pod = box(17.8 * s, 2 * s, 21 * s, mat(C.pcb)); pod.position.set(-27 * s, 3 * s, 78 * s); g.add(pod);
  const drv = box(18.5 * s, 2 * s, 16.5 * s, mat(0x1d1840)); drv.position.set(8.5 * s, 3 * s, 80 * s); g.add(drv);
  const bat = box(12 * s, 6 * s, 54 * s, mat(0x9aa6b4, { metalness: .6, roughness: .3 })); bat.position.set(0, 5 * s, 97 * s); g.add(bat);
  g.userData.props = props;
  return g;
}

function consoleModel(screenTex) {
  const g = new THREE.Group();
  const body = box(2.6, 4, .45, mat(0x5b2bd6, { roughness: .35 })); g.add(body);
  const bezel = box(2.2, 1.75, .05, mat(0x111522)); bezel.position.set(0, .8, .24); g.add(bezel);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.5), new THREE.MeshBasicMaterial({ map: screenTex || null, color: screenTex ? 0xffffff : 0x111a33 }));
  scr.position.set(0, .8, .27); g.add(scr);
  const dm = mat(0x16161c);
  const dx = box(.75, .24, .12, dm), dy = box(.24, .75, .12, dm); dx.position.set(-.65, -.85, .26); dy.position.set(-.65, -.85, .26); g.add(dx, dy);
  for (const [x, y, c] of [[.55, -.7, C.red], [.9, -1.0, C.orange]]) { const b = cyl(.17, .17, .12, mat(c)); b.rotation.x = Math.PI / 2; b.position.set(x, y, .26); g.add(b); }
  return g;
}

function sceneProjects(ctx) {
  const g = new THREE.Group(), ring = new THREE.Group(); g.add(ring);
  const items = [
    [boatModel(), 'Airboat', '#ffb020'],
    [planeModel(.013), 'Paper plane', '#3ad0ff'],
    [(m => (m.scale.setScalar(.55), m))(consoleModel(ctx.gameTex)), 'Game console', '#b07cff'],
    [ctx.couplerMesh(.09), '3D-printed coupler', '#7ce07c'],
  ];
  items.forEach(([m, name, col], i) => {
    const a = i / items.length * Math.PI * 2, holder = new THREE.Group();
    holder.position.set(Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6); holder.add(m);
    const l = label(name, { color: col, size: .45 }); l.position.y = -1.9; holder.add(l);
    ring.add(holder); items[i].push(holder);
  });
  return {
    group: g, cam: [0, 3, 13], look: [-4.6, -.2, 0],
    update(t) {
      ring.rotation.y = t * .25;
      items.forEach(([m, , , h], i) => { m.rotation.y = -ring.rotation.y + t * .6 + i; h.position.y = Math.sin(t * 1.3 + i) * .2; m.userData.spin?.(t); m.userData.props?.forEach(p => (p.rotation.z = t * 30)); });
    }
  };
}

function sceneRecipe() {
  const g = new THREE.Group(), blocks = [];
  [['GOAL', C.cyan], ['CONTEXT', C.purple], ['LIMITS', C.orange], ['CHECK', C.green]].forEach(([w, c], i) => {
    const b = new THREE.Group();
    b.add(box(3.2, .8, 1.6, mat(c, { roughness: .3, emissive: c, emissiveIntensity: .25 })));
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.1, .75), new THREE.MeshBasicMaterial({ transparent: true, map: paint(512, 124, (x, W, H) => { x.fillStyle = '#06101e'; x.font = 'bold 72px Segoe UI, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(w, W / 2, H / 2 + 4); }) }));
    face.position.z = .81; b.add(face);
    g.add(b); blocks.push(b);
  });
  let t0 = 0;
  return {
    group: g, cam: [2, 2.5, 10], look: [-3, 1.2, 0],
    enter(t) { t0 = t; },
    update(t) {
      blocks.forEach((b, i) => {
        const k = ease(Math.min(1, Math.max(0, (t - t0 - .6 - i * .45) / .9)));
        b.position.y = (1 - k) * 8 + i * .95;
        b.rotation.y = (1 - k) * 2 + Math.sin(t * .6 + i * .5) * .15;
      });
      g.rotation.y = Math.sin(t * .25) * .3;
    }
  };
}

function sceneWeb() {
  const g = new THREE.Group(), panels = [];
  const tabs = ['Home', 'Plan', 'Parts', 'Helm', 'Steps', 'Log'];
  const page = (n, accent) => paint(800, 560, (x, w, h) => {
    x.fillStyle = '#0d1430'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#1b2550'; x.fillRect(0, 0, w, 44);
    ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { x.fillStyle = c; x.beginPath(); x.arc(24 + i * 22, 22, 7, 0, 7); x.fill(); });
    x.fillStyle = '#2a3566'; x.fillRect(110, 11, 420, 22); x.fillStyle = '#9aa6c4'; x.font = '16px monospace'; x.fillText('localhost/?p=' + tabs[n].toLowerCase(), 120, 28);
    tabs.forEach((t, i) => { x.fillStyle = i === n ? accent : '#25305e'; x.fillRect(16 + i * 128, 60, 118, 34); x.fillStyle = i === n ? '#06101e' : '#cfd8f2'; x.font = 'bold 18px sans-serif'; x.fillText(t, 30 + i * 128, 83); });
    x.fillStyle = '#eef3ff'; x.font = 'bold 34px sans-serif'; x.fillText(['The plan in one sentence', 'Design + physics', 'Parts list', 'Helm', 'Build steps', 'Build log'][n], 24, 150);
    if (n === 3) { // the helm: a joystick pad
      x.strokeStyle = accent; x.lineWidth = 4; x.beginPath(); x.arc(400, 360, 130, 0, 7); x.stroke();
      x.fillStyle = accent; x.beginPath(); x.arc(440, 320, 44, 0, 7); x.fill();
      x.fillStyle = '#9aa6c4'; x.font = '20px sans-serif'; x.fillText('L 72%', 120, 360); x.fillText('R 48%', 610, 360);
    } else for (let i = 0; i < 7; i++) { x.fillStyle = i % 3 ? '#26315f' : '#33407a'; x.fillRect(24, 180 + i * 50, 300 + ((i * 137) % 420), 26); }
  });
  [C.orange, C.cyan, C.green, C.orange, C.purple, C.cyan].forEach((c, i) => {
    const col = '#' + c.toString(16).padStart(6, '0');
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.8), new THREE.MeshBasicMaterial({ map: page(i, col), side: THREE.DoubleSide, transparent: true }));
    const a = (i - 2.5) * .42;
    m.userData.home = new THREE.Vector3(Math.sin(a) * 6.5, Math.sin(i * 1.7) * 1.2, -Math.cos(a) * 6.5 + 6.5);
    m.userData.rot = -a;
    g.add(m); panels.push(m);
  });
  let t0 = 0;
  return {
    group: g, cam: [0, .5, 11], look: [-3, 0, 0],
    enter(t) { t0 = t; },
    update(t) {
      panels.forEach((p, i) => {
        const k = ease(Math.min(1, Math.max(0, (t - t0 - .3 - i * .18) / 1.1)));
        p.position.copy(p.userData.home).multiplyScalar(k).add(new THREE.Vector3(0, (1 - k) * -6, (1 - k) * -10));
        p.position.y += Math.sin(t + i) * .12;
        p.rotation.y = p.userData.rot * k;
        p.material.opacity = k;
      });
    }
  };
}

function sceneCoupler(ctx) {
  const g = new THREE.Group(), holder = new THREE.Group(); g.add(holder);
  const part = ctx.couplerMesh(.16); holder.add(part);
  // two 2 mm shafts that slide into the 1.9 mm holes
  const sm = mat(C.steel, { metalness: .95, roughness: .2 });
  const shaftA = cyl(.16, .16, 3.2, sm), shaftB = cyl(.16, .16, 4.2, sm);
  holder.add(shaftA, shaftB);
  const mot = cyl(1.2, 1.2, 2.4, mat(0xaab4bf, { metalness: .8, roughness: .3 })); holder.add(mot);
  const l1 = label('hole 1.9 mm', { color: '#7ce07c', size: .42 }), l2 = label('shaft 2.0 mm', { color: '#cfd8f2', size: .42 });
  l1.position.set(2.3, 1.2, 0); l2.position.set(2.3, -2.9, 0); holder.add(l1, l2);
  const L = 32 * .16; // coupler length in scene units
  return {
    group: g, cam: [0, 1, 11], look: [-3.4, 0, 0],
    update(t) {
      holder.rotation.y = t * .5; holder.rotation.z = .25;
      const k = ease((Math.sin(t * .9) + 1) / 2); // 0 apart, 1 pressed in
      shaftA.position.y = L + 1.6 - k * 1.9 + .3;
      shaftB.position.y = -2.1 - (1 - k) * 1.9 + .2;
      mot.position.y = shaftB.position.y - 3.2;
      l1.material.opacity = .5 + .5 * k;
    }
  };
}

function sceneShop() {
  const g = new THREE.Group(), parts = [
    ['XIAO ESP32-C3', 2.4, C.cyan], ['motor driver', 1.5, C.purple], ['2 motors + props', 5, C.orange],
    ['battery 220 mAh', 5.5, 0x9aa6b4], ['wires + tape', 2, C.green], ['card wing + spine', 7.3, 0xf2f0ea],
  ], blocks = [];
  let y = 0;
  parts.forEach(([name, gr, c], i) => {
    const h = gr * .24, b = new THREE.Group();
    b.add(box(2.4, h, 2.4, mat(c, { roughness: .35 })));
    const l = label(`${name}  ${gr} g`, { size: .34 }); l.position.set(2.9, 0, 0); l.center.set(0, .5); b.add(l);
    b.userData.y = y + h / 2; y += h + .06;
    g.add(b); blocks.push(b);
  });
  // the thrust limit: a glowing ring at ~25 g
  const lim = new THREE.Mesh(new THREE.TorusGeometry(2.3, .04, 8, 64), glow(C.red, { opacity: .9 }));
  lim.rotation.x = Math.PI / 2; lim.position.y = 25 * .24 + .36; g.add(lim);
  const ll = label('motors can lift ~25 g', { color: '#ff5a5a', size: .36 }); ll.position.set(2.9, lim.position.y + .45, 0); ll.center.set(0, .5); g.add(ll);
  g.position.y = -3.4;
  let t0 = 0;
  return {
    group: g, cam: [2, 2.2, 14], look: [-3.6, -.3, 0],
    enter(t) { t0 = t; },
    update(t) {
      blocks.forEach((b, i) => {
        const k = Math.min(1, Math.max(0, (t - t0 - .5 - i * .4) / .7));
        b.position.y = b.userData.y + (1 - k * k) * 9; b.visible = k > 0;
        b.rotation.y = Math.sin(t * .5) * .3;
      });
      lim.material.opacity = .5 + .4 * Math.sin(t * 3);
    }
  };
}

function sceneWiring(ctx) {
  const g = new THREE.Group(), P = ctx.plane, s = .1;
  const at = (x, y, z = 0) => new THREE.Vector3(x * s, z * s, y * s); // mm, drawn top-down: y runs toward the camera
  const pins = {};
  const board = (b, name, color, label3) => {
    const pcb = box(b.w * s, 1.2 * s, b.h * s, mat(color, { roughness: .6 }));
    pcb.position.copy(at(b.x + b.w / 2, b.y + b.h / 2, 0)); g.add(pcb);
    for (const [side, list] of [[0, b.left], [1, b.right]]) list.forEach((pn, i) => {
      const p = at(b.x + b.pinX[side], b.y + b.pin0 + i * b.pitch, .9);
      pins[`${name} ${pn}`] = p;
      const m = cyl(.55 * s, .55 * s, 1.4 * s, mat(C.gold, { metalness: .9, roughness: .3 }), 10); m.position.copy(p); g.add(m);
      const l = label(pn, { size: .2, bg: null, color: '#cfd8f2', bold: false });
      l.position.copy(p).add(new THREE.Vector3((side ? 1 : -1) * .35, .05, 0)); g.add(l);
    });
    const l = label(label3, { size: .34, color: name === 'XIAO' ? '#7ce07c' : '#b07cff' });
    l.position.copy(at(b.x + b.w / 2, b.y - 3, 4)); g.add(l);
  };
  board(P.xiao, 'XIAO', C.pcb, 'brain: XIAO ESP32-C3');
  board(P.drv, 'DRV', 0x1d1840, 'muscle: DRV8833');
  const [bx, by, bw, bh] = P.battery;
  const bat = box(bw * s, 3 * s, bh * s, mat(0x9aa6b4, { metalness: .6, roughness: .3 })); bat.position.copy(at(bx + bw / 2, by + bh / 2, 0)); g.add(bat);
  const bl = label('battery', { size: .3, color: '#ff5a5a' }); bl.position.copy(at(bx + bw / 2, by + bh + 3, 2)); g.add(bl);
  pins['BAT +'] = at(24.2, by, 1.5); pins['BAT -'] = at(21.8, by, 1.5);
  pins['SPLIT +'] = at(24.2, P.split[1], 1.5); pins['SPLIT -'] = at(21.8, P.split[1], 1.5);
  const props = [];
  for (const [name, [mx, my]] of Object.entries(P.motors)) {
    const m = motor(name.startsWith('LEFT') ? C.cyan : C.purple); m.scale.setScalar(.55); m.rotation.y = -Math.PI / 2;
    m.position.copy(at(mx - 6, my, 2)); g.add(m); props.push(m.userData.prop);
    pins[name] = at(mx, my, 2);
    const l = label(name.toLowerCase(), { size: .26, color: '#ffb020' }); l.position.copy(at(mx - 8, my - 4, 6)); g.add(l);
  }
  const pulses = [];
  P.wires.forEach((w, i) => {
    const a = pins[w.from], b = pins[w.to];
    if (!a || !b) return;
    const pts = [a, ...(w.via || []).map(([x, y]) => at(x, y, 1.6 + (i % 3) * .5)), b];
    if (!w.via) pts.splice(1, 0, a.clone().lerp(b, .5).add(new THREE.Vector3(0, .5, 0)));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', .05);
    const col = new THREE.Color(w.color);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .045, 6), mat(col, { emissive: col, emissiveIntensity: .35, roughness: .4 })));
    const r = riders(curve, 2, w.color === '#8a8f99' ? 0xdfe6ff : col, .07, .35); g.add(r); pulses.push(r);
  });
  g.position.set(-2.2, -1, -1.6);
  const pivot = new THREE.Group(); pivot.add(g);
  return {
    group: pivot, cam: [0, 8.6, 9.4], look: [-3.4, -.8, 0],
    update(t) { pivot.rotation.y = Math.sin(t * .25) * .35; pulses.forEach(p => p.userData.tick(t)); props.forEach(p => (p.rotation.z = t * 20)); }
  };
}

function sceneFlash() {
  const g = new THREE.Group();
  // laptop
  const lap = new THREE.Group();
  lap.add(box(4, .18, 2.8, mat(0x2b3140, { metalness: .5 })));
  const code = paint(800, 520, (x, w, h) => {
    x.fillStyle = '#0b1020'; x.fillRect(0, 0, w, h); x.font = '22px monospace';
    const lines = ['void setup() {', '  WiFi.softAP(AP_SSID, AP_PASS);', '  server.on("/drive", drive);', '  server.begin();', '}', '', 'void loop() {', '  server.handleClient();', '  failsafe();   // stop if the tablet goes quiet', '}', '', '$ arduino-cli compile   ✔', '$ arduino-cli upload    ██████████ 100%'];
    lines.forEach((l, i) => { x.fillStyle = l.startsWith('$') ? '#7ce07c' : l.includes('//') ? '#9aa6c4' : '#cfd8f2'; x.fillText(l, 24, 44 + i * 36); });
  });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 2.5), new THREE.MeshBasicMaterial({ map: code }));
  const lid = new THREE.Group(); lid.add(box(4, 2.7, .1, mat(0x2b3140, { metalness: .5 }))); screen.position.z = .06; lid.add(screen);
  lid.position.set(0, 1.4, -1.35); lid.rotation.x = -.15; lap.add(lid);
  lap.position.set(-3.2, -1, 0); lap.rotation.y = .5; g.add(lap);
  g.position.x = 2.6;
  const chip = esp32({ w: 3, d: 1.6 }); chip.position.set(3.4, -.8, .6); chip.rotation.y = -.4; g.add(chip);
  // the USB cable, with bits racing along it
  const cable = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.4, -1, .6), new THREE.Vector3(0, -2.2, 2), new THREE.Vector3(1.6, -1.6, 1.4), new THREE.Vector3(2, -.7, .6)]);
  g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 60, .07, 8), mat(0x222222)));
  const bits = riders(cable, 10, C.green, .09, .5); g.add(bits);
  // Wi-Fi arcs for the cable-free update
  const arcs = [];
  for (let i = 0; i < 4; i++) {
    const a = new THREE.Mesh(new THREE.TorusGeometry(.6 + i * .55, .04, 6, 40, Math.PI * .6), glow(C.cyan, { opacity: 0 }));
    a.rotation.z = Math.PI * .2; a.position.set(-1.6, 1.6, -.4); a.rotation.y = .5; g.add(a); arcs.push(a);
  }
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.05, 64, 1, 0, .01), glow(C.green, { side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.copy(chip.position).add(new THREE.Vector3(0, -.2, 0)); g.add(ring);
  return {
    group: g, cam: [2.6, 2.2, 11.5], look: [-1.2, 0, 0],
    update(t) {
      bits.userData.tick(t);
      arcs.forEach((a, i) => (a.material.opacity = Math.max(0, Math.sin(t * 3 - i * .7)) * .9));
      const k = (t * .18) % 1.15;
      ring.geometry.dispose(); ring.geometry = new THREE.RingGeometry(1.9, 2.05, 64, 1, 0, Math.min(1, k) * Math.PI * 2);
      chip.userData.led.material.color.setHex(k > 1 ? C.green : C.orange);
      chip.userData.led.material.opacity = k > 1 ? 1 : .4 + .6 * (Math.sin(t * 14) > 0);
      g.rotation.y = Math.sin(t * .25) * .12;
    }
  };
}

function sceneGame(ctx) {
  const g = new THREE.Group();
  const con = consoleModel(ctx.gameTex); con.rotation.set(-.1, -.35, 0); g.add(con);
  const pumpkins = [];
  for (let i = 0; i < 26; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(.18 + Math.random() * .12, 12, 10), mat(C.orange, { emissive: 0x552200, emissiveIntensity: .6 }));
    p.scale.y = .8; p.userData = { x: (Math.random() - .5) * 9, z: (Math.random() - .5) * 5 - 1, v: .6 + Math.random(), o: Math.random() * 10 };
    g.add(p); pumpkins.push(p);
  }
  return {
    group: g, cam: [0, .4, 8.5], look: [-2.6, 0, 0],
    update(t) {
      con.position.y = Math.sin(t * 1.1) * .15; con.rotation.y = -.35 + Math.sin(t * .5) * .3;
      pumpkins.forEach(p => { const u = p.userData; p.position.set(u.x, 5 - ((t * u.v + u.o) % 10), u.z); p.rotation.y = t * u.v; });
    }
  };
}

function scenePlane() {
  const s = .024, g = new THREE.Group(), fly = new THREE.Group(), pl = planeModel(s);
  pl.position.z = -100 * s; fly.add(pl); g.add(fly);
  const cg = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 16), glow(C.orange)); cg.position.set(0, .3, (100 - 100) * s); fly.add(cg);
  const np = new THREE.Mesh(new THREE.SphereGeometry(.13, 16, 16), glow(C.cyan)); np.position.set(0, .3, (121 - 100) * s); fly.add(np);
  const lc = label('CG 100 mm', { color: '#ffb020', size: .3 }); lc.position.set(-1.3, .75, 0); fly.add(lc);
  const ln = label('NP ~121 mm', { color: '#3ad0ff', size: .3 }); ln.position.set(1.3, .75, 21 * s); fly.add(ln);
  const thrust = [C.cyan, C.purple].map((c, i) => {
    const a = new THREE.Mesh(new THREE.ConeGeometry(.12, .9, 12), glow(c, { opacity: .8 }));
    a.rotation.x = -Math.PI / 2; a.position.set((i ? 1 : -1) * 70 * s, .2, (52 - 100) * s - .75); fly.add(a); return a;
  });
  return {
    group: g, cam: [4, 4.2, 8.5], look: [-3.4, -.3, 0],
    update(t) {
      const d = Math.sin(t * .7); // >0: left motor faster -> yaw right
      const [L, R] = [.6 + .4 * Math.max(0, d), .6 + .4 * Math.max(0, -d)];
      pl.userData.props[0].rotation.z += L * .9; pl.userData.props[1].rotation.z -= R * .9;
      thrust[0].scale.set(1, L * 1.6, 1); thrust[1].scale.set(1, R * 1.6, 1);
      fly.rotation.set(Math.sin(t * .9) * .05, -t * .25 - d * .35, -d * .35);
      fly.position.y = Math.sin(t * 1.2) * .2;
    }
  };
}

function sceneWrong() {
  const g = new THREE.Group(), cards = [];
  const mk = (title, sub) => paint(600, 300, (x, w, h) => {
    x.fillStyle = '#141b38'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ff5a5a'; x.lineWidth = 8; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#eef3ff'; x.font = 'bold 40px sans-serif'; x.fillText(title, 30, 90);
    x.fillStyle = '#9aa6c4'; x.font = '26px sans-serif'; x.fillText(sub, 30, 140);
    x.strokeStyle = '#ff5a5a'; x.lineWidth = 16; x.beginPath(); x.moveTo(440, 170); x.lineTo(540, 270); x.moveTo(540, 170); x.lineTo(440, 270); x.stroke();
  });
  [['PUMKIN BOX', 'label spelled wrong'], ['USB on the left?', 'board drawn wrong'], ['5 batteries!', 'box had 0'], ['wire to... where?', 'confusing diagram'], ['"it will fly"', 'shape never tested']]
    .forEach(([a, b], i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshBasicMaterial({ map: mk(a, b), side: THREE.DoubleSide }));
      g.add(m); cards.push(m);
    });
  const q = label('?', { size: 3, bg: null, color: '#ff5a5a' }); g.add(q);
  return {
    group: g, cam: [0, .8, 10.5], look: [-3.6, 0, 0],
    update(t) {
      cards.forEach((c, i) => {
        const a = t * .35 + i / cards.length * Math.PI * 2;
        c.position.set(Math.cos(a) * 3, Math.sin(a * 2) * .6 + (i - 2) * .3, Math.sin(a) * 3);
        c.lookAt(0, c.position.y, 0); c.rotateY(Math.PI);
        c.position.x += (Math.sin(t * 40 + i) > .97 ? .08 : 0); // a little glitch
      });
      q.material.opacity = .6 + .4 * Math.sin(t * 2);
    }
  };
}

function sceneSafe() {
  const g = new THREE.Group();
  const bat = box(1.6, .4, 3, mat(0xc0c8d2, { metalness: .7, roughness: .25 })); g.add(bat);
  const wires = [C.red, 0x222222].map((c, i) => { const w = cyl(.05, .05, 1.2, mat(c)); w.rotation.x = Math.PI / 2; w.position.set(i ? -.2 : .2, 0, -2); g.add(w); return w; });
  const shield = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 2), new THREE.MeshBasicMaterial({ color: C.green, wireframe: true, transparent: true, opacity: .35 }));
  g.add(shield);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.9, .05, 8, 80), glow(C.green, { opacity: .8 })); ring.rotation.x = Math.PI / 2; g.add(ring);
  return {
    group: g, cam: [0, 2, 9.5], look: [-2.8, 0, 0],
    update(t) { bat.rotation.y = t * .4; wires.forEach(w => (w.parent.rotation.y = 0)); shield.rotation.y = -t * .2; shield.scale.setScalar(1 + .04 * Math.sin(t * 2)); ring.position.y = Math.sin(t * 1.4) * 1.6; }
  };
}

function sceneOpen() {
  const g = new THREE.Group(), nodes = [], lines = [];
  const grow = (p, dir, depth) => {
    nodes.push({ p, depth });
    if (depth > 4) return;
    const n = depth === 0 ? 4 : 2;
    for (let i = 0; i < n; i++) {
      // fan out sideways (around z), then swing round the trunk (around y) so it fills out in 3D
      const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 0, 1), (i - (n - 1) / 2) * (depth ? .55 : .7))
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), depth ? (Math.random() - .5) * 1.6 : i * 1.6);
      const q = p.clone().add(d.multiplyScalar(2.1 - depth * .3));
      lines.push([p, q, depth]); grow(q, d.normalize(), depth + 1);
    }
  };
  grow(new THREE.Vector3(0, -2.4, 0), new THREE.Vector3(0, 1, 0), 0);
  const nm = nodes.map(({ p, depth }) => { const m = box(.46 - depth * .06, .46 - depth * .06, .46 - depth * .06, mat(depth ? C.green : C.orange, { emissive: depth ? C.green : C.orange, emissiveIntensity: .5 })); m.position.copy(p); g.add(m); m.userData.d = depth; return m; });
  const lm = lines.map(([a, b, d]) => { const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), new THREE.LineBasicMaterial({ color: 0xa8ffb0, transparent: true })); l.userData.d = d; g.add(l); return l; });
  let t0 = 0;
  return {
    group: g, cam: [0, 1.5, 11.5], look: [0, 3.2, 0],
    enter(t) { t0 = t; },
    update(t) {
      const k = ((t - t0) * .8) % 9; // grow, hold, regrow
      nm.forEach(m => m.scale.setScalar(Math.min(1, Math.max(0.001, k - m.userData.d))));
      lm.forEach(l => (l.material.opacity = Math.min(.7, Math.max(0, k - l.userData.d - .3))));
      g.rotation.y = t * .2;
    }
  };
}

function sceneYou() {
  const n = 1400, pos = new Float32Array(n * 3), seed = [];
  for (let i = 0; i < n; i++) seed.push([Math.random() * 6 + 1, Math.random() * Math.PI * 2, (Math.random() - .5) * 2.5, Math.random() * .5 + .2]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: .06, color: C.purple, transparent: true, opacity: .8, blending: THREE.AdditiveBlending, depthWrite: false }));
  const g = new THREE.Group(); g.add(pts);
  return {
    group: g, cam: [0, 6, 6], look: [0, 0, 0],
    update(t) {
      seed.forEach(([r, a, y, v], i) => { const ang = a + t * v / r * 2; pos[i * 3] = Math.cos(ang) * r; pos[i * 3 + 1] = y * (r / 4) + Math.sin(t + r) * .2; pos[i * 3 + 2] = Math.sin(ang) * r; });
      geo.attributes.position.needsUpdate = true;
    }
  };
}

// ---------- the stage ----------
export function createStage(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x060914);
  scene.fog = new THREE.FogExp2(0x060914, .012);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 600);
  scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x1a1030, 1.4));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(5, 10, 7); scene.add(sun);

  // stars everywhere, so the flights between scenes feel like flying
  const sp = new Float32Array(5000 * 3);
  for (let i = 0; i < sp.length; i += 3) { sp[i] = (Math.random() - .2) * 900; sp[i + 1] = (Math.random() - .5) * 260; sp[i + 2] = (Math.random() - .5) * 260; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: .5, color: 0x8aa0ff, transparent: true, opacity: .7, sizeAttenuation: true, depthWrite: false })));

  // shared assets: the real coupler STL, the real game screenshot, the real pin map
  const couplerGeo = new THREE.BufferGeometry();
  const couplerMat = mat(C.green, { roughness: .35, emissive: 0x0a3a14, emissiveIntensity: .5 });
  new STLLoader().load('../media/3d/shaft_coupler.stl', geo => {
    geo.computeBoundingBox(); geo.center(); geo.computeVertexNormals(); geo.computeBoundingSphere();
    couplerGeo.copy(geo);
  }, undefined, () => console.warn('coupler STL missing'));
  const gameTex = new THREE.TextureLoader().load('../game/frames/frame-0200.png');
  gameTex.colorSpace = THREE.SRGBColorSpace; gameTex.magFilter = THREE.NearestFilter;
  const ctx = {
    gameTex,
    // the STL is a Z-up column in mm; stand it up in Y and scale it
    couplerMesh(scale) { const m = new THREE.Mesh(couplerGeo, couplerMat); m.frustumCulled = false; m.rotation.x = -Math.PI / 2; m.scale.setScalar(scale); const h = new THREE.Group(); h.add(m); return h; },
    plane: null,
  };

  const BUILDERS = { brain: sceneBrain, ai: sceneAI, projects: sceneProjects, recipe: sceneRecipe, web: sceneWeb, coupler: sceneCoupler, shop: sceneShop, wiring: sceneWiring, flash: sceneFlash, game: sceneGame, plane: scenePlane, wrong: sceneWrong, safe: sceneSafe, open: sceneOpen, you: sceneYou, end: sceneBrain };
  const scenes = {};
  let i = 0;
  const build = (name) => {
    const sc = BUILDERS[name](ctx);
    sc.origin = new THREE.Vector3(i++ * 55, 0, 0);
    sc.group.position.add(sc.origin);
    sc.group.visible = false;
    scene.add(sc.group);
    return (scenes[name] = sc);
  };
  const ready = fetch('../data/plane.json').then(r => r.json()).then(p => { ctx.plane = p; }).catch(() => {});

  let active = null, last = null, flight = null;
  const timer = new THREE.Timer();
  const clock = { get elapsedTime() { return timer.getElapsed(); } };
  const v = new THREE.Vector3(), lookNow = new THREE.Vector3();
  const camFor = sc => sc.origin.clone().add(new THREE.Vector3(...sc.cam));
  const lookFor = sc => sc.origin.clone().add(new THREE.Vector3(...sc.look));

  async function show(name) {
    if (name === 'wiring') await ready;
    const sc = scenes[name] || build(BUILDERS[name] ? name : 'brain');
    if (sc === active) return;
    last = active; active = sc; sc.group.visible = true;
    sc.enter?.(clock.elapsedTime);
    if (!last) { camera.position.copy(camFor(sc)); lookNow.copy(lookFor(sc)); return; }
    flight = { t0: clock.elapsedTime, from: camera.position.clone(), lookFrom: lookNow.clone(), dur: 1.5 };
  }

  function resize() {
    const w = innerWidth, h = innerHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // on a tall screen, centre the 3D instead of pushing it right
    camera.userData.portrait = w < h;
    camera.updateProjectionMatrix();
  }
  addEventListener('resize', resize); resize();

  let mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; });

  renderer.setAnimationLoop(() => {
    timer.update();
    const t = timer.getElapsed();
    if (!active) return renderer.render(scene, camera);
    const toCam = camFor(active), toLook = lookFor(active);
    if (camera.userData.portrait) toLook.x = active.origin.x + active.look[0] * .15, toCam.y += 2;
    if (flight) {
      const k = Math.min(1, (t - flight.t0) / flight.dur), e = ease(k);
      // arc up and out between scenes so it feels like a swoop
      camera.position.lerpVectors(flight.from, toCam, e).add(v.set(0, Math.sin(e * Math.PI) * 6, Math.sin(e * Math.PI) * 10));
      lookNow.lerpVectors(flight.lookFrom, toLook, e);
      if (k >= 1) { flight = null; if (last && last !== active) last.group.visible = false; }
    } else {
      camera.position.lerp(toCam.add(v.set(mx * 1.2, -my * .8, 0)), .04);
      lookNow.lerp(toLook, .08);
    }
    camera.lookAt(lookNow);
    active.update(t);
    if (flight && last) last.update(t);
    renderer.render(scene, camera);
  });

  return { show };
}
