// The boat's LEGO build steps, as a 3D movie: every part drops into its real hole,
// every jumper wire draws itself in, sparks fly when a pin goes in, and when the power
// goes on, electricity runs along the wires and the lights on the ESP32, the driver and
// the nav LEDs switch on.
//
// The circuit below is copied from the boat's ONE circuit description,
// <local path> (which draws the boat site's ?p=steps).
// Same holes, same colours, same 13 steps. If a wire moves there, move it here too.
//
// Used two ways: the "build" slide in the talk, and full screen at talk/build.html
// (tools/boat-video.mjs build -> media/video/boat-wiring.mp4).
import * as THREE from 'three';

// ---------- the breadboard grid, same numbers as bbsteps.mjs (SVG pixels) ----------
const PX = 26, ROWS = { j: 0, i: 1, h: 2, g: 3, f: 4, e: 6, d: 7, c: 8, b: 9, a: 10 };
const cx = c => 70 + (c - 1) * PX, ry = r => 320 + ROWS[r] * PX;
const RAIL = { 'T+': 250, 'T-': 276, '-': ry('a') + 50, '+': ry('a') + 50 + PX };
const RAIL_GAP = new Set([6, 12, 18, 24, 30]);
const P = .254;                                   // one hole pitch = 2.54 mm; 1 scene unit = 1 cm
const X = px => (px - cx(15.5)) / PX * P, Z = py => (py - 450) / PX * P;
const T = -.85;                                   // the table, under the breadboard
const hole = id => {
  const m = /^([+-])(\d+)$/.exec(id);
  return m ? new THREE.Vector3(X(cx(+m[2])), 0, Z(RAIL[m[1]])) : new THREE.Vector3(X(cx(+id.slice(1))), 0, Z(ry(id[0])));
};

// where the off-board things sit (cm), and the end of each wire that leaves the board
const MOTORS = { R1: -3.4, R2: -2.0, L1: -.6, L2: .8 }, MZ = -4.5;
const clip = (m, k) => new THREE.Vector3(MOTORS[m] + (k ? .3 : -.3), T + .34, MZ + 1.3);
const LEDS = { R: [1.0, 0xff3b3b], G: [2.2, 0x2bff6a], Y: [3.4, 0xffd23b] }, LZ = 4.0;
const ledLeg = (c, k) => new THREE.Vector3(LEDS[c][0] + (k ? .14 : -.14), T + .62, LZ);
const BANK = new THREE.Vector3(3.3, T + .45, -4.3), USB = new THREE.Vector3(X(cx(30)) + .78, .64, Z(ry('f') + 6));
const AA = new THREE.Vector3(-2.3, T + .55, 4.5);

const C = { green: 0x16a34a, blue: 0x2563eb, gold: 0xca8a04, orange: 0xea580c, purple: 0x8b5cf6, black: 0x1a1a1a, red: 0xdc2626, grey: 0x6b7280, lead: 0x444444, teal: 0x0d9488, res: 0x9ca3af };

// wire: [id, from, to, colour, net, bow]. net = which power switches it on.
const WIRES = [
  ['g1', 'a29', '-29', C.black, 'esp'], ['g2', 'c8', '-8', C.black, 'drv'],
  ['s1', 'a21', 'c5', C.green, 'sig', 140], ['s2', 'a22', 'c6', C.blue, 'sig', 100],
  ['s3', 'a23', 'c9', C.gold, 'sig', 60], ['s4', 'a24', 'c10', C.orange, 'sig', 20],
  ['e1', 'j10', 'a25', C.purple, 'sig', -330],
  ['usb', BANK.clone().add(new THREE.Vector3(-1.45, 0, .3)), USB, 0x9aa1ab, 'esp', 0, .075],
  ['m1', 'j8', clip('L1', 0), C.lead, 'sig'], ['m2', 'j9', clip('L1', 1), C.lead, 'sig'],
  ['m3', 'j6', clip('R1', 0), C.lead, 'sig'], ['m4', 'j7', clip('R1', 1), C.lead, 'sig'],
  ['m5', 'i8', clip('L2', 0), C.lead, 'm2'], ['m6', 'i9', clip('L2', 1), C.lead, 'm2'],
  ['m7', 'i6', clip('R2', 0), C.lead, 'm2'], ['m8', 'i7', clip('R2', 1), C.lead, 'm2'],
  ['p1', 'c7', '+7', C.red, 'drv'],
  ['p2', AA.clone().add(new THREE.Vector3(-.7, .3, -1.25)), '+3', C.red, 'drv', 0, .05],
  ['p3', AA.clone().add(new THREE.Vector3(.7, .3, -1.25)), '-5', C.black, 'drv', 0, .05],
  ['l1', 'a26', ledLeg('R', 0), 0xef4444, 'lights'], ['l2', 'a27', ledLeg('G', 0), 0x22c55e, 'lights'], ['l3', 'a28', ledLeg('Y', 0), 0xeab308, 'lights'],
  ['l4', ledLeg('R', 1), '-23', C.black, 'lights'], ['l5', ledLeg('G', 1), '-27', C.black, 'lights'], ['l6', ledLeg('Y', 1), '-28', C.black, 'lights'],
  ['r1', '+9', 'e13', C.res, 'gauge', 0, .025], ['r2', 'd13', '-16', C.res, 'gauge', 0, .025], ['r3', 'b13', 'a19', C.teal, 'gauge', -60],
];

