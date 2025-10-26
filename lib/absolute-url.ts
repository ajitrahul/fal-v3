// lib/absolute-url.ts
/**
 * Builds an absolute URL without using `headers()` (which requires await in Next 15).
 * Configure once with NEXT_PUBLIC_SITE_URL:
 *   - Dev:  http://localhost:3002
 *   - Prod: https://your-domain.com
 */
export function absoluteURL(pathname: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_URL ||
    "http://localhost:3002";

  const origin = String(base).startsWith("http")
    ? String(base).replace(/\/+$/, "")
    : `https://${String(base).replace(/\/+$/, "")}`;

  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${origin}${path}`;
}
