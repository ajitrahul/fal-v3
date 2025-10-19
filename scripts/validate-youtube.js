#!/usr/bin/env node
/**
 * Validate & auto-fix YouTube tutorial URLs inside tools.json
 *
 * Usage:
 *   node scripts/validate-youtube.js --in ./data/tools.json --out ./data/tools.fixed.json --api-key YOUR_YT_API_KEY
 *   node scripts/validate-youtube.js --in ./data/tools.json --inplace --backup
 *
 * Requires: Node 18+ (for global fetch). No external deps.
 *
 * Rules:
 * - A YouTube link is considered "active" if https://www.youtube.com/oembed?url=<URL> returns 200.
 *   (This filters out deleted/blocked/private/non-embeddable/age-gated videos.)
 * - If inactive, we search a replacement:
 *     A) With API key: YouTube Data API search for "<toolName> tutorial" (embeddable videos only)
 *     B) Without API key: DuckDuckGo HTML results for "site:youtube.com <toolName> tutorial"
 * - We normalize all links to the standard watch URL: https://www.youtube.com/watch?v=<id>
 */

import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// ---- simple argv parsing ----
const args = process.argv.slice(2);
function getFlag(name, hasValue = false) {
  const i = args.indexOf(name);
  if (i === -1) return hasValue ? undefined : false;
  return hasValue ? args[i + 1] : true;
}
const IN_PATH = getFlag("--in", true);
const OUT_PATH = getFlag("--out", true);
const INPLACE = getFlag("--inplace");
const BACKUP = getFlag("--backup");
const API_KEY = getFlag("--api-key", true) || process.env.YOUTUBE_API_KEY || process.env.YT_API_KEY;

if (!IN_PATH) {
  console.error("Error: --in <path/to/tools.json> is required.");
  process.exit(1);
}

// ---- helpers ----
const YT_WATCH = (id) => `https://www.youtube.com/watch?v=${id}`;
const YT_OEMBED = (u) => `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(u)}`;
const isYouTubeHost = (h) => /(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(h);

function extractVideoId(u) {
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (host.endsWith("youtube.com")) {
      // watch?v=, embed/ID, shorts/ID, live?v=
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const parts = url.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return parts[1];
      if (parts[0] === "shorts" && parts[1]) return parts[1];
      if (parts[0] === "live") return url.searchParams.get("v") || parts[1] || null;
    }
  } catch (_) {}
  return null;
}

function normalizeWatchUrl(u) {
  const id = extractVideoId(u);
  return id ? YT_WATCH(id) : null;
}

async function fetchJSON(url, { timeoutMs = 12000, headers = {} } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    const text = await res.text(); // robust to invalid JSON bodies
    clearTimeout(t);
    if (!res.ok) {
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    try {
      return JSON.parse(text);
    } catch {
      return text; // sometimes we purposely want raw html (DDG fallback)
    }
  } catch (e) {
    clearTimeout(t);
    throw e;
  }
}

async function isActiveYouTube(url) {
  const normalized = normalizeWatchUrl(url);
  if (!normalized) return { ok: false, reason: "not-youtube" };
  try {
    const res = await fetch(YT_OEMBED(normalized));
    if (res.status === 200) return { ok: true, url: normalized };
    return { ok: false, reason: `oembed-${res.status}` };
  } catch (e) {
    return { ok: false, reason: e.message || "fetch-error" };
  }
}

