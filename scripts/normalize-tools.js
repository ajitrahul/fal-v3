// scripts/normalize-tools.js (ESM)
// Usage:
//   node scripts/normalize-tools.js           -> dry run (writes data/tools.normalized.json)
//   node scripts/normalize-tools.js --apply   -> backup + overwrite data/tools.json

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data", "tools.json");
const OUT_PATH = path.join(ROOT, "data", "tools.normalized.json");

function toYouTubeEmbed(u) {
  if (!u || typeof u !== "string") return null;
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.replace(/^\/+/, "");
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname.startsWith("/embed/")) return url.toString();
      if (url.pathname.startsWith("/shorts/")) {
        const parts = url.pathname.split("/").filter(Boolean);
        const id = parts[1];
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
      return url.toString().replace("watch?v=", "embed/");
    }
    return null;
  } catch { return null; }
}

function backupFile(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, ".json");
  const ts = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const backup = path.join(dir, `${base}.backup.${ts}.json`);
  fs.copyFileSync(filePath, backup);
  return backup;
}

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error(`Not found: ${DATA_PATH}`); process.exit(1);
  }
  let tools = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  if (!Array.isArray(tools)) { console.error("tools.json must be an array"); process.exit(1); }

  let tutFixed = 0, galFilled = 0, pricingModelMissing = 0;

  const updated = tools.map((tool) => {
    const t = { ...tool };

    if (Array.isArray(t.tutorials) && t.tutorials.length) {
      t.tutorials = t.tutorials.map((item) => {
        const it = { ...item };
        const candidate = it.youtube || it.url;
        const isYT = typeof candidate === "string" && (candidate.includes("youtu.be") || candidate.includes("youtube.com"));
        if (isYT) {
          const embed = toYouTubeEmbed(candidate);
          if (embed && it.youtube !== embed) { it.youtube = embed; tutFixed++; }
        }
        return it;
      });
    }

    const hasGallery = Array.isArray(t.gallery) && t.gallery.length > 0;
    const hasImages = Array.isArray(t.images) && t.images.length > 0;
    if (!hasGallery && hasImages) {
      t.gallery = t.images.map((src) => ({ src })); galFilled++;
    }

    if (!t.pricing || !t.pricing.model) pricingModelMissing++;
    return t;
  });

  const isApply = process.argv.includes("--apply");
  if (!isApply) {
    fs.writeFileSync(OUT_PATH, JSON.stringify(updated, null, 2), "utf-8");
    console.log("Dry run complete.");
    console.log(`- Tutorials normalized to youtube EMBED: ${tutFixed}`);
    console.log(`- Gallery filled from images:           ${galFilled}`);
    console.log(`- Tools missing pricing.model:          ${pricingModelMissing}`);
    console.log(`Wrote: ${OUT_PATH}`);
    console.log("Run with --apply to overwrite data/tools.json (backup created).");
    return;
  }

  const backup = backupFile(DATA_PATH);
  fs.writeFileSync(DATA_PATH, JSON.stringify(updated, null, 2), "utf-8");
  console.log(`Applied changes to ${DATA_PATH}`);
  console.log(`Backup: ${backup}`);
  console.log(`- Tutorials normalized to youtube EMBED: ${tutFixed}`);
  console.log(`- Gallery filled from images:           ${galFilled}`);
  console.log(`- Tools missing pricing.model:          ${pricingModelMissing}`);
}

main();
