// scripts/migrate-add-faqs-recipes.cjs
// Ensures every tool in data/tools.json has `faqs` and `use_case_recipes` arrays (empty by default).
// Safe to run multiple times.

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'data', 'tools.json');

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error('✖ data/tools.json not found at', FILE);
    process.exit(1);
  }

  const data = loadJson(FILE);
  const tools = Array.isArray(data) ? data : (data && Array.isArray(data.tools) ? data.tools : null);
  if (!tools) {
    console.error('✖ tools.json must be an array or an object with a "tools" array');
    process.exit(1);
  }

  let changed = 0;
  for (const t of tools) {
    if (!t) continue;

    // Add arrays if missing (empty arrays won't render on the page)
    if (!Array.isArray(t.faqs)) {
      t.faqs = [];
      changed++;
    }
    // prefer use_case_recipes, mirror legacy recipes if needed
    if (!Array.isArray(t.use_case_recipes)) {
      if (Array.isArray(t.recipes)) {
        t.use_case_recipes = t.recipes;
      } else {
        t.use_case_recipes = [];
      }
      changed++;
    }
  }

  if (Array.isArray(data)) {
    saveJson(FILE, tools);
  } else {
    data.tools = tools;
    saveJson(FILE, data);
  }

  console.log(`✔ Backfilled faqs/use_case_recipes on ${changed} tools (empty arrays where missing).`);
}

main();