// the 13 steps of the boat site's ?p=steps. focus = [x, z, camera distance] for the close-up.
const STEPS = [
  { add: ['drv'], say: 'Motor driver across the middle groove: IN1 in hole d5', focus: [-2.4, 0, 6.5] },
  { add: ['esp'], say: 'ESP32 at the right end: the USB plug hangs off the edge', focus: [2.6, 0, 7.5] },
  { add: ['g1', 'g2'], say: 'Black ground wires: a29 and c8 into the − rail', focus: [0, 1.2, 8] },
  { add: ['s1', 's2'], say: 'Left motor signals: green a21 → c5, blue a22 → c6', focus: [-.4, .9, 7] },
  { add: ['s3', 's4'], say: 'Right motor signals: yellow a23 → c9, orange a24 → c10', focus: [-.2, .9, 7] },
  { add: ['e1'], say: 'The purple wire wakes the driver up: j10 → a25', focus: [0, 0, 7.5] },
  { add: ['bank', 'usb'], say: 'Power bank in: the ESP32 lights up and makes its own Wi-Fi', focus: [2.4, -1.6, 9], power: 'esp' },
  { add: ['L1', 'R1', 'm1', 'm2', 'm3', 'm4'], say: 'Motors in through WAGO clips: j8 + j9 and j6 + j7', focus: [-1.6, -2.6, 9] },
  { add: ['aa', 'p1', 'p2', 'p3'], say: 'Motor battery (6 AA = 9 V) into the + and − rails', focus: [-2, 2.4, 8.5], power: 'drv' },
  { add: [], say: 'First drive! Signals flow and the motors spin', focus: [-.5, -1.2, 11.5], power: 'sig' },
  { add: ['ledR', 'ledG', 'ledY', 'l1', 'l2', 'l3', 'l4', 'l5', 'l6'], say: 'Nav lights: red = port (left), green = starboard, yellow = stern', focus: [1.8, 2.6, 8.5], power: 'lights', opt: 1 },
  { add: ['L2', 'R2', 'm5', 'm6', 'm7', 'm8'], say: 'Upgrade: two more motors, one row lower (i8 + i9, i6 + i7)', focus: [-1.2, -2.8, 9], power: 'm2', opt: 1 },
  { add: ['r1', 'r2', 'r3'], say: 'Battery gauge: two resistors meet in column 13', focus: [-.8, 1.2, 6.5], power: 'gauge', opt: 1 },
];
const DUR = [4.4, 4.4, 4.6, 4.6, 4.6, 4.4, 6, 5.8, 5.8, 6, 6.2, 5.6, 5.6];
const T0 = DUR.reduce((a, d, i) => (a.push(a[i] + d), a), [0]);

// ---------- the finale: the finished bench goes into the real boat ----------
// Same cm as the boat model in scenes.js (ctx.boat.BOAT): the table turns into the yard sign,
// the bottles get zip-tied under it, the motors fly into the 45° holders at the back and the
// steel rods slant down to the props in the water. [t, caption, colour, camera]
// camera = [look x, look y, distance, elevation (rad), azimuth (rad)]
const FIN = [
  [0, 'Into the boat: the bench becomes the yard-sign deck', '#ff8787', [-3, -3, 30, .75, -.35]],
  [2.4, 'Two 1-liter bottles, zip-tied under the sign', '#3ad0ff', [-4, -6, 36, .32, -.25]],
  [5.6, 'The clear to-go box keeps the electronics dry', '#b07cff', [0, -1, 23, .8, -.3]],
  [8, 'Four motors go in the 45° holders, two per side', '#ffb020', [-14, -1, 30, .62, -.6]],
  [11.4, 'Steel rods slant down 45° to the props underwater', '#7ce07c', [-21, -6, 30, .22, -1.15]],
  [14.6, 'Power on: four props spin. Go!', '#7ce07c', [-9, -5, 46, .42, -.5]],
  [19, 'Done! 13 steps, one boat, zero soldering', '#7ce07c', null],
];
const FIN_LEN = 22;
export const BUILD_LOOP = T0[STEPS.length] + FIN_LEN;

