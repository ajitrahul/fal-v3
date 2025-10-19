// lib/flags.ts
// Robust feature flags (all OFF by default)

function on(v: string | undefined | null): boolean {
  if (!v) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export const FLAGS = {
  // Tool page extras
  SHOW_FAQ: on(process.env.NEXT_PUBLIC_SHOW_FAQ),
  SHOW_RECIPES: on(process.env.NEXT_PUBLIC_SHOW_RECIPES),
  SHOW_TUTORIAL_TITLES: on(process.env.NEXT_PUBLIC_SHOW_TUTORIAL_TITLES),

  // Guided Finder preview UI at /tools/find
  SHOW_GUIDED_UI: on(process.env.NEXT_PUBLIC_SHOW_GUIDED_UI),

  // Compare UI at /tools/compare
  SHOW_COMPARE_UI: on(process.env.NEXT_PUBLIC_SHOW_COMPARE_UI),

  // NEW: show AI summary panel inside Compare UI
  SHOW_AI_SUMMARY: on(process.env.NEXT_PUBLIC_SHOW_AI_SUMMARY),
} as const;
