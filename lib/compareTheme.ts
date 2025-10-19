// lib/compareTheme.ts
export type Accent = "sky" | "emerald" | "amber" | "violet" | "stone";

/** Read from env, fallback to 'sky'. Unknown values also fallback to 'sky'. */
export const ACCENT: Accent = (() => {
  const raw = (process.env.NEXT_PUBLIC_COMPARE_ACCENT || "sky").toLowerCase();
  const allowed: Accent[] = ["sky", "emerald", "amber", "violet", "stone"];
  return (allowed.includes(raw as Accent) ? (raw as Accent) : "sky");
})();

/** Tailwind class tokens per accent. Keep contrast-friendly colors only. */
export const ACCENTS = {
  sky:     { even: "even:bg-sky-50",     hover: "hover:bg-sky-100",     avatar: "bg-sky-600 text-white",     ring: "ring-sky-200" },
  emerald: { even: "even:bg-emerald-50", hover: "hover:bg-emerald-100", avatar: "bg-emerald-600 text-white", ring: "ring-emerald-200" },
  amber:   { even: "even:bg-amber-50",   hover: "hover:bg-amber-100",   avatar: "bg-amber-500 text-white",   ring: "ring-amber-200" },
  violet:  { even: "even:bg-violet-50",  hover: "hover:bg-violet-100",  avatar: "bg-violet-600 text-white",  ring: "ring-violet-200" },
  stone:   { even: "even:bg-stone-50",   hover: "hover:bg-stone-100",   avatar: "bg-stone-700 text-white",   ring: "ring-stone-200" },
} as const;
