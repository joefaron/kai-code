// The talking Polaroid: a web port of Fish Wrangler 3D's coach rig (FWCoachFace.cs; fw3d's
// Tools/art/diego/talk_preview.py replays the same constants). The textures are the game's own.
// Layers, back to front: the backdrop for the time of day -> the body -> a mouth cell -> an eye cell
// -> rain -> the paper frame. The whole rig is tinted for the hour, sways, breathes, nods on loud
// syllables and leans between poses, exactly like the trailers.
//   const c = coach(canvas); c.say(who, text, scene); c.level(0..1 every frame); c.quiet();
const R = 'audio/cast/rig/';
const WIN = [30, 32, 367, 441];                        // the photo window on the 400x548 paper
const BODY_OF_WIN = 1.12, BODY_TOP_OVER = 0.02, PIVOT_Y = 0.12;
const RECTS = {                                        // x, y-from-bottom, w, h, as parts of the body
  diego: { mouth: [0.2984, 0.4426, 0.3773, 0.1520], eye: [0.3153, 0.6136, 0.3463, 0.1753] },
  earl:  { mouth: [0.3378, 0.3750, 0.3266, 0.1774], eye: [0.3041, 0.6199, 0.3941, 0.1182] },
};
const OPEN = 60, CLOSE = 40;
const SWAY_DEG = 1.2, SWAY_T = 4.1, BREATH = 0.008, BREATH_T = 3.3;
const NOD_KICK = 55, NOD_SPRING = 160, NOD_DAMP = 14, NOD_HIT = 0.7;
const LEAN_DEG = 5, LEAN_EASE = 0.32, LEAN_QUIET = 0.5;
const LEAN_CYCLE = [-1, 0.7, 0.1, 1, -0.55, 0.35, -0.9, 0.85, -0.15], LEAN_HOLD = [1.7, 2.4, 1.2, 2.9, 1.9, 1.4, 2.6];
const TALK_BOB = 0.012, PARALLAX = 0.006;
const BLINK_GAP = [3.1, 4.4, 2.6, 5.0, 3.7, 2.9], BLINK_HOLD = 0.13;
const TINT = { morning: [1, .94, .88], day: [1, 1, 1], sunset: [1, .86, .74], night: [.66, .70, .84], rain: [.84, .88, .94] };
// eye cells: 1 blink, 2 half-lid, 3 wide, 4 squint-grin, 6 skeptical, 7/8 glance, 10 look up (Diego).
// Earl only has 1 blink + 2 half-lid: he glares, and goes flat for the punchline.
const NO_BLINK = { diego: [2, 4, 6, 11], earl: [2] };

const loadImg = src => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
const sets = {};
function rig(who) {
  return sets[who] ??= Promise.all(['polaroid', 'rig-body', 'rig-mouth', 'rig-eyes'].map(p => loadImg(`${R}${who}-${p}.webp`)))
    .then(([paper, body, mouth, eyes]) => ({ paper, body, mouth, eyes, bg: {} }));
}
async function backdrop(who, scene) {
  const s = await rig(who);
  return s.bg[scene] ??= await loadImg(`${R}${who}-rig-bg-${scene}.webp`);
}

// the mouth shape for a letter, then FWCoachFace.MouthCell: how loud decides how far it opens
function shapeOf(ch) {
  if ('mbp'.includes(ch)) return 'm';
  if ('ouw'.includes(ch)) return 'u';
  if ('eiy'.includes(ch)) return 'e';
  if ('fv'.includes(ch)) return 'f';
  return 'r';
}
function mouthCell(loud, sh) {
  if (sh === 'm') return loud <= 1 ? 8 : loud;
  if (sh === 'u') return loud >= 3 ? 9 : loud >= 1 ? 5 : loud;
  if (sh === 'e') return loud >= 1 && loud <= 3 ? 6 : loud;
  if (sh === 'f') return loud >= 1 && loud <= 2 ? 7 : loud;
  return loud;
}
// the look for each sentence of a line: excited, asking, trailing off, or just talking
function looks(who, text) {
  const parts = text.match(/[^.!?]+[.!?]*\s*/g) || [text];
  let at = 0;
  return parts.map((p, i) => {
    const from = at; at += p.length;
    let eye = 0;
    if (who === 'earl') eye = i === parts.length - 1 && parts.length > 1 ? 2 : 0;
    else if (/^\s*\.\.\./.test(p) || /\.\.\.\s*$/.test(p)) eye = 6;
    else if (/!/.test(p)) eye = i % 2 ? 4 : 3;
    else if (/\?/.test(p)) eye = 10;
    else eye = [0, 7, 0, 8][i % 4];
    return { from: from / text.length, to: at / text.length, eye };
  });
}

