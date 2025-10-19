// scripts/validate-content-quality.cjs
// Quality checks for FAQs and Use-case Recipes across all tools.
// - No external deps, safe on Windows, works with "type": "module" because this is .cjs.
// - Exit code 0 by default (warnings only). Use --strict to exit 1 on issues.
//
// Usage examples:
//   node scripts/validate-content-quality.cjs
//   node scripts/validate-content-quality.cjs --slug chatgpt
//   node scripts/validate-content-quality.cjs --strict
//   node scripts/validate-content-quality.cjs --minAnswer 15 --minRecipe 20
//
// What it checks:
//   - FAQ: missing/empty question, missing/short answer (default min 10 chars)
//   - Recipes (use_case_recipes or recipes):
//       * if string: too short (default min 12 chars)
//       * if object: missing title AND steps; empty steps; empty strings

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'data', 'tools.json');

// ---- tiny CLI args parser ----
const args = process.argv.slice(2);
function getArg(name, def) {
  const i = args.findIndex(a => a === `--${name}` || a.startsWith(`--${name}=`));
  if (i === -1) return def;
  const a = args[i];
  if (a.includes('=')) return a.split('=').slice(1).join('=') || def;
  const v = args[i + 1];
  if (!v || v.startsWith('--')) return true;
  return v;
}

const ONLY_SLUG = (getArg('slug', '') || '').toLowerCase();
const STRICT = !!getArg('strict', false);
const MIN_ANSWER = parseInt(getArg('minAnswer', '10'), 10);
const MIN_RECIPE = parseInt(getArg('minRecipe', '12'), 10);

// ---- helpers ----
function loadJson(p) {
  if (!fs.existsSync(p)) {
    console.error(`✖ Not found: ${p}`);
    process.exit(1);
  }
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`✖ Failed to parse JSON at ${p}\n${e.stack || e}`);
    process.exit(1);
  }
}

function getToolsShape(obj) {
  if (Array.isArray(obj)) return obj;
  if (obj && Array.isArray(obj.tools)) return obj.tools;
  console.error('✖ tools.json must be an array or an object with a "tools" array');
  process.exit(1);
}

function isStr(x) { return typeof x === 'string'; }
function nonEmpty(x) { return isStr(x) && x.trim().length > 0; }
function tooShort(x, min) { return !nonEmpty(x) || x.trim().length < min; }
function asArray(x) { return Array.isArray(x) ? x : []; }

function warn(list, msg) { list.push(msg); }

function validateFaqs(tool, faqs, minAnswer) {
  const warnings = [];
  faqs.forEach((f, idx) => {
    const q = isStr(f?.question) ? f.question : (isStr(f?.q) ? f.q : '');
    const a = isStr(f?.answer) ? f.answer : (isStr(f?.a) ? f.a : '');
    if (!nonEmpty(q)) {
      warn(warnings, `FAQ[${idx}]: missing question`);
    }
    if (tooShort(a, minAnswer)) {
      warn(warnings, `FAQ[${idx}]: answer missing/too short (<${minAnswer} chars)`);
    }
  });
  return warnings;
}

function validateRecipes(tool, recipes, minChars) {
  const warnings = [];
  recipes.forEach((r, idx) => {
    if (isStr(r)) {
      if (tooShort(r, minChars)) {
        warn(warnings, `Recipe[${idx}]: string too short (<${minChars} chars)`);
      }
      return;
    }
    if (r && typeof r === 'object') {
      const hasTitle = nonEmpty(r.title);
      const steps = asArray(r.steps);
      const hasSteps = steps.length > 0 && steps.every(s => nonEmpty(s));
      if (!hasTitle && !hasSteps) {
        warn(warnings, `Recipe[${idx}]: missing both title and steps`);
      } else {
        if (!hasTitle) warn(warnings, `Recipe[${idx}]: missing title`);
        if (!hasSteps) warn(warnings, `Recipe[${idx}]: steps empty/invalid`);
      }
      return;
    }
    warn(warnings, `Recipe[${idx}]: unsupported type (${typeof r})`);
  });
  return warnings;
}

// ---- main ----
(function main() {
  const raw = loadJson(FILE);
  const tools = getToolsShape(raw);

  let totalWarnings = 0;
  let checked = 0;

  tools.forEach((t) => {
    if (!t) return;
    const slug = (t.slug || '').toLowerCase();
    const name = t.name || slug || '(no name)';

    if (ONLY_SLUG && slug !== ONLY_SLUG) return;

    const faqs = asArray(t.faqs);
    const recipes = asArray(t.use_case_recipes?.length ? t.use_case_recipes : t.recipes);

    const warnings = [];

    // Validate FAQs
    if (faqs.length) {
      warnings.push(...validateFaqs(t, faqs, MIN_ANSWER));
    }

    // Validate Recipes
    if (recipes.length) {
      warnings.push(...validateRecipes(t, recipes, MIN_RECIPE));
    }

    if (warnings.length) {
      totalWarnings += warnings.length;
      console.log(`\n⚠ ${name} (${slug}) — ${warnings.length} issue(s)`);
      warnings.forEach(w => console.log(`  • ${w}`));
    }
    checked++;
  });

  if (!checked) {
    console.log(ONLY_SLUG
      ? `ℹ No tool matched slug "${ONLY_SLUG}".`
      : 'ℹ No tools found to validate.');
  } else {
    console.log(`\n✔ Checked ${checked} tool(s). ${totalWarnings ? 'Found ' + totalWarnings + ' issue(s).' : 'No issues found.'}`);
  }

  if (STRICT && totalWarnings > 0) process.exit(1);
})();
