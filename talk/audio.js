// Game-style sound for the talk: a music bed, sound effects timed to the slides, and the
// talking-Polaroid narrators (Deckhand Diego, Cousin Earl, Cousin Rusty from Fish Wrangler 3D).
//   MUSIC button = the music bed.   SFX button = sound effects AND the voices.
// Both remember their setting. Browsers only allow sound after the first click or key press,
// so the first arrow press starts everything. Free libraries: Howler.js (music) + ZzFX (effects).
// Voice lines: talk/audio/script.json -> node tools/voices.mjs -> talk/audio/voices.json.
import { ZZFX } from './vendor/zzfx.js';
const { Howl, Howler } = window;

const A = 'audio/';
const store = (k, v) => { try { return v === undefined ? localStorage.getItem(k) : localStorage.setItem(k, v); } catch {} };
let musicOn = store('talk-music') !== '0';
let sfxOn = store('talk-sfx') !== '0';

// ---- effects: tiny synth recipes, no sound files (ZzFX parameter lists) ----
const FX = {
  whoosh: [.5, .05, 260, .08, .06, .22, 4, 1.2, -4, , , , , 3, , , , .7],
  pop: [.35, .05, 640, , .02, .06, , 2, , , 460, .02],
  ding: [.5, , 1675, , .06, .24, 1, 1.82, , , 837, .06],
  laser: [.45, .05, 1300, .01, .04, .16, 2, 1.4, -42, , , , , , , , , .6],
  boom: [1, .1, 70, .02, .25, .9, 4, .4, , , , , , 1.6, , .5, , .35, .2],
  power: [.5, , 220, .02, .2, .35, 1, , 6, , , , .06],
  coin: [.4, , 1100, , .04, .2, 1, 1.5, , , 600, .05],
};
ZZFX.volume = .4;
const fx = name => { if (sfxOn && ZZFX.x.state === 'running') ZZFX.play(...FX[name]); };

// extra effects per slide, [ms after the slide opens, effect]. Slide 1 = index 0.
const CUES = {
  0: [[300, 'power']],
  1: [[650, 'boom']],                                   // rockets blow up on purpose
  2: [[700, 'pop'], [900, 'pop'], [1100, 'ding']],      // three tries -> it floats
  6: [[700, 'coin']],                                   // into the cart
  9: [[500, 'laser'], [700, 'laser'], [900, 'laser']],  // lasers!
  13: [[300, 'power'], [900, 'ding']],
};

// ---- music bed ----
let music = null;
function startMusic() {
  if (music || !musicOn || !Howl) return;
  music = new Howl({ src: [A + 'music/loop-a.mp3'], loop: true, volume: 0, html5: true });
  music.play(); music.fade(0, BED, 1500);
}
const BED = .32, DUCK = .1;
const duck = down => music?.playing() && music.fade(music.volume(), down ? DUCK : BED, 350);

// ---- voices + the talking Polaroid ----
const card = document.createElement('div');
card.className = 'talker';
card.innerHTML = '<img alt="">';
const cardImg = card.querySelector('img');
let lines = [], ctx = null, analyser = null, voiceGain = null, buffers = {}, playing = null, plan = [], level = new Uint8Array(256);

fetch(A + 'voices.json').then(r => r.json()).then(j => { lines = j.slides; }).catch(() => {});
const load = async f => buffers[f] ??= fetch(A + f).then(r => r.arrayBuffer()).then(b => ctx.decodeAudioData(b));

function setupCtx() {
  ctx = Howler?.ctx || ZZFX.x;
  ZZFX.x = ctx;                       // one audio context for everything
  analyser = ctx.createAnalyser(); analyser.fftSize = 512;
  voiceGain = ctx.createGain(); voiceGain.gain.value = 1.1;
  analyser.connect(voiceGain).connect(ctx.destination);
}

function stopVoices() {
  plan.forEach(clearTimeout); plan = [];
  try { playing?.stop(); } catch {}
  playing = null;
  card.classList.remove('on'); duck(false);
}

async function sayAll(n, token) {
  const list = lines[n] || [];
  list.forEach(l => load(l.file));    // start fetching the whole slide at once
  for (const l of list) {
    if (token !== slideToken || !sfxOn) return;
    const buf = await load(l.file).catch(() => null);
    if (!buf || token !== slideToken || !sfxOn) return;
    cardImg.src = `${A}cast/${l.who}.png`;
    card.dataset.who = l.who;
    card.classList.add('on'); duck(true);
    const src = ctx.createBufferSource();
    src.buffer = buf; src.connect(analyser); src.start();
    playing = src;
    await new Promise(r => { src.onended = r; });
    if (token !== slideToken) return;
    await new Promise(r => plan.push(setTimeout(r, 280)));
  }
  if (token === slideToken) { card.classList.remove('on'); duck(false); }
}

// the card bobs and tilts with how loud the voice is, like the mouth flap in the game
(function bob() {
  requestAnimationFrame(bob);
  if (!analyser || !playing) { card.style.setProperty('--lv', 0); return; }
  analyser.getByteTimeDomainData(level);
  let sum = 0; for (const v of level) sum += (v - 128) ** 2;
  card.style.setProperty('--lv', Math.min(1, Math.sqrt(sum / level.length) / 26).toFixed(3));
})();

// ---- buttons ----
const bar = document.createElement('div');
bar.className = 'snd';
bar.innerHTML = '<button data-k="music" title="Music on/off">&#9835; MUSIC</button><button data-k="sfx" title="Sound effects + voices on/off">&#10039; SFX</button>';
const paint = () => {
  bar.querySelector('[data-k=music]').classList.toggle('off', !musicOn);
  bar.querySelector('[data-k=sfx]').classList.toggle('off', !sfxOn);
};
bar.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  e.stopPropagation();
  unlock();
  if (b.dataset.k === 'music') {
    musicOn = !musicOn; store('talk-music', musicOn ? 1 : 0);
    if (musicOn) startMusic(); else { music?.unload(); music = null; }
  } else {
    sfxOn = !sfxOn; store('talk-sfx', sfxOn ? 1 : 0);
    if (sfxOn) { fx('coin'); slide(cur, true); } else stopVoices();
  }
  paint();
});
document.body.append(card, bar);
paint();

// ---- unlock on the first click / key / tap, then catch up on the slide we're on ----
let unlocked = false;
function unlock() {
  if (unlocked) return;
  unlocked = true;
  setupCtx();
  ctx.resume?.();
  startMusic();
  if (cur >= 0) setTimeout(() => slide(cur, true), 150);
}
['pointerdown', 'keydown', 'touchend'].forEach(t => addEventListener(t, unlock, { capture: true }));

// ---- called by slides.js every time a slide opens ----
let cur = -1, slideToken = 0;
export function slide(n, again) {
  const moved = n !== cur;
  cur = n;
  if (!unlocked) return;
  stopVoices();
  const token = ++slideToken;
  if (moved && !again) fx('whoosh');
  if (!sfxOn) return;
  // a little pop as each line of text rises in (matches talk.css .r timing)
  const el = document.querySelectorAll('.slide')[n];
  const reveals = [...el.querySelectorAll('.r')].map(r => parseFloat(r.style.getPropertyValue('--i')) || 0);
  [...new Set(reveals)].slice(0, 5).forEach(i => plan.push(setTimeout(() => token === slideToken && fx('pop'), 300 + i * 140)));
  (CUES[n] || []).forEach(([ms, name]) => plan.push(setTimeout(() => token === slideToken && fx(name), ms)));
  plan.push(setTimeout(() => sayAll(n, token), 1100));
}
