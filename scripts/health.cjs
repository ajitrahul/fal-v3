#!/usr/bin/env node
/**
 * scripts/health.cjs
 * Health & (optional) auto-fix pipeline for FindAIList.
 *
 * Usage:
 *   node scripts/health.cjs
 *   node scripts/health.cjs --fix                # runs autofill + repair and replaces data/tools.json
 *   BASE_URL=http://127.0.0.1:3000 node scripts/health.cjs
 *
 * Steps:
 *  - Validate schema (base/extended)
 *  - If --fix: autofill -> repair -> backup + replace tools.json
 *  - URL validation
 *  - If server up at BASE_URL: Linkinator crawl
 *  - Playwright smoke tests (will start dev server automatically)
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const FIX = argv.includes('--fix');
const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, 'data');
const TOOLS_JSON = path.join(DATA_DIR, 'tools.json');
const TOOLS_NORM = path.join(DATA_DIR, 'tools.normalized.json');
const TOOLS_REPAIRED = path.join(DATA_DIR, 'tools.repaired.json');
const REPORTS_DIR = path.join(ROOT, 'reports');

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000';
const LINKINATOR_CONFIG = path.join(ROOT, 'linkinator.config.json');

function run(cmd, opts={}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function npx(pkgAndArgs) {
  const exe = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  run(`${exe} ${pkgAndArgs}`);
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

async function serverReachable(url, timeoutMs = 3000) {
  if (typeof fetch !== 'function') return false; // Node 18+ has fetch
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs).unref();
  try {
    const res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    clearTimeout(timer);
    return res.ok || (res.status >= 200 && res.status < 400);
  } catch {
    clearTimeout(timer);
    return false;
  }
}

function backupAndReplace(src, replacement) {
  if (!fs.existsSync(replacement)) {
    console.log(`ℹ️ Skip replace: ${path.basename(replacement)} not found.`);
    return false;
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = path.join(DATA_DIR, `tools.backup-${stamp}.json`);
  fs.copyFileSync(src, backup);
  fs.copyFileSync(replacement, src);
  console.log(`🔁 Replaced ${path.relative(ROOT, src)} with ${path.relative(ROOT, replacement)}`);
  console.log(`🧰 Backup written → ${path.relative(ROOT, backup)}`);
  return true;
}

(async () => {
  try {
    ensureDir(REPORTS_DIR);

    // 1) Schema validation (pre)
    let preValidationFailed = false;
    try {
      run('node scripts/validate-tools-extended.cjs');
    } catch (e) {
      preValidationFailed = true;
      if (!FIX) {
        console.error('\n❌ Schema validation failed. Re-run with --fix to attempt automatic repairs.');
        process.exit(2);
      } else {
        console.warn('\n⚠️ Schema validation failed, continuing because --fix was provided.');
      }
    }

    // 2) Auto-fix flow (optional)
    if (FIX) {
      // Autofill + validate (safe enrich + normalized copy)
      try {
        run('node scripts/autofill-and-validate.cjs --timeout 20000 --concurrency 4 --write');
      } catch (e) {
        console.warn('\n⚠️ Autofill step reported errors; continuing to repair step.');
      }

      // Repair broken links (official site only) → writes tools.repaired.json
      try {
        run('node scripts/repair-links.cjs --timeout 20000 --concurrency 4 --write');
      } catch (e) {
        console.warn('\n⚠️ Repair step reported errors.');
      }

      // Replace tools.json with repaired version if present; fallback to normalized
      let replaced = false;
      if (fs.existsSync(TOOLS_REPAIRED)) {
        replaced = backupAndReplace(TOOLS_JSON, TOOLS_REPAIRED);
      } else if (fs.existsSync(TOOLS_NORM)) {
        replaced = backupAndReplace(TOOLS_JSON, TOOLS_NORM);
      } else {
        console.warn('⚠️ No repaired/normalized file found to replace tools.json.');
      }

      if (replaced) {
        // Re-run schema validation after replacement
        run('node scripts/validate-tools-extended.cjs');
      }
    }

    // 3) URL validation (always)
    run('node scripts/check-and-normalize.cjs --timeout 15000 --concurrency 8');

    // 4) Link check (only if server is up at BASE_URL)
    const up = await serverReachable(BASE_URL);
    if (up) {
      console.log(`\n🌐 Server reachable at ${BASE_URL} → running linkinator`);
      // Some versions of linkinator want verbosity via CLI to avoid conflicts
      const urlArg = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
      npx(`linkinator --verbosity INFO --config ${LINKINATOR_CONFIG} ${urlArg}`);
    } else {
      console.log(`\nℹ️ Skipping linkinator: server not reachable at ${BASE_URL}`);
      console.log(`   (Start your dev server with: npm run dev -- --hostname 127.0.0.1 -p 3000)`);
    }

    // 5) Playwright smoke tests (auto-starts dev server if not running)
    try {
      npx('@playwright/test@latest install --with-deps');
    } catch {}
    try {
      npx('playwright test');
    } catch (e) {
      console.error('\n❌ Playwright tests failed.');
      process.exit(2);
    }

    console.log('\n✅ Health pipeline completed.');
  } catch (e) {
    console.error('\n❌ Health pipeline failed.');
    process.exit(2);
  }
})();
