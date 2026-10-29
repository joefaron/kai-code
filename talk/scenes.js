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

// ---------- the real boat, built in centimetres ----------
// Two 1-liter bottles under a piece of recycled yard sign, the electronics in a
// clear snap-lid to-go box, and FOUR motors at the back (two per side) in the
// 45-degree printed holders. Each motor turns a 2 mm steel rod through the
// printed coupler, and the rod reaches down into the water to a little prop.
// Change a number in BOAT and the model (and the assembly video) follows.
const BOAT = {
  bottleR: 4, bottleL: 30, bottleZ: 8,     // 1 L bottle: ~8 cm round, ~30 cm long; centres 16 cm apart
  deckL: 34, deckW: 24, deckT: .4,         // the yard-sign piece
  boxL: 14, boxW: 11, boxH: 5.5, boxX: 4,  // to-go box, a little forward of centre
  motorX: -15, motorZ: [-10, -5, 5, 10],   // the four holders along the back edge
  motorH: 2, tilt: 45,                     // motor centre height above the deck, shaft angle
  rodEnd: 15, water: 2.6,                  // rod reach (from motor centre) and the waterline height
};

// a 1 L soda bottle lying on its side, cap pointing forward (+x)
function bottle() {
  const R = BOAT.bottleR, L = BOAT.bottleL, pts = [];
  [[0, 0], [R * .7, 0], [R * .95, .6], [R, 1.6], [R, L * .66], [R * .86, L * .76], [R * .45, L * .86], [1.25, L * .9], [1.25, L * .94]]
    .forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const g = new THREE.Group();
  const clear = mat(0xd6f0ff, { transparent: true, opacity: .42, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 40), clear));
  const cap = cyl(1.45, 1.45, L * .06, mat(0x2f9e44)); cap.position.y = L * .97; g.add(cap);
  const lab = new THREE.Mesh(new THREE.CylinderGeometry(R * 1.01, R * 1.01, L * .22, 40, 1, true), mat(0xe03131, { roughness: .5 }));
  lab.position.y = L * .4; g.add(lab);
  g.rotation.z = -Math.PI / 2; // lathe axis (y) -> boat length (x)
  const h = new THREE.Group(); g.position.x = -L / 2; h.add(g);
  return h;
}

// the yard sign: white corrugated plastic with the old print still on it
function yardSign() {
  const { deckL: L, deckW: W, deckT: T } = BOAT;
  const top = paint(1024, 724, (x, w, h) => {
    x.fillStyle = '#f4f6f8'; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(0,0,0,.06)'; x.lineWidth = 3;
    for (let i = 0; i < w; i += 14) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); } // the flutes
    x.fillStyle = '#c92a2a'; x.font = 'bold 230px Arial Black, Impact, sans-serif'; x.textBaseline = 'middle';
    x.textAlign = 'center'; x.font = 'bold 190px Arial Black, Impact, sans-serif'; x.fillText('YARD SALE', w / 2, h * .42);
    x.fillStyle = '#1c3d8a'; x.font = 'bold 70px Arial, sans-serif'; x.fillText('SAT 8AM', w / 2, h * .72);
    x.fillRect(0, 0, w, 30); x.fillRect(0, h - 30, w, 30);
  });
  const side = mat(0xe9ecef, { roughness: .7 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(L, T, W), [side, side, mat(0xffffff, { map: top, roughness: .6 }), side, side, side]);
  return m;
}

// clear clamshell to-go box: tray + hinged lid, the brain, driver and battery inside
function togoBox() {
  const { boxL: L, boxW: W, boxH: H } = BOAT;
  const g = new THREE.Group();
  const pet = () => mat(0xeaf6ff, { transparent: true, opacity: .2, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const edge = geo => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .7 }));
  const trayGeo = new THREE.BoxGeometry(L, H * .55, W);
  const tray = new THREE.Mesh(trayGeo, pet()); tray.position.y = H * .275; g.add(tray);
  const te = edge(trayGeo); te.position.copy(tray.position); g.add(te);
  const lidGeo = new THREE.BoxGeometry(L, H * .45, W); lidGeo.translate(0, H * .225, W / 2); // hinge on the back edge
  const lid = new THREE.Group(); lid.position.set(0, H * .55, -W / 2);
  lid.add(new THREE.Mesh(lidGeo, pet()), edge(lidGeo)); g.add(lid);
  const inside = new THREE.Group(); g.add(inside);
  const bank = box(9, 2.2, 6, mat(0x343a40, { metalness: .3, roughness: .4 })); bank.position.set(-1.5, 1.1, -1.5); inside.add(bank);
  const led = new THREE.Mesh(new THREE.SphereGeometry(.18, 8, 8), glow(C.cyan)); led.position.set(3, 2.25, -1.5); inside.add(led);
  const brain = esp32({ w: 2.1, d: 1.8 }); brain.position.set(4.2, .6, 2.6); inside.add(brain);
  const drv = box(1.9, .16, 1.8, mat(0x5f3dc4, { roughness: .6 })); drv.position.set(1.2, .45, 3.2); inside.add(drv);
  const drv2 = drv.clone(); drv2.position.x = -1.4; inside.add(drv2);
  g.userData = { lid, inside, led: brain.userData.led };
  return g;
}

