#!/usr/bin/env node
/* scripts/audit-tools.cjs
 * Audits tool data for fields needed by the home page features:
 * - rating / votes (for stars + review count)
 * - flags.featured (for Featured strip)
 * - videos.* (for official video) OR tutorials[].youtube fallback
 *
 * Output:
 * - console summary
 * - audit-tools.json
 * - audit-tools.csv
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TOOLS_DIR = path.join(ROOT, "data", "tools");
const TOOLS_JSON = path.join(ROOT, "data", "tools.json");
const OUT_JSON = path.join(ROOT, "audit-tools.json");
const OUT_CSV = path.join(ROOT, "audit-tools.csv");

function readJsonFileSync(file) {
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`✖ Failed to read JSON: ${file}\n  ${e.message}`);
    return null;
  }
}

function loadTools() {
  const tools = [];
  if (fs.existsSync(TOOLS_DIR) && fs.statSync(TOOLS_DIR).isDirectory()) {
    const files = fs.readdirSync(TOOLS_DIR).filter((f) => f.toLowerCase().endsWith(".json"));
    for (const f of files) {
      const full = path.join(TOOLS_DIR, f);
      const obj = readJsonFileSync(full);
      if (!obj) continue;
      // obj may be a single tool or { tools: [...] }
      if (Array.isArray(obj)) {
        tools.push(...obj);
      } else if (obj && Array.isArray(obj.tools)) {
        tools.push(...obj.tools);
      } else {
        tools.push(obj);
      }
    }
  } else if (fs.existsSync(TOOLS_JSON)) {
    const obj = readJsonFileSync(TOOLS_JSON);
    if (obj) {
      if (Array.isArray(obj)) tools.push(...obj);
      else if (Array.isArray(obj.tools)) tools.push(...obj.tools);
      else tools.push(obj);
    }
  } else {
    console.error("✖ No tools data found. Expected data/tools/*.json or data/tools.json");
  }
  return tools;
}

function num(v, d = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
}

function reviewCount(t) {
  if (t?.community?.votes != null) return num(t.community.votes, 0);
  if (Array.isArray(t?.community?.reviews)) return t.community.reviews.length;
  return 0;
}

function hasOfficialVideo(t) {
  const v = t?.videos || {};
  return !!(v.official_embed_url || v.official_mp4 || v.official_page);
}

function hasAnyVideo(t) {
  if (hasOfficialVideo(t)) return true;
  const yt = Array.isArray(t?.tutorials) ? t.tutorials.find((x) => !!x?.youtube) : null;
  return !!yt;
}

function audit(tools) {
  const rows = [];

  for (const t of tools) {
    const slug = t?.slug || t?.id || "(no-slug)";
    const name = t?.name || "(no-name)";
    const rating = num(t?.community?.rating, 0);
    const votes = reviewCount(t);
    const featured = !!(t?.flags?.featured === true);
    const officialVideo = hasOfficialVideo(t);
    const anyVideo = hasAnyVideo(t);

    rows.push({
      slug,
      name,
      hasRating: rating > 0,
      rating: rating || "",
      hasVotesOrReviews: votes > 0,
      votes_or_reviews: votes || "",
      isFeatured: featured,
      hasOfficialVideo: officialVideo,
      hasAnyVideo: anyVideo,
    });
  }

  const totals = {
    total_tools: rows.length,
    with_rating: rows.filter((r) => r.hasRating).length,
    with_votes_or_reviews: rows.filter((r) => r.hasVotesOrReviews).length,
    featured: rows.filter((r) => r.isFeatured).length,
    with_official_video: rows.filter((r) => r.hasOfficialVideo).length,
    with_any_video: rows.filter((r) => r.hasAnyVideo).length,
  };

  const missing = {
    rating: rows.filter((r) => !r.hasRating).map((r) => ({ slug: r.slug, name: r.name })),
    votes_or_reviews: rows.filter((r) => !r.hasVotesOrReviews).map((r) => ({ slug: r.slug, name: r.name })),
    featured_flag: rows.filter((r) => !r.isFeatured).map((r) => ({ slug: r.slug, name: r.name })),
    official_video: rows.filter((r) => !r.hasOfficialVideo).map((r) => ({ slug: r.slug, name: r.name })),
    any_video: rows.filter((r) => !r.hasAnyVideo).map((r) => ({ slug: r.slug, name: r.name })),
  };

  return { rows, totals, missing };
}

function writeJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch (e) {
    console.error(`✖ Failed to write ${file}\n  ${e.message}`);
    return false;
  }
}

function writeCsv(file, rows) {
  const headers = [
    "slug",
    "name",
    "hasRating",
    "rating",
    "hasVotesOrReviews",
    "votes_or_reviews",
    "isFeatured",
    "hasOfficialVideo",
    "hasAnyVideo",
  ];
  const esc = (v) => {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(
      headers
        .map((h) => esc(r[h]))
        .join(",")
    );
  }
  try {
    fs.writeFileSync(file, lines.join("\n"), "utf8");
    return true;
  } catch (e) {
    console.error(`✖ Failed to write ${file}\n  ${e.message}`);
    return false;
  }
}

function main() {
  const tools = loadTools();
  if (!tools.length) {
    process.exit(1);
  }

  const { rows, totals, missing } = audit(tools);

  // Console summary
  console.log("—".repeat(60));
  console.log(`Tools audited: ${totals.total_tools}`);
  console.log(
    `Ratings: ${totals.with_rating}/${totals.total_tools} | Votes/Reviews: ${totals.with_votes_or_reviews}/${totals.total_tools}`
  );
  console.log(
    `Featured: ${totals.featured}/${totals.total_tools} | Official video: ${totals.with_official_video}/${totals.total_tools} | Any video: ${totals.with_any_video}/${totals.total_tools}`
  );
  console.log("—".repeat(60));

  const showTop = (label, list) => {
    if (!list.length) {
      console.log(`Missing ${label}: none`);
      return;
    }
    console.log(`Missing ${label} (first 10):`);
    for (const { slug, name } of list.slice(0, 10)) {
      console.log(`  - ${name} (${slug})`);
    }
  };

  showTop("rating", missing.rating);
  showTop("votes_or_reviews", missing.votes_or_reviews);
  showTop("featured_flag", missing.featured_flag);
  showTop("official_video", missing.official_video);
  showTop("any_video", missing.any_video);

  // Files
  writeJson(OUT_JSON, { totals, rows, missing });
  writeCsv(OUT_CSV, rows);

  console.log("—".repeat(60));
  console.log(`Wrote ${path.relative(ROOT, OUT_JSON)} and ${path.relative(ROOT, OUT_CSV)}`);
}

main();
