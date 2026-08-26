#!/usr/bin/env node
// RoundAIble one-shot launcher: installs dependencies if missing, builds if
// needed, starts a single server (API + UI) and opens the browser.
//
//   npx github:Navid-Moradimehr/RoundAIble
//   — or —
//   node scripts/launch.mjs
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || '4199';
const URL = `http://localhost:${PORT}`;
const IS_WIN = process.platform === 'win32';

const npm = (args, opts = {}) =>
  spawnSync(IS_WIN ? 'npm.cmd' : 'npm', args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: IS_WIN,
    ...opts,
  });

const exists = (p) => fs.existsSync(path.join(ROOT, p));

function step(title) {
  console.log(`\n\x1b[1m▸ ${title}\x1b[0m`);
}

function die(msg) {
  console.error(`\n${msg}`);
  console.error('Fix the issue above and run the launcher again.');
  process.exit(1);
}

// 1. Node version check
const major = Number(process.versions.node.split('.')[0]);
if (major < 18) die(`Node.js 18+ is required (you have ${process.versions.node}). Get it from https://nodejs.org`);

step('Checking dependencies');
if (!exists('backend/node_modules') || !exists('frontend/node_modules')) {
  console.log('First run: installing dependencies (this can take a minute)…');
  const r1 = npm(['install', '--prefix', 'backend', '--no-audit', '--no-fund']);
  const r2 = npm(['install', '--prefix', 'frontend', '--no-audit', '--no-fund']);
  if (r1.status !== 0 || r2.status !== 0) die('✗ Dependency installation failed.');
}

step('Building app');
if (!exists('backend/dist/server.js')) {
  if (npm(['run', 'build:backend']).status !== 0) die('✗ Backend build failed.');
}
if (!exists('frontend/dist/index.html')) {
  if (npm(['run', 'build:frontend']).status !== 0) die('✗ Frontend build failed.');
}

step(`Starting RoundAIble on ${URL}`);
const server = spawn(process.execPath, [path.join(ROOT, 'backend/dist/server.js')], {
  stdio: 'inherit',
  env: { ...process.env, PORT },
});

// Give the server a beat, then open the browser.
setTimeout(() => {
  const open =
    process.platform === 'win32'
      ? spawn('cmd', ['/c', 'start', '', URL], { detached: true, stdio: 'ignore' })
      : process.platform === 'darwin'
        ? spawn('open', [URL], { detached: true, stdio: 'ignore' })
        : spawn('xdg-open', [URL], { detached: true, stdio: 'ignore' });
  open.on('error', () => {
    console.log(`Open ${URL} in your browser.`);
  });
}, 1500);

const shutdown = () => {
  server.kill();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
server.on('exit', (code) => process.exit(code ?? 0));
