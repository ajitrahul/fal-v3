// scripts/validate-assets.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = process.cwd();
const TOOLS_PATH = process.env.TOOLS_PATH || path.join(ROOT, "data", "tools.json");
const OUT_DIR = path.join(ROOT, "data", "reports");
const OUT_CSV = path.join(OUT_DIR, "assets-audit.csv");

const ARGS = process.argv.slice(2);
const DO_FIX = ARGS.includes("--fix");
const TIMEOUT_MS = 12000;

const YT_WATCH_RE = /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([A-Za-z0-9_\-]{11})([&#?].*)?$/i;
const YT_SHORTS_RE = /^https?:\/\/(www\.)?youtube\.com\/shorts\/([A-Za-z0-9_\-]{11})(\?.*)?$/i;
const YT_YOUTU_BE_RE = /^https?:\/\/youtu\.be\/([A-Za-z0-9_\-]{11})(\?.*)?$/i;

function abortableFetch(url, opts = {}, timeout = TIMEOUT_MS) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { ...opts, signal: controller.signal }).finally(() => clearTimeout(id));
}

async function ensureDir(p) {
  try { await fs.access(p); } catch { await fs.mkdir(p, { recursive: true }); }
}

function csvEscape(s) {
  const str = String(s ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function toCsvRow(cols) {
  return cols.map(csvEscape).join(",") + "\n";
}

function readJsonSafe(buf) {
  try { return JSON.parse(buf); } catch { return null; }
}

function normalizeYouTubeWatch(url) {
  if (YT_WATCH_RE.test(url)) return url;
  const m1 = YT_SHORTS_RE.exec(url);
  if (m1) return `https://www.youtube.com/watch?v=${m1[2]}`;
  const m2 = YT_YOUTU_BE_RE.exec(url);
  if (m2) return `https://www.youtube.com/watch?v=${m2[1]}`;
  // try to extract v= param generically
  try {
    const u = new URL(url);
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_\-]{11}$/.test(v)) return `https://www.youtube.com/watch?v=${v}`;
  } catch {}
  return url;
}

async function checkImage(url) {
  try {
    const res = await abortableFetch(url, { method: "HEAD" });
    if (!res.ok) {
      // Some CDNs don’t allow HEAD; try GET with small range if server supports
      const res2 = await abortableFetch(url, { method: "GET" });
      if (!res2.ok) return { ok: false, status: res2.status, ctype: res2.headers.get("content-type") || "" };
      return { ok: true, status: res2.status, ctype: res2.headers.get("content-type") || "" };
    }
    return { ok: true, status: res.status, ctype: res.headers.get("content-type") || "" };
  } catch (e) {
    return { ok: false, status: "ERR", ctype: "" };
  }
}

async function checkUrl200(url) {
  try {
    const res = await abortableFetch(url, { method: "HEAD" });
    if (!res.ok) {
      const res2 = await abortableFetch(url, { method: "GET" });
      return { ok: res2.ok, status: res2.status, ctype: res2.headers.get("content-type") || "" };
    }
    return { ok: true, status: res.status, ctype: res.headers.get("content-type") || "" };
  } catch {
    return { ok: false, status: "ERR", ctype: "" };
  }
}

async function checkYouTubeWatch(url) {
  // require watch URL format + oEmbed success
  const norm = normalizeYouTubeWatch(url);
  if (!YT_WATCH_RE.test(norm)) {
    return { ok: false, status: "BAD_FORMAT", detail: "not_watch_url", norm };
  }
  const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(norm)}&format=json`;
  try {
    const res = await abortableFetch(oembed, { method: "GET" });
    if (!res.ok) return { ok: false, status: res.status, detail: "oembed_fail", norm };
    return { ok: true, status: 200, detail: "oembed_ok", norm };
  } catch {
    return { ok: false, status: "ERR", detail: "oembed_err", norm };
  }
}

/** Optional: If you export YOUTUBE_API_KEY and pass --fix, we can search for an alternative */
async function youtubeSearchFirstResult(q) {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return null;
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", key);
  try {
    const res = await abortableFetch(url.toString(), { method: "GET" }, 15000);
    if (!res.ok) return null;
    const data = await res.json();
    const id = data?.items?.[0]?.id?.videoId;
    if (id && /^[A-Za-z0-9_\-]{11}$/.test(id)) return `https://www.youtube.com/watch?v=${id}`;
    return null;
  } catch {
    return null;
  }
}

