// Auto-build hook for `npm install` at the repo root: prepares backend and
// frontend so the app is immediately launchable. Soft-fails (never blocks
// installation) — scripts/launch.mjs will retry on demand.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const IS_WIN = process.platform === 'win32';

if (process.env.ROUNDABLE_SKIP_PREPARE === '1' || process.env.CI) {
  process.exit(0);
}

const npm = (args) =>
  spawnSync(IS_WIN ? 'npm.cmd' : 'npm', args, { cwd: ROOT, stdio: 'inherit', shell: IS_WIN });

function exists(p) {
  return fs.existsSync(path.join(ROOT, p));
}

try {
  if (!exists('backend/node_modules') || !exists('frontend/node_modules')) {
    npm(['install', '--prefix', 'backend', '--no-audit', '--no-fund']);
    npm(['install', '--prefix', 'frontend', '--no-audit', '--no-fund']);
  }
  if (!exists('backend/dist/server.js')) npm(['run', 'build:backend']);
  if (!exists('frontend/dist/index.html')) npm(['run', 'build:frontend']);
} catch {
  // soft-fail on purpose
}
