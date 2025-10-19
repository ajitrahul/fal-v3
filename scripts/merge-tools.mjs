import fs from "node:fs";

const A = "./tools_pt7_batch1.json";
const B = "./tools_pt7_batch2.json";
const OUT = "./data/tools.json";           // change if you prefer another path
const WRAP_IN_OBJECT = false;              // set true if your app expects { tools: [...] }

const a = JSON.parse(fs.readFileSync(A, "utf8"));
const b = JSON.parse(fs.readFileSync(B, "utf8"));

// Merge and de-dupe by slug (change to 'id' if you prefer)
const map = new Map();
[...a, ...b].forEach(t => {
  if (!t || typeof t !== "object") return;
  if (!t.slug) return;
  map.set(t.slug, t); // last one wins if duplicate
});

const merged = Array.from(map.values());

// Optional: sort (by votes desc, then name)
merged.sort((x, y) => (y?.community?.votes ?? 0) - (x?.community?.votes ?? 0) || x.name.localeCompare(y.name));

const output = WRAP_IN_OBJECT ? { tools: merged } : merged;
fs.mkdirSync("./data", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(output, null, 2));
console.log(`Wrote ${merged.length} tools to ${OUT}`);
