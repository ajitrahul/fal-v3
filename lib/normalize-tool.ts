// lib/normalize-tool.ts
// Safe, side-effect-free normalizers for a single tool record.
// Backward-compat: tutorials[].youtube and tutorials[].url_youtube are both set.

export type TutorialItem = {
  title?: string;
  youtube?: string | null;
  url?: string | null;
  url_youtube?: string | null;
};

export type FaqItem = {
  question: string;
  answer: string;
};

export type RecipeItem =
  | string
  | {
      title?: string;
      steps?: string[];
      goal?: string;
      inputs?: string[];
      [k: string]: any;
    };

export type GalleryItem = {
  src: string;
  alt?: string;
};

export type Tool = {
  slug?: string;
  name?: string;
  website_url?: string;
  logo_url?: string | null;
  icon_url?: string | null;
  tutorials?: TutorialItem[];
  gallery?: GalleryItem[];
  best_for?: string[] | null;
  use_cases?: string[] | null;
  pros?: string[] | null;
  cons?: string[] | null;
  languages?: string[] | null;
  integrations?: string[] | null;
  models?: string[] | null;
  main_category?: string | null;
  subcategory?: string | null;
  vendor_name?: string | null;
  tags?: string[] | null;

  // NEW additive fields we normalize:
  faqs?: FaqItem[];
  use_case_recipes?: RecipeItem[];
  // some tools may already have `recipes`; we’ll respect it and mirror into use_case_recipes
  recipes?: RecipeItem[];

  [k: string]: any;
};

const YT_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

function parseYouTubeId(u?: string | null): string | null {
  if (!u) return null;
  const rx = /youtube(?:-nocookie)?\.com\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{6,})/i;
  const m = u.match(rx);
  if (m && m[1]) return m[1];

  try {
    const url = new URL(u);
    if (url.hostname.includes("youtu.be")) {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }
    if (!YT_HOSTS.has(url.hostname)) return null;
    if (url.pathname === "/watch") {
      const v = url.searchParams.get("v");
      return v || null;
    }
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && ["embed", "shorts", "live"].includes(parts[0])) {
      return parts[1] || null;
    }
    return null;
  } catch {
    return null;
  }
}

function toNoCookieEmbed(id: string | null): string | null {
  return id ? `https://www.youtube-nocookie.com/embed/${id}?rel=0` : null;
}

function httpsify(u?: string | null): string | null {
  if (!u) return null;
  try {
    const url = new URL(u, "https://");
    if (url.protocol !== "https:") url.protocol = "https:";
    return url.href;
  } catch {
    return u;
  }
}

function coerceStringArray(maybe: any): string[] | undefined {
  if (!maybe) return undefined;
  if (Array.isArray(maybe)) {
    return maybe
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter(Boolean);
  }
  if (typeof maybe === "string") {
    const out = maybe
      .split(/[,;|]/g)
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

export function normalizeTutorials(input?: TutorialItem[]): TutorialItem[] | undefined {
  if (!Array.isArray(input)) return undefined;

  const out: TutorialItem[] = [];
  for (const t of input) {
    if (!t) continue;
    const rawUrl =
      (typeof t.youtube === "string" && t.youtube) ||
      (typeof t.url_youtube === "string" && t.url_youtube) ||
      (typeof t.url === "string" && t.url) ||
      "";

    const id = parseYouTubeId(rawUrl);
    const embed = toNoCookieEmbed(id);
    const title = (t?.title || "").trim() || undefined;

    if (embed) {
      out.push({ title, youtube: embed, url_youtube: embed });
    } else if (rawUrl && /youtube/i.test(rawUrl)) {
      const safe = httpsify(rawUrl) || rawUrl;
      out.push({ title, youtube: safe, url_youtube: safe });
    } else {
      const safeUrl = httpsify(t.url || t.youtube || t.url_youtube || "");
      out.push({ title, url: safeUrl || undefined });
    }
  }
  return out.length ? out : undefined;
}

export function normalizeGallery(input?: any): GalleryItem[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: GalleryItem[] = [];
  for (const g of input) {
    if (!g) continue;
    if (typeof g === "string") {
      const src = httpsify(g);
      if (src) out.push({ src, alt: "" });
      continue;
    }
    const src = httpsify(g.src);
    if (src) out.push({ src, alt: (g.alt || "").trim() || undefined });
  }
  return out.length ? out : undefined;
}

function normalizeFaqs(input?: any): FaqItem[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: FaqItem[] = [];
  for (const raw of input) {
    if (!raw) continue;
    if (typeof raw === "string") {
      // Treat a string as both question and answer (placeholder)
      out.push({ question: raw, answer: "" });
      continue;
    }
    if (typeof raw === "object") {
      const q = (raw.question || raw.q || "").toString().trim();
      const a = (raw.answer || raw.a || "").toString().trim();
      if (q || a) out.push({ question: q, answer: a });
    }
  }
  return out.length ? out : undefined;
}

function normalizeRecipes(input?: any): RecipeItem[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const out: RecipeItem[] = [];
  for (const raw of input) {
    if (!raw) continue;
    if (typeof raw === "string") {
      out.push(raw.trim());
      continue;
    }
    if (typeof raw === "object") {
      const item: any = { ...raw };
      if (item.title) item.title = String(item.title);
      if (Array.isArray(item.steps)) {
        item.steps = item.steps.map((s: any) => String(s)).filter(Boolean);
      }
      if (Array.isArray(item.inputs)) {
        item.inputs = item.inputs.map((s: any) => String(s)).filter(Boolean);
      }
      if (item.goal) item.goal = String(item.goal);
      out.push(item);
    }
  }
  return out.length ? out : undefined;
}

export function normalizeTool<T extends Tool>(tool: T): T {
  const out: T = { ...tool };

  // URLs → https
  out.website_url = httpsify(out.website_url) || undefined;
  out.logo_url = httpsify(out.logo_url) || undefined;
  out.icon_url = httpsify(out.icon_url) || undefined;

  // Tutorials
  out.tutorials = normalizeTutorials(out.tutorials);

  // Gallery
  out.gallery = normalizeGallery(out.gallery);

  // Arrays coerced
  const as = ["best_for", "use_cases", "pros", "cons", "languages", "integrations", "models", "tags"] as const;
  for (const k of as) {
    const v = coerceStringArray(out[k]);
    if (v && v.length) (out as any)[k] = v;
    else if (out[k] && Array.isArray(out[k]) && !(out[k] as any[]).length) {
      delete (out as any)[k];
    }
  }

  // NEW: FAQs + Recipes
  const faqs = normalizeFaqs(out.faqs);
  if (faqs && faqs.length) out.faqs = faqs; else delete (out as any).faqs;

  // prefer use_case_recipes, but also accept recipes and mirror
  const recipes = normalizeRecipes(out.use_case_recipes || out.recipes);
  if (recipes && recipes.length) {
    (out as any).use_case_recipes = recipes;
    // keep legacy `recipes` in sync if it existed
    if (Array.isArray((out as any).recipes)) (out as any).recipes = recipes;
  } else {
    delete (out as any).use_case_recipes;
  }

  return out;
}

export function normalizeToolsList<T extends Tool>(tools: T[]): T[] {
  if (!Array.isArray(tools)) return [];
  return tools.map((t) => normalizeTool(t));
}

export const YouTube = { parseYouTubeId, toNoCookieEmbed };
