// app/api/guided/route.ts
// Read-only Guided Finder API. No UI change.
// Example: /api/guided?q=chat&categories=Writing&languages=English&limit=10

import { NextResponse } from "next/server";
import { filterTools, getFacetOptions, mapResultItems } from "@/lib/guided";

function csv(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(/[,\|]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const q = (searchParams.get("q") || "").trim();

  const filters = {
    q,
    categories: csv(searchParams.get("categories")),
    tasks: csv(searchParams.get("tasks")),
    roles: csv(searchParams.get("roles")),
    best_for: csv(searchParams.get("best_for")),
    use_cases: csv(searchParams.get("use_cases")),
    models: csv(searchParams.get("models")),
    languages: csv(searchParams.get("languages")),
    integrations: csv(searchParams.get("integrations")),
    tags: csv(searchParams.get("tags")),
    pricing_model: csv(searchParams.get("pricing_model")),
  };

  const limit = Math.max(1, Math.min(100, Number(searchParams.get("limit") || 24)));
  const offset = Math.max(0, Number(searchParams.get("offset") || 0));

  const { total, items } = filterTools(filters, offset, limit);
  const body = {
    ok: true,
    total,
    offset,
    limit,
    items: mapResultItems(items),
    facets: getFacetOptions(),
  };

  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store", // so your filters feel “live” in dev
    },
  });
}