// one motor + 45-degree holder + coupler + rod + prop. tail = the bit that tilts.
function longTail() {
  const g = new THREE.Group();
  const blue = mat(0x3a6fc4, { roughness: .45 });
  const base = box(3.1, .4, 2.6, blue); base.position.y = .2; g.add(base);
  const post = box(1.2, BOAT.motorH, 2, blue); post.position.set(.6, BOAT.motorH / 2, 0); g.add(post);
  const tail = new THREE.Group(); tail.position.y = BOAT.motorH + .2;
  tail.rotation.z = Math.PI + THREE.MathUtils.degToRad(BOAT.tilt); // local +x points back and down
  g.add(tail);
  const along = (m, x) => { m.rotation.z = -Math.PI / 2; m.position.x = x; tail.add(m); return m; };
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, .3, 10, 32), blue); ring.rotation.y = Math.PI / 2; tail.add(ring);
  along(cyl(1.23, 1.23, 2.6, mat(0xaab4bf, { metalness: .85, roughness: .25 })), -.2);
  const coupler = along(cyl(.45, .45, 3.2, mat(C.green, { emissive: 0x0a3a14, emissiveIntensity: .5 })), 2.9);
  const rodLen = BOAT.rodEnd - 4.2;
  const rod = new THREE.Group(); rod.position.x = 4.2; tail.add(rod);
  const steel = cyl(.1, .1, rodLen, mat(C.steel, { metalness: .95, roughness: .2 }), 8); steel.rotation.z = -Math.PI / 2; steel.position.x = rodLen / 2; rod.add(steel);
  const prop = new THREE.Group(); prop.position.x = BOAT.rodEnd; tail.add(prop);
  for (let i = 0; i < 3; i++) {
    const b = box(.12, 1.5, .7, mat(C.orange, { roughness: .4 })); b.position.y = .75; b.rotation.y = .5;
    const arm = new THREE.Group(); arm.rotation.x = i * Math.PI * 2 / 3; arm.add(b); prop.add(arm);
  }
  const hub = cyl(.3, .3, .6, mat(0x222222)); hub.rotation.z = -Math.PI / 2; prop.add(hub);
  g.userData = { tail, coupler, rod, prop };
  return g;
}

// a black zip tie that hugs one bottle and goes over the top of the sign. zc = bottle centre (z)
function zipTie(zc) {
  const R = BOAT.bottleR + .15, top = 2 * BOAT.bottleR + BOAT.deckT + .12, pts = [];
  for (let i = 0; i <= 12; i++) { const a = Math.PI + i / 12 * Math.PI; pts.push(new THREE.Vector3(0, R + R * Math.sin(a) - .15, zc + R * Math.cos(a))); }
  pts.push(new THREE.Vector3(0, top, zc + R), new THREE.Vector3(0, top, zc - R));
  const g = new THREE.Group(), nylon = mat(0x15171c, { roughness: .6 });
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true, 'catmullrom', .1), 60, .14, 6, true), nylon));
  const head = box(.5, .45, .7, nylon); head.position.set(0, top + .1, zc + R * .5); g.add(head);
  return g;
}

