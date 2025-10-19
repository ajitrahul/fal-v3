import fs from "node:fs";

const PATH = "./data/tools.json";
const raw = JSON.parse(fs.readFileSync(PATH, "utf8"));
const list = Array.isArray(raw) ? raw : raw.tools;

if (!Array.isArray(list)) {
  console.error("tools.json must be an array or { tools: [...] }");
  process.exit(1);
}

const asArray = (v) => (Array.isArray(v) ? v : (v ? [v] : []));
const asObj = (v) => (v && typeof v === "object" ? v : {});
const ensure = (o, k, def) => (o[k] === undefined ? (o[k] = def) : o[k]);

for (const t of list) {
  ensure(t, "best_for", []);
  ensure(t, "use_cases", []);
  ensure(t, "pros_cons", { pros: [], cons: [] });
  ensure(t, "key_differentiators", []);
  ensure(t, "limitations", []);
  ensure(t, "setup_time", "");

  ensure(t, "technical", {});
  t.technical = asObj(t.technical);
  ensure(t.technical, "context_tokens", t.technical.context_tokens ?? null);
  ensure(t.technical, "latency_ms", t.technical.latency_ms ?? null);
  ensure(t.technical, "throughput_rps", t.technical.throughput_rps ?? null);
  ensure(t.technical, "sdk_languages", asArray(t.technical.sdk_languages));

  ensure(t, "benchmarks", {});
  t.benchmarks = asObj(t.benchmarks);
  ensure(t.benchmarks, "latency_ms_p50", t.benchmarks.latency_ms_p50 ?? null);
  ensure(t.benchmarks, "latency_ms_p95", t.benchmarks.latency_ms_p95 ?? null);
  ensure(t.benchmarks, "note", t.benchmarks.note ?? "");

  ensure(t, "import_export", []);
  ensure(t, "data_controls", []);
  ensure(t, "governance", []);
  ensure(t, "privacy", {});
  t.privacy = asObj(t.privacy);
  ensure(t.privacy, "training_policy", t.privacy.training_policy ?? "");
  ensure(t.privacy, "data_retention", t.privacy.data_retention ?? "");
  ensure(t, "security", {});
  t.security = asObj(t.security);
  ensure(t.security, "certifications", asArray(t.security.certifications));
  ensure(t.security, "sso", t.security.sso ?? "—");
  ensure(t, "limits", {});
  t.limits = asObj(t.limits);
  ensure(t.limits, "free_tier", t.limits.free_tier ?? "");
  ensure(t.limits, "rate_limits", t.limits.rate_limits ?? "");

  ensure(t, "uptime_slo", t.uptime_slo ?? "");
  ensure(t, "ideal_industries", asArray(t.ideal_industries));
  ensure(t, "support_channels", asArray(t.support_channels));
  ensure(t, "case_studies", asArray(t.case_studies));
  ensure(t, "migration_paths", asArray(t.migration_paths));
  ensure(t, "alternatives_notes", t.alternatives_notes ?? "");
  ensure(t, "roadmap_highlights", asArray(t.roadmap_highlights));
}

const output = Array.isArray(raw) ? list : { ...raw, tools: list };
fs.writeFileSync(PATH, JSON.stringify(output, null, 2));
console.log("Ensured Pt7 keys present on", list.length, "tools");
