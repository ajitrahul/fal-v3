// scripts/seed-chatgpt-demo.cjs
// Adds demo FAQs and Use-case Recipes to the ChatGPT tool entry in data/tools.json
// Safe on Windows / Node with "type": "module" because this is CommonJS (.cjs).

const fs = require('fs');
const path = require('path');

const FILE = path.join(process.cwd(), 'data', 'tools.json');

function loadJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function saveJson(p, obj) {
  const out = JSON.stringify(obj, null, 2) + '\n';
  fs.writeFileSync(p, out, 'utf8');
}

function findChatGPTIndex(arr) {
  // Prefer exact slug === "chatgpt". Fallbacks: slug includes "chatgpt" or name === "ChatGPT".
  let idx = arr.findIndex(t => t && typeof t.slug === 'string' && t.slug.toLowerCase() === 'chatgpt');
  if (idx !== -1) return idx;
  idx = arr.findIndex(t => t && typeof t.slug === 'string' && t.slug.toLowerCase().includes('chatgpt'));
  if (idx !== -1) return idx;
  idx = arr.findIndex(t => t && typeof t.name === 'string' && t.name.trim().toLowerCase() === 'chatgpt');
  return idx;
}

function main() {
  if (!fs.existsSync(FILE)) {
    console.error('✖ data/tools.json not found at', FILE);
    process.exit(1);
  }

  const data = loadJson(FILE);
  const tools = Array.isArray(data) ? data : (Array.isArray(data.tools) ? data.tools : null);
  if (!tools) {
    console.error('✖ tools.json must be an array or an object with a "tools" array');
    process.exit(1);
  }

  const idx = findChatGPTIndex(tools);
  if (idx === -1) {
    console.error('✖ Could not find a tool with slug or name matching "chatgpt"');
    process.exit(1);
  }

  const tool = tools[idx];

  // ---- Demo content (kept concise; edit anytime) ----
  const use_case_recipes = [
    "Draft a customer support reply from a raw ticket (tone: friendly, length: 80–120 words).",
    "Summarize a long blog post into 5 bullet key takeaways with one actionable tip.",
    "Generate 10 SEO title ideas (≤60 chars) for a blog about {topic}.",
    "Rewrite a paragraph in professional tone and fix grammar; keep original meaning.",
    "Create a step-by-step study plan for learning {skill} in 30 days (daily tasks).",
    "Extract key entities (names, dates, amounts) from this text and return JSON."
  ];

  const faqs = [
    {
      question: "Is ChatGPT free to use?",
      answer: "There is a free plan with usage limits and paid plans that offer higher limits and advanced capabilities."
    },
    {
      question: "Can I use ChatGPT for commercial work?",
      answer: "Yes. Check the Terms for specifics and API licensing if you’re integrating it into products."
    },
    {
      question: "Does ChatGPT keep my data?",
      answer: "Data handling depends on product and settings. For sensitive use, review the privacy controls and enterprise options."
    },
    {
      question: "Does it support plugins or integrations?",
      answer: "Integrations vary by product tier and interface. Many workflows can be automated via the API."
    }
  ];

  // Upsert fields without changing anything else
  tool.use_case_recipes = use_case_recipes;
  tool.faqs = faqs;

  // Write back preserving the original top-level shape
  if (Array.isArray(data)) {
    data[idx] = tool;
    saveJson(FILE, data);
  } else {
    data.tools[idx] = tool;
    saveJson(FILE, data);
  }

  console.log('✔ Added demo use_case_recipes and faqs to ChatGPT in data/tools.json');
}

main();
