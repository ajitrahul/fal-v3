// lib/utils.ts
export const domainOf = (u?: string) => {
  try { return u ? new URL(u).host : null; } catch { return null; }
};

// Always prefer our proxies (they cache and have fallbacks)
export const logoSrc = (tool: any) => {
  const d = domainOf(tool?.website_url) || domainOf(tool?.logo_url) || '';
  return d ? `/api/logo?domain=${encodeURIComponent(d)}` : '/logo-fallback.svg';
};

export const shotSrc = (tool: any) => {
  const u = tool?.website_url || '';
  return u ? `/api/screenshot?url=${encodeURIComponent(u)}` : '/screenshot-fallback.svg';
};
