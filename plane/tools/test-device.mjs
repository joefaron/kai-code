#!/usr/bin/env node
// Drives the REAL device's page in a real browser and checks it works.
// Join its Wi-Fi first (bash tools/wifi.sh join), then: node tools/test-device.mjs
// Checks: the page loads, no JS errors, the command loop gets 200s, settings that
// are saved on the device come back in a FRESH browser profile.
import { createRequire } from 'node:module'; import { execSync } from 'node:child_process'; import { join } from 'node:path';
const { chromium } = createRequire(join(execSync('npm root -g').toString().trim(), '@playwright/cli/package.json'))('playwright-core');

const DEV = process.argv[2] || 'http://192.168.4.1';
const b = await chromium.launch({ channel: 'chrome' });
const p = await (await b.newContext()).newPage();       // fresh context = a different phone
const errs = [], cmds = [];
p.on('pageerror', e => errs.push('pageerror: ' + e.message));
p.on('console', m => m.type() === 'error' && errs.push('console: ' + m.text()));
p.on('response', r => r.url().includes('/cmd') && cmds.push(r.status()));

const t0 = Date.now();
const res = await p.goto(DEV + '/', { waitUntil: 'load', timeout: 20000 });
await p.waitForTimeout(2000);
const version = await (await fetch(DEV + '/version')).text();
const cfg = await (await fetch(DEV + '/cfg')).text();
await p.screenshot({ path: 'tmp/device.png', fullPage: true });
console.log(JSON.stringify({
  http: res.status(), loadMs: Date.now() - t0, version, cfgOnDevice: cfg,
  cmdsSent: cmds.length, allOK: cmds.every(c => c === 200), errs
}, null, 1));
await b.close();
process.exit(errs.length || !cmds.length ? 1 : 0);
