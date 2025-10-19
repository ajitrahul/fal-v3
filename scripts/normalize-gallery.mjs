import fs from "node:fs";

const PATH = "./data/tools.json";
const raw = JSON.parse(fs.readFileSync(PATH, "utf8"));
const list = Array.isArray(raw) ? raw : raw.tools;
if (!Array.isArray(list)) throw new Error("tools.json must be array or { tools: [...] }");

const fixed = list.map(t => {
  const website = t.website_url || "";
  // ensure at least one gallery image that uses our proxy (always renders)
  if (!Array.isArray(t.gallery) || t.gallery.length === 0) {
    t.gallery = [{ src: `/api/screenshot?url=${website}`, caption: "Homepage" }];
  } else {
    t.gallery = t.gallery.map(g => {
      const src = g?.src || "";
      // keep existing if it already uses our proxy; else fallback to proxy
      const newSrc = src.startsWith('/api/screenshot') || src.startsWith('data:') ? src : `/api/screenshot?url=${website}`;
      return { src: newSrc, caption: g?.caption || "Screenshot" };
    });
  }
  return t;
});

const output = Array.isArray(raw) ? fixed : { ...raw, tools: fixed };
fs.writeFileSync(PATH, JSON.stringify(output, null, 2));
console.log("Normalized gallery for", fixed.length, "tools");