// YouTube API search (if API key provided)
async function searchYouTubeAPI(query, apiKey, { maxResults = 8 } = {}) {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(maxResults),
    q: query,
    videoEmbeddable: "true", // avoid non-embeddable
    order: "relevance",
    safeSearch: "none",
    key: apiKey,
  });
  const url = `https://www.googleapis.com/youtube/v3/search?${params}`;
  const data = await fetchJSON(url);
  const items = (data.items || []).map((it) => it.id?.videoId).filter(Boolean);
  if (!items.length) return [];
  // Get status/duration to filter Shorts/blocked
  const vParams = new URLSearchParams({
    part: "status,contentDetails",
    id: items.join(","),
    key: apiKey,
  });
  const vData = await fetchJSON(`https://www.googleapis.com/youtube/v3/videos?${vParams}`);
  const byId = Object.fromEntries((vData.items || []).map((x) => [x.id, x]));
  const candidates = items
    .map((id) => {
      const meta = byId[id];
      return {
        id,
        embeddable: Boolean(meta?.status?.embeddable),
        // ISO 8601 duration like PT3M12S -> rough seconds
        seconds: iso8601DurationToSeconds(meta?.contentDetails?.duration || "PT0S"),
      };
    })
    .filter((x) => x.embeddable)
    // prefer >= 180s to avoid Shorts/reels, but allow anything if nothing long exists
    .sort((a, b) => b.seconds - a.seconds);

  const longOrAny = candidates.find((x) => x.seconds >= 180) || candidates[0];
  return longOrAny ? [YT_WATCH(longOrAny.id)] : [];
}

function iso8601DurationToSeconds(iso) {
  // minimal parser: PT#H#M#S
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "");
  if (!m) return 0;
  const [_, h, mm, s] = m;
  return (Number(h || 0) * 3600) + (Number(mm || 0) * 60) + Number(s || 0);
}

// Fallback search via DuckDuckGo HTML results (no key)
async function searchYouTubeViaDDG(query) {
  const q = `site:youtube.com ${query} tutorial`;
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
  const html = await fetchJSON(url, { timeoutMs: 15000 }); // returns raw html string
  if (typeof html !== "string") return [];
  // Find first watch link
  const re = /https?:\/\/(?:www\.)?youtube\.com\/watch\?[^"'<>\s]+/gi;
  const matches = html.match(re) || [];
  // clean & normalize
  for (const m of matches) {
    const normalized = normalizeWatchUrl(m);
    if (normalized) return [normalized];
  }
  return [];
}

// Recursively collect references to every YT URL + provide a setter
function collectYouTubeRefs(node, path = []) {
  const refs = [];

  const isURLString = (s) =>
    typeof s === "string" &&
    (s.includes("youtube.com/") || s.includes("youtu.be/"));

  if (Array.isArray(node)) {
    node.forEach((val, idx) => {
      if (typeof val === "string" && isURLString(val)) {
        refs.push({
          path: [...path, idx],
          get: () => node[idx],
          set: (newUrl) => (node[idx] = newUrl),
          kind: "string",
        });
      } else if (typeof val === "object" && val !== null) {
        // if object has url
        if (typeof val.url === "string" && isURLString(val.url)) {
          refs.push({
            path: [...path, idx, "url"],
            get: () => val.url,
            set: (newUrl) => (val.url = newUrl),
            kind: "object.url",
          });
        }
        refs.push(...collectYouTubeRefs(val, [...path, idx]));
      }
    });
  } else if (typeof node === "object" && node !== null) {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string" && isURLString(v)) {
        refs.push({
          path: [...path, k],
          get: () => node[k],
          set: (newUrl) => (node[k] = newUrl),
          kind: "string",
        });
      } else if (typeof v === "object" && v !== null) {
        // { url: "..." } pattern
        if (typeof v.url === "string" && isURLString(v.url)) {
          refs.push({
            path: [...path, k, "url"],
            get: () => v.url,
            set: (newUrl) => (v.url = newUrl),
            kind: "object.url",
          });
        }
        refs.push(...collectYouTubeRefs(v, [...path, k]));
      }
    }
  }
  return refs;
}

// Best-guess "tool name" for searching
function guessToolName(toolObj) {
  return (
    toolObj.tool_name ||
    toolObj.name ||
    toolObj.title ||
    toolObj.slug ||
    toolObj.brand ||
    ""
  );
}

