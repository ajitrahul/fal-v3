// scripts/validate-tools.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv/dist/2020.js";           // <-- 2020 build
import addFormats from "ajv-formats";
import { request } from "undici";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const loadJson = async (fp) => JSON.parse(await fs.readFile(fp, "utf8"));

const ajv = new Ajv({
  allErrors: true,
  strict: true,
});
addFormats(ajv);

const schema = await loadJson(path.join(ROOT, "tools.schema.json"));
const validate = ajv.compile(schema);

const toolsPath = path.join(ROOT, "data/tools.json");
const data = await loadJson(toolsPath);

// Accept either { tools: [...] } or [ ... ]
const tools = Array.isArray(data) ? data : Array.isArray(data.tools) ? data.tools : [];
if (!Array.isArray(tools) || tools.length === 0) {
  console.error("❌ tools.json has no tools array.");
  process.exit(1);
}

let ok = true;

const bySlug = new Map();
const byDomain = new Map();

function domainOf(url) {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

async function headOk(url) {
  try {
    const res = await request(url, {
      method: "HEAD",
      maxRedirections: 2,
      headersTimeout: 8000,
      bodyTimeout: 8000,
    });
    return res.statusCode >= 200 && res.statusCode < 400;
  } catch {
    return false;
  }
}

// Extract a YouTube video ID from a URL, or null if not a direct video
function extractYouTubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();
    const p = u.pathname;
    if (host.includes("youtube") && p.startsWith("/results")) return null; // search results (non-embeddable)
    if (host === "youtu.be") return p.slice(1) || null;
    if (host.endsWith("youtube.com")) {
      if (p === "/watch") return u.searchParams.get("v");
      if (p.startsWith("/shorts/")) return p.split("/")[2] || null;
      if (p.startsWith("/embed/")) return p.split("/")[2] || null;
    }
    return null;
  } catch {
    return null;
  }
}

console.log(`📦 Validating ${tools.length} tools…`);

for (const t of tools) {
  const valid = validate(t);
  if (!valid) {
    ok = false;
    console.error(`\n❌ Schema errors for tool "${t?.name || t?.slug || t?.id}":`);
    console.error(validate.errors);
  }

  // Duplicate slug
  if (t.slug) {
    if (bySlug.has(t.slug)) {
      ok = false;
      console.error(`❌ Duplicate slug: ${t.slug} (${bySlug.get(t.slug)} and ${t.name})`);
    } else {
      bySlug.set(t.slug, t.name);
    }
  }

  // Duplicate domain (canonicalization hint)
  if (t.website_url) {
    const d = domainOf(t.website_url);
    if (d) {
      if (byDomain.has(d)) {
        console.warn(`⚠ Potential duplicate domain: ${d} (${byDomain.get(d)} and ${t.name})`);
      } else {
        byDomain.set(d, t.name);
      }
    }
  }

  // Check logos & screenshots
  if (t.logo_url && !(await headOk(t.logo_url))) {
    ok = false;
    console.error(`❌ Dead logo_url for ${t.name}: ${t.logo_url}`);
  }
  if (Array.isArray(t.gallery)) {
    for (const g of t.gallery.slice(0, 3)) {
      if (g?.src && !(await headOk(g.src))) {
        ok = false;
        console.error(`❌ Dead gallery src for ${t.name}: ${g.src}`);
      }
    }
  }

  // Tutorials: videos must be resolvable; warn on non-embeddable YouTube search URLs
  if (t.tutorials?.videos?.length) {
    for (const v of t.tutorials.videos.slice(0, 5)) {
      if (!v?.url) continue;
      const good = await headOk(v.url);
      if (!good) {
        ok = false;
        console.error(`❌ Dead tutorial video URL for ${t.name}: ${v.url}`);
      }
      if ((v.provider === "youtube" || /youtu\.?be/.test(v.url)) && !extractYouTubeId(v.url)) {
        console.warn(`⚠ Non-embeddable YouTube URL (search/results) for ${t.name}: ${v.url}`);
      }
    }
  }

  // Pricing identicality detector (common issue)
  if (t.pricing?.plans?.length) {
    const planSig = t.pricing.plans.map(p => `${p.name}|${p.price}`).join("||");
    if (planSig === "Free|$0||Pro|$10/mo||Team|$149/mo") {
      console.warn(`⚠ ${t.name} uses the default synthetic plan set. Replace with real pricing.`);
    }
  }
}

if (ok) {
  console.log("\n✅ tools.json passed validation & URL checks.");
  process.exit(0);
} else {
  console.error("\n❌ Validation failed. See errors above.");
  process.exit(2);
}
