// scripts/check-tool-readiness.js
// Usage: node scripts/check-tool-readiness.js <slug>
import fs from "node:fs";
import path from "node:path";

const slug = process.argv[2];
if (!slug) {
  console.error("Usage: node scripts/check-tool-readiness.js <slug>");
  process.exit(1);
}

const DATA_PATH = path.join(process.cwd(), "data", "tools.json");
if (!fs.existsSync(DATA_PATH)) {
  console.error(`Not found: ${DATA_PATH}. Run from project root.`);
  process.exit(1);
}

const tools = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
if (!Array.isArray(tools)) {
  console.error("data/tools.json must be an array.");
  process.exit(1);
}

const tool = tools.find((t) => t.slug === slug);
if (!tool) {
  console.error(`No tool found for slug: ${slug}`);
  process.exit(1);
}

function has(v) {
  return Array.isArray(v) ? v.length > 0 : !!v;
}

const report = {
  slug: tool.slug,
  name: !!tool.name,
  logo_url: !!tool.logo_url,
  tagline_or_summary: !!(tool.tagline || tool.summary),

  summary_section_will_render: has(tool.summary),
  features_section_will_render: has(tool.features),

  // Tutorials logic in your page:
  // - Renders up to 3 if tutorial item has .youtube
  // - Also renders if item has .url and provider includes "youtube"
  tutorials_total: Array.isArray(tool.tutorials) ? tool.tutorials.length : 0,
  tutorials_items_with_youtube:
    Array.isArray(tool.tutorials)
      ? tool.tutorials.filter((t) => typeof t?.youtube === "string" && t.youtube).length
      : 0,
  tutorials_items_with_url_youtube:
    Array.isArray(tool.tutorials)
      ? tool.tutorials.filter((t) => {
          const u = t?.url || "";
          const p = String(t?.provider || "").toLowerCase();
          return typeof u === "string" && u && (u.includes("youtu.be") || u.includes("youtube.com")) && p.includes("youtube");
        }).length
      : 0,

  gallery_section_will_render:
    Array.isArray(tool.gallery) && tool.gallery.length > 0,
  gallery_len: Array.isArray(tool.gallery) ? tool.gallery.length : 0,
  images_len: Array.isArray(tool.images) ? tool.images.length : 0,

  right_panel: {
    website_url: !!tool.website_url,
    main_category: !!tool.main_category,
    subcategory: !!tool.subcategory,
    tasks: has(tool.tasks),
    roles: has(tool.roles),
    models: has(tool.models),
    languages: has(tool.languages),
    integrations: has(tool.integrations),
    compliance: has(tool.compliance),
    pricing_model: !!(tool.pricing && tool.pricing.model),
    vendor_name: !!(tool.vendor && tool.vendor.name),
    vendor_hq_country: !!(tool.vendor && tool.vendor.hq_country),
    release_date: !!tool.release_date,
    updated_at: !!tool.updated_at,
    best_for: has(tool.best_for),
    use_cases: has(tool.use_cases),
  },
};

console.log(JSON.stringify(report, null, 2));

// Helpful hints
const hints = [];
if (!report.name) hints.push("Missing tool.name (header will look empty).");
if (!(report.logo_url || report.name)) hints.push("Missing logo_url and/or name.");
if (!(report.tagline_or_summary)) hints.push("Missing both tagline and summary.");
if (report.tutorials_total > 0 && report.tutorials_items_with_youtube === 0 && report.tutorials_items_with_url_youtube === 0) {
  hints.push("Tutorials exist but not in a YouTube-friendly shape (.youtube or .url + provider:'youtube').");
}
if (!report.gallery_section_will_render && report.images_len > 0) {
  hints.push("You have images[] but no gallery[]. The page renders gallery[], not images[].");
}
const noMeta = Object.values(report.right_panel).every((v) => v === false);
if (noMeta) hints.push("Right panel looks empty because those fields are missing/null for this tool.");
if (hints.length) {
  console.log("\nHints:");
  for (const h of hints) console.log("-", h);
}
