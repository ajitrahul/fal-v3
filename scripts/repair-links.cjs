#!/usr/bin/env node
/**
 * scripts/repair-links.cjs
 * Purpose: Attempt to auto-repair broken URLs in data/tools.json by ONLY using the official website pages.
 * - If website_url is unreachable, tries https/http + with/without www.
 * - If logo_url/icon_url are broken, scrapes the homepage for <link rel="icon">, apple-touch-icon, og:image.
 * - If tutorials YouTube URLs are broken, looks for up to 3 YouTube links on the homepage/docs and replaces them with privacy embeds.
 * - If gallery images are broken, drops just the broken entries (keeps the rest).
 * - Produces a repair report and a repaired JSON copy.
 *
 * Usage:
 *   node scripts/repair-links.cjs
 *   node scripts/repair-links.cjs --write   # writes data/tools.repaired.json
 * Options:
 *   --input data/tools.json
 *   --timeout 12000
 *   --concurrency 6
 *
 * Requires Node 18+. Optional: cheerio (for better HTML parsing).
 */

const fs = require("fs");
const path = require("path");

if (typeof fetch !== "function") {
  console.error("❌ Requires Node 18+ (global fetch).");
  process.exit(1);
}

let cheerio = null;
try { cheerio = require("cheerio"); } catch { /* optional parsing mode */ }

const argv = process.argv.slice(2);
const ROOT = process.cwd();
const INPUT = getArg("--input") || path.join(ROOT, "data", "tools.json");
const OUT_REPAIRED = path.join(ROOT, "data", "tools.repaired.json");
const REPORT_DIR = path.join(ROOT, "reports");
const WRITE = argv.includes("--write");
const TIMEOUT = parseInt(getArg("--timeout") || "12000", 10);
const CONCURRENCY = parseInt(getArg("--concurrency") || "6", 10);

function getArg(flag) { const i = argv.indexOf(flag); return (i >= 0 && argv[i+1] && !argv[i+1].startsWith("--")) ? argv[i+1] : null; }
function ensureDir(p){ if(!fs.existsSync(p)) fs.mkdirSync(p,{recursive:true}); }
function readJSON(p){ try { return JSON.parse(fs.readFileSync(p,"utf8")); } catch(e){ console.error(`❌ Cannot read ${p}: ${e.message}`); process.exit(1);} }

const UA = {"User-Agent":"FindAIList-Repair/1.0 (+https://findailist.com)"};

