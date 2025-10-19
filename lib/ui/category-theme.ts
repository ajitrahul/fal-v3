// lib/ui/category-theme.ts
// One source of truth for per-category colors across the site.
// Use getCategoryTheme(category).<property> in components.

export type CategoryTheme = {
  accentBar: string;      // top bar color
  ringHover: string;      // hover ring color
  chip: string;           // category chip colors
  btnSolid: string;       // primary button
  btnSolidHover: string;
  btnOutline: string;     // outline button
  btnOutlineHover: string;
};

type Conf = Omit<CategoryTheme, never>;

const CATS: Record<string, Conf> = {
  // emerald family
  rag: themeEmerald(),
  search: themeEmerald(),

  // purple family
  vision: themePurple(),
  multimodal: themePurple(),
  image: themePurple(),

  // orange family
  code: themeOrange(),
  "developer tools": themeOrange(),
  sdk: themeOrange(),

  // sky family
  agent: themeSky(),
  automation: themeSky(),
  orchestration: themeSky(),

  // pink/rose families
  speech: themePink(),
  audio: themePink(),
  voice: themePink(),
  video: themeRose(),

  // indigo family
  data: themeIndigo(),
  embeddings: themeIndigo(),
  "vector db": themeIndigo(),

  // teal family
  security: themeTeal(),
  compliance: themeTeal(),

  // amber family
  writing: themeAmber(),
  content: themeAmber(),
  marketing: themeAmber(),

  // fuchsia family
  analytics: themeFuchsia(),

  // blue family
  platform: themeBlue(),
};

const FALLBACKS: Conf[] = [
  themeBlue(),
  themeEmerald(),
  themePurple(),
  themeOrange(),
  themeSky(),
  themePink(),
  themeIndigo(),
  themeTeal(),
  themeAmber(),
  themeFuchsia(),
];

export function getCategoryTheme(category?: string): CategoryTheme {
  const key = (category || "").toLowerCase().trim();
  if (CATS[key]) return CATS[key];
  for (const k of Object.keys(CATS)) {
    if (key.includes(k)) return CATS[k];
  }
  // hash fallback for unknown categories → stable but varied colors
  const idx = hash(key) % FALLBACKS.length;
  return FALLBACKS[idx];
}

