#!/usr/bin/env node
/**
 * scripts/audit-youtube.cjs
 * Purpose: Audit (and optionally fix) YouTube links in data/tools.json tutorials.
 *
 * Features:
 * - Accepts watch/shorts/youtu.be/embed formats.
 * - Verifies each video by checking the YouTube thumbnail URL (200 + image/*).
 * - --fix: converts all valid videos to privacy embed (youtube-nocookie.com).
 * - --drop-broken: removes broken/non-YouTube entries from tutorials[].
 * - Caps to --max videos per tool (default 3) while preserving order.
 * - Writes a separate output file unless you explicitly replace your live one.
 *
 * Usage:
 *   node scripts/audit-youtube.cjs
 *   node scripts/audit-youtube.cjs --fix --drop-broken --write
 *
 * Options:
 *   --input data/tools.json
 *   --output data/tools.youtube.fixed.json
 *   --timeout 12000
 *   --concurrency 8
 *   --max 3
 *   --fix           (convert to privacy embed)
 *   --drop-broken   (remove broken/non-YouTube)
 *   --write         (write output file)
 */

const fs = require("fs");
const path = require("path");

if (typeof fetch !== "function") {
  console.error("❌ Requires Node 18+ (global fetch).");
  process.exit(1);
}

const argv = process.argv.slice(2);
const ROOT = process.cwd();
const INPUT  = getArg("--input")  || path.join(ROOT, "data", "tools.json");
const OUTPUT = getArg("--output") || path.join(ROOT, "data", "tools.youtube.fixed.json");
const TIMEOUT = parseInt(getArg("--timeout") || "12000", 10);
const CONCURRENCY = parseInt(getArg("--concurrency") || "8", 10);
const MAX_VIDEOS = parseInt(getArg("--max") || "3", 10);
const FIX = argv.includes("--fix");
const DROP_BROKEN = argv.includes("--drop-broken");
const WRITE = argv.includes("--write");

function getArg(flag) {
  const i = argv.indexOf(flag);
  if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1];
  return null;
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) { console.error(`❌ Cannot read ${p}: ${e.message}`); process.exit(1); }
}

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

const REPORTS_DIR = path.join(ROOT, "reports");
ensureDir(REPORTS_DIR);

const UA = { "User-Agent": "FindAIList-YTAudit/1.0 (+https://findailist.com)" };

const YT_HOSTS = ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be"];
function ytId(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (!YT_HOSTS.includes(url.hostname)) return null;
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.split("/").filter(Boolean)[0] || null;
    }
    if (url.pathname === "/watch") {
      return url.searchParams.get("v") || null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["embed", "shorts", "live"].includes(parts[0])) {
      return parts[1] || null;
    }
    return null;
  } catch {
    return null;
  }
}
const ytEmbed = (id) => id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

async function httpCheck(url, { expectImage = false, timeout = TIMEOUT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout).unref();
  try {
    const res = await fetch(url, { method: "HEAD", redirect: "follow", signal: controller.signal, headers: UA });
    const ok = res.ok || (res.status >= 200 && res.status < 400);
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    clearTimeout(timer);
    return { ok: expectImage ? ok && ct.startsWith("image/") : ok, status: res.status, contentType: ct };
  } catch (e) {
    clearTimeout(timer);
    return { ok: false, status: 0, error: e.name || "fetch-error" };
  }
}

function pLimit(max) {
  const q = []; let active = 0;
  const next = () => {
    if (active >= max || q.length === 0) return;
    active++;
    const { fn, resolve, reject } = q.shift();
    fn().then(v => { active--; resolve(v); next(); })
      .catch(e => { active--; reject(e); next(); });
  };
  return (fn) => new Promise((resolve, reject) => { q.push({ fn, resolve, reject }); next(); });
}

(async () => {
  const data = readJSON(INPUT);
  const tools = Array.isArray(data) ? data : (Array.isArray(data.tools) ? data.tools : []);
  if (!Array.isArray(tools)) {
    console.error("❌ data/tools.json must be an array (or { tools: [...] })");
    process.exit(1);
  }

  const limit = pLimit(CONCURRENCY);
  const tasks = [];
  const report = [];
  let totalChecked = 0, totalValid = 0, totalFixed = 0, totalDropped = 0;

  function summarize(slug, lines) {
    report.push(`## ${slug}`);
    if (lines.length === 0) report.push("No changes.");
    else lines.forEach(l => report.push(`- ${l}`));
    report.push("");
  }

  const updated = [];
  for (const t of tools) {
    const n = JSON.parse(JSON.stringify(t));
    const slug = n.slug || n.name || "<unknown>";
    const lines = [];
    const seenIds = new Set();

    const tutorials = Array.isArray(n.tutorials) ? n.tutorials.map(x => ({ ...x })) : [];
    const results = await Promise.all(tutorials.map((item, idx) => limit(async () => {
      const raw = item.youtube || item.url || "";
      const id = ytId(raw);
      totalChecked++;
      if (!id) return { idx, ok: false, reason: "not-youtube", id: null, raw };
      const r = await httpCheck(ytThumb(id), { expectImage: true });
      return { idx, ok: r.ok, id, raw };
    })));

    // apply fixes/drops
    let newTuts = [];
    for (const r of results) {
      const it = tutorials[r.idx];
      if (!r.ok) {
        if (DROP_BROKEN) {
          totalDropped++;
          lines.push(`dropped invalid/broken tutorial: ${it.youtube || it.url || "(no url)"}`);
          continue;
        } else {
          // keep as-is but note
          lines.push(`warning: invalid/broken tutorial left as-is → ${it.youtube || it.url || "(no url)"}`);
          newTuts.push(it);
          continue;
        }
      }
      totalValid++;
      if (FIX) {
        const embed = ytEmbed(r.id);
        if (embed && it.youtube !== embed) {
          it.youtube = embed;
          delete it.url;
          totalFixed++;
          lines.push(`fixed to privacy embed: ${embed}`);
        }
      }
      // ensure uniqueness by video id
      if (!seenIds.has(r.id)) {
        seenIds.add(r.id);
        newTuts.push(it);
      }
    }

    // keep at most MAX_VIDEOS
    if (newTuts.length > MAX_VIDEOS) {
      lines.push(`trimmed tutorials from ${newTuts.length} → ${MAX_VIDEOS}`);
      newTuts = newTuts.slice(0, MAX_VIDEOS);
    }

    // write back
    n.tutorials = newTuts;
    updated.push(n);
    summarize(slug, lines);
  }

  // write report
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(REPORTS_DIR, `yt-audit-${stamp}.md`);
  const header = [
    `# YouTube Audit — ${new Date().toISOString()}`,
    `Input: ${path.relative(ROOT, INPUT)}`,
    `Options: fix=${FIX} drop_broken=${DROP_BROKEN} max=${MAX_VIDEOS} timeout=${TIMEOUT} concurrency=${CONCURRENCY}`,
    ``,
    `Totals: checked=${totalChecked}, valid=${totalValid}, fixed=${totalFixed}, dropped=${totalDropped}`,
    ``,
  ];
  fs.writeFileSync(reportPath, header.concat(report).join("\n"), "utf8");
  console.log(`\nReport → ${path.relative(ROOT, reportPath)}`);

  if (WRITE) {
    ensureDir(path.dirname(OUTPUT));
    fs.writeFileSync(OUTPUT, JSON.stringify(updated, null, 2), "utf8");
    console.log(`Output → ${path.relative(ROOT, OUTPUT)}`);
  } else {
    console.log(`(dry-run) Use --write to save ${path.relative(ROOT, OUTPUT)}`);
  }
})();