async function main() {
  await ensureDir(OUT_DIR);

  // Load tools.json
  const buf = await fs.readFile(TOOLS_PATH, "utf-8");
  const DB = readJsonSafe(buf);
  if (!DB || !Array.isArray(DB.tools) && !Array.isArray(DB)) {
    console.error(`✖ Could not parse ${TOOLS_PATH}. Expected { tools: [...] } or an array of tools.`);
    process.exit(1);
  }
  const tools = Array.isArray(DB) ? DB : DB.tools;

  const rows = [];
  rows.push(
    toCsvRow([
      "tool_id",
      "tool_slug",
      "tool_name",
      "logo_ok",
      "logo_status",
      "logo_ctype",
      "gallery_ok_count",
      "gallery_total",
      "tutorials_ok_count",
      "tutorials_total",
      "notes"
    ])
  );

  let changed = 0;

  for (const t of tools) {
    const toolId = t.id || "";
    const slug = t.slug || "";
    const name = t.name || "";

    // Logo
    let logoOk = "";
    let logoStatus = "";
    let logoCtype = "";
    if (t.logo_url) {
      const res = await checkImage(t.logo_url);
      logoOk = res.ok ? "ok" : "fail";
      logoStatus = res.status;
      logoCtype = res.ctype;
      if (res.ok && !/^image\//i.test(res.ctype || "")) {
        logoOk = "warn"; // reachable but not image/*
      }
    } else {
      logoOk = "missing";
    }

    // Gallery
    const gallery = Array.isArray(t.gallery) ? t.gallery : [];
    let gOk = 0;
    for (const g of gallery) {
      if (!g?.src) continue;
      const res = await checkUrl200(g.src);
      if (res.ok) gOk += 1;
    }

    // Tutorials (YouTube)
    const tutorials = Array.isArray(t.tutorials) ? t.tutorials : [];
    let tutOk = 0;
    const notes = [];

    for (let i = 0; i < tutorials.length; i++) {
      const it = tutorials[i];
      if (!it?.youtube) continue;
      let url = it.youtube;
      // normalize
      const norm = normalizeYouTubeWatch(url);
      if (norm !== url && DO_FIX) {
        it.youtube = norm;
        changed++;
      }
      const chk = await checkYouTubeWatch(norm);
      if (chk.ok) {
        tutOk++;
      } else {
        notes.push(`tutorial_${i + 1}:${chk.status}:${chk.detail || ""}`);
        // optional search+fix
        if (DO_FIX && process.env.YOUTUBE_API_KEY) {
          const q = `${t.name} tutorial`;
          const candidate = await youtubeSearchFirstResult(q);
          if (candidate) {
            const chk2 = await checkYouTubeWatch(candidate);
            if (chk2.ok) {
              tutorials[i].youtube = chk2.norm;
              tutOk++;
              changed++;
              notes.push(`tutorial_${i + 1}:replaced_by_search`);
            }
          }
        }
      }
    }

    rows.push(
      toCsvRow([
        toolId,
        slug,
        name,
        logoOk,
        logoStatus,
        logoCtype,
        gOk,
        gallery.length,
        tutOk,
        tutorials.length,
        notes.join("|")
      ])
    );
  }

  await fs.writeFile(OUT_CSV, rows.join(""), "utf-8");

  // If tools were an object { tools: [...] } and we DID fix, persist it
  if (DO_FIX && !Array.isArray(DB)) {
    await fs.writeFile(TOOLS_PATH, JSON.stringify({ ...DB, tools }, null, 2), "utf-8");
  } else if (DO_FIX && Array.isArray(DB)) {
    await fs.writeFile(TOOLS_PATH, JSON.stringify(tools, null, 2), "utf-8");
  }

  console.log(`✓ Audit complete → ${path.relative(ROOT, OUT_CSV)}${DO_FIX ? `  (fixed: ${changed})` : ""}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
