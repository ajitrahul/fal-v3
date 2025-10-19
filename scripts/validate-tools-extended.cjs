#!/usr/bin/env node
/**
 * Validate data/tools.json against tools.schema.json (+ optional tools.schema.extend.json).
 * Works even when your schema declares "$schema": "https://json-schema.org/draft/2020-12/schema"
 * by disabling meta-schema validation (we only need data validation here).
 *
 * Usage:
 *   node scripts/validate-tools-extended.cjs
 *
 * Dev deps (install once):
 *   npm i -D ajv ajv-formats
 */

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const DATA_PATH = path.join(ROOT, "data", "tools.json");
const SCHEMA_BASE = path.join(ROOT, "tools.schema.json");
const SCHEMA_EXT  = path.join(ROOT, "tools.schema.extend.json"); // optional

let Ajv, addFormats, ajv;
try {
  Ajv = require("ajv");
  addFormats = require("ajv-formats");
  // ✅ Turn OFF meta-schema validation to avoid "no schema with key or ref …/2020-12/schema"
  ajv = new Ajv({
    allErrors: true,
    strict: false,
    allowUnionTypes: true,
    validateSchema: false,   // <-- key fix
  });
  addFormats(ajv);
} catch (e) {
  console.error("❌ Please install dev deps: npm i -D ajv ajv-formats");
  process.exit(1);
}

function readJSON(p) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch (e) {
    console.error(`❌ Cannot read ${p}: ${e.message}`);
    process.exit(1);
  }
}

// Optionally strip $schema to be extra safe (Ajv shouldn't care, but some bundles still try to touch it)
function stripDollarSchema(obj) {
  if (obj && typeof obj === "object") {
    if (Object.prototype.hasOwnProperty.call(obj, "$schema")) delete obj.$schema;
    // If you want to be extremely defensive, uncomment to recurse:
    // for (const k of Object.keys(obj)) stripDollarSchema(obj[k]);
  }
}

const baseRaw = readJSON(SCHEMA_BASE);
stripDollarSchema(baseRaw);

let schema = baseRaw;
if (fs.existsSync(SCHEMA_EXT)) {
  const extRaw = readJSON(SCHEMA_EXT);
  stripDollarSchema(extRaw);
  schema = { allOf: [baseRaw, extRaw] };
  console.log("ℹ️ Using combined schema (base + extend).");
} else {
  console.log("ℹ️ Using base schema only.");
}

let validate;
try {
  validate = ajv.compile(schema);
} catch (e) {
  console.error("❌ Failed to compile schema:", e && e.message ? e.message : e);
  process.exit(1);
}

const data = readJSON(DATA_PATH);
if (!Array.isArray(data)) {
  console.error("❌ data/tools.json must be an array");
  process.exit(1);
}

let errs = 0;
data.forEach((tool, idx) => {
  const ok = validate(tool);
  if (!ok) {
    errs++;
    console.log(`\n❌ Tool index ${idx} (${tool.slug || tool.name || "unknown"}):`);
    for (const e of validate.errors || []) {
      console.log(` - ${e.instancePath || "(root)"} ${e.message}`);
    }
  }
  // Reset errors between items (Ajv reuses error array)
  validate.errors = null;
});

if (errs > 0) {
  console.error(`\n❌ ${errs} invalid tool(s).`);
  process.exit(2);
}
console.log("\n✅ All tools validate against schema.");
