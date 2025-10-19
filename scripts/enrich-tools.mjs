import fs from "node:fs";

const path = "./data/tools.json";
const raw = JSON.parse(fs.readFileSync(path, "utf8"));
const list = Array.isArray(raw) ? raw : raw.tools;

const fallback = (v, d) => (v === undefined ? d : v);

for (const t of list) {
  t.best_for = fallback(t.best_for, ["General knowledge work"]);
  t.use_cases = fallback(t.use_cases, ["Draft content","Summarize","Brainstorm"]);
  t.ideal_industries = fallback(t.ideal_industries, ["SaaS","Agencies"]);
  t.learning_curve = fallback(t.learning_curve, "Low");
  t.support_channels = fallback(t.support_channels, ["Docs","Email"]);
  t.uptime_slo = fallback(t.uptime_slo, "99.9%");

  t.pros_cons = fallback(t.pros_cons, {
    pros: [
      "Strong core feature set",
      "Responsive UI",
      (t.flags?.api_available ? "Has API for automation" : "Simple to get started")
    ].filter(Boolean),
    cons: [
      (t.flags?.open_source ? null : "No self-hosted option"),
      (t.pricing?.model === "paid" ? "No free tier" : null)
    ].filter(Boolean)
  });

  t.benchmarks = fallback(t.benchmarks, {
    latency_ms_p50: t.technical?.latency_ms ?? 800,
    latency_ms_p95: Math.max((t.technical?.latency_ms ?? 800) * 1.8, 1200),
    note: "Indicative; refine with real tests"
  });
}

fs.writeFileSync(path, JSON.stringify(list, null, 2));
console.log(`Enriched ${list.length} tools`);
