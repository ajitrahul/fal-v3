// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Hosts that should always show the Coming Soon page
const PROD_HOSTS = new Set(["www.findailist.com", "findailist.com"]);

/** Hosts that are allowed to see the full app */
function isAllowedHost(hostname: string): boolean {
  if (!hostname) return false;
  if (
    hostname === "preview.findailist.com" ||
    hostname.endsWith(".vercel.app") ||
    hostname.startsWith("localhost") ||
    hostname.startsWith("127.0.0.1") ||
    hostname.startsWith("192.168.")
  ) return true;

  const extra = (process.env.ALLOW_HOSTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (extra.length > 0 && extra.includes(hostname)) return true;

  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // Allow the hold page and safe static paths / assets to pass through
  // so images, brand assets, favicons, _next and other static files load correctly.
  if (
    pathname.startsWith("/hold") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/api/") || // leave API endpoints alone
    pathname.startsWith("/public/") ||
    pathname.startsWith("/brand/") || // your logo path
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    // allow direct requests for common image/file extensions
    !!pathname.match(/\.(png|jpg|jpeg|svg|ico|webp|avif|json|xml)$/i)
  ) {
    return NextResponse.next();
  }

  // Force Coming Soon on explicit production hostnames
  if (PROD_HOSTS.has(hostname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/hold";
    url.search = "";
    return NextResponse.rewrite(url);
  }

  // Otherwise allow approved hosts
  if (isAllowedHost(hostname)) {
    return NextResponse.next();
  }

  // Unknown host => show Coming Soon
  const url = req.nextUrl.clone();
  url.pathname = "/hold";
  url.search = "";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/image).*)"],
};
