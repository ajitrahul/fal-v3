// scripts/link-check.mjs
// Simple link checker for tools-batch files or merged tools.json
// Usage:
//   node scripts/link-check.mjs data/tools-batch1.json
//   node scripts/link-check.mjs data/tools.json

import { readFile } from "node:fs/promises";
import process from "node:process";

const file = process.argv[2] || "data/tools.json";
const TIMEOUT = 12000;

function isHttp(u) { return typeof u === "string" && /^https?:\/\//i.test(u); }

async function check(url) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    // Try HEAD first; fall back to GET if blocked
    let res = await fetch(url, { method: "HEAD", signal: controller.signal });
    if (res.ok) return { ok: true, status: res.status };
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", signal: controller.signal });
      return { ok: res.ok, status: res.status };
    }
    return { ok: false, status: res.status };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  } finally {
    clearTimeout(t);
  }
}

async function run() {
  const raw = JSON.parse(await readFile(file, "utf8"));
  const tools = Array.isArray(raw) ? raw : (raw.tools || []);
  if (!Array.isArray(tools)) throw new Error("No tools array found");

  const targets = [];
  for (const t of tools) {
    if (isHttp(t.website_url)) targets.push({ slug: t.slug, kind: "website", url: t.website_url });
    if (isHttp(t.logo_url)) targets.push({ slug: t.slug, kind: "logo", url: t.logo_url });
    (t.gallery || []).forEach(g => { if (isHttp(g?.src)) targets.push({ slug: t.slug, kind: "gallery", url: g.src }); });
    (t.tutorials || []).forEach(v => { if (isHttp(v?.url)) targets.push({ slug: t.slug, kind: "tutorial", url: v.url }); });
  }

  let bad = 0;
  for (const item of targets) {
    const res = await check(item.url);
    if (!res.ok) {
      bad++;
      console.error(`✖ [${item.slug}] ${item.kind} -> ${item.url} (${res.status || res.error || "error"})`);
    }
  }

  if (bad > 0) {
    console.error(`Link check FAILED with ${bad} bad link(s).`);
    process.exit(1);
  } else {
    console.log("Link check PASSED.");
  }
}

run().catch(e => { console.error(e); process.exit(1); });