// the whole boat, plus a .build(k) that assembles it: k = 0 exploded ... 1 done
function boatModel() {
  const S = .14, outer = new THREE.Group(), g = new THREE.Group(); g.scale.setScalar(S); outer.add(g);
  const { bottleR: R, bottleZ, deckT, motorX, motorZ } = BOAT, deckY = 2 * R;
  const bottles = [-1, 1].map(s => { const b = bottle(); b.position.set(0, R, s * bottleZ); g.add(b); return b; });
  const deck = yardSign(); deck.position.y = deckY + deckT / 2; g.add(deck);
  const ties = new THREE.Group(); // two ties per bottle, holding it to the sign
  for (const zc of [-bottleZ, bottleZ]) for (const x of [-9, 9]) { const z = zipTie(zc); z.position.x = x; ties.add(z); }
  g.add(ties);
  const tb = togoBox(); tb.position.set(BOAT.boxX, deckY + deckT, 0); g.add(tb);
  const tails = motorZ.map(z => { const m = longTail(); m.position.set(motorX, deckY + deckT, z); g.add(m); return m; });
  // wires from the box to each motor, with signal dots for when it drives
  const wires = new THREE.Group(), dots = [];
  tails.forEach((m, i) => {
    const a = new THREE.Vector3(BOAT.boxX - BOAT.boxL / 2, deckY + 1.5, (i - 1.5) * 2);
    const b = new THREE.Vector3(motorX + .2, deckY + deckT + BOAT.motorH + 1.2, motorZ[i]);
    const c = new THREE.CatmullRomCurve3([a, a.clone().lerp(b, .5).setY(deckY + 1.1), b]);
    wires.add(new THREE.Mesh(new THREE.TubeGeometry(c, 30, .16, 6), mat(i < 2 ? 0xe03131 : 0xffb020)));
    const r = riders(c, 2, C.cyan, .3, .8); wires.add(r); dots.push(r);
  });
  g.add(wires);
  const at = (o) => (o.userData.home = o.position.clone(), o);
  [...bottles, deck, tb, ...tails, wires].forEach(at);
  const lerp01 = (k, a, b) => ease(Math.min(1, Math.max(0, (k - a) / (b - a))));
  // step windows (in 0..1 of the build)
  outer.userData.build = k => {
    bottles.forEach((b, i) => { const e = lerp01(k, 0, .14); b.position.copy(b.userData.home).add(new THREE.Vector3(0, 0, (i ? 1 : -1) * (1 - e) * 40)); b.visible = k > 0; });
    { const e = lerp01(k, .16, .3); deck.position.copy(deck.userData.home).add(new THREE.Vector3(0, (1 - e) * 45, 0)); deck.visible = k > .16; }
    ties.children.forEach((z, i) => { const e = lerp01(k, .3 + i * .012, .34 + i * .012); z.visible = e > 0; z.scale.set(1, 1 + (1 - e) * .6, 1 + (1 - e) * .6); });
    { const e = lerp01(k, .32, .44); tb.position.copy(tb.userData.home).add(new THREE.Vector3(0, (1 - e) * 40, 0)); tb.visible = k > .32;
      const e2 = lerp01(k, .44, .52); tb.userData.inside.position.y = (1 - e2) * 14; tb.userData.inside.visible = k > .44;
      tb.userData.lid.rotation.x = -(1 - lerp01(k, .53, .6)) * 1.9; }
    tails.forEach((m, i) => {
      const e = lerp01(k, .62 + i * .04, .72 + i * .04);
      m.position.copy(m.userData.home).add(new THREE.Vector3(-(1 - e) * 30, (1 - e) * 20, 0)); m.visible = k > .62 + i * .04;
      const r = lerp01(k, .82, .94); const u = m.userData;
      u.coupler.visible = r > 0; u.coupler.scale.y = Math.max(.01, r);
      u.rod.scale.x = Math.max(.001, r); u.prop.position.x = 4.2 + (BOAT.rodEnd - 4.2) * r; u.prop.visible = r > .02;
    });
    wires.visible = k > .95;
  };
  outer.userData.spin = (t, on = 1) => { tails.forEach((m, i) => (m.userData.prop.rotation.x = t * 30 * on * (i < 2 ? 1 : -1))); dots.forEach(d => d.userData.tick(t)); dots.forEach(d => (d.visible = on > 0)); tb.userData.led.material.opacity = on ? .4 + .6 * (Math.sin(t * 6) > 0) : .3; };
  outer.userData.build(1);
  outer.userData.props = []; // the carousel spins via .spin
  outer.userData.waterY = BOAT.water * S;
  return outer;
}