// deterministic random, so every render of the video is identical
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function sceneBuild(ctx) {
  const { mat, box, cyl, label, paint, ease } = ctx.kit;
  const root = new THREE.Group();
  const dot = paint(64, 64, (x, w) => { const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, w); });
  const halo = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); s.scale.setScalar(size); return s; };
  const metal = mat(0xc9ced6, { metalness: .85, roughness: .25 }), gold = mat(0xd9b45a, { metalness: .8, roughness: .3 });

  // ---------- the table and the breadboard ----------
  const table = new THREE.Mesh(new THREE.CircleGeometry(9, 64), mat(0x1a2338, { roughness: .9 }));
  table.rotation.x = -Math.PI / 2; table.position.y = T; root.add(table);
  const x0 = X(cx(1)) - .5, x1 = X(cx(30)) + .5, z0 = Z(RAIL['T+']) - .45, z1 = Z(RAIL['+']) + .45;
  const bb = box(x1 - x0, .85, z1 - z0, mat(0xf4f2ec, { roughness: .8 })); bb.position.set(0, -.425, (z0 + z1) / 2); root.add(bb);
  const groove = box(x1 - x0 - .2, .03, .2, mat(0xd2cec4)); groove.position.set(0, .005, Z(450)); root.add(groove);
  const holeList = [];
  for (const r in ROWS) for (let c = 1; c <= 30; c++) holeList.push([X(cx(c)), Z(ry(r))]);
  for (const k in RAIL) for (let c = 1; c <= 30; c++) if (!RAIL_GAP.has(c)) holeList.push([X(cx(c)), Z(RAIL[k])]);
  const holes = new THREE.InstancedMesh(new THREE.BoxGeometry(.1, .012, .1), mat(0x2a2a2a), holeList.length);
  holeList.forEach(([x, z], i) => holes.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, .004, z)));
  root.add(holes);
  for (const [k, side] of [['T+', -1], ['T-', 1], ['-', -1], ['+', 1]]) {
    const line = box(x1 - x0 - .6, .01, .035, mat(k.endsWith('+') ? 0xdc2626 : 0x2563eb)); line.position.set(0, .006, Z(RAIL[k]) + side * .17); root.add(line);
  }

  // ---------- parts ----------
  const parts = {};
  const part = (id, obj, pins, name, col) => { obj.userData.home = obj.position.clone(); root.add(obj); parts[id] = { obj, pins, name: name && label(name, { color: col, size: .34 }) }; if (parts[id].name) { parts[id].name.material.opacity = 0; root.add(parts[id].name); } };

  { // DRV8833 across the groove, cols 5-10, pins in rows h and d
    const g = new THREE.Group(), xa = X(cx(5)), xb = X(cx(10)), za = Z(ry('h')), zb = Z(ry('d'));
    const pcb = box(xb - xa + .4, .12, zb - za + .45, mat(0x5b2bd6, { roughness: .5 })); pcb.position.set((xa + xb) / 2, .32, (za + zb) / 2); g.add(pcb);
    for (const z of [za, zb]) { const h = box(xb - xa + .25, .25, .25, mat(0x111111)); h.position.set((xa + xb) / 2, .125, z); g.add(h);
      for (let c = 5; c <= 10; c++) { const p = box(.06, .1, .06, gold); p.position.set(X(cx(c)), .42, z); g.add(p); } }
    const chip = box(.5, .1, .55, mat(0x111111)); chip.position.set((xa + xb) / 2, .43, (za + zb) / 2); g.add(chip);
    const led = box(.12, .06, .08, mat(0x550000, { emissive: 0xff2020, emissiveIntensity: 0 })); led.position.set(xb - .05, .41, (za + zb) / 2 + .35); g.add(led);
    const glowL = halo(0xff3030, .9); glowL.position.copy(led.position).add(new THREE.Vector3(0, .05, 0)); g.add(glowL);
    g.userData.led = [led, glowL];
    part('drv', g, [[xa, za], [xb, za], [xa, zb], [xb, zb]], 'DRV8833 · the muscle', '#b07cff');
    parts.drv.name.position.set((xa + xb) / 2, 1.3, za - .3);
  }
  { // ESP32 DevKit, cols 16-30, pins in rows b and j, antenna LEFT, USB RIGHT
    const g = new THREE.Group(), xa = X(cx(16)), xb = X(cx(30)), za = Z(ry('j')), zb = Z(ry('b')), zc = (za + zb) / 2;
    const p0 = xa - 1.0, p1 = xb + .62;
    const pcb = box(p1 - p0, .16, zb - za + .4, mat(0x15181f, { roughness: .9, metalness: 0 })); pcb.position.set((p0 + p1) / 2, .42, zc); g.add(pcb);
    for (const z of [za, zb]) { const h = box(xb - xa + .25, .34, .25, mat(0x111111)); h.position.set((xa + xb) / 2, .17, z); g.add(h);
      for (let c = 16; c <= 30; c++) { const p = box(.06, .1, .06, gold); p.position.set(X(cx(c)), .54, z); g.add(p); } }
    const can = box(1.75, .3, 1.55, metal); can.position.set(p0 + 1.3, .65, zc); g.add(can);
    const ant = box(.6, .02, 1.7, gold); ant.position.set(p0 + .36, .51, zc); g.add(ant);
    const usb = box(.62, .28, .78, metal); usb.position.set(p1 - .2, .64, zc); g.add(usb);
    for (const s of [-1, 1]) { const b = box(.34, .14, .34, mat(0x222222)); b.position.set(p1 - .75, .57, zc + s * .95); g.add(b); }
    const ledP = box(.12, .06, .08, mat(0x550000, { emissive: 0xff2020, emissiveIntensity: 0 })); ledP.position.set(p1 - 1.25, .53, zc + .5); g.add(ledP);
    const ledB = box(.12, .06, .08, mat(0x001133, { emissive: 0x3a7bff, emissiveIntensity: 0 })); ledB.position.set(p1 - 1.25, .53, zc - .5); g.add(ledB);
    const hp = halo(0xff3030, 1), hb = halo(0x4a8cff, 1.5); hp.position.copy(ledP.position).add(new THREE.Vector3(0, .06, 0)); hb.position.copy(ledB.position).add(new THREE.Vector3(0, .06, 0)); g.add(hp, hb);
    g.userData = { power: [ledP, hp], blue: [ledB, hb], center: new THREE.Vector3((p0 + p1) / 2, .6, zc) };
    part('esp', g, [[xa, za], [xb, za], [xa, zb], [xb, zb], [X(cx(23)), zb]], 'ESP32 · the brain', '#3ad0ff');
    parts.esp.name.position.set((p0 + p1) / 2, 1.5, za - .2);
  }
  { // power bank + cable end
    const g = new THREE.Group();
    const b = box(2.9, .9, 1.45, mat(0x2b2f38, { roughness: .4 })); g.add(b);
    const strip = box(.6, .04, .08, mat(0x002244, { emissive: 0x3ad0ff, emissiveIntensity: 0 })); strip.position.set(.6, .46, .5); g.add(strip);
    g.position.copy(BANK); g.userData.strip = strip;
    part('bank', g, [[BANK.x - 1.4, BANK.z + .3]], 'USB power bank · for the brain', '#cfd8f2');
    parts.bank.name.position.set(BANK.x, 1.1, BANK.z);
  }
  // motors: props OFF, so a green 3D-printed coupler on the shaft shows them spinning
  for (const m in MOTORS) {
    const g = new THREE.Group(), x = MOTORS[m];
    const can = cyl(.62, .62, 1.15, metal); can.rotation.x = Math.PI / 2; g.add(can);
    const cap = cyl(.5, .5, .1, mat(0x8a5a2b)); cap.rotation.x = Math.PI / 2; cap.position.z = .6; g.add(cap);
    const spin = new THREE.Group(); spin.position.z = -.6; g.add(spin);
    const shaft = cyl(.04, .04, .5, metal, 8); shaft.rotation.x = Math.PI / 2; shaft.position.z = -.25; spin.add(shaft);
    const cpl = cyl(.14, .14, .45, mat(0x7ce07c, { emissive: 0x0a3a14, emissiveIntensity: .5 }), 12); cpl.rotation.x = Math.PI / 2; cpl.position.z = -.4; spin.add(cpl);
    const flag = box(.04, .32, .3, mat(0xffffff)); flag.position.set(0, .16, -.4); spin.add(flag);
    g.position.set(x, T + .62, MZ);
    // two WAGO clips with the motor's own leads going to them
    for (const k of [0, 1]) {
      const w = box(.3, .3, .5, mat(0xe8eef4, { transparent: true, opacity: .75 })); w.position.set((k ? .3 : -.3), -.47, 1.3); g.add(w);
      const lever = box(.28, .06, .3, mat(0xff7a1a)); lever.position.set((k ? .3 : -.3), -.29, 1.42); g.add(lever);
      const lead = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(k ? .2 : -.2, 0, .62), new THREE.Vector3(k ? .3 : -.3, -.2, .9), new THREE.Vector3(k ? .3 : -.3, -.45, 1.1)]), 12, .03, 6), mat(k ? 0x111111 : 0xd42020));
      g.add(lead);
    }
    g.userData.spin = spin;
    const side = m[0] === 'L' ? 'LEFT' : 'RIGHT', two = m[1] === '2';
    part(m, g, [[x - .3, MZ + 1.3], [x + .3, MZ + 1.3]], `${side} motor${two ? ' #2' : ''}`, '#ffb020');
    parts[m].name.position.set(x, .9, MZ);
  }
  { // 8×AA holder: 6 real cells + 2 dummies
    const g = new THREE.Group();
    const tray = box(4.4, .5, 2.5, mat(0x161616)); tray.position.y = -.3; g.add(tray);
    for (let r = 0; r < 4; r++) for (let k = 0; k < 2; k++) {
      const dummy = r === 3;
      const cell = cyl(.26, .26, 1.95, dummy ? mat(0xb08850) : mat(0x2f9e44, { metalness: .3 }), 16); cell.rotation.z = Math.PI / 2;
      cell.position.set(-1.05 + k * 2.1, -.05, -.84 + r * .56); g.add(cell);
      if (dummy) { const foil = cyl(.27, .27, .3, metal, 16); foil.rotation.z = Math.PI / 2; foil.position.copy(cell.position).add(new THREE.Vector3(k ? .8 : -.8, 0, 0)); g.add(foil); }
    }
    const sw = box(.5, .12, .3, mat(0xeeeeee)); sw.position.set(1.7, .0, 1.05); g.add(sw);
    g.position.copy(AA);
    part('aa', g, [[AA.x - .7, AA.z - 1.25], [AA.x + .7, AA.z - 1.25]], '6 AA + 2 dummies = 9 V · for the motors', '#ff8787');
    parts.aa.name.position.set(AA.x, 1.9, AA.z - .3);
  }
  for (const c in LEDS) { // nav lights: 5 mm LED with a resistor on the long leg
    const [x, col] = LEDS[c], g = new THREE.Group();
    const lens = new THREE.Mesh(new THREE.CapsuleGeometry(.24, .35, 6, 16), new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: .55, emissive: col, emissiveIntensity: 0, roughness: .2 }));
    lens.position.y = 1.15; g.add(lens);
    for (const k of [0, 1]) { const leg = cyl(.02, .02, .6, metal, 6); leg.position.set(k ? .14 : -.14, .62, 0); g.add(leg); }
    const res = cyl(.07, .07, .3, mat(0xd8c7a0), 10); res.position.set(-.14, .45, 0); g.add(res);
    const base = box(.7, .1, .5, mat(0x333333)); base.position.y = .05; g.add(base);
    const h = halo(col, 2.4); h.position.y = 1.2; g.add(h);
    const light = new THREE.PointLight(col, 0, 5); light.position.y = 1.4; g.add(light);
    g.position.set(x, T, LZ); g.userData = { lens, h, light };
    part('led' + c, g, [[x, LZ]], { R: 'RED · port', G: 'GREEN · starboard', Y: 'YELLOW · stern' }[c], '#' + col.toString(16).padStart(6, '0'));
    parts['led' + c].name.position.set(x, 1.4, LZ + .5);
  }

  // ---------- wires ----------
  const wires = {};
  for (const [id, a, b, color, net, bow = 0, r = .04] of WIRES) {
    const onA = typeof a === 'string', onB = typeof b === 'string';
    const A = onA ? hole(a).add(new THREE.Vector3(0, .4, 0)) : a.clone(), B = onB ? hole(b).add(new THREE.Vector3(0, .4, 0)) : b.clone();
    const d = A.distanceTo(B), h = Math.min(1.7, .35 + d * .2 + Math.abs(bow) * .0015);
    const off = new THREE.Vector3(0, 0, bow * .0012);
    const curve = new THREE.CubicBezierCurve3(A, A.clone().add(new THREE.Vector3(0, h, 0)).add(off), B.clone().add(new THREE.Vector3(0, h, 0)).add(off), B);
    const col = new THREE.Color(color);
    const m = mat(col, { emissive: col, emissiveIntensity: .12, roughness: .4 });
    const geo = new THREE.TubeGeometry(curve, 64, r, 8); const tube = new THREE.Mesh(geo, m); root.add(tube);
    const ends = [];
    for (const [on, P0] of [[onA, A], [onB, B]]) {
      if (!on) { ends.push(null); continue; }
      const g = new THREE.Group(); g.position.copy(P0).setY(0);
      const hs = box(.11, .38, .11, mat(0x151515)); hs.position.y = .2; g.add(hs);
      root.add(g); ends.push(g);
    }
    let res = null;
    if (id === 'r1' || id === 'r2') { // a resistor body halfway along, with its colour bands
      res = new THREE.Group(); const body = cyl(.09, .09, .5, mat(0xd8c7a0), 12); res.add(body);
      (id === 'r1' ? [0xfacc15, 0x7c3aed, 0x111111, 0xdc2626] : [0x7c3f12, 0x111111, 0x111111, 0xdc2626]).forEach((c, i) => { const band = cyl(.095, .095, .05, mat(c), 12); band.position.y = -.16 + i * .09; res.add(band); });
      res.position.copy(curve.getPointAt(.5)); res.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), curve.getTangentAt(.5)); root.add(res);
      const t = label(id === 'r1' ? '47k' : '10k', { size: .26, color: '#e5e7eb' }); t.position.copy(res.position).add(new THREE.Vector3(0, .4, 0)); root.add(t); res.userData.tag = t;
    }
    // electricity: glowing dots that run along the wire once it's live
    const sparkCol = color === C.black || color === C.lead ? 0x9fd8ff : col.clone().lerp(new THREE.Color(0xffffff), .5);
    const runners = [...Array(Math.max(3, Math.round(d * 2.2)))].map(() => { const s = halo(sparkCol, .32); root.add(s); return s; });
    const tags = [onA && label(a.replace('-', '− rail ').replace('+', '+ rail '), { size: .22, color: '#ffffff' }), onB && label(b.replace('-', '− rail ').replace('+', '+ rail '), { size: .22, color: '#ffffff' })]
      .map((t, i) => { if (!t) return null; t.position.copy(i ? B : A).add(new THREE.Vector3(0, .45, 0)); t.material.opacity = 0; root.add(t); return t; });
    wires[id] = { tube, geo, ends, curve, net, runners, tags, res, A, B, count: geo.index.count, ring: 8 * 6 };
  }

  // ---------- sparks ----------
  const N = 700, spos = new Float32Array(N * 3), scol = new Float32Array(N * 3);
  const sgeo = new THREE.BufferGeometry(); sgeo.setAttribute('position', new THREE.BufferAttribute(spos, 3)); sgeo.setAttribute('color', new THREE.BufferAttribute(scol, 3));
  const sparks = new THREE.Points(sgeo, new THREE.PointsMaterial({ size: .11, map: dot, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  sparks.frustumCulled = false; root.add(sparks);
  const SP = [...Array(N)].map(() => ({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), c: new THREE.Color() }));
  let nextSpark = 0;
  const burst = (at, n, color, speed = 1.4) => {
    for (let i = 0; i < n; i++) {
      const s = SP[nextSpark++ % N]; s.p.copy(at);
      s.v.set(rnd() - .5, rnd() * .9 + .4, rnd() - .5).normalize().multiplyScalar(speed * (.5 + rnd()));
      s.max = s.life = .35 + rnd() * .5; s.c.set(color).lerp(new THREE.Color(0xffffff), rnd() * .5);
    }
  };
  const stepSparks = dt => SP.forEach((s, i) => {
    if (s.life > 0) { s.life -= dt; s.v.y -= 5 * dt; s.p.addScaledVector(s.v, dt); if (s.p.y < 0 && Math.abs(s.p.x) < 4 && Math.abs(s.p.z) < 2.4) { s.p.y = 0; s.v.y *= -.35; } }
    const k = Math.max(0, s.life / s.max);
    spos[i * 3] = s.p.x; spos[i * 3 + 1] = s.life > 0 ? s.p.y : -99; spos[i * 3 + 2] = s.p.z;
    scol[i * 3] = s.c.r * k; scol[i * 3 + 1] = s.c.g * k; scol[i * 3 + 2] = s.c.b * k;
  });
  // a ring of light that whooshes out when something powers on
  const rings = [...Array(4)].map(() => { const m = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; root.add(m); return m; });

  // ---------- the boat it all goes into (only seen in the finale) ----------
  const { BOAT, bottle, yardSign, zipTie, longTail, water } = ctx.boat;
  const deckTop = 2 * BOAT.bottleR + BOAT.deckT;
  const BX = .2, BZ = .4, BL = 14, BW = 13, BH = 5.5;          // the to-go box, around the breadboard
  const boat = new THREE.Group(); boat.position.set(BX - BOAT.boxX, T - deckTop, 0); root.add(boat);
  const deck = yardSign(); deck.position.y = deckTop - BOAT.deckT / 2; boat.add(deck);
  const bottles = [-1, 1].map(sd => { const b = bottle(); b.position.set(0, BOAT.bottleR, sd * BOAT.bottleZ); boat.add(b); return b; });
  const ties = [];
  for (const x of [-9, 9]) for (const zc of [-BOAT.bottleZ, BOAT.bottleZ]) { const z = zipTie(zc); z.position.x = x; boat.add(z); ties.push([z, zc]); }
  const pet = () => mat(0xeaf6ff, { transparent: true, opacity: .16, roughness: .05, metalness: 0, side: THREE.DoubleSide, depthWrite: false });
  const edge = geo => new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .75 }));
  const togo = new THREE.Group(); togo.position.set(BX, T, BZ); root.add(togo);
  { const tg = new THREE.BoxGeometry(BL, BH * .55, BW); tg.translate(0, BH * .275, 0); togo.add(new THREE.Mesh(tg, pet()), edge(tg)); }
  const lid = new THREE.Group(); lid.position.set(0, BH * .55, -BW / 2); togo.add(lid);
  { const lg = new THREE.BoxGeometry(BL, BH * .45, BW); lg.translate(0, BH * .225, BW / 2); lid.add(new THREE.Mesh(lg, pet()), edge(lg)); }
  // the bench motors map onto the four holders: left = port (−z), right = starboard (+z)
  const SEAT = { L1: -5, L2: -10, R1: 5, R2: 10 };
  const tails = {};
  for (const m in SEAT) {
    const t = longTail(); t.position.set(BOAT.motorX, deckTop, SEAT[m]); boat.add(t);
    const u = t.userData; u.home = u.tail.position.clone(); u.homeQ = u.tail.quaternion.clone();
    // where the bench motor is, in this holder's own coordinates
    u.from = parts[m].obj.userData.home.clone().sub(boat.position).sub(t.position);
    u.fromQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
    tails[m] = t;
  }
  const holderW = m => boat.position.clone().add(tails[m].position);
  const propW = m => holderW(m).add(new THREE.Vector3(-Math.cos(Math.PI / 4) * BOAT.rodEnd, BOAT.motorH + .2 - Math.sin(Math.PI / 4) * BOAT.rodEnd, 0));
  // motor leads: out of the back of the box to the top of each motor
  const leads = Object.keys(SEAT).map((m, i) => {
    const A = new THREE.Vector3(BX - BL / 2 + .3, T + 1.2, BZ + (i - 1.5) * 1.2);
    const B = holderW(m).add(new THREE.Vector3(1.1, BOAT.motorH + 1.3, 0));
    const curve = new THREE.CatmullRomCurve3([A, A.clone().lerp(B, .5).setY(T + 2.6), B]);
    const col = new THREE.Color(m[0] === 'L' ? 0xe03131 : 0xffb020);
    const geo = new THREE.TubeGeometry(curve, 48, .12, 6), tube = new THREE.Mesh(geo, mat(col, { emissive: col, emissiveIntensity: .2 })); root.add(tube);
    const runners = [...Array(5)].map(() => { const s = halo(0x9fd8ff, .7); root.add(s); return s; });
    return { m, curve, geo, tube, runners, count: geo.index.count };
  });
  const sea = water(45); root.add(sea);
  const SEA_Y = T - deckTop + BOAT.water;
  sea.material.opacity = 0; sea.renderOrder = 5; sea.position.x = -10; sea.material.color.set(0x0e5aa8);
  // bubbles streaming back from each prop
  const NB = 240, bpos = new Float32Array(NB * 3), bseed = [...Array(NB)].map((_, i) => [rnd(), rnd() - .5, rnd() - .5, i % 4]);
  const bgeo = new THREE.BufferGeometry(); bgeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
  const bubbles = new THREE.Points(bgeo, new THREE.PointsMaterial({ size: .45, color: 0xe7f5ff, map: dot, transparent: true, opacity: 0, depthWrite: false }));
  bubbles.frustumCulled = false; root.add(bubbles);
  const finObjs = [deck, ...bottles, togo, ...leads.map(l => l.tube), sea, bubbles, ...ties.map(z => z[0]), ...Object.values(tails)];
  table.material.transparent = true;

  // ---------- the timeline ----------
  // every item gets a start time; parts drop in first, then the wires draw themselves
  const when = {}, events = [];
  STEPS.forEach((st, i) => {
    const ps = st.add.filter(id => parts[id]), ws = st.add.filter(id => wires[id]);
    ps.forEach((id, k) => { when[id] = [T0[i] + .5 + k * .35, .8]; parts[id].pins.forEach(([x, z]) => events.push([when[id][0] + .8, 'burst', new THREE.Vector3(x, .3, z), 14, 0xffd27a])); });
    ws.forEach((id, k) => {
      const t = T0[i] + .6 + ps.length * .35 + (ps.length ? .5 : 0) + k * .5; when[id] = [t, 1];
      const w = wires[id];
      if (w.ends[0]) events.push([t + .05, 'burst', w.A.clone().setY(.1), 10, 0xffe08a]);
      events.push([t + 1, 'burst', w.B.clone().setY(w.ends[1] ? .1 : w.B.y), 16, 0xffe08a]);
    });
  });
  const LIVE = { esp: T0[6] + 2.6, drv: T0[8] + 3.4, sig: T0[9] + .6, lights: T0[10] + 4.4, m2: T0[11] + 3.6, gauge: T0[12] + 3.2 };
  const espC = () => parts.esp.obj.userData.center.clone();
  events.push([LIVE.esp, 'power', () => espC(), 0x3ad0ff], [LIVE.drv, 'power', () => new THREE.Vector3(X(cx(7.5)), .5, Z(450)), 0xff6a3a],
    [LIVE.sig, 'power', () => new THREE.Vector3(-1.5, .5, MZ + .6), 0x7ce07c], [LIVE.m2, 'power', () => new THREE.Vector3(-.6, .5, MZ + .6), 0xffb020],
    [LIVE.gauge, 'power', () => new THREE.Vector3(X(cx(13)), .4, Z(450)), 0x2dd4bf]);
  for (const c in LEDS) events.push([LIVE.lights + (c === 'R' ? 0 : c === 'G' ? .25 : .5), 'burst', new THREE.Vector3(LEDS[c][0], T + 1.2, LZ), 30, LEDS[c][1]]);
  const ringAt = [];
  const fire = ([te, kind, at, n, color]) => {
    if (kind === 'burst') return burst(at, n, color);
    const p = at(); burst(p, 60, color, 2.2); ringAt.push([te, p, color]);
  };

  const live = net => s => s >= LIVE[net];
  const stepAt = s => { let i = 0; while (i < STEPS.length - 1 && s >= T0[i + 1]) i++; return i; };
  const camFor = (i, s) => {
    const [fx, fz, dist] = i < 0 ? [0, -.6, 12.5] : STEPS[i].focus;
    return { look: new THREE.Vector3(fx, 0, fz * .7), dist };
  };
  let lastS = -1, lastT = 0, view = { cam: [0, 8, 9], look: [0, 0, 0] };
  const solo = !!ctx.solo;

  return {
    group: root, cam: [0, 8, 9], look: [-3.6, 0, 0], LOOP: BUILD_LOOP,
    camAt: () => view,
    enter(t) { lastT = t; lastS = -1; this.t0 = t; },
    update(t) {
      const s = (t - (this.t0 || 0)) % BUILD_LOOP, dt = Math.min(.1, Math.max(0, t - lastT)); lastT = t;
      if (s < lastS) { SP.forEach(p => (p.life = 0)); ringAt.length = 0; lastS = -1; }
      for (const e of events) if (e[0] > lastS && e[0] <= s) fire(e);
      lastS = s;
      const si = stepAt(s), inHold = s >= T0[STEPS.length];

      // parts drop in with a little bounce, and show their name while it's their step
      for (const id in parts) {
        const p = parts[id], [ta, du] = when[id] || [0, 0], k = Math.min(1, Math.max(0, (s - ta) / du));
        p.obj.visible = s >= ta;
        const e = k < 1 ? 1 - Math.pow(1 - k, 3) : 1, bounce = k >= 1 ? Math.max(0, Math.sin((s - ta - du) * 14)) * .06 * Math.exp(-(s - ta - du) * 6) : 0;
        p.obj.position.copy(p.obj.userData.home).add(new THREE.Vector3(0, (1 - e) * 3.2 + bounce, 0));
        const mine = !inHold && STEPS[si].add.includes(id);
        p.name.material.opacity = mine ? Math.min(1, (s - ta) * 3) : 0;
      }
      // wires draw on from their first end, the hole names pop up while it's their step
      for (const id in wires) {
        const w = wires[id], [ta, du] = when[id], k = Math.min(1, Math.max(0, (s - ta) / du));
        w.tube.visible = k > 0;
        const segs = Math.floor(ease(k) * w.count / w.ring) * w.ring; w.geo.setDrawRange(0, segs);
        w.ends.forEach((g, i) => g && (g.visible = i === 0 ? k > 0 : k >= 1));
        const mine = !inHold && STEPS[si].add.includes(id);
        w.tags.forEach((tg, i) => tg && (tg.material.opacity = mine && (i === 0 ? k > 0 : k >= 1) ? .95 : 0));
        if (w.res) { w.res.visible = k >= .5; w.res.userData.tag.material.opacity = mine && k >= .5 ? 1 : 0; }
        const on = k >= 1 && live(w.net)(s), n = w.runners.length;
        w.tube.material.emissiveIntensity = on ? .35 + .15 * Math.sin(t * 9 + n) : .12;
        w.runners.forEach((r, i) => {
          r.visible = on;
          if (on) { const u = ((t * (w.net === 'sig' ? .9 : .55)) + i / n) % 1; r.position.copy(w.curve.getPointAt(u)); r.material.opacity = .65 + .35 * Math.sin(t * 31 + i * 7); }
        });
      }
      // lights
      const esp = parts.esp.obj.userData, drv = parts.drv.obj.userData;
      const espOn = live('esp')(s), drvOn = live('drv')(s), sigOn = live('sig')(s);
      esp.power[0].material.emissiveIntensity = espOn ? 3 : 0; esp.power[1].material.opacity = espOn ? .9 : 0;
      const blue = espOn ? (sigOn ? .7 + .3 * Math.sin(t * 20) : (Math.sin(t * 6) > 0 ? 1 : 0)) : 0;
      esp.blue[0].material.emissiveIntensity = blue * 3; esp.blue[1].material.opacity = blue;
      drv.led[0].material.emissiveIntensity = drvOn ? 3 : 0; drv.led[1].material.opacity = drvOn ? .9 : 0;
      parts.bank.obj.userData.strip.material.emissiveIntensity = s >= when.bank[0] + .8 ? 2 : 0;
      for (const c in LEDS) {
        const u = parts['led' + c].obj.userData, on = live('lights')(s) ? (c === 'Y' && !sigOn ? (Math.sin(t * 5) > 0 ? 1 : .15) : 1) : 0;
        const k = on * (.9 + .1 * Math.sin(t * 3 + LEDS[c][0]));
        u.lens.material.emissiveIntensity = 1.6 * k; u.h.material.opacity = .85 * k; u.light.intensity = 6 * k;
      }
      // motors: the left pair runs a bit faster now and then, so you can see it steer
      for (const m in MOTORS) {
        const go = m[1] === '2' ? live('m2')(s) : sigOn;
        const sp = go ? (m[0] === 'L' ? 1 : .55 + .45 * Math.sin(t * .8) ** 2) * Math.min(1, (s - (m[1] === '2' ? LIVE.m2 : LIVE.sig)) * 1.5) : 0;
        const u = parts[m].obj.userData; u.spin.rotation.z = (u.angle = (u.angle || 0) + sp * 40 * dt);
      }
      // power-on rings
      rings.forEach((r, i) => {
        const e = ringAt[ringAt.length - 1 - i];
        if (!e || s - e[0] > 1.2) { r.material.opacity = 0; return; }
        const k = (s - e[0]) / 1.2; r.position.copy(e[1]).setY(e[1].y + .02); r.scale.setScalar(.3 + k * 5); r.material.color.set(e[2]); r.material.opacity = (1 - k) * .8;
      });
      stepSparks(dt); sgeo.attributes.position.needsUpdate = true; sgeo.attributes.color.needsUpdate = true;

      // ---------- finale: into the boat ----------
      const fs = s - T0[STEPS.length], e01 = (a, b) => ease(Math.min(1, Math.max(0, (fs - a) / (b - a))));
      finObjs.forEach(o => (o.visible = inHold));
      table.material.opacity = 1 - e01(0, 1); table.visible = table.material.opacity > 0;
      if (inHold) {
        const fi = FIN.reduce((n, [at], i) => (fs >= at ? i : n), 0);
        deck.position.y = deckTop - BOAT.deckT / 2 - (1 - e01(.3, 1.6)) * 14; deck.visible = fs > .3;
        bottles.forEach((b, i) => { b.position.z = (i ? 1 : -1) * (BOAT.bottleZ + (1 - e01(2.4, 3.6)) * 30); });
        ties.forEach(([z, zc], i) => { const a = 3.9 + i * .35, e = e01(a, a + .3); z.visible = fs > a; z.scale.set(1, 1 + (1 - e) * .8, 1 + (1 - e) * .8);
          if (fs > a + .3 && fs - dt <= a + .3) burst(boat.position.clone().add(new THREE.Vector3(z.position.x, deckTop + .3, zc + 2)), 22, 0xffffff, 3); });
        togo.position.y = T + (1 - e01(5.6, 6.6)) * 22; togo.visible = fs > 5.6;
        lid.rotation.x = -1.9 * (1 - e01(6.9, 7.7));
        Object.keys(SEAT).forEach((m, i) => {
          const tl = tails[m], u = tl.userData, a = 8.6 + i * .4, e = e01(a, a + 1.5);
          // the holder drops in first, then the motor flies off the bench into it
          const hk = e01(8 + i * .15, 8.6 + i * .15); tl.position.y = deckTop + (1 - hk) * 10; tl.visible = fs > 8 + i * .15;
          parts[m].obj.visible = fs < a;
          u.tail.visible = fs >= a;
          u.tail.position.lerpVectors(u.from, u.home, e).y += Math.sin(e * Math.PI) * 6;
          u.tail.quaternion.slerpQuaternions(u.fromQ, u.homeQ, e); u.tail.scale.setScalar(.5 + .5 * e);
          if (fs >= a + 1.5 && fs - dt < a + 1.5) burst(holderW(m).add(new THREE.Vector3(0, BOAT.motorH + .5, 0)), 30, 0xffb020, 3);
          const r = e01(11.9 + i * .2, 13.2 + i * .2);
          u.coupler.visible = r > 0; u.coupler.scale.y = Math.max(.01, r);
          u.rod.scale.x = Math.max(.001, r); u.prop.position.x = 4.2 + (BOAT.rodEnd - 4.2) * r; u.prop.visible = r > .02;
          if (r >= 1 && fs - dt < 13.2 + i * .2) burst(propW(m), 26, 0x7ce07c, 2.5);
          const go = Math.min(1, Math.max(0, (fs - 14.6) * .8)) * (m[0] === 'L' ? 1 : .6 + .4 * Math.sin(t * .8) ** 2);
          u.prop.rotation.x = (u.angle = (u.angle || 0) + go * 30 * dt * (m[0] === 'L' ? 1 : -1));
        });
        // the bench leads unclip as each motor leaves; the long boat leads draw in
        for (const id of ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8']) {
          const m = { m1: 'L1', m2: 'L1', m3: 'R1', m4: 'R1', m5: 'L2', m6: 'L2', m7: 'R2', m8: 'R2' }[id];
          if (!parts[m].obj.visible) { const w = wires[id]; w.tube.visible = false; w.ends.forEach(g => g && (g.visible = false)); w.runners.forEach(r => (r.visible = false)); }
        }
        leads.forEach((l, i) => {
          const k = e01(10.4 + i * .2, 11.2 + i * .2); l.tube.visible = k > 0;
          l.geo.setDrawRange(0, Math.floor(k * l.count / 36) * 36);
          const on = fs > 14.6;
          l.runners.forEach((r, j) => { r.visible = on; if (on) { r.position.copy(l.curve.getPointAt((t * .7 + j / 5) % 1)); r.material.opacity = .7 + .3 * Math.sin(t * 29 + j * 5); } });
        });
        if (fs >= 14.6 && fs - dt < 14.6) { burst(new THREE.Vector3(BX, T + 3, BZ), 80, 0x3ad0ff, 4); ringAt.push([s, new THREE.Vector3(BX, T + .1, BZ), 0x7ce07c]); }
        const se = e01(11.4, 12.4); sea.position.y = SEA_Y - (1 - se) * 4; sea.material.opacity = .93 * se; sea.visible = se > 0; sea.userData.tick(t);
        const drive = Math.min(1, Math.max(0, fs - 14.8));
        bubbles.material.opacity = .85 * drive;
        const PA = Object.keys(SEAT).map(propW);
        bseed.forEach(([life, dy, dz, w], i) => {
          const a = (life + fs * .8) % 1, p = PA[w];
          bpos[i * 3] = p.x - a * 14; bpos[i * 3 + 1] = Math.min(SEA_Y - .1, p.y + a * 5 + dy); bpos[i * 3 + 2] = p.z + dz * 3 * a;
        });
        bgeo.attributes.position.needsUpdate = true;
        boat.position.y = T - deckTop + Math.sin(t * 1.4) * .15 * drive;
        ctx.onCaption?.(FIN[fi][1], FIN[fi][2], 100 + fi);
      }

      // camera: glide to each step's close-up, then out to the boat for the finale
      const a = camFor(inHold ? STEPS.length - 1 : si, s), b = camFor(si - 1, s);
      const since = s - T0[si], k = ease(Math.min(1, since / 1.3));
      // on a talk slide the text sits on the left, so stay wide and keep the board on the right half
      const wide = !solo && camFor(-1, s);
      const look = wide ? wide.look.clone() : (si === 0 && !inHold) ? a.look : b.look.clone().lerp(a.look, k);
      const dist = wide ? wide.dist : (si === 0 && !inHold) ? a.dist : b.dist + (a.dist - b.dist) * k;
      const az = wide ? -.3 + .25 * Math.sin(s * .08) : -.3 + .18 * Math.sin(s * .11);
      let cam = look.clone().add(new THREE.Vector3(Math.sin(az) * dist * .55, dist * .8, Math.cos(az) * dist * .62));
      if (wide) { look.x -= dist * .4; cam.x -= dist * .4; }
      if (inHold) { // finale camera: blend from the bench view through each FIN key
        const keyAt = i => { const [lx, ly, d, el, az0] = FIN[Math.min(i, FIN.length - 2)][3], z = az0 + (i >= FIN.length - 2 ? Math.max(0, fs - FIN[FIN.length - 2][0]) * .13 : 0);
          const L = new THREE.Vector3(lx, ly, 0), C = L.clone().add(new THREE.Vector3(Math.sin(z) * Math.cos(el), Math.sin(el), Math.cos(z) * Math.cos(el)).multiplyScalar(d));
          if (!solo) { const sh = new THREE.Vector3(Math.cos(z), 0, -Math.sin(z)).multiplyScalar(-d * .4); L.add(sh); C.add(sh); }
          return [C, L]; };
        const fi = FIN.reduce((n, [at], i) => (fs >= at ? i : n), 0), kf = ease(Math.min(1, (fs - FIN[fi][0]) / 1.8));
        const [C1, L1] = keyAt(fi), [C0, L0] = fi ? keyAt(fi - 1) : [cam, look];
        cam = C0.clone().lerp(C1, kf); look.copy(L0.clone().lerp(L1, kf));
      }
      view = { cam: cam.toArray(), look: look.toArray() };

      // tell the page what to caption
      if (!inHold) ctx.onCaption?.(`${si + 1}  ${STEPS[si].say}`, STEPS[si].opt ? '#b07cff' : '#3ad0ff', si);
    }
  };
}