// ---- YouTube helpers ----
const YT_HOSTS = ["youtube.com","www.youtube.com","m.youtube.com","youtu.be","www.youtu.be"];
function ytId(u){ if(!u) return null; try{
  const url = new URL(u);
  if(!YT_HOSTS.includes(url.hostname)) return null;
  if (url.hostname.includes("youtu.be")) return url.pathname.split("/").filter(Boolean)[0] || null;
  if (url.pathname === "/watch") return url.searchParams.get("v") || null;
  const parts = url.pathname.split("/").filter(Boolean);
  if (parts.length>=2 && ["embed","shorts","live"].includes(parts[0])) return parts[1] || null;
  return null;
}catch{return null;}}
const ytEmbed = (id)=> id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
const ytThumb = (id)=> `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

async function httpCheck(url, {expectImage=false, timeout=TIMEOUT}={}){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeout).unref();
  const tryReq = async (method)=>{
    try {
      const res = await fetch(url, { method, redirect:"follow", signal: controller.signal, headers: UA });
      const ct = (res.headers.get("content-type") || "").toLowerCase();
      const ok = res.ok || (res.status >= 200 && res.status < 400);
      clearTimeout(timer);
      return { ok: expectImage ? ok && ct.startsWith("image/") : ok, status: res.status, contentType: ct };
    } catch(e){
      clearTimeout(timer);
      return { ok:false, status:0, error:e.name || "fetch-error" };
    }
  };
  let r = await tryReq("HEAD");
  if(!r.ok) r = await tryReq("GET");
  return r;
}

async function fetchHtml(url, timeout = TIMEOUT){
  const controller = new AbortController();
  const timer = setTimeout(()=>controller.abort(), timeout).unref();
  try {
    const res = await fetch(url, { redirect:"follow", signal: controller.signal, headers: UA });
    if(!res.ok) return null;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    if(!ct.includes("text/html")) return null;
    return await res.text();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

function toAbs(base, maybe){
  if(!maybe) return null;
  try{ return new URL(maybe, base).href; } catch { return null; }
}

function extractIcons(base, html){
  const out = { icon:null, logo:null, og:null, candidates:[] };
  if(!html || !cheerio) return out;
  const $ = cheerio.load(html);
  const og = $('meta[property="og:image"]').attr("content") || $('meta[name="og:image"]').attr("content");
  if(og) out.og = toAbs(base, og);
  $('link[rel~="icon"], link[rel="apple-touch-icon"], link[rel="mask-icon"]').each((_,el)=>{
    const href = $(el).attr("href"); const sizes = ($(el).attr("sizes")||"").toLowerCase(); const rel = ($(el).attr("rel")||"").toLowerCase();
    const abs = toAbs(base, href); if(abs) out.candidates.push({ rel, sizes, href:abs });
  });
  const apple = out.candidates.find(c=>c.rel.includes("apple-touch-icon"));
  const largest = out.candidates.map(c=>({...c, n: parseInt((c.sizes||"").split("x")[0]||"0",10)})).sort((a,b)=>b.n-a.n)[0];
  out.logo = (apple && apple.href) || (largest && largest.href) || out.og || null;
  out.icon = (out.candidates.find(c=>c.rel.includes("icon")) || largest || apple || {}).href || null;
  try { const root = new URL(base); const fav = new URL("/favicon.ico", root.origin).href; if(!out.icon) out.icon = fav; } catch {}
  return out;
}

function findYouTubeLinks(base, html){
  if(!html) return [];
  const re = /(https?:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)[^"'<>\s]+)/gi;
  const matches = new Set(); let m;
  while((m = re.exec(html)) !== null){ const abs = toAbs(base, m[1]) || m[1]; matches.add(abs); }
  return Array.from(matches);
}

function pLimit(max){
  const q = []; let active = 0;
  const next = ()=>{
    if(active>=max || !q.length) return;
    active++;
    const {fn,resolve,reject} = q.shift();
    fn().then(v=>{active--;resolve(v);next();}).catch(e=>{active--;reject(e);next();});
  };
  return (fn)=> new Promise((res,rej)=>{ q.push({fn,resolve:res,reject:rej}); next(); });
}

// Tries small variants of a base site (http/https, www/no-www)
async function tryWebsiteVariants(u){
  let url;
  try { url = new URL(u); } catch { return null; }
  const hosts = new Set([url.hostname.replace(/^www\./,""), `www.${url.hostname.replace(/^www\./,"")}`]);
  const schemes = url.protocol === "http:" ? ["http:", "https:"] : ["https:", "http:"];
  for (const proto of schemes){
    for (const host of hosts){
      const candidate = `${proto}//${host}${url.pathname || "/"}`;
      const r = await httpCheck(candidate, { expectImage:false });
      if(r.ok) return candidate;
    }
  }
  return null;
}

