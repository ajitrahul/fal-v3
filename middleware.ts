// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Allowed hosts pass through to the real app.
 * Everyone else gets rewritten to /hold (Coming Soon).
 *
 * Defaults allow:
 *  - preview.findailist.com
 *  - localhost / 127.0.0.1
 *  - any *.vercel.app (preview URLs)
 *  - 192.168.* (LAN dev)
 *
 * You can override/extend via ALLOW_HOSTS env (comma-separated), e.g.:
 * ALLOW_HOSTS=preview.findailist.com,my-preview.example.com
 */
function isAllowedHost(host: string): boolean {
  if (!host) return false;

  // Always allow preview + local + vercel preview links
  if (
    host === "preview.findailist.com" ||
    host.endsWith(".vercel.app") ||
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.startsWith("192.168.")
  ) {
    return true;
  }

  const fromEnv = (process.env.ALLOW_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length) {
    // match exact or suffix
    return fromEnv.some((allowed) => host === allowed || host.endsWith(allowed));
  }

  // If no env provided and not matched above → treat as not allowed
  return false;
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  const { pathname } = req.nextUrl;

  // Always allow the hold page and common assets
  if (
    pathname.startsWith("/hold") ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  // If host is allowed, let the request through; else rewrite to /hold
  if (isAllowedHost(host)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/hold";
  url.search = ""; // drop query
  return NextResponse.rewrite(url);
}

// Run on everything except static asset paths listed above.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
