// lib/compare.ts
// Pure DB-based compare utilities (no AI here)

import { DB } from "@/lib/data";

type Tool = (typeof DB)["tools"][number];

function normSlug(s: string): string {
  return String(s || "").trim().toLowerCase();
}

function getBySlug(slug: string): Tool | null {
  const s = normSlug(slug);
  const tool = DB.tools.find((t) => normSlug(t.slug) === s);
  return tool || null;
}

function get(obj: any, path: string): any {
  if (!obj) return null;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur && typeof cur === "object" && p in cur) cur = cur[p];
    else return null;
  }
  return cur;
}

function fmt(v: any): string | null {
  if (v == null) return null;
  if (Array.isArray(v)) {
    const arr = v.map((x) => (typeof x === "string" ? x.trim() : String(x))).filter(Boolean);
    return arr.length ? arr.join(", ") : null;
  }
  if (typeof v === "object") return null; // we only print primitives/arrays
  const s = String(v).trim();
  return s ? s : null;
}

// Fields we expose in the compare table (order matters)
const FIELDS: Array<{ label: string; key: string; compute?: (t: Tool) => any }> = [
  { label: "Tagline", key: "tagline" },
  { label: "Summary", key: "summary" },
  {
    label: "Other categories",
    key: "categories",
    compute: (t) => t.categories || [t.main_category, t.subcategory].filter(Boolean),
  },
  { label: "Pricing model", key: "pricing_model", compute: (t) => t.pricing?.model || t.pricing_model },
  { label: "Plans", key: "pricing_plans", compute: (t) => t.pricing?.plans?.map((p: any) => p?.name).filter(Boolean) },
  { label: "Features", key: "features" },
  { label: "Pros", key: "pros", compute: (t) => t.pros_cons?.pros },
  { label: "Cons", key: "cons", compute: (t) => t.pros_cons?.cons },
  { label: "Best for", key: "best_for" },
  { label: "Use cases", key: "use_cases" },
  { label: "Roles", key: "roles", compute: (t) => t.job_roles || t.roles },
  { label: "Tasks", key: "tasks" },
  { label: "Models", key: "models" },
  { label: "Languages", key: "languages" },
  { label: "Integrations", key: "integrations" },
  { label: "Compliance", key: "compliance" },
  { label: "Data controls", key: "data_controls" },
  { label: "Governance", key: "governance" },

  // Technical
  { label: "Context tokens", key: "technical.context_tokens" },
  { label: "Latency (ms)", key: "technical.latency_ms" },
  { label: "Throughput (RPS)", key: "technical.throughput_rps" },
  { label: "SDK languages", key: "technical.sdk_languages" },

  // Benchmarks
  { label: "p50 latency (ms)", key: "benchmarks.latency_ms_p50" },
  { label: "p95 latency (ms)", key: "benchmarks.latency_ms_p95" },
  { label: "Benchmark note", key: "benchmarks.note" },

  // Privacy / Security / Limits
  { label: "Training policy", key: "privacy.training_policy" },
  { label: "Data retention", key: "privacy.data_retention" },
  { label: "Security certs", key: "security.certifications" },
  { label: "SSO", key: "security.sso" },
  { label: "Free tier", key: "limits.free_tier" },
  { label: "Rate limits", key: "limits.rate_limits" },
  { label: "Uptime SLO", key: "uptime_slo" },

  // Vendor / Dates
  { label: "Vendor", key: "vendor.name" },
  { label: "HQ", key: "vendor.hq_country" },
  { label: "Release date", key: "release_date" },
  { label: "Updated", key: "updated_at" },
];

export function compareBySlugs(slugs: string[]) {
  const uniq = Array.from(new Set(slugs.map(normSlug))).slice(0, 3);
  const raw: Tool[] = uniq.map((s) => getBySlug(s)).filter(Boolean) as Tool[];

  const names = raw.map((t) => t.name);
  const outFields = FIELDS.map(({ label, key, compute }) => {
    const values = raw.map((t) => {
      const v = compute ? compute(t) : get(t, key);
      return fmt(v);
    });
    return { label, key, values };
  });

  return {
    raw,
    slugs: uniq,
    names,
    fields: outFields,
  };
}
