// Makes the printable PDFs for a build booklet (data/builds/<name>.json).
//   node tools/build-pdf.mjs plane      -> media/builds/plane-steps.pdf (+ plane-template.pdf)
//   node tools/build-pdf.mjs            -> every booklet
// Fails loudly if a step spills onto a 2nd page, or the template isn't exactly one Letter page.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(join(execSync('npm root -g').toString().trim(), '@playwright/cli/package.json'));
const { chromium } = require('playwright-core');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.env.SITE || 'http://localhost:8080';   // SITE=http://localhost:8080 for your own copy
const names = process.argv[2] ? [process.argv[2]] : readdirSync(join(root, 'data/builds')).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5));
mkdirSync(join(root, 'media/builds'), { recursive: true });
const countPages = f => (readFileSync(f, 'latin1').match(/\/Type\s*\/Page(?!s)/g) || []).length;

const b = await chromium.launch({ channel: 'chrome' });
let bad = 0;
async function load(p, url) {
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(async () => {
    [...document.images].forEach(i => { i.loading = 'eager'; });
    await Promise.all([...document.images].map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; })));
    await document.fonts.ready;
  });
}
for (const name of names) {
  const J = JSON.parse(readFileSync(join(root, 'data/builds', name + '.json'), 'utf8'));
  const p = await b.newPage();
  // the booklet: cover + one page per step
  const out = join(root, 'media/builds', `${name}-steps.pdf`);
  await load(p, `${site}/?p=build&b=${name}`);
  await p.emulateMedia({ media: 'print' });
  // each sheet is a fixed 10in box with overflow hidden, so a too-long step gets CUT, not spilled
  const cut = await p.$$eval('main .bk', els => els.map((e, i) => e.scrollHeight > e.clientHeight + 1 ? (i ? 'step ' + i : 'cover') : '').filter(Boolean));
  if (cut.length) { bad++; console.error('CUT OFF at the bottom: ' + cut.join(', ') + '. Shorten the text or shrink its picture.'); }
  await p.pdf({ path: out, format: 'Letter', printBackground: true, preferCSSPageSize: true,
    displayHeaderFooter: true, headerTemplate: '<span></span>',
    footerTemplate: `<div style="font-size:9px;width:100%;text-align:center;color:#666">${J.title} · page <span class="pageNumber"></span> of <span class="totalPages"></span></div>` });
  const want = J.steps.length + 1, got = countPages(out);
  console.log(`wrote ${out} (${got} pages)`);
  if (got !== want) { bad++; console.error(`OVERFLOW: expected ${want} pages (cover + ${J.steps.length} steps), got ${got}. Shorten a step's text or shrink its picture.`); }
  // the template: one page, no margins, true size
  if (J.template) {
    const t = join(root, 'media/builds', `${name}-template.pdf`);
    await load(p, `${site}/template.php?b=${name}`);
    await p.pdf({ path: t, preferCSSPageSize: true, printBackground: true, margin: { top: 0, bottom: 0, left: 0, right: 0 } });
    await p.setViewportSize({ width: 816, height: 1056 });            // 8.5 x 11 in at 96 dpi: a preview picture
    await p.screenshot({ path: t.replace(/\.pdf$/, '.png') });
    const box = readFileSync(t, 'latin1').match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)/);
    const pages = countPages(t);
    console.log(`wrote ${t} (${pages} page, ${box && box[1]} x ${box && box[2]} pt)`);
    if (pages !== 1 || !box || Math.round(box[1]) !== 612 || Math.round(box[2]) !== 792) { bad++; console.error('TEMPLATE is not exactly one Letter page (612 x 792 pt)'); }
  }
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
