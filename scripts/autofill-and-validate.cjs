#!/usr/bin/env node
/* scripts/autofill-and-validate.cjs
 * Auto-fills logo/icon/YouTube from each tool's website and validates URLs.
 * Usage:
 *   node scripts/autofill-and-validate.cjs
 *   node scripts/autofill-and-validate.cjs --write         # also writes tools.normalized.json
 *   node scripts/autofill-and-validate.cjs --input data/tools.json --timeout 12000 --concurrency 12
 */

const fs = require("fs");
const path = require("path");

// Node 18+ for global fetch required
if (typeof fetch !== "function") {
  console.error("❌ Requires Node 18+ (global fetch).");
  process.exit(1);
}

let cheerio = null;
try { cheerio = require("cheerio"); } catch { /* optional; we’ll handle no-cheerio mode */ }

const ROOT = process.cwd();
const argv = process.argv.slice(2);

const INPUT = getArg("--input") || path.join(ROOT, "data", "tools.json");
const OUT_NORM = path.join(ROOT, "data", "tools.normalized.json");
const REPORTS_DIR = path.join(ROOT, "reports");
const SCHEMA_PATH = path.join(ROOT, "tools.schema.json");
const WRITE = argv.includes("--write");
const TIMEOUT = parseInt(getArg("--timeout") || "8000", 10);
const CONCURRENCY = parseInt(getArg("--concurrency") || "8", 10);

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

function toAbsoluteUrl(base, maybe) {
  if (!maybe) return null;
  try {
    const u = new URL(maybe, base);
    return u.href;
  } catch { return null; }
}

// -------------------- YouTube helpers --------------------
const YT_HOSTS = ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be"];
function ytId(u) {
  if (!u) return null;
  try {
    const url = new URL(u);
    if (!YT_HOSTS.includes(url.hostname)) return null;
    if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || null;
    if (url.pathname === "/watch") return url.searchParams.get("v") || null;
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["embed","shorts","live"].includes(parts[0])) return parts[1] || null;
    return null;
  } catch { return null; }
}
const ytEmbed = (id) => id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
const ytThumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

// -------------------- HTTP checks --------------------
async function httpCheck(url, { expectImage = false, timeout = TIMEOUT } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout).unref();
  const ua = {"User-Agent":"FindAIList-Autofill/1.0 (+https://findailist.com)"};
  const tryReq = async (method) => {
    try {
      const res = await fetch(url, { method, redirect:"follow", signal: controller.signal, headers: ua });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const ok = res.ok || (res.status >= 200 && res.status < 400);
      clearTimeout(timer);
      return { ok: expectImage ? ok && ct.startsWith("image/") : ok, status: res.status, contentType: ct };
    } catch (e) {
      clearTimeout(timer);
      return { ok:false, status:0, error: e.name || "fetch-error" };
    }
  };
  let r = await tryReq("HEAD");
  if (!r.ok) r = await tryReq("GET");
  return r;
}

// -------------------- HTML parse helpers --------------------
async function fetchHtml(url) {
  try {
    const r = await fetch(url, { redirect:"follow", signal: AbortSignal.timeout(TIMEOUT) });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (!ct.includes("text/html")) return null;
    return await r.text();
  } catch { return null; }
}

function extractIcons(base, html) {
  const out = { icon_url: null, logo_url: null, og_image: null, candidates: [] };
  if (!html || !cheerio) return out;

  const $ = cheerio.load(html);

  // og:image
  const og = $('meta[property="og:image"]').attr("content") || $('meta[name="og:image"]').attr("content");
  if (og) out.og_image = toAbsoluteUrl(base, og);

  // link rel icons
  $('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]').each((_, el) => {
    const href = $(el).attr("href");
    const sizes = ($(el).attr("sizes") || "").toLowerCase();
    const rel = ($(el).attr("rel") || "").toLowerCase();
    const abs = toAbsoluteUrl(base, href);
    if (abs) out.candidates.push({ rel, sizes, href: abs });
  });

  // simple heuristic: prefer apple-touch-icon / largest sizes for logo_url, any icon for icon_url
  const apple = out.candidates.find(c => c.rel.includes("apple-touch-icon"));
  const largest = out.candidates
    .map(c => ({...c, n: parseInt((c.sizes || "").split("x")[0] || "0", 10)}))
    .sort((a,b)=>b.n-a.n)[0];

  out.logo_url = (apple && apple.href) || (largest && largest.href) || out.og_image || null;
  out.icon_url = (out.candidates.find(c => c.rel.includes("icon")) || largest || apple || {}).href || null;

  // fallback favicon.ico
  try {
    const root = new URL(base);
    const fav = new URL("/favicon.ico", root.origin).href;
    out.candidates.push({ rel:"favicon", href: fav });
    if (!out.icon_url) out.icon_url = fav;
  } catch {}

  return out;
}

