// lib/brand.ts
export const SITE_NAME =
  process.env.NEXT_PUBLIC_SITE_NAME?.trim() || "FindAIList";

// You can replace this path with any file you put under /public
export const SITE_LOGO =
  process.env.NEXT_PUBLIC_SITE_LOGO?.trim() || "/brand/findailist-logo.svg";

// Optional central place for title patterns if you need elsewhere
export const TITLE_TEMPLATE = `%s — ${SITE_NAME}`;