/* ---------------- internals ---------------- */
function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function themeBlue(): Conf {
  return {
    accentBar: "bg-blue-200 dark:bg-blue-900/40",
    ringHover: "hover:ring-blue-200 dark:hover:ring-blue-800",
    chip:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    btnSolid:
      "bg-blue-600 text-white dark:bg-blue-400 dark:text-black",
    btnSolidHover:
      "hover:bg-blue-700 dark:hover:bg-blue-300",
    btnOutline:
      "border border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-300",
    btnOutlineHover:
      "hover:bg-blue-50 dark:hover:bg-blue-900/20",
  };
}
function themeEmerald(): Conf {
  return {
    accentBar: "bg-emerald-200 dark:bg-emerald-900/40",
    ringHover: "hover:ring-emerald-200 dark:hover:ring-emerald-800",
    chip:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
    btnSolid:
      "bg-emerald-600 text-white dark:bg-emerald-400 dark:text-black",
    btnSolidHover:
      "hover:bg-emerald-700 dark:hover:bg-emerald-300",
    btnOutline:
      "border border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300",
    btnOutlineHover:
      "hover:bg-emerald-50 dark:hover:bg-emerald-900/20",
  };
}
function themePurple(): Conf {
  return {
    accentBar: "bg-purple-200 dark:bg-purple-900/40",
    ringHover: "hover:ring-purple-200 dark:hover:ring-purple-800",
    chip:
      "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800",
    btnSolid:
      "bg-purple-600 text-white dark:bg-purple-400 dark:text-black",
    btnSolidHover:
      "hover:bg-purple-700 dark:hover:bg-purple-300",
    btnOutline:
      "border border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300",
    btnOutlineHover:
      "hover:bg-purple-50 dark:hover:bg-purple-900/20",
  };
}
function themeOrange(): Conf {
  return {
    accentBar: "bg-orange-200 dark:bg-orange-900/40",
    ringHover: "hover:ring-orange-200 dark:hover:ring-orange-800",
    chip:
      "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800",
    btnSolid:
      "bg-orange-600 text-white dark:bg-orange-400 dark:text-black",
    btnSolidHover:
      "hover:bg-orange-700 dark:hover:bg-orange-300",
    btnOutline:
      "border border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-300",
    btnOutlineHover:
      "hover:bg-orange-50 dark:hover:bg-orange-900/20",
  };
}
function themeSky(): Conf {
  return {
    accentBar: "bg-sky-200 dark:bg-sky-900/40",
    ringHover: "hover:ring-sky-200 dark:hover:ring-sky-800",
    chip:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800",
    btnSolid:
      "bg-sky-600 text-white dark:bg-sky-400 dark:text-black",
    btnSolidHover:
      "hover:bg-sky-700 dark:hover:bg-sky-300",
    btnOutline:
      "border border-sky-200 text-sky-700 dark:border-sky-800 dark:text-sky-300",
    btnOutlineHover:
      "hover:bg-sky-50 dark:hover:bg-sky-900/20",
  };
}
function themePink(): Conf {
  return {
    accentBar: "bg-pink-200 dark:bg-pink-900/40",
    ringHover: "hover:ring-pink-200 dark:hover:ring-pink-800",
    chip:
      "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800",
    btnSolid:
      "bg-pink-600 text-white dark:bg-pink-400 dark:text-black",
    btnSolidHover:
      "hover:bg-pink-700 dark:hover:bg-pink-300",
    btnOutline:
      "border border-pink-200 text-pink-700 dark:border-pink-800 dark:text-pink-300",
    btnOutlineHover:
      "hover:bg-pink-50 dark:hover:bg-pink-900/20",
  };
}
function themeRose(): Conf {
  return {
    accentBar: "bg-rose-200 dark:bg-rose-900/40",
    ringHover: "hover:ring-rose-200 dark:hover:ring-rose-800",
    chip:
      "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800",
    btnSolid:
      "bg-rose-600 text-white dark:bg-rose-400 dark:text-black",
    btnSolidHover:
      "hover:bg-rose-700 dark:hover:bg-rose-300",
    btnOutline:
      "border border-rose-200 text-rose-700 dark:border-rose-800 dark:text-rose-300",
    btnOutlineHover:
      "hover:bg-rose-50 dark:hover:bg-rose-900/20",
  };
}
function themeIndigo(): Conf {
  return {
    accentBar: "bg-indigo-200 dark:bg-indigo-900/40",
    ringHover: "hover:ring-indigo-200 dark:hover:ring-indigo-800",
    chip:
      "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800",
    btnSolid:
      "bg-indigo-600 text-white dark:bg-indigo-400 dark:text-black",
    btnSolidHover:
      "hover:bg-indigo-700 dark:hover:bg-indigo-300",
    btnOutline:
      "border border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300",
    btnOutlineHover:
      "hover:bg-indigo-50 dark:hover:bg-indigo-900/20",
  };
}
function themeTeal(): Conf {
  return {
    accentBar: "bg-teal-200 dark:bg-teal-900/40",
    ringHover: "hover:ring-teal-200 dark:hover:ring-teal-800",
    chip:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800",
    btnSolid:
      "bg-teal-600 text-white dark:bg-teal-400 dark:text-black",
    btnSolidHover:
      "hover:bg-teal-700 dark:hover:bg-teal-300",
    btnOutline:
      "border border-teal-200 text-teal-700 dark:border-teal-800 dark:text-teal-300",
    btnOutlineHover:
      "hover:bg-teal-50 dark:hover:bg-teal-900/20",
  };
}
function themeAmber(): Conf {
  return {
    accentBar: "bg-amber-200 dark:bg-amber-900/40",
    ringHover: "hover:ring-amber-200 dark:hover:ring-amber-800",
    chip:
      "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-800",
    btnSolid:
      "bg-amber-600 text-white dark:bg-amber-400 dark:text-black",
    btnSolidHover:
      "hover:bg-amber-700 dark:hover:bg-amber-300",
    btnOutline:
      "border border-amber-200 text-amber-800 dark:border-amber-800 dark:text-amber-200",
    btnOutlineHover:
      "hover:bg-amber-50 dark:hover:bg-amber-900/20",
  };
}
function themeFuchsia(): Conf {
  return {
    accentBar: "bg-fuchsia-200 dark:bg-fuchsia-900/40",
    ringHover: "hover:ring-fuchsia-200 dark:hover:ring-fuchsia-800",
    chip:
      "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-900/20 dark:text-fuchsia-300 dark:border-fuchsia-800",
    btnSolid:
      "bg-fuchsia-600 text-white dark:bg-fuchsia-400 dark:text-black",
    btnSolidHover:
      "hover:bg-fuchsia-700 dark:hover:bg-fuchsia-300",
    btnOutline:
      "border border-fuchsia-200 text-fuchsia-700 dark:border-fuchsia-800 dark:text-fuchsia-300",
    btnOutlineHover:
      "hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/20",
  };
}
