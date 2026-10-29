#!/usr/bin/env node
// Turns the two little PHP sites (the project site at the root, the boat site in boat/) into
// plain .html files, so GitHub Pages can show them: joefaron.github.io/kai-code/ and
// joefaron.github.io/kai-code/boat/. Run from the repo root (export-public.mjs runs it):
//   node tools/static-site.mjs            -> writes index.html + <page>.html next to each index.php
// Needs php on PATH (or PHP=<path to php.exe>). The PHP sites keep working as they are.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const PHP = process.env.PHP || 'php';
const SITES = [
  { dir: '.', port: 8097, skip: ['build'] },   // no build booklets in this copy (yet)
  { dir: 'boat', port: 8098, skip: [] },
];

// "/?p=parts" -> "parts.html", "/assets/x.css?v=3" -> "assets/x.css", "/talk/" -> "../talk/" (from boat/)
function rewrite(html, site, slugs) {
  const up = site.dir === '.' ? '' : '../'.repeat(site.dir.split('/').length);
  const fix = (u) => {
    if (/^(https?:|mailto:|#|data:|javascript:)/.test(u)) return u;
    let m = u.match(/^\/?\?p=([\w-]+)(.*)$/);
    if (m) return slugs.includes(m[1]) ? (m[1] === 'home' ? 'index.html' : m[1] + '.html') + (m[2].match(/#.*/) || [''])[0] : 'index.html';
    if (u === '/' || u === '/?' ) return 'index.html';
    if (!u.startsWith('/')) return u;
    const p = u.replace(/^\//, '');
    const own = path.join(ROOT, site.dir, p.split(/[?#]/)[0]);          // a file of this site
    if (fs.existsSync(own)) return p.replace(/\?v=[\w.-]*/, '');
    return up + p.replace(/\?v=[\w.-]*/, '');                            // a file of the repo (talk/, media/)
  };
  // root-absolute paths inside scripts (import maps, fetch) too
  html = html.replace(/(["'])\/(talk|media|assets|data)\//g, (_, q, d) => q + (fs.existsSync(path.join(ROOT, site.dir, d)) ? './' : up || './') + d + '/');   // "./" so module imports resolve
  return html.replace(/\b(href|src|poster)="([^"]*)"/g, (_, a, u) => `${a}="${fix(u.replace(/&amp;/g, '&')).replace(/&/g, '&amp;')}"`);
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let made = 0;
const broken = new Set(), links = [];
for (const site of SITES) {
  const dir = path.join(ROOT, site.dir);
  const src = fs.readFileSync(path.join(dir, 'index.php'), 'utf8');
  const slugs = [...src.match(/\$PAGES = \[([\s\S]*?)\];/)[1].matchAll(/'([\w-]+)'\s*=>/g)].map((m) => m[1]);
  const srv = spawn(PHP, ['-S', `127.0.0.1:${site.port}`, '-t', dir], { stdio: 'ignore' });
  await wait(1200);
  try {
    for (const slug of slugs) {
      if (site.skip.includes(slug)) continue;
      const res = await fetch(`http://127.0.0.1:${site.port}/?p=${slug}`);
      let html = await res.text();
      // drop skipped tabs from the menu
      for (const s of site.skip) html = html.replace(new RegExp(`<a[^>]*href="/\\?p=${s}"[^>]*>[\\s\\S]*?</a>`, 'g'), '');
      html = rewrite(html, site, slugs.filter((s) => !site.skip.includes(s)));
      const out = path.join(dir, slug === 'home' ? 'index.html' : slug + '.html');
      fs.writeFileSync(out, html);
      made++;
      for (const m of html.matchAll(/\b(?:href|src|poster)="([^"#?]+)/g)) links.push([dir, out, m[1]]);
    }
  } finally { srv.kill(); }
}
// every local link must land on a real file (checked once all pages exist)
for (const [dir, out, u] of links) {
  if (/^(https?:|mailto:|data:|javascript:)/.test(u) || !u) continue;
  if (!fs.existsSync(path.resolve(dir, u))) broken.add(`${path.relative(ROOT, out)} -> ${u}`);
}
console.log(`static site: ${made} pages`);
if (broken.size) { console.error('BROKEN LINKS:\n  ' + [...broken].join('\n  ')); process.exitCode = 1; }
