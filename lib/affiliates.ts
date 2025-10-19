// lib/affiliates.ts
import type { Tool } from "@/lib/types";

export function resolveOutboundUrl(
  tool: Tool,
  campaign: string = "directory",
  content?: string
): string {
  const base =
    (tool.affiliate?.enabled && tool.affiliate?.link) || tool.website_url || "/";

  try {
    const url = new URL(base);
    url.searchParams.set("utm_source", "findailist");
    url.searchParams.set("utm_medium", "referral");
    url.searchParams.set("utm_campaign", campaign);
    if (content) url.searchParams.set("utm_content", content);
    return url.toString();
  } catch {
    // Relative or malformed; just return it
    return base;
  }
}
