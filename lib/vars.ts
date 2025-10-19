// lib/vars.ts
const n = (v: string | undefined, d: number) => {
  const x = parseInt(String(v ?? ""), 10);
  return Number.isFinite(x) && x > 0 ? x : d;
};

/** How many tool cards to show at first on the Home page */
export const START_TOOLS_COUNT = n(process.env.NEXT_PUBLIC_HOME_TOOLS_START, 90);

/** How many extra tool cards to load each time "More Tools" is clicked */
export const MORE_TOOLS_STEP = n(process.env.NEXT_PUBLIC_HOME_MORE_STEP, 90);

/** How many category blocks to show initially at the bottom section */
export const START_CATEGORY_BLOCK_COUNT = n(process.env.NEXT_PUBLIC_HOME_CATEGORIES_START, 30);
