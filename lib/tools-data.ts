// lib/tools-data.ts
import fs from "node:fs";
import path from "node:path";

const TOOLS_DIR = path.join(process.cwd(), "data", "tools"); // adjust if different

export type ToolEntry = {
  name: string;
  slug: string;
  website_url: string;
  logo_url: string;
  description: string;
  category: string;
  best_for?: string[];
  use_cases?: Array<{ title: string; details: string; industries?: string[] }>;
  pros?: string[];
  cons?: string[];
  pricing_plans?: Array<{
    name: string;
    price?: number | string;
    currency?: string;
    billing_cycle?: "monthly" | "yearly" | "lifetime" | "one-time";
  }>;
  company_details?: {
    name?: string;
    hq_city?: string | null;
    hq_country?: string | null;
    team_size_range?: string | null;
    founded_year?: number | null;
  };
  reviews_and_ratings?: Array<{
    source_name?: string | null;
    rating?: number | null;
    rating_scale_max?: number | null;
    rating_count?: number | null;
  }>;
  image?: string;
  models?: Array<{
    name?: string | null;
    provider?: string | null;
    version?: string | null;
    modality?: string | null;
  }>;
  technical_information?: {
    api_available?: boolean | null;
    hosting_options?: string[];
    sdk_languages?: string[];
    inference_endpoints?: string[];
    rate_limits?: string | null;
    data_retention_policy?: string | null;
    security?: {
      encryption_at_rest?: boolean | null;
      encryption_in_transit?: boolean | null;
      pii_processing_supported?: boolean | null;
      compliance_certifications?: string[];
      subprocessors_url?: string | null;
    };
    integrations?: string[];
  };
  key_differentiator?: string | string[];
  case_studies?: any[];
  vendor_details?: any;
  flags?: Record<string, boolean | null>;
  gallery?: any[];
  tutorials_youtube?: Array<{ title?: string | null; url: string; channel?: string | null; published_date?: string | null }>;
  qa?: any[];
  official_video?: string | null;
};

export async function getAllTools(): Promise<ToolEntry[]> {
  const files = fs.existsSync(TOOLS_DIR) ? fs.readdirSync(TOOLS_DIR) : [];
  const tools: ToolEntry[] = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = fs.readFileSync(path.join(TOOLS_DIR, f), "utf8");
    try {
      const t = JSON.parse(raw);
      // minimal guard for required fields so card never crashes
      if (t?.name && t?.slug && t?.website_url && t?.logo_url && t?.description && t?.category) {
        tools.push(t);
      }
    } catch {
      // skip invalid JSON
    }
  }
  // simple sort by name
  return tools.sort((a, b) => a.name.localeCompare(b.name));
}