function findYouTubeLinks(base, html) {
  if (!html) return [];
  const re = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^"'<>\s]+)/gi;
  const matches = [];
  let m; while ((m = re.exec(html)) !== null) matches.push(m[1]);
  // de-dup, resolve
  const uniq = Array.from(new Set(matches)).map(u => toAbsoluteUrl(base, u) || u);
  return uniq;
}

// -------------------- Ajv (optional) --------------------
let validateSchema = null;
try {
  const Ajv = require("ajv");
  const addFormats = require("ajv-formats");
  const ajv = new Ajv({ allErrors:true, strict:false, allowUnionTypes:true });
  addFormats(ajv);
  const base = readJSON(SCHEMA_PATH);
  const v = ajv.compile(base);
  validateSchema = (obj) => { const ok = v(obj); return { ok, errors: v.errors || [] }; };
} catch { /* schema step optional */ }

// -------------------- concurrency limiter --------------------
function pLimit(max) {
  const q = []; let active = 0;
  const next = () => {
    if (active >= max || q.length === 0) return;
    active++; const { fn, resolve, reject } = q.shift();
    fn().then(v=>{ active--; resolve(v); next(); })
        .catch(e=>{ active--; reject(e); next(); });
  };
  return (fn) => new Promise((res, rej)=>{ q.push({ fn, resolve:res, reject:rej }); next(); });
}

