#!/usr/bin/env node
// Tests the two-stick control page with NO plane: a fake plane answers /cmd and /cfg, and we
// drag the sticks like thumbs would (including BOTH at once, via real multi-touch events).
//   node tools/test-page.mjs [screenshot.png]
import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path'; import { readFileSync } from 'node:fs'; import { fileURLToPath } from 'node:url';
const { chromium } = createRequire(join(execSync('npm root -g').toString().trim(), '@playwright/cli/package.json'))('playwright-core');

const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'web', 'page.html'), 'utf8');
const b = await chromium.launch({ channel: 'chrome' });
const ctx = await b.newContext({ viewport: { width: 915, height: 412 }, hasTouch: true, deviceScaleFactor: 2 });   // phone, landscape
const p = await ctx.newPage();
const errs = [], last = { l: null, r: null }; let saved = null;
p.on('pageerror', e => errs.push(e.message));
await p.route('**/*', r => {
  const u = new URL(r.request().url());
  if (u.pathname === '/cmd') { last.l = +u.searchParams.get('l'); last.r = +u.searchParams.get('r'); return r.fulfill({ body: 'ok' }); }
  if (u.pathname === '/cfg') { if (r.request().method() === 'POST') saved = JSON.parse(r.request().postData()); return r.fulfill({ body: '{}' }); }
  return r.fulfill({ body: html, contentType: 'text/html' });
});
await p.goto('http://plane.test/');
const tick = () => p.waitForTimeout(200);
const fails = [];
const check = (name, ok) => { console.log((ok ? 'PASS ' : 'FAIL ') + name, JSON.stringify(last)); if (!ok) fails.push(name); };

// stick point: fx/fy in -1..1 of the stick's travel (+y = up)
async function pt(id, fx, fy) {
  const r = await p.$eval('#' + id, e => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  return { x: r.x + r.w * (0.5 + fx * 0.35), y: r.y + r.h * (0.5 - fy * 0.35) };
}
async function drag(id, fx, fy, release = true) {
  const s = await pt(id, 0, 0), e = await pt(id, fx, fy);
  await p.mouse.move(s.x, s.y); await p.mouse.down(); await p.mouse.move(e.x, e.y, { steps: 4 });
  if (release) await p.mouse.up();
}

await p.waitForTimeout(600); check('idle = both motors off', last.l === 0 && last.r === 0);
await drag('padR', 1, 0, false); await tick(); check('steering with no throttle does nothing', last.l === 0 && last.r === 0); await p.mouse.up();
await drag('padL', 0, 0); await tick(); check('left stick to the middle = 50% both', last.l === 50 && last.r === 50);
await tick(); check('throttle STAYS when you let go', last.l === 50 && last.r === 50);
await drag('padR', 1, 0, false); await tick(); check('right stick right = left motor faster (turn right)', last.l === 90 && last.r === 10);
await p.mouse.up(); await tick(); check('right stick springs back = straight', last.l === 50 && last.r === 50);
await drag('padR', 0, 1, false); await tick(); check('right stick up = climb (both faster)', last.l === 75 && last.r === 75); await p.mouse.up();
await drag('padR', 0, -1, false); await tick(); check('right stick down = glide (both slower)', last.l === 25 && last.r === 25); await p.mouse.up();

// BOTH thumbs at once, with real touch points: left thumb full throttle, right thumb hard left
const cdp = await ctx.newCDPSession(p);
const tL = await pt('padL', 0, 1), tR = await pt('padR', -1, 0), cL = await pt('padL', 0, 0), cR = await pt('padR', 0, 0);
const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q.x, y: q.y, id: i })) });
await touch('touchStart', [cL, cR]); await touch('touchMove', [tL, tR]); await tick();
check('two thumbs at once: full throttle + hard left = right motor faster', last.l === 60 && last.r === 100);
if (process.argv[2]) await p.screenshot({ path: process.argv[2] });
await touch('touchEnd', []); await tick();
check('let both go: throttle stays at full, steering re-centres', last.l === 100 && last.r === 100);

await p.click('#stop'); await tick(); check('CUT MOTORS = both off', last.l === 0 && last.r === 0);
await p.click('#gear'); await p.click('#flipL'); await p.click('#close');
await drag('padL', 0, 0); await tick(); check('flip left = left motor reversed', last.l === -50 && last.r === 50);
await p.waitForTimeout(900); check('settings saved to the plane', saved && saved.flipL === true);
check('no JS errors', errs.length === 0 || (console.log(errs), false));
await b.close();
console.log(fails.length ? `${fails.length} FAILED` : 'ALL PASS');
process.exit(fails.length ? 1 : 0);