// water: a soft disc that fades out at the edge and ripples
function water(r = 9) {
  const alpha = paint(256, 256, (x, w) => { const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); gr.addColorStop(0, '#fff'); gr.addColorStop(.6, '#bbb'); gr.addColorStop(1, '#000'); x.fillStyle = gr; x.fillRect(0, 0, w, w); });
  const geo = new THREE.PlaneGeometry(r * 2, r * 2, 70, 70); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1971c2, transparent: true, opacity: .8, alphaMap: alpha, roughness: .15, metalness: .2, depthWrite: false }));
  const base = geo.attributes.position.array.slice();
  m.userData.tick = t => {
    const p = geo.attributes.position.array;
    for (let i = 0; i < p.length; i += 3) p[i + 1] = base[i + 1] + Math.sin(p[i] * 1.3 + t * 1.6) * .03 + Math.cos(p[i + 2] * 1.1 + t * 1.2) * .03;
    geo.attributes.position.needsUpdate = true; geo.computeVertexNormals();
  };
  return m;
}

// the build, as a movie: assemble in the air, splash down, drive in a slow circle
const BOAT_STEPS = [
  [0, '1  Two 1-liter bottles = the floats', '#3ad0ff'],
  [.16, '2  A recycled yard sign, zip-tied on top', '#ff8787'],
  [.32, '3  A to-go box keeps the brain dry', '#b07cff'],
  [.62, '4  Four motors, two per side, tilted 45°', '#ffb020'],
  [.82, '5  A steel rod spins the prop under water', '#7ce07c'],
];
function sceneBoat({ solo, onCaption } = {}) {
  const outer = new THREE.Group(), g = new THREE.Group(); outer.add(g);
  const boat = boatModel(); g.add(boat);
  const sea = water(); sea.position.y = 0; outer.add(sea);
  // bubbles behind each prop while driving
  const N = 160, bpos = new Float32Array(N * 3), bseed = [...Array(N)].map(() => [Math.random(), Math.random() - .5, Math.random() - .5, Math.floor(Math.random() * 4)]);
  const bgeo = new THREE.BufferGeometry(); bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  const bubbles = new THREE.Points(bgeo, new THREE.PointsMaterial({ size: .1, color: 0xe7f5ff, map: paint(32, 32, (x) => { x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 14, 0, 7); x.fill(); }), alphaTest: .4, transparent: true, opacity: 0, depthWrite: false })); boat.add(bubbles);
  const propAt = BOAT.motorZ.map(z => new THREE.Vector3(BOAT.motorX - BOAT.rodEnd * Math.cos(Math.PI / 4), 0, z).multiplyScalar(.14));
  const LOOP = 22, BUILD = 10, SPLASH = 11.5;
  let t0 = 0;
  return {
    group: outer, cam: solo ? [5.6, 4.4, 7.2] : [4, 3.4, 9.5], look: solo ? [-.5, .7, 0] : [-3.3, .7, 0], LOOP,
    enter(t) { t0 = t; },
    update(t) {
      const s = (t - t0) % LOOP, k = Math.min(1, s / BUILD);
      boat.userData.build(k);
      const drive = s > SPLASH ? Math.min(1, (s - SPLASH) / 1) : 0;
      // assemble 2.2 units up in the air, then drop onto the water with a little bounce
      const drop = s < BUILD + .2 ? 0 : Math.min(1, (s - BUILD - .2) / 1.1);
      const lift = 1.3 * (1 - drop * drop) + (drop >= 1 ? Math.sin((s - BUILD - 1.3) * 5) * .08 * Math.exp(-(s - BUILD - 1.3) * 1.5) : 0);
      boat.position.y = lift - boat.userData.waterY + Math.sin(t * 1.4) * .02 * drive;
      boat.rotation.z = Math.sin(t * 1.1) * .02 * drive;
      // then drive a slow circle (heading follows the path: forward is +x)
      const a = s > SPLASH ? (s - SPLASH) * .35 : 0;
      g.rotation.y = a; g.position.set(Math.sin(a) * .9, 0, (Math.cos(a) - 1) * .9);
      boat.userData.spin(t, drive);
      const step = BOAT_STEPS.reduce((n, [at], i) => (k >= at ? i : n), 0);
      if (s < BUILD + .6) onCaption?.(BOAT_STEPS[step][1], BOAT_STEPS[step][2], step);
      else onCaption?.(s > SPLASH + .3 && s < LOOP - .6 ? 'Go!  Speed up one side to steer' : '', '#eef3ff', 9);
      bubbles.material.opacity = .8 * drive;
      bseed.forEach(([life, dy, dz, w], i) => {
        const a = (life + s * .9) % 1, p = propAt[w];
        bpos[i * 3] = p.x - a * 2.2; bpos[i * 3 + 1] = BOAT.water * .14 + dy * .1 * a + .02; bpos[i * 3 + 2] = p.z + dz * .5 * a;
      });
      bgeo.attributes.position.needsUpdate = true;
      sea.userData.tick(t);
      outer.rotation.y = solo ? .5 - s * .05 : (s < BUILD ? Math.sin(t * .2) * .3 : 0); // solo: a slow camera orbit
    }
  };
}

