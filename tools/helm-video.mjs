// Films the boat's driving app (the helm) for the talk: steer the simulator boat around,
// fire the LASERS, hit ALL STOP. The helm runs on its own clock, so this is a real-time
// recording (Chrome's screencast, sharp JPEG frames with timestamps) -> MP4, cropped to the
// helm card + simulator: a 9:16 portrait clip.
//   node tools/helm-video.mjs   -> media/video/helm-demo.mp4  (~20 s, no sound)
// Needs ffmpeg on PATH. SITE=http://localhost:8080 to film your own copy.
import { createRequire } from 'node:module';
import { execSync, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(join(execSync('npm root -g').toString().trim(), '@playwright/cli/package.json'));
const { chromium } = require('playwright-core');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.env.SITE || 'the boat site';
const raw = join(root, 'tmp', 'helm-video');
rmSync(raw, { recursive: true, force: true }); mkdirSync(raw, { recursive: true });

const b = await chromium.launch({ channel: 'chrome', args: ['--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await b.newPage({ viewport: { width: 1280, height: 1700 } });
const errors = [];
page.on('pageerror', e => errors.push(e.message));
await page.goto(`${site}/?p=control`, { waitUntil: 'networkidle' });
// helm card on top, simulator right under it, nothing else
const box = await page.evaluate(() => {
  const hud = document.querySelector('.gamehud'), sim = document.getElementById('sim');
  sim.parentElement.style.marginTop = '8px';
  window.scrollTo(0, hud.getBoundingClientRect().top + scrollY - 10);
  const a = hud.getBoundingClientRect(), z = sim.getBoundingClientRect();
  return { x: Math.round(a.x) - 10, y: Math.round(a.y) - 10, w: Math.round(a.width) + 20, h: Math.round(z.bottom - a.top) + 20 };
});
box.w += box.w % 2; box.h += box.h % 2;

const cdp = await page.context().newCDPSession(page);
const frames = [];
cdp.on('Page.screencastFrame', f => {
  const file = join(raw, `f${String(frames.length).padStart(5, '0')}.jpg`);
  writeFileSync(file, Buffer.from(f.data, 'base64'));
  frames.push({ file, t: f.metadata.timestamp });
  cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
});
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, everyNthFrame: 1 });
await page.waitForTimeout(800);

const pad = await (await page.$('#pad')).boundingBox();
const cx = pad.x + pad.width / 2, cy = pad.y + pad.height / 2, R = pad.width * 0.4;
const m = page.mouse;
async function glide(pts, ms) {                          // drag the stick through points
  for (const [x, y] of pts) { await m.move(cx + x * R, cy - y * R, { steps: 8 }); await page.waitForTimeout(ms); }
}
await m.move(cx, cy); await m.down();
await glide([[0, .3], [0, .6], [0, 1]], 300);                         // throttle up
await page.waitForTimeout(1500);
await glide([[.4, 1], [.8, .9]], 300);                                // turn right
await page.waitForTimeout(1300);
await glide([[0, 1], [-.6, .9], [-.9, .8]], 300);                     // swing left
await page.waitForTimeout(1300);
await glide([[0, 1]], 300);
await m.up();                                                          // let go: steering springs back
await page.waitForTimeout(1500);
await page.click('#laserBtn');                                         // PEW PEW
await page.waitForTimeout(2800);
await m.move(cx, cy); await m.down();
await glide([[.3, 1], [.7, .9]], 300);
await page.waitForTimeout(1500);
await m.up();
await page.click('#stopBtn');                                          // ALL STOP
await page.waitForTimeout(2000);
await cdp.send('Page.stopScreencast');
await b.close();
if (errors.length) { console.error('page errors:\n' + errors.join('\n')); process.exit(1); }

// each frame lasts until the next one arrived (screencast only sends frames when pixels change)
let list = 'ffconcat version 1.0\n';
frames.forEach((f, i) => {
  const d = i + 1 < frames.length ? frames[i + 1].t - f.t : 0.5;
  list += `file '${f.file.replace(/\\/g, '/')}'\nduration ${d.toFixed(4)}\n`;
});
list += `file '${frames.at(-1).file.replace(/\\/g, '/')}'\n`;
writeFileSync(join(raw, 'list.txt'), list);
mkdirSync(join(root, 'media', 'video'), { recursive: true });
const out = join(root, 'media', 'video', 'helm-demo.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(raw, 'list.txt'),
  '-vf', `crop=${box.w}:${box.h}:${box.x}:${box.y},fps=30`, '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
  '-crf', '20', '-preset', 'slow', '-movflags', '+faststart', '-an', out]);
console.log(`wrote ${out}: ${frames.length} frames, ${(frames.at(-1).t - frames[0].t).toFixed(1)} s, ${box.w}x${box.h}`);
