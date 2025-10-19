#!/usr/bin/env node
/**
 * Merge all batch JSON files into a single tools.json.
 * Usage:
 *   node merge-tools-batches.mjs ./batches ./data/tools.json
 */
import fs from 'node:fs';
import path from 'node:path';

const [,, inputDir = './batches', outputPath = './data/tools.json'] = process.argv;

function isJsonFile(p){ return p.endsWith('.json'); }

const files = fs.readdirSync(inputDir).filter(isJsonFile).sort();
if (!files.length) {
  console.error(`No .json files found in ${inputDir}`);
  process.exit(1);
}

const bySlug = new Map();
for (const file of files) {
  const full = path.join(inputDir, file);
  const raw = JSON.parse(fs.readFileSync(full, 'utf8'));
  const arr = Array.isArray(raw) ? raw : raw.tools;
  if (!Array.isArray(arr)) {
    console.warn(`Skipping ${file}: not an array`);
    continue;
  }
  for (const t of arr) {
    if (!t || !t.slug) continue;
    if (!bySlug.has(t.slug)) bySlug.set(t.slug, t);
  }
}

const merged = Array.from(bySlug.values());
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(merged, null, 2), 'utf8');
console.log(`Wrote ${merged.length} tools to ${outputPath}`);
