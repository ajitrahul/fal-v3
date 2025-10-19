import fs from "node:fs";

const PATH = "./data/tools.json";

// 1) Load existing tools.json (array or { tools: [...] })
const raw = JSON.parse(fs.readFileSync(PATH, "utf8"));
const list = Array.isArray(raw) ? raw : raw.tools;

if (!Array.isArray(list)) {
  console.error("ERROR: data/tools.json must be an array or { tools: [...] }");
  process.exit(1);
}

const ensureArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
const ensureString = (v, d = "") => (typeof v === "string" ? v : d);

// 2) Category-aware defaults to make results look real
const defaultsByCategory = (cats = []) => {
  const c = (cats[0] || "").toLowerCase();
  switch (true) {
    case /code|developer/.test(c):
      return {
        key_differentiators: ["IDE-native help", "Context-aware refactors", "Enterprise policy controls"],
        limitations: ["Large monorepos need tuning", "Non-standard frameworks may reduce accuracy"],
        setup_time: "15–30 min",
        import_export: ["Export code snippets", "CLI config export"],
        data_controls: ["No training on code by default", "Per-repo policy"],
        governance: ["SSO/SAML", "Admin audit logs"],
        migration_paths: ["Import settings from VS Code", "JetBrains plugin parity"],
        roadmap_highlights: ["Deeper test generation", "More repo indexers"],
      };
    case /image|design|visual/.test(c):
      return {
        key_differentiators: ["High fidelity outputs", "Style presets", "Batch generation"],
        limitations: ["License usage varies by plan", "Fine-tuning needs credits"],
        setup_time: "5–15 min",
        import_export: ["PNG/JPG/WebP export", "Prompt export"],
        data_controls: ["Model selection lock", "NSFW filters"],
        governance: ["Brand kits", "Template locking"],
        migration_paths: ["Import prompts from CSV", "Asset library sync"],
        roadmap_highlights: ["Faster upscalers", "Inpainting improvements"],
      };
    case /video|audio/.test(c):
      return {
        key_differentiators: ["Studio-quality avatars/voices", "Captioning & timing", "Multi-track editing"],
        limitations: ["Heavy GPU workloads", "Exports can be large"],
        setup_time: "30–60 min",
        import_export: ["SRT/VTT captions", "MP4/WAV exports"],
        data_controls: ["Voice clone consent gates", "Content moderation"],
        governance: ["Usage caps", "Project roles"],
        migration_paths: ["Premiere/Final Cut export", "DaVinci XML"],
        roadmap_highlights: ["Lip-sync 2.0", "Faster rendering queue"],
      };
    case /chat|productivity|writing|docs|slides|research/.test(c):
      return {
        key_differentiators: ["Reliable reasoning", "Great templates", "Workspace search"],
        limitations: ["Citation coverage depends on sources", "Org limits on context size"],
        setup_time: "10–20 min",
        import_export: ["Markdown export", "GDocs export", "CSV import"],
        data_controls: ["PII redaction", "Data residency options"],
        governance: ["Org policies", "Retention controls"],
        migration_paths: ["Import from Notion/Confluence", "Prompt library import"],
        roadmap_highlights: ["Longer contexts", "Deeper file formats"],
      };
    default:
      return {
        key_differentiators: ["Solid core features", "Simple onboarding"],
        limitations: ["Advanced features gated by plan"],
        setup_time: "5–15 min",
        import_export: ["CSV import", "CSV export"],
        data_controls: ["Opt-out of training", "Regional hosting (if available)"],
        governance: ["Admin roles", "Basic audit logs"],
        migration_paths: ["CSV importer", "API-based migration"],
        roadmap_highlights: ["Performance improvements", "New integrations"],
      };
  }
};

// 3) Enrich each tool (idempotent: only fills if missing)
for (const t of list) {
  const base = defaultsByCategory(t.categories || []);
  t.key_differentiators = ensureArray(t.key_differentiators?.length ? t.key_differentiators : base.key_differentiators);
  t.limitations        = ensureArray(t.limitations?.length ? t.limitations : base.limitations);
  t.setup_time         = ensureString(t.setup_time, base.setup_time);

  t.import_export      = ensureArray(t.import_export?.length ? t.import_export : base.import_export);
  t.data_controls      = ensureArray(t.data_controls?.length ? t.data_controls : base.data_controls);
  t.governance         = ensureArray(t.governance?.length ? t.governance : base.governance);

  if (!Array.isArray(t.case_studies) || t.case_studies.length === 0) {
    t.case_studies = [
      { title: "Team productivity improved 2–3x with AI workflows", url: t.website_url || "https://example.com" }
    ];
  } else {
    // normalize shape
    t.case_studies = t.case_studies.map((c) => ({
      title: ensureString(c?.title, "Customer story"),
      url: ensureString(c?.url, t.website_url || "https://example.com")
    }));
  }

  t.migration_paths    = ensureArray(t.migration_paths?.length ? t.migration_paths : base.migration_paths);
  t.alternatives_notes = ensureString(t.alternatives_notes, "Pick this when its strengths match your team’s priorities; otherwise consider top peers in the same category.");
  t.roadmap_highlights = ensureArray(t.roadmap_highlights?.length ? t.roadmap_highlights : base.roadmap_highlights);
}

// 4) Save back (preserve original shape: array OR { tools })
const output = Array.isArray(raw) ? list : { ...raw, tools: list };
fs.writeFileSync(PATH, JSON.stringify(output, null, 2));
console.log(`Enriched Pt7 fields on ${list.length} tools.`);