function smoothDamp(cur, tgt, vel, t, dt) {          // Unity's Mathf.SmoothDamp
  const omega = 2 / t, x = omega * dt, e = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const ch = cur - tgt, tmp = (vel + omega * ch) * dt;
  vel = (vel - omega * tmp) * e;
  let out = tgt + (ch + tmp) * e;
  if ((tgt - cur > 0) === (out > tgt)) { vel = (out - tgt) / dt; out = tgt; }
  return [out, vel];
}

export function coach(canvas) {
  const g = canvas.getContext('2d');
  canvas.width = 400; canvas.height = 548;
  const off = document.createElement('canvas'), og = off.getContext('2d');
  const rain = makeRain(WIN[2] - WIN[0], WIN[3] - WIN[1]);
  let cur = null, lvl = 0, o = 0, prev = 0, nod = 0, nodv = 0, sign = 1, clock = 0, last = 0;
  let blinkIn = 2, blinkLeft = 0, blinkNo = 0, lean = 0, leanV = 0, leanTgt = 0, leanFor = .4, leanNo = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(1 / 20, (now - (last || now)) / 1000); last = now;
    if (!cur?.ready) return;
    const { who, s, bg, scene } = cur;
    // mouth: ease toward the voice level, open fast, close slower
    const tgt = Math.min(1, lvl);
    o += (tgt - o) * (1 - Math.exp(-(tgt > o ? OPEN : CLOSE) * dt));
    const loud = Math.max(0, Math.min(4, Math.floor(o * 5 + 0.15)));
    const onset = prev === 0 && loud > 0; prev = loud;
    const p = cur.talking ? Math.min(.999, (now - cur.t0) / 1000 / cur.dur) : 1;
    const ch = cur.text[Math.floor(p * cur.text.length)] || ' ';
    const mouth = cur.talking ? mouthCell(loud, shapeOf(ch.toLowerCase())) : 0;
    let eye = cur.talking ? (cur.looks.find(l => p >= l.from && p < l.to)?.eye || 0) : 0;
    const blinks = !NO_BLINK[who].includes(eye);
    blinkIn -= dt;
    if (blinkLeft > 0) blinkLeft -= dt;
    else if (blinkIn <= 0 && blinks) { blinkLeft = BLINK_HOLD; blinkIn = BLINK_GAP[blinkNo++ % BLINK_GAP.length]; }
    if (blinkLeft > 0 && blinks) eye = 1;
    // head: sway + a springy nod on loud syllables + a lean that changes pose between phrases
    clock += dt;
    if (onset && lvl >= NOD_HIT) { nodv += NOD_KICK * sign; sign = -sign; }
    nodv += (-NOD_SPRING * nod - NOD_DAMP * nodv) * dt; nod += nodv * dt;
    leanFor -= dt;
    if (leanFor <= 0 && (onset || !cur.talking)) {
      leanTgt = LEAN_CYCLE[leanNo % LEAN_CYCLE.length] * LEAN_DEG * (cur.talking ? 1 : LEAN_QUIET);
      leanFor = LEAN_HOLD[leanNo++ % LEAN_HOLD.length];
    }
    [lean, leanV] = smoothDamp(lean, leanTgt, leanV, LEAN_EASE, dt);
    const deg = SWAY_DEG * Math.sin(clock * 2 * Math.PI / SWAY_T) + nod + lean;
    const breath = 1 + BREATH * Math.sin(clock * 2 * Math.PI / BREATH_T);
    draw(s, bg, scene, who, mouth, eye, deg, breath, TALK_BOB * o, clock * 2.2);
  }

  function draw(s, bg, scene, who, mouth, eye, deg, breath, bob, scroll) {
    const W = WIN[2] - WIN[0], H = WIN[3] - WIN[1];
    const bw = W * BODY_OF_WIN, bh = bw * s.body.height / s.body.width;
    // the rig, tinted for the hour: body + mouth + eyes, multiplied, clipped back to the body
    off.width = Math.ceil(bw); off.height = Math.ceil(bh);
    og.drawImage(s.body, 0, 0, bw, bh);
    const r = RECTS[who];
    const cell = (sheet, n, [x, y, w, h]) => {
      const cw = sheet.width / 4, chh = sheet.height / 3;
      og.drawImage(sheet, (n % 4) * cw, Math.floor(n / 4) * chh, cw, chh, x * bw, (1 - y - h) * bh, w * bw, h * bh);
    };
    if (mouth > 0) cell(s.mouth, mouth, r.mouth);
    if (eye > 0) cell(s.eyes, eye, r.eye);
    const [tr, tg, tb] = TINT[scene];
    if (tr * tg * tb < 1) {
      og.globalCompositeOperation = 'multiply';
      og.fillStyle = `rgb(${tr * 255},${tg * 255},${tb * 255})`; og.fillRect(0, 0, bw, bh);
      og.globalCompositeOperation = 'destination-in'; og.drawImage(s.body, 0, 0, bw, bh);
      og.globalCompositeOperation = 'source-over';
    }
    g.clearRect(0, 0, 400, 548);
    g.save();
    g.beginPath(); g.rect(WIN[0], WIN[1], W, H); g.clip();
    const u0 = 0.02 + PARALLAX * deg;                  // the backdrop drifts a touch against the lean
    g.drawImage(bg, u0 * bg.width, 0.02 * bg.height, 0.96 * bg.width, 0.96 * bg.height, WIN[0], WIN[1], W, H);
    const pivY = bh * (1 - PIVOT_Y - BODY_TOP_OVER - bob);
    g.translate(WIN[0] + W / 2, WIN[1] + pivY);
    g.rotate(-deg * Math.PI / 180);
    g.scale(1, breath);
    g.drawImage(off, -bw / 2, -bh * (1 - PIVOT_Y));
    g.restore();
    if (scene === 'rain') {
      g.save(); g.beginPath(); g.rect(WIN[0], WIN[1], W, H); g.clip();
      const dy = (scroll * 40) % H;
      g.drawImage(rain, WIN[0], WIN[1] + dy - H); g.drawImage(rain, WIN[0], WIN[1] + dy);
      g.restore();
    }
    g.drawImage(s.paper, 0, 0, 400, 548);
  }

  requestAnimationFrame(frame);
  return {
    async say(who, text, scene, dur) {
      const s = await rig(who), bg = await backdrop(who, scene);
      cur = { who, s, bg, scene, text, dur: dur || 3, t0: performance.now(), looks: looks(who, text), talking: true, ready: true };
    },
    level(v) { lvl = v; },
    quiet() { if (cur) cur.talking = false; lvl = 0; },
    preload(who, scene) { backdrop(who, scene).catch(() => {}); },
  };
}

function makeRain(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  let s = 2166136261;
  for (let k = 0; k < 30; k++) {
    s = Math.imul(s ^ k, 16777619) >>> 0;
    const x = s % w, y = (s >>> 8) % h, ln = 18 + (s >>> 16) % 22;
    g.strokeStyle = `rgba(235,240,255,${(70 + (s >>> 4) % 90) / 255})`; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + ln / 4, y + ln); g.stroke();
  }
  return c;
}
