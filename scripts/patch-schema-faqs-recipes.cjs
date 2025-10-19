// scripts/patch-schema-faqs-recipes.cjs
// Adds `faqs` and `use_case_recipes` to tools-schema.json (Ajv 2020-12 compatible)

const fs = require('fs');
const path = require('path');

const SCHEMA = path.join(process.cwd(), 'tools-schema.json'); // adjust if your file lives elsewhere

function loadJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function saveJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function ensure(obj, key, defVal) {
  if (obj[key] == null) obj[key] = defVal;
  return obj[key];
}

function main() {
  if (!fs.existsSync(SCHEMA)) {
    console.error('✖ tools-schema.json not found at', SCHEMA);
    process.exit(1);
  }
  const schema = loadJson(SCHEMA);

  // Ensure top-level shape
  // We assume your schema validates a "Tool" object; if it's an array of tools,
  // the "items" schema likely contains "properties". We handle both cases.
  let props = null;

  if (schema && schema.type === 'array' && schema.items && schema.items.properties) {
    props = schema.items.properties;
  } else if (schema && schema.properties) {
    props = schema.properties;
  } else if (schema && schema.$defs && schema.$defs.Tool && schema.$defs.Tool.properties) {
    props = schema.$defs.Tool.properties;
  }

  if (!props) {
    console.error('✖ Could not find a properties object to patch (root.properties or items.properties or $defs.Tool.properties).');
    process.exit(1);
  }

  // Add/patch `faqs`
  props.faqs = {
    type: "array",
    items: {
      type: "object",
      additionalProperties: false,
      properties: {
        question: { type: "string", minLength: 1 },
        answer: { type: "string" }
      },
      required: ["question"]
    }
  };

  // Add/patch `use_case_recipes`
  props.use_case_recipes = {
    type: "array",
    items: {
      oneOf: [
        { type: "string", minLength: 1 },
        {
          type: "object",
          additionalProperties: true,
          properties: {
            title: { type: "string" },
            steps: { type: "array", items: { type: "string" } },
            goal: { type: "string" },
            inputs: { type: "array", items: { type: "string" } }
          }
        }
      ]
    }
  };

  // Optional: keep legacy "recipes" as alias
  if (!props.recipes) {
    props.recipes = props.use_case_recipes;
  }

  saveJson(SCHEMA, schema);
  console.log('✔ Patched tools-schema.json with faqs & use_case_recipes.');
}

main();