// -------------------- Main --------------------
(async () => {
  const tools = readJSON(INPUT);
  if (!Array.isArray(tools)) { console.error("❌ Input must be an array"); process.exit(1); }

  const limit = pLimit(CONCURRENCY);
  const normalized = [];
  const issues = [];
  const urlChecks = [];

  for (const tool of tools) {
    const slug = tool.slug || tool.name || "<unknown>";
    const warn = []; const bad = [];

    const n = JSON.parse(JSON.stringify(tool)); // shallow clone
    const base = n.website_url && n.website_url.startsWith("http") ? n.website_url : null;

    // Fetch & parse homepage for icons/og/youtube if we have a base URL
    let html = null;
    if (base) {
      html = await fetchHtml(base);
      if (!html) warn.push("website_url: not HTML or unreachable (skipping autofill)");
    }

    // Autofill icons/logos when missing
    if (base && html) {
      const ic = extractIcons(base, html);
      if (!n.logo_url && ic.logo_url) n.logo_url = ic.logo_url;
      if (!n.icon_url && ic.icon_url) n.icon_url = ic.icon_url;
      // If both still empty but og_image exists
      if (!n.logo_url && ic.og_image) n.logo_url = ic.og_image;
    }

    // Autofill tutorials (YouTube) if missing or empty
    if (base && html) {
      const candidates = findYouTubeLinks(base, html).slice(0, 5);
      const ids = candidates.map(ytId).filter(Boolean);
      const embeds = ids.map(id => ytEmbed(id)).filter(Boolean);

      if (!Array.isArray(n.tutorials)) n.tutorials = [];
      // Only add if we don't already have 3 videos
      const existing = n.tutorials.filter(x => x.youtube).length;
      for (const e of embeds) {
        if (n.tutorials.length >= 3 || (existing && existing >= 3)) break;
        if (!n.tutorials.find(x => x.youtube === e)) {
          n.tutorials.push({ title: "Video", youtube: e });
        }
      }
    }

    // Normalize any provided tutorial links to nocookie embed
    if (Array.isArray(n.tutorials)) {
      n.tutorials = n.tutorials.map((t) => {
        const raw = t.youtube || t.url;
        const id = ytId(raw);
        return id ? { ...t, youtube: ytEmbed(id) } : t;
      });
    }

    // Queue URL checks
    if (n.website_url) urlChecks.push({ slug, field:"website_url", url:n.website_url, expectImage:false });
    if (n.logo_url)    urlChecks.push({ slug, field:"logo_url", url:n.logo_url, expectImage:true });
    if (n.icon_url)    urlChecks.push({ slug, field:"icon_url", url:n.icon_url, expectImage:true });
    if (Array.isArray(n.gallery)) {
      n.gallery.forEach((g,i)=>{ if (g?.src) urlChecks.push({ slug, field:`gallery[${i}].src`, url: g.src, expectImage:true }); });
    }
    if (Array.isArray(n.tutorials)) {
      n.tutorials.forEach((t,i)=>{
        const id = ytId(t.youtube || t.url);
        if (id) urlChecks.push({ slug, field:`tutorials[${i}].youtube`, url: ytThumb(id), expectImage:true });
      });
    }

    // HTTPS hints
    for (const k of ["website_url","logo_url","icon_url"]) {
      if (n[k] && !String(n[k]).startsWith("https://")) warn.push(`${k}: not https`);
    }

    // Schema validation (optional)
    if (validateSchema) {
      const r = validateSchema(n);
      if (!r.ok) r.errors.forEach(e => bad.push(`schema: ${e.instancePath || "(root)"} ${e.message}`));
    } else {
      warn.push("schema: skipped (install ajv + ajv-formats to enable)");
    }

    normalized.push(n);
    issues.push({ slug, warn, bad });
  }

  // Run URL checks concurrently
  const limitRun = pLimit(CONCURRENCY);
  const results = await Promise.all(urlChecks.map(job =>
    limitRun(async () => {
      const r = await httpCheck(job.url, { expectImage: job.expectImage, timeout: TIMEOUT });
      return { ...job, result:r };
    })
  ));

  for (const r of results) {
    const entry = issues.find(i => i.slug === r.slug);
    if (!entry) continue;
    const { ok, status, error, contentType } = r.result;
    if (!ok) {
      entry.bad.push(`${r.field}: unreachable (${status || error || "error"}) → ${r.url}`);
    } else if (!r.expectImage && contentType && !/text\/html|application\/xhtml\+xml/i.test(contentType)) {
      entry.warn.push(`${r.field}: unusual content-type "${contentType}"`);
    }
  }

  // Output
  ensureDir(REPORTS_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const reportPath = path.join(REPORTS_DIR, `autofill-report-${stamp}.md`);

  const totalBad = issues.reduce((a,x)=>a+x.bad.length,0);
  const totalWarn = issues.reduce((a,x)=>a+x.warn.length,0);

  const lines = [];
  lines.push(`# Tools Autofill + Validation Report — ${new Date().toISOString()}`);
  lines.push(`Input: ${path.relative(ROOT, INPUT)}`);
  lines.push(`Timeout: ${TIMEOUT}ms | Concurrency: ${CONCURRENCY} | Cheerio: ${!!cheerio}`);
  lines.push(`Schema: ${validateSchema ? "enabled" : "skipped"}`);
  lines.push("");
  for (const it of issues) {
    lines.push(`## ${it.slug}`);
    if (!it.warn.length && !it.bad.length) { lines.push("✔️  No issues"); lines.push(""); continue; }
    if (it.bad.length) { lines.push("**Errors:**"); it.bad.forEach(b=>lines.push(`- ${b}`)); }
    if (it.warn.length) { lines.push("**Warnings:**"); it.warn.forEach(w=>lines.push(`- ${w}`)); }
    lines.push("");
  }
  lines.push("---");
  lines.push(`Totals: ${totalBad} error(s), ${totalWarn} warning(s)`);
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");

  if (WRITE) fs.writeFileSync(OUT_NORM, JSON.stringify(normalized, null, 2), "utf8");

  console.log(`\nReport → ${path.relative(ROOT, reportPath)}`);
  if (WRITE) console.log(`Normalized → ${path.relative(ROOT, OUT_NORM)}`);
  if (totalBad > 0) { console.error(`\n❌ ${totalBad} error(s) found`); process.exit(2); }
  console.log(`\n✅ No blocking errors. ${totalWarn} warning(s).`);
})();