// prototype 2 -> 3: the motor sits flat (prop spinning in the air), the printed holder
// tilts it to 45 degrees, the rod dives in, SPLASH, and the prop churns the water.
function sceneDunk() {
  const S = .12, outer = new THREE.Group(), g = new THREE.Group(); g.scale.setScalar(S); outer.add(g);
  const W = -5.5, PIV = [-10, 2.2], TILT = THREE.MathUtils.degToRad(45); // waterline, motor pivot (cm), final angle
  const deck = box(32, .4, 12, mat(0xf4f6f8, { roughness: .7 })); deck.position.set(4, -.2, 0); g.add(deck);
  const fl = bottle(); fl.position.set(4, -4.4, 0); g.add(fl);
  const tailM = longTail(); tailM.position.x = PIV[0]; g.add(tailM);
  const { tail, prop } = tailM.userData; prop.scale.setScalar(1.6); // a bigger prop reads better from the back row
  const sea = water(5); sea.position.y = W * S; outer.add(sea);
  // splash droplets + bubbles: one pool of particles, each with a position, velocity and age
  const N = 260, pos = new Float32Array(N * 3).fill(-999), P = [...Array(N)].map(() => ({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, age: 9, wet: 0 }));
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dot = paint(32, 32, x => { x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 14, 0, 7); x.fill(); });
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .09, color: 0xdff4ff, map: dot, alphaTest: .4, transparent: true, depthWrite: false })));
  let next = 0;
  const spawn = (x, y, z, vx, vy, vz, wet = 0) => { const p = P[next++ % N]; Object.assign(p, { x, y, z, vx, vy, vz, age: 0, wet }); };
  const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 40), glow(0xffffff, { opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; g.add(ring);
  const lFlat = label('flat: prop spins in the AIR', { color: '#ff5a5a', size: .36 }), lTilt = label('45°: prop bites the WATER', { color: '#7ce07c', size: .36 });
  lFlat.position.set(-.6, 1.35, 0); lTilt.position.set(-.6, 1.35, 0); outer.add(lFlat, lTilt);
  const LOOP = 10;
  let t0 = 0, last = 0, wasUnder = false, splashAt = -9;
  return {
    group: outer, cam: [0, .9, 9.5], look: [-1.6, -.4, 0],
    enter(t) { t0 = t; last = t; },
    update(t) {
      const s = (t - t0) % LOOP, dt = Math.min(.05, Math.max(0, t - last)); last = t;
      const k = s < 2 ? 0 : s < 3.4 ? ease((s - 2) / 1.4) : s < 9.2 ? 1 : 1 - ease((s - 9.2) / .8);
      const a = TILT * k;
      tail.rotation.z = Math.PI + a;
      prop.rotation.x += dt * (k > .95 ? 34 : 18);
      // where the prop is now, in cm
      const px = PIV[0] - 15 * Math.cos(a), py = PIV[1] - 15 * Math.sin(a);
      const under = py < W;
      if (under && !wasUnder && s < 9) { // SPLASH: the prop just hit the water
        splashAt = s;
        const ex = PIV[0] - (PIV[1] - W) / Math.tan(Math.max(a, .2));
        for (let i = 0; i < 110; i++) { const th = Math.random() * 6.28, v = 6 + Math.random() * 14; spawn(ex, W, 0, Math.cos(th) * v * .5, 14 + Math.random() * 22, Math.sin(th) * v * .5); }
        ring.position.set(ex, W + .05, 0);
      }
      wasUnder = under;
      if (under && k > .95) { // churn: spray kicked up behind, bubbles pushed back under water
        for (let i = 0; i < 3; i++) spawn(px - 1 + Math.random(), W, (Math.random() - .5) * 3, -6 - Math.random() * 8, 5 + Math.random() * 10, (Math.random() - .5) * 4);
        for (let i = 0; i < 2; i++) spawn(px, py + (Math.random() - .5) * 2, (Math.random() - .5) * 2, -14 - Math.random() * 10, 1.5, (Math.random() - .5) * 3, 1);
      } else if (!under && k < .05 && Math.random() < .5) { // in the air it only makes a breeze
        spawn(px - 1, py + (Math.random() - .5) * 2, (Math.random() - .5) * 2, -12, 0, 0, 2);
      }
      P.forEach((p, i) => {
        p.age += dt;
        if (p.wet === 1) { p.vy = 1.5; if (p.y > W - .3 || p.age > 1.6) p.y = -999; } // bubbles rise and pop
        else if (p.wet === 2) { if (p.age > .5) p.y = -999; } // breeze
        else { p.vy -= 60 * dt; if (p.y < W - .2 && p.vy < 0) p.y = -999; } // droplets fall back in
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      });
      geo.attributes.position.needsUpdate = true;
      const r = s - splashAt; ring.scale.setScalar(1 + r * 9); ring.material.opacity = r < 1.2 ? .8 * (1 - r / 1.2) : 0;
      lFlat.material.opacity = 1 - Math.min(1, k * 3); lTilt.material.opacity = Math.max(0, k * 3 - 2);
      sea.userData.tick(t);
      outer.rotation.y = Math.PI - .3 + Math.sin(t * .3) * .1; // stern faces right, away from the text
      g.position.y = Math.sin(t * 1.3) * .02;
    }
  };
}

// a calm backdrop for the photo slides: still water and a few bubbles drifting up
function sceneCalm() {
  const g = new THREE.Group(), sea = water(12); sea.position.set(4, -2.5, -2); g.add(sea);
  const n = 90, pos = new Float32Array(n * 3), seed = [...Array(n)].map(() => [Math.random() * 14 - 3, Math.random() * 6 - 4, Math.random(), .2 + Math.random() * .4]);
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.add(new THREE.Points(geo, new THREE.PointsMaterial({ size: .08, color: C.cyan, transparent: true, opacity: .5, depthWrite: false })));
  return {
    group: g, cam: [0, 1.5, 11], look: [0, 0, 0],
    update(t) {
      seed.forEach(([x, z, o, v], i) => { pos[i * 3] = x + Math.sin(t + o * 9) * .2; pos[i * 3 + 1] = -2.5 + ((t * v + o * 6) % 6); pos[i * 3 + 2] = z; });
      geo.attributes.position.needsUpdate = true; sea.userData.tick(t);
    }
  };
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
    [(m => (m.scale.setScalar(.6), m))(boatModel()), 'Bottle boat', '#ffb020'],
    [(m => (m.scale.setScalar(.55), m))(consoleModel(ctx.gameTex)), 'Game console', '#b07cff'],
    [ctx.couplerMesh(.09), '3D-printed coupler', '#7ce07c'],
  ];
  items.forEach(([m, name, col], i) => {
    const a = i / items.length * Math.PI * 2, holder = new THREE.Group();
    holder.position.set(Math.cos(a) * 3.1, 0, Math.sin(a) * 3.1); holder.add(m);
    const l = label(name, { color: col, size: .45 }); l.position.y = -1.9; holder.add(l);
    ring.add(holder); items[i].push(holder);
  });
  return {
    group: g, cam: [0, 3, 13], look: [-4.1, -.2, 0],
    update(t) {
      ring.rotation.y = t * .25;
      items.forEach(([m, , , h], i) => { m.rotation.y = -ring.rotation.y + t * .6 + i; h.position.y = Math.sin(t * 1.3 + i) * .2; m.userData.spin?.(t); m.userData.props?.forEach(p => (p.rotation.z = t * 30)); });
    }
  };
}

