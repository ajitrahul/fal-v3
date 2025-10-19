#!/usr/bin/env node
/* scripts/check-and-normalize.cjs
 * Windows-friendly tool catalog normalizer + URL validator.
 * Usage:
 *   node scripts/check-and-normalize.cjs
 *   node scripts/check-and-normalize.cjs --write   # also writes normalized JSON
 * Options:
 *   --timeout 8000        request timeout (ms)
 *   --concurrency 8       number of parallel URL checks
 */

const fs = require("fs");
const path = require("path");
const { setTimeout: sleep } = require("timers/promises");

// Try to use global fetch (Node 18+). If unavailable, advise to upgrade Node.
if (typeof fetch !== "function") {
  console.error("❌ This script requires Node 18+ for global fetch.");
  process.exit(1);
}

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data", "tools.json");
const SCHEMA_PATH = path.join(ROOT, "tools.schema.json");
const REPORTS_DIR = path.join(ROOT, "reports");
const OUT_PATH = path.join(ROOT, "data", "tools.normalized.json");

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const TIMEOUT = parseInt((getArg("--timeout") || "8000"), 10);
const CONCURRENCY = parseInt((getArg("--concurrency") || "8"), 10);

function getArg(flag) {
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return null;
}

function readJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    console.error(`❌ Failed to read ${p}: ${e.message}`);
    process.exit(1);
  }
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

// -------------------- YouTube helpers --------------------
const YT_HOSTS = ["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"];
function parseYouTubeId(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (!YT_HOSTS.includes(url.hostname)) return null;

    // youtu.be/<id>
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    // youtube.com/watch?v=<id>
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || null;
    }

    // /embed/<id>, /shorts/<id>, /live/<id>
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["embed", "shorts", "live"].includes(parts[0])) {
      return parts[1] || null;
    }
    return null;
  } catch {
    return null;
  }
}
function toEmbedUrlFromId(id) {
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}
function normalizeYouTubeLink(x) {
  // Accept objects like { youtube: "..."} or { url: "..." }
  const raw = x?.youtube || x?.url || "";
  const id = parseYouTubeId(raw);
  return id ? toEmbedUrlFromId(id) : null;
}

// Validate thumbnail exists as a cheap existence check
function youtubeThumbUrl(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

// -------------------- URL checker --------------------
async function checkUrl(u, { expectImage = false, timeout = TIMEOUT } = {}) {
  if (!u || typeof u !== "string") return { ok: false, status: 0, error: "empty-url" };
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout).unref();

  const headers = {
    "User-Agent": "FindAIList-Validator/1.0 (+https://findailist.com)"
  };

  const tryRequest = async (method, url) => {
    try {
      const res = await fetch(url, {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers
      });
      const ct = res.headers.get("content-type") || "";
      const ok = res.ok || (res.status >= 200 && res.status < 400);
      if (expectImage) {
        return { ok: ok && ct.toLowerCase().startsWith("image/"), status: res.status, contentType: ct };
      }
      return { ok, status: res.status, contentType: ct };
    } catch (e) {
      return { ok: false, status: 0, error: e.name || "fetch-error" };
    }
  };

  // Try HEAD then GET (some hosts block HEAD)
  let out = await tryRequest("HEAD", u);
  if (!out.ok) out = await tryRequest("GET", u);
  clearTimeout(t);
  return out;
}

// -------------------- Ajv schema (optional) --------------------
let ajv, addFormats, validateAgainstSchema = null;
try {
  ajv = require("ajv");
  addFormats = require("ajv-formats");
  const Ajv = ajv;
  const instance = new Ajv({ allErrors: true, strict: false, allowUnionTypes: true });
  addFormats(instance);
  const baseSchema = readJSON(SCHEMA_PATH);
  const validator = instance.compile(baseSchema);
  validateAgainstSchema = (obj) => {
    const ok = validator(obj);
    return { ok, errors: validator.errors || [] };
  };
} catch {
  // Ajv not installed; skip schema validation gracefully
  validateAgainstSchema = null;
}

