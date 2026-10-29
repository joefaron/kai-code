// Slide navigation, presenter window and the prompt builder.
// The 3D lives in scenes.js; this file only says which scene each slide wants.
import { createStage } from './scenes.js?v=15';
import { sceneBuild } from './wiring3d.js?v=6';

const slides = [...document.querySelectorAll('.slide')];
const presenter = new URLSearchParams(location.search).has('presenter');
const chan = 'BroadcastChannel' in window ? new BroadcastChannel('kai-talk') : null;
let cur = -1;
let started = Date.now();

let stage = null;
if (!presenter) {
  try { stage = createStage(document.getElementById('stage'), { scenes: { build: sceneBuild } }); }
  catch (e) { console.warn('no WebGL, slides only', e); }
} else {
  document.body.classList.add('presenter');
}

// music, sound effects and the talking narrators: only decks that ask for it (<body data-audio>)
let audio = null;
if (!presenter && 'audio' in document.body.dataset)
  import('./audio.js?v=2').then(m => { audio = m; audio.slide(cur); }).catch(e => console.warn('no audio', e));

const title = s => (s.querySelector('h1,h2')?.textContent || '').replace(/\s+/g, ' ').trim();
const plan = slides.map(s => parseFloat(s.dataset.min || 1));
const total = plan.reduce((a, b) => a + b, 0);

function go(n, fromChannel) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (n === cur) return;
  slides[cur]?.classList.remove('on');
  slides[cur]?.querySelectorAll('.yt.playing').forEach(stopVideo);
  cur = n;
  const s = slides[cur];
  // restart the CSS animations every time a slide opens
  s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  document.body.classList.toggle('full', s.classList.contains('center'));
  fit(s);
  stage?.show(s.dataset.scene || 'brain');
  audio?.slide(cur);
  document.getElementById('bar').style.width = ((cur + 1) / slides.length * 100) + '%';
  document.getElementById('meta').textContent = `${cur + 1} / ${slides.length}`;
  if (location.hash !== '#' + (cur + 1)) history.replaceState(null, '', '#' + (cur + 1));
  if (!fromChannel) chan?.postMessage({ go: cur });
  renderPresenter();
}

// Shrink a slide's text (and photos, via --fit) until it fits the screen, so a phone held
// sideways or a short laptop never cuts the bottom off. Big screens stay at full size.
function fit(s) {
  if (presenter) return;
  s.style.fontSize = ''; s.style.removeProperty('--fit');
  const cs = getComputedStyle(s);
  const room = s.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const used = () => {
    const kids = [...s.children].filter(c => !c.matches('.notes'));
    const last = kids[kids.length - 1];
    return last.offsetTop + last.offsetHeight + parseFloat(getComputedStyle(last).marginBottom) - kids[0].offsetTop;
  };
  for (let f = 1; used() > room && f > 0.5; ) {
    f = Math.round((f - 0.04) * 100) / 100;
    s.style.fontSize = f + 'em'; s.style.setProperty('--fit', f);
  }
  // portrait phone: the words sit over the 3D, so the dark shade grows to cover them
  const top = [...s.children].find(c => !c.matches('.notes')).offsetTop;
  document.body.style.setProperty('--cover', Math.min(100, (s.clientHeight - top + 24) / s.clientHeight * 100) + '%');
}
addEventListener('resize', () => slides[cur] && fit(slides[cur]));

function renderPresenter() {
  if (!presenter) return;
  const s = slides[cur], nx = slides[cur + 1];
  const due = plan.slice(0, cur + 1).reduce((a, b) => a + b, 0);
  document.getElementById('pnow').textContent = `${cur + 1}. ${title(s)}  (${plan[cur]} min)`;
  document.getElementById('pnotes').textContent = s.querySelector('.notes')?.textContent.trim().replace(/\n\s+/g, '\n') || '';
  document.getElementById('pnext').textContent = nx ? `${cur + 2}. ${title(nx)}` : 'the end';
  document.getElementById('pplan').textContent = `be done with this slide by ${due.toFixed(1)} min of ${total} total`;
  document.getElementById('pplan').dataset.due = due;
}