// Find replacement URL for a given tool
async function findReplacement(toolObj, failUrl) {
  const name = guessToolName(toolObj) || "AI tool";
  const baseQueries = [
    `${name} tutorial`,
    `${name} how to use`,
    `${name} walkthrough`,
    `${name} demo`,
    `${name} beginners guide`,
  ];

  for (const q of baseQueries) {
    try {
      let candidates = [];
      if (API_KEY) {
        candidates = await searchYouTubeAPI(q, API_KEY);
      } else {
        candidates = await searchYouTubeViaDDG(q);
      }
      for (const c of candidates) {
        const check = await isActiveYouTube(c);
        if (check.ok) return check.url;
      }
    } catch (_) {
      // continue trying next query
    }
    await delay(250); // be gentle
  }
  return null;
}

function formatPath(p) {
  return p
    .map((seg) => (typeof seg === "number" ? `[${seg}]` : `.${seg}`))
    .join("")
    .replace(/^\./, "");
}

// ---- main ----
(async () => {
  // read
  const raw = await fs.readFile(path.resolve(IN_PATH), "utf8");
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error("Invalid JSON in input file:", e.message);
    process.exit(1);
  }

  // Handle either an array of tools or an object with a `tools` array
  const toolsArray = Array.isArray(data) ? data : Array.isArray(data.tools) ? data.tools : null;
  if (!toolsArray) {
    console.error("Expected top-level array or an object with a `tools` array.");
    process.exit(1);
  }

  let checked = 0, valid = 0, fixed = 0, failed = 0;
  const report = [];

  for (let i = 0; i < toolsArray.length; i++) {
    const tool = toolsArray[i];
    const refs = collectYouTubeRefs(tool);
    if (!refs.length) continue;

    for (const ref of refs) {
      checked++;
      const current = ref.get();
      const normalized = normalizeWatchUrl(current);
      const pathStr = formatPath(ref.path);

      const status = await isActiveYouTube(current);
      if (status.ok) {
        // normalize to clean watch URL if different
        if (normalized && normalized !== current) {
          ref.set(normalized);
        }
        valid++;
        report.push(`OK   :: Tool[${i}] ${guessToolName(tool) || "(unknown)"} :: ${pathStr} :: ${normalized || current}`);
        continue;
      }

      // Try replacement
      const replacement = await findReplacement(tool, current);
      if (replacement) {
        ref.set(replacement);
        fixed++;
        report.push(`FIX  :: Tool[${i}] ${guessToolName(tool) || "(unknown)"} :: ${pathStr} :: ${current}  -->  ${replacement}`);
      } else {
        failed++;
        report.push(`FAIL :: Tool[${i}] ${guessToolName(tool) || "(unknown)"} :: ${pathStr} :: ${current}  (no replacement found)`);
      }
    }
  }

  // write output
  let outPath = OUT_PATH;
  if (INPLACE) {
    if (BACKUP) {
      const backupPath = IN_PATH.replace(/\.json$/i, `.backup.${Date.now()}.json`);
      await fs.writeFile(backupPath, JSON.stringify(data, null, 2), "utf8");
      console.log(`Backup written: ${backupPath}`);
    }
    outPath = IN_PATH;
  }
  if (!outPath) {
    outPath = path.resolve(path.dirname(IN_PATH), path.basename(IN_PATH, ".json") + ".fixed.json");
  }

  await fs.writeFile(outPath, JSON.stringify(data, null, 2), "utf8");

  // summary
  console.log("\n===== YouTube Tutorial Link Audit =====");
  console.log(`Input  : ${path.resolve(IN_PATH)}`);
  console.log(`Output : ${path.resolve(outPath)}`);
  console.log(`Checked: ${checked}`);
  console.log(`Valid  : ${valid}`);
  console.log(`Fixed  : ${fixed}`);
  console.log(`Failed : ${failed}`);
  console.log("---------------------------------------");
  console.log(report.join("\n"));
})();