(async ()=>{
  const tools = readJSON(INPUT);
  if(!Array.isArray(tools)){ console.error("❌ Input must be an array"); process.exit(1); }

  ensureDir(REPORT_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g,"-");
  const reportPath = path.join(REPORT_DIR, `repair-report-${stamp}.md`);
  const lines = [`# Repair Report — ${new Date().toISOString()}`, `Input: ${path.relative(ROOT, INPUT)}`, ""];

  const limit = pLimit(CONCURRENCY);
  let changed = 0;

  async function repairTool(t){
    const log = [];
    const n = JSON.parse(JSON.stringify(t));
    const slug = n.slug || n.name || "<unknown>";

    // 1) website_url
    if(n.website_url){
      const chk = await httpCheck(n.website_url, { expectImage:false });
      if(!chk.ok){
        const fixed = await tryWebsiteVariants(n.website_url);
        if(fixed && fixed !== n.website_url){
          log.push(`website_url: replaced with reachable ${fixed}`);
          n.website_url = fixed;
        } else {
          log.push(`website_url: still unreachable (${chk.status || chk.error || "error"})`);
        }
      }
    }

    // Fetch homepage HTML if possible
    let html = null;
    if(n.website_url){
      html = await fetchHtml(n.website_url, TIMEOUT);
    }

    // 2) logo/icon
    const iconFields = ["logo_url","icon_url"];
    for (const fld of iconFields){
      if(n[fld]){
        const r = await httpCheck(n[fld], { expectImage:true });
        if(!r.ok){
          if(html){
            const ic = extractIcons(n.website_url, html);
            const candidate = fld === "logo_url" ? (ic.logo || ic.og) : (ic.icon || ic.logo || ic.og);
            if(candidate){
              const rc = await httpCheck(candidate, { expectImage:true });
              if(rc.ok){
                log.push(`${fld}: replaced via site parse → ${candidate}`);
                n[fld] = candidate;
              } else {
                log.push(`${fld}: site candidate not reachable`);
              }
            } else {
              log.push(`${fld}: no candidate found on site`);
            }
          } else {
            log.push(`${fld}: homepage not fetchable`);
          }
        }
      } else {
        // missing -> try to fill
        if(html){
          const ic = extractIcons(n.website_url, html);
          const candidate = fld === "logo_url" ? (ic.logo || ic.og) : (ic.icon || ic.logo || ic.og);
          if(candidate){
            const rc = await httpCheck(candidate, { expectImage:true });
            if(rc.ok){
              log.push(`${fld}: filled via site parse → ${candidate}`);
              n[fld] = candidate;
            }
          }
        }
      }
    }

    // 3) gallery: drop broken images only
    if(Array.isArray(n.gallery) && n.gallery.length){
      const keep = [];
      for (let i=0;i<n.gallery.length;i++){
        const g = n.gallery[i];
        if(!g?.src){ continue; }
        const r = await httpCheck(g.src, { expectImage:true });
        if(r.ok){ keep.push(g); } else { log.push(`gallery[${i}]: removed broken image → ${g.src}`); }
      }
      if(keep.length !== n.gallery.length){
        n.gallery = keep;
      }
    }

    // 4) tutorials: verify YT, fill from page if needed
    const validY = [];
    if(Array.isArray(n.tutorials)){
      for (let i=0;i<n.tutorials.length;i++){
        const raw = n.tutorials[i]?.youtube || n.tutorials[i]?.url || null;
        const id = ytId(raw);
        if(id){
          const r = await httpCheck(ytThumb(id), { expectImage:true });
          if(r.ok){
            validY.push({ ...n.tutorials[i], youtube: ytEmbed(id) });
          } else {
            log.push(`tutorials[${i}]: dropped broken YouTube → ${raw}`);
          }
        } // non-youtube ignored
      }
    }
    let needMore = validY.length < 3;
    if(needMore && html){
      const links = findYouTubeLinks(n.website_url, html);
      for (const u of links){
        if(validY.length >= 3) break;
        const id = ytId(u); if(!id) continue;
        const r = await httpCheck(ytThumb(id), { expectImage:true });
        if(r.ok && !validY.find(v=>v.youtube && v.youtube.includes(id))){
          validY.push({ title: "Video", youtube: ytEmbed(id) });
          log.push(`tutorials: added from site → ${u}`);
        }
      }
    }
    if(validY.length) n.tutorials = validY;

    return { slug, updated: log.length>0, log, next: n };
  }

  const results = await Promise.all(tools.map(t => limit(()=>repairTool(t))));
  const repaired = results.map(r => r.next);
  for (const r of results){
    lines.push(`## ${r.slug}`);
    if(!r.updated) { lines.push("No changes."); }
    else { changed++; r.log.forEach(l=>lines.push(`- ${l}`)); }
    lines.push("");
  }
  lines.push("---");
  lines.push(`Changed tools: ${changed} / ${tools.length}`);

  ensureDir(REPORT_DIR);
  fs.writeFileSync(reportPath, lines.join("\n"), "utf8");
  console.log(`\nRepair completed → ${path.relative(ROOT, reportPath)}`);

  if (WRITE){
    fs.writeFileSync(OUT_REPAIRED, JSON.stringify(repaired, null, 2), "utf8");
    console.log(`Repaired JSON → ${path.relative(ROOT, OUT_REPAIRED)}`);
  } else {
    console.log(`(dry-run) Use --write to save data/tools.repaired.json`);
  }
})();