function sceneRecipe() {
  const g = new THREE.Group(), blocks = [];
  // a deck can rename the blocks: <body data-recipe="WHAT,DETAILS,RULES,CHECK"> (kids.html does)
  const words = (document.body.dataset.recipe || 'GOAL,CONTEXT,LIMITS,CHECK').split(',');
  [C.cyan, C.purple, C.orange, C.green].map((c, i) => [words[i], c]).forEach(([w, c], i) => {
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
    ['ESP32 brains (3)', 15.99, C.cyan], ['motor drivers', 7.99, C.purple], ['motors + brackets', 13.99, C.orange],
    ['real props', 7.59, C.red], ['jumper wires', 6.98, C.green], ['USB cables', 7, 0x9aa6b4], ['power bank (had one)', 0, 0xf2f0ea],
  ], blocks = [];
  let y = 0;
  parts.forEach(([name, gr, c], i) => {
    const h = Math.max(.12, gr * .1), b = new THREE.Group();
    b.add(box(2.4, h, 2.4, mat(c, { roughness: .35 })));
    const l = label(`${name}  $${gr.toFixed(2).replace('.00', '')}`, { size: .34 }); l.position.set(2.9, 0, 0); l.center.set(0, .5); b.add(l);
    b.userData.y = y + h / 2; y += h + .06;
    g.add(b); blocks.push(b);
  });
  // the cart total: a glowing ring on top
  const lim = new THREE.Mesh(new THREE.TorusGeometry(2.3, .04, 8, 64), glow(C.red, { opacity: .9 }));
  lim.rotation.x = Math.PI / 2; lim.position.y = y + .2; g.add(lim);
  const ll = label('cart total $59.54', { color: '#ff5a5a', size: .36 }); ll.position.set(2.9, lim.position.y + .45, 0); ll.center.set(0, .5); g.add(ll);
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
  const g = new THREE.Group(), P = ctx.wiring, s = .1;
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
  board(P.xiao, 'XIAO', C.pcb, 'brain: ESP32');
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
    group: pivot, cam: [0, 8.6, 9.4], look: [-4.2, -.8, 0],
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
export function createStage(canvas, opts = {}) {
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
    wiring: null,
    solo: !!opts.solo, onCaption: opts.onCaption,
    kit: { mat, glow, box, cyl, label, paint, ease, riders },   // helpers for scenes that live in other files
    boat: { BOAT, bottle, yardSign, zipTie, longTail, water },   // the real boat's parts, in cm (the wiring movie ends on it)
  };

  const BUILDERS = { brain: sceneBrain, ai: sceneAI, projects: sceneProjects, recipe: sceneRecipe, web: sceneWeb, coupler: sceneCoupler, shop: sceneShop, wiring: sceneWiring, flash: sceneFlash, game: sceneGame, wrong: sceneWrong, boat: sceneBoat, dunk: sceneDunk, calm: sceneCalm, safe: sceneSafe, open: sceneOpen, you: sceneYou, end: sceneBrain, ...opts.scenes };
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
  const ready = fetch('./wiring.json').then(r => r.json()).then(p => { ctx.wiring = p; }).catch(() => {});

  let active = null, last = null, flight = null;
  const timer = new THREE.Timer();
  const clock = { get elapsedTime() { return opts.time ? opts.time() : timer.getElapsed(); } };
  const v = new THREE.Vector3(), lookNow = new THREE.Vector3();
  // a scene can steer its own camera with camAt() (the build movie does)
  const camFor = sc => sc.origin.clone().add(new THREE.Vector3(...(sc.camAt?.().cam || sc.cam)));
  const lookFor = sc => sc.origin.clone().add(new THREE.Vector3(...(sc.camAt?.().look || sc.look)));

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

  const tick = () => {
    timer.update();
    const t = opts.time ? opts.time() : timer.getElapsed();
    if (!active) return renderer.render(scene, camera);
    active.update(t);   // first, so a scene that steers the camera is never a frame behind
    const toCam = camFor(active), toLook = lookFor(active);
    if (camera.userData.portrait) toLook.x = active.origin.x + active.look[0] * .15, toCam.y += 2;
    if (flight) {
      const k = Math.min(1, (t - flight.t0) / flight.dur), e = ease(k);
      // arc up and out between scenes so it feels like a swoop
      camera.position.lerpVectors(flight.from, toCam, e).add(v.set(0, Math.sin(e * Math.PI) * 6, Math.sin(e * Math.PI) * 10));
      lookNow.lerpVectors(flight.lookFrom, toLook, e);
      if (k >= 1) { flight = null; if (last && last !== active) last.group.visible = false; }
    } else {
      if (opts.solo) { camera.position.copy(toCam); lookNow.copy(toLook); }
      else { camera.position.lerp(toCam.add(v.set(mx * 1.2, -my * .8, 0)), .04); lookNow.lerp(toLook, .08); }
    }
    camera.lookAt(lookNow);
    if (flight && last) last.update(t);
    renderer.render(scene, camera);
  };
  // manual = a video renderer steps time itself and calls tick() once per frame
  if (!opts.manual) renderer.setAnimationLoop(tick);

  return { show, tick, camera };
}
