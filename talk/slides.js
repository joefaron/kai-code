// Slide navigation, presenter window and the prompt builder.
// The 3D lives in scenes.js; this file only says which scene each slide wants.
import { createStage } from './scenes.js?v=2';

const slides = [...document.querySelectorAll('.slide')];
const presenter = new URLSearchParams(location.search).has('presenter');
const chan = 'BroadcastChannel' in window ? new BroadcastChannel('kai-talk') : null;
let cur = -1;
let started = Date.now();

let stage = null;
if (!presenter) {
  try { stage = createStage(document.getElementById('stage')); }
  catch (e) { console.warn('no WebGL, slides only', e); }
} else {
  document.body.classList.add('presenter');
}

const title = s => (s.querySelector('h1,h2')?.textContent || '').replace(/\s+/g, ' ').trim();
const plan = slides.map(s => parseFloat(s.dataset.min || 1));
const total = plan.reduce((a, b) => a + b, 0);

function go(n, fromChannel) {
  n = Math.max(0, Math.min(slides.length - 1, n));
  if (n === cur) return;
  slides[cur]?.classList.remove('on');
  cur = n;
  const s = slides[cur];
  // restart the CSS animations every time a slide opens
  s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  document.body.classList.toggle('full', s.classList.contains('center'));
  stage?.show(s.dataset.scene || 'brain');
  document.getElementById('bar').style.width = ((cur + 1) / slides.length * 100) + '%';
  document.getElementById('meta').textContent = `${cur + 1} / ${slides.length}`;
  if (location.hash !== '#' + (cur + 1)) history.replaceState(null, '', '#' + (cur + 1));
  if (!fromChannel) chan?.postMessage({ go: cur });
  renderPresenter();
}

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

const fromHash = () => go(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1));
addEventListener('hashchange', fromHash);
fromHash();
if (presenter) chan?.postMessage({ hello: 1 });