setInterval(() => {
  if (!presenter) return;
  const sec = Math.floor((Date.now() - started) / 1000);
  const el = document.getElementById('pclock');
  el.textContent = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
  el.classList.toggle('late', sec / 60 > parseFloat(document.getElementById('pplan').dataset.due || 99));
}, 500);

chan && (chan.onmessage = e => {
  if (typeof e.data.go === 'number') go(e.data.go, true);
  if (e.data.hello && !presenter) chan.postMessage({ go: cur });
});

addEventListener('keydown', e => {
  if (e.target.matches('textarea,input')) { if (e.key === 'Escape') e.target.blur(); return; }
  const k = e.key;
  if (['ArrowRight', 'ArrowDown', 'PageDown', ' ', 'Enter'].includes(k)) { e.preventDefault(); go(cur + 1); }
  else if (['ArrowLeft', 'ArrowUp', 'PageUp', 'Backspace'].includes(k)) { e.preventDefault(); go(cur - 1); }
  else if (k === 'Home') go(0);
  else if (k === 'End') go(slides.length - 1);
  else if (k === 'p' || k === 'P') window.open('?presenter#' + (cur + 1), 'kai-presenter', 'width=900,height=760');
  else if (k === 'f' || k === 'F') document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
  else if (k === 'r' || k === 'R') started = Date.now();
});
document.getElementById('prev').onclick = () => go(cur - 1);
document.getElementById('next').onclick = () => go(cur + 1);

let tx = null;
addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
addEventListener('touchend', e => {
  if (tx === null || e.target.matches('textarea,button')) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
  tx = null;
});

// the "your turn" prompt builder
const parts = ['b1', 'b2', 'b3', 'b4'].map(id => document.getElementById(id));
const built = document.getElementById('built');
const assemble = () => parts.map(p => p.value.trim()).filter(Boolean).join(' ');
parts.forEach(p => p.addEventListener('input', () => {
  const t = assemble();
  built.textContent = t || 'Start typing above...';
  built.classList.toggle('dim', !t);
}));
document.getElementById('copy').onclick = async e => {
  e.stopPropagation();
  try { await navigator.clipboard.writeText(assemble()); e.target.textContent = 'Copied!'; }
  catch { e.target.textContent = 'Select the text to copy'; }
  setTimeout(() => (e.target.textContent = 'Copy prompt'), 1600);
};

// a YouTube video plays inside the slide (click the thumbnail); leaving the slide stops it
function stopVideo(a) { a.classList.remove('playing'); a.replaceChildren(); }
document.querySelectorAll('.yt').forEach(a => a.addEventListener('click', e => {
  e.preventDefault(); e.stopPropagation();
  if (a.classList.contains('playing')) return;
  const f = document.createElement('iframe');
  f.src = `https://www.youtube-nocookie.com/embed/${a.dataset.yt}?autoplay=1&rel=0`;
  f.allow = 'autoplay; fullscreen; encrypted-media'; f.allowFullscreen = true;
  a.append(f); a.classList.add('playing');
}));

// click a photo to see it full screen; click or any key to close
const zoom = document.getElementById('zoom');
document.querySelectorAll('.pics img').forEach(img => img.addEventListener('click', e => {
  e.stopPropagation(); zoom.querySelector('img').src = img.src; zoom.classList.add('on');
}));
zoom.onclick = () => zoom.classList.remove('on');
addEventListener('keydown', e => { if (zoom.classList.contains('on')) { zoom.classList.remove('on'); e.stopImmediatePropagation(); e.preventDefault(); } }, true);

const fromHash = () => go(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
addEventListener('hashchange', fromHash);
fromHash();
if (presenter) chan?.postMessage({ hello: 1 });