// -------------------- Main --------------------
(async () => {
  const tools = readJSON(DATA_PATH);
  if (!Array.isArray(tools)) {
    console.error("❌ data/tools.json must be an array");
    process.exit(1);
  }

  const normalized = [];
  const issues = []; // per tool issues
  const tasks = [];
  const limit = pLimit(CONCURRENCY);

  for (const tool of tools) {
    const tslug = tool.slug || tool.name || "<unknown>";
    const warn = [];
    const bad  = [];

    // Clone shallowly to avoid mutating original in memory
    const n = JSON.parse(JSON.stringify(tool));

    // --- HTTPS checks ---
    for (const k of ["website_url", "logo_url", "icon_url"]) {
      if (n[k] && !String(n[k]).startsWith("https://")) {
        warn.push(`${k}: not https`);
      }
    }

    // --- Tutorials → YouTube embed normalization ---
    if (Array.isArray(n.tutorials)) {
      n.tutorials = n.tutorials.map((item) => {
        const embed = normalizeYouTubeLink(item) || null;
        return embed ? { ...item, youtube: embed } : item;
      });
    }

    // --- Collect URLs to validate ---
    const urlChecks = [];

    if (n.website_url) urlChecks.push({ field: "website_url", url: n.website_url, expectImage: false });
    if (n.logo_url)    urlChecks.push({ field: "logo_url", url: n.logo_url, expectImage: true });
    if (n.icon_url)    urlChecks.push({ field: "icon_url", url: n.icon_url, expectImage: true });

    if (Array.isArray(n.gallery)) {
      for (let i = 0; i < n.gallery.length; i++) {
        const g = n.gallery[i];
        if (g?.src) urlChecks.push({ field: `gallery[${i}].src`, url: g.src, expectImage: true });
      }
    }

    if (Array.isArray(n.tutorials)) {
      for (let i = 0; i < n.tutorials.length; i++) {
        const y = n.tutorials[i]?.youtube || n.tutorials[i]?.url || null;
        const id = parseYouTubeId(y);
        if (id) {
          const thumb = youtubeThumbUrl(id);
          urlChecks.push({ field: `tutorials[${i}].youtube`, url: thumb, expectImage: true });
        } else if (y) {
          warn.push(`tutorials[${i}]: not a recognizable YouTube URL`);
        }
      }
    }

    // Push async checks with concurrency limit
    tasks.push(
      ...urlChecks.map(({ field, url, expectImage }) =>
        limit(async () => {
          const r = await checkUrl(url, { expectImage, timeout: TIMEOUT });
          return { slug: tslug, field, url, expectImage, result: r };
        })
      )
    );

    // Ajv schema validation (optional)
    if (validateAgainstSchema) {
      const sch = validateAgainstSchema(n);
      if (!sch.ok) {
        for (const e of sch.errors) {
          bad.push(`schema: ${e.instancePath || "(root)"} ${e.message}`);
        }
      }
    } else {
      warn.push("schema: skipped (install ajv + ajv-formats to enable)");
    }

    normalized.push(n);
    issues.push({ slug: tslug, warn, bad });
  }

  // Run URL checks
  const urlResults = await Promise.all(tasks);
  for (const r of urlResults) {
    const item = issues.find(x => x.slug === r.slug);
    if (!item) continue;
    const { ok, status, error, contentType } = r.result;
    if (!ok) {
      item.bad.push(`${r.field}: unreachable (${status || error || "error"}) → ${r.url}`);
    } else {
      // additional sanity for website content-type if needed
      if (!r.expectImage && contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
        // Some sites return different CTs; only warn.
        item.warn.push(`${r.field}: unusual content-type "${contentType}"`);
      }
    }
  }

  // Summaries
  const totalBad = issues.reduce((acc, x) => acc + x.bad.length, 0);
  const totalWarn = issues.reduce((acc, x) => acc + x.warn.length, 0);

  // Write normalized file if requested
  if (WRITE) {
    ensureDir(path.dirname(OUT_PATH));
    fs.writeFileSync(OUT_PATH, JSON.stringify(normalized, null, 2), "utf8");
  }

  // Report
  ensureDir(REPORTS_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(REPORTS_DIR, `url-report-${stamp}.md`);
  const lines = [];
  lines.push(`# Tools Validation Report — ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`- Timeout: ${TIMEOUT} ms`);
  lines.push(`- Concurrency: ${CONCURRENCY}`);
  lines.push(`- Schema: ${validateAgainstSchema ? "enabled" : "skipped"}`);
  lines.push(`- Normalized output: ${WRITE ? path.relative(ROOT, OUT_PATH) : "(not written — run with --write)"}`);
  lines.push("");
  for (const it of issues) {
    lines.push(`## ${it.slug}`);
    if (it.bad.length === 0 && it.warn.length === 0) {
      lines.push(`✔️  No issues`);
    } else {
      if (it.bad.length) {
        lines.push(`**Errors:**`);
        for (const b of it.bad) lines.push(`- ${b}`);
      }
      if (it.warn.length) {
        lines.push(`**Warnings:**`);
        for (const w of it.warn) lines.push(`- ${w}`);
      }
    }
    lines.push("");
  }
  lines.push(`---`);
  lines.push(`Totals: ${totalBad} error(s), ${totalWarn} warning(s)`);
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  // Console summary
  console.log(`\nValidation complete → ${path.relative(ROOT, reportPath)}`);
  if (WRITE) console.log(`Normalized JSON written → ${path.relative(ROOT, OUT_PATH)}`);
  if (totalBad > 0) {
    console.error(`\n❌ ${totalBad} error(s). Fix before publishing.`);
    process.exit(2);
  } else {
    console.log(`\n✅ No blocking errors. ${totalWarn} warning(s).`);
  }
})();

// Simple concurrency limiter (no deps)
function pLimit(max) {
  const queue = [];
  let active = 0;
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const { fn, resolve, reject } = queue.shift();
    fn().then((v) => { active--; resolve(v); next(); })
        .catch((e) => { active--; reject(e); next(); });
  };
  return (fn) => new Promise((resolve, reject) => {
    queue.push({ fn, resolve, reject });
    next();
  });
}
