// lib/types.ts

export type Tutorial = {
  title: string;
  url: string;
  provider?: "youtube" | "vimeo" | "loom" | "wistia" | "other";
  language?: string | null;
};

export type PricingPlan = {
  name: string;
  price: string;
  features?: string[];
};

export type Tool = {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  summary?: string;
  website_url?: string;
  logo_url?: string;
  gallery?: { src: string; caption?: string }[];
  categories?: string[];
  tasks?: string[];
  job_roles?: string[];
  pricing?: { model?: string } & Record<string, any>;
  flags?: {
    free?: boolean;
    open_source?: boolean;
    api_available?: boolean;
    [k: string]: any;
  };

  features?: string[];
  platforms?: string[];
  models?: string[];
  integrations?: string[];
  languages?: string[];

  maturity?: "new" | "growing" | "established" | null;
  release_date?: string | null; // YYYY-MM-DD
  updated_at: string;           // YYYY-MM-DD
  status: "active" | "deadpool" | "sunset";
  compliance?: string[];

  vendor?: {
    name?: string | null;
    hq_country?: string | null;
    contact_email?: string | null;
    twitter?: string | null;
    linkedin?: string | null;
  };

  community?: {
    rating?: number | null;
    votes?: number | null;
    reviews?: {
      id: string;
      author: string;
      rating: number; // 1..5
      title: string;
      body: string;
      created_at: string; // YYYY-MM-DD
    }[];
  };

  seo?: {
    keywords?: string[];
    canonical_url?: string | null;
    schema_org?: string[];
  };

  flags?: {
    free?: boolean;
    no_signup?: boolean;
    open_source?: boolean;
    mobile_app?: boolean;
    api_available?: boolean;
    on_device?: boolean;
    privacy_first?: boolean;
    educational?: boolean;
    nsfw?: boolean;
    verified?: boolean;
  };

  links?: {
    docs?: string | null;
    changelog?: string | null;
    support?: string | null;
    pricing?: string | null;
  };

  affiliate?: {
    enabled?: boolean;
    link?: string | null;
    partner_id?: string | null;
  };

  moderation?: {
    submitted_by?: string | null;
    moderation_state?: "pending" | "approved" | "rejected" | null;
    notes?: string | null;
  };

  best_for?: string[];
  use_cases?: string[];
  ideal_industries?: string[];
  support_channels?: string[];
  pricing_notes?: string | null;

  pros_cons?: {
    pros?: string[];
    cons?: string[];
  };

  key_differentiators?: string[];
  limitations?: string[];
  setup_time?: string | null;
  import_export?: string[];
  data_controls?: string[];
  governance?: string[];

  case_studies?: { title: string; url: string }[];
  migration_paths?: string[];
  alternatives_notes?: string | null;
  roadmap_highlights?: string[];

  technical?: {
    context_tokens?: number | null;
    latency_ms?: number | null;
    throughput_rps?: number | null;
    sdk_languages?: string[];
  };

  benchmarks?: {
    latency_ms_p50?: number | null;
    latency_ms_p95?: number | null;
    note?: string | null;
  };

  privacy?: {
    training_policy?: string | null;
    data_retention?: string | null;
  };

  security?: {
    certifications?: string[];
    sso?: string | null;
  };

  limits?: {
    free_tier?: string | null;
    rate_limits?: string | null;
  };

  uptime_slo?: string | null;

  // NEW: first-class tutorials list (matches tools.schema.json)
  tutorials?: Tutorial[];
};
