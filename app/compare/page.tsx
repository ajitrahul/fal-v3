// app/compare/page.tsx
import Link from "next/link";
import { headers } from "next/headers";
import CompareAiSummary from "@/components/CompareAiSummary";
import ClearCompareOnMount from "@/components/ClearCompareOnMount";
import ComparePickerUrl from "@/components/ComparePickerUrl.server";
import { DB } from "@/lib/data";
import { buildAliasIndexFromDB } from "@/lib/aliases";
import { ACCENT, ACCENTS } from "@/lib/compareTheme";

const A = ACCENTS[ACCENT];

// ---------- Types ----------
type CompareAI = {
  overview?: string;
  key_differences?: string[];
  strengths?: Record<string, string[]>;
  best_for?: Array<{ audience: string; pick: string; why: string }>;
  considerations?: string[];
  data_used?: string[];
};

type FieldRow = {
  field?: string;
  label?: string;
  name?: string;
  key?: string;
  id?: string;
  values: Array<string | null>;
};

type CompareBase = {
  slugs: string[];
  names: string[];
  fields: FieldRow[];
};

type CompareResponse =
  | { ok: true; slugs: string[]; names: string[]; fields: FieldRow[]; error?: null }
  | {
      ok?: false;
      error?: string | null;
      base?: CompareBase | null;
      ai?: CompareAI | null;
      slugs?: unknown;
      names?: unknown;
      fields?: unknown;
    };

// ---------- Utils (no behavior change) ----------
function parseSlugsRaw(raw: string | undefined): string[] {
  if (!raw) return [];
  const parts = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const k = p.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(p);
      if (out.length >= 3) break;
    }
  }
  return out;
}

function isValidBase(x: any): x is CompareBase {
  return (
    x &&
    Array.isArray(x.slugs) &&
    Array.isArray(x.names) &&
    Array.isArray(x.fields) &&
    x.fields.every((f: any) => f && typeof f === "object" && Array.isArray(f.values))
  );
}

function humanize(s: string): string {
  if (!s) return "";
  const spaced = s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return spaced
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function getFieldLabel(f: Partial<FieldRow>, index: number): string {
  const raw =
    (typeof f.field === "string" && f.field) ||
    (typeof f.label === "string" && f.label) ||
    (typeof f.name === "string" && f.name) ||
    (typeof f.key === "string" && f.key) ||
    (typeof f.id === "string" && f.id) ||
    "";
  const pretty = humanize(raw);
  return pretty || `Field ${index + 1}`;
}

// Canonicalize with shared alias map (DRY)
function canonicalizeAll(rawSlugs: string[]): string[] {
  const index = buildAliasIndexFromDB();
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of rawSlugs) {
    const c = (index[s.toLowerCase()] ?? s).toLowerCase();
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
      if (out.length >= 3) break;
    }
  }
  return out;
}

// ---------- Pretty value rendering (UI only) ----------
function isUrl(s: string) {
  return /^https?:\/\//i.test(s);
}
function isYes(s: string) {
  const x = s.trim().toLowerCase();
  return ["yes", "true", "supported", "available"].includes(x);
}
function isNo(s: string) {
  const x = s.trim().toLowerCase();
  return ["no", "false", "unsupported", "unavailable"].includes(x);
}
function splitList(s: string): string[] | null {
  const parts = s.split(/[;,|]/).map((t) => t.trim()).filter(Boolean);
  if (parts.length >= 2 && parts.length <= 6 && parts.every((p) => p.length <= 40))
    return Array.from(new Set(parts));
  return null;
}
function renderCell(v: string | null) {
  if (!v || v === "-") return <span className="text-gray-400 italic text-base">-</span>;
  const s = String(v).trim();
  if (isUrl(s))
    return (
      <a
        href={s}
        target="_blank"
        rel="noopener noreferrer"
        className="underline underline-offset-2 break-words text-base"
        title={s}
      >
        {s}
      </a>
    );
  if (isYes(s))
    return (
      <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-0.5 text-base font-medium text-green-700 ring-1 ring-inset ring-green-200">
        Yes
      </span>
    );
  if (isNo(s))
    return (
      <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-base font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
        No
      </span>
    );
  const list = splitList(s);
  if (list)
    return (
      <div className="flex flex-wrap gap-1">
        {list.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-base font-medium text-gray-700 ring-1 ring-inset ring-gray-200"
          >
            {item}
          </span>
        ))}
      </div>
    );
  return <span className="whitespace-pre-wrap break-words leading-relaxed text-base">{s}</span>;
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

// ---------- Header meta (icon + link) ----------
type ToolHeaderMeta = { name: string; slug: string; href: string; iconUrl?: string | null };
function getHeaderMeta(base: CompareBase): ToolHeaderMeta[] {
  const tools = (DB.tools as any[]) ?? [];
  const bySlug = new Map<string, any>();
  for (const t of tools) bySlug.set(String(t.slug).toLowerCase(), t);

  return base.names.map((name, i) => {
    const slug = (base.slugs[i] || "").toLowerCase();
    const tool = bySlug.get(slug);
    const iconUrl =
      (tool?.logo_url as string) ||
      (tool?.icon_url as string) ||
      (tool?.logo as string) ||
      (tool?.icon as string) ||
      (tool?.image as string) ||
      (tool?.images?.logo as string) ||
      (Array.isArray(tool?.images)
        ? (tool.images.find((x: any) => typeof x === "string") as string)
        : null) ||
      (tool?.brand?.logo as string) ||
      (tool?.avatar as string) ||
      (tool?.thumbnail as string) ||
      (tool?.og_image as string) ||
      (tool?.banner as string) ||
      (tool?.favicon as string) ||
      null;

  return {
      name: String(name),
      slug,
      href: `/tools/${slug}`,
      iconUrl: iconUrl || null,
    };
  });
}

// ---------- Page ----------
export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;

  // 1) Raw slugs (aliases allowed)
  const rawSlugs = parseSlugsRaw(
    typeof sp?.slugs === "string"
      ? (sp.slugs as string)
      : Array.isArray(sp?.slugs)
      ? (sp.slugs as string[]).join(",")
      : undefined
  );

  // 2) Canonicalize BEFORE calling API (shared helper)
  const canonicalSlugs = canonicalizeAll(rawSlugs);

  // 0 or 1 slug → no fetch; keep picker visible
  if (canonicalSlugs.length < 2) {
    const need =
      canonicalSlugs.length === 0
        ? "Select at least 2 tools to start comparing."
        : "Add one more tool to start comparing.";
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="mb-4 text-xl font-semibold">Compare tools</h1>
        <ComparePickerUrl />
        <div className="rounded-md border bg-white p-4">
          <p className="text-sm text-gray-700">
            {need} You can also start from the{" "}
            <Link href="/tools" className="underline underline-offset-2">
              Explore
            </Link>{" "}
            page and use “Compare” there.
          </p>
        </div>
      </main>
    );
  }

  // 3) Absolute API URL; encode each slug; join with RAW comma
  const hdrs = await headers();
  const host = hdrs.get("x-forwarded-host") || hdrs.get("host") || "localhost:3000";
  const proto = hdrs.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  const baseUrl = `${proto}://${host}`;
  const qs = canonicalSlugs.map(encodeURIComponent).join(",");

  // 4) Fetch; accept both shapes
  let json: CompareResponse | null = null;
  let fetchError: string | null = null;
  try {
    const res = await fetch(`${baseUrl}/api/compare?slugs=${qs}`, { cache: "no-store" });
    if (!res.ok) fetchError = `Compare API returned ${res.status}`;
    else json = (await res.json()) as CompareResponse;
  } catch (e: any) {
    fetchError = e?.message || "Compare API request failed";
  }

  let base: CompareBase | null = null;
  let ai: CompareAI | null = null;

  if (json?.base && isValidBase(json.base)) {
    base = json.base;
    ai = json.ai ?? null;
  } else if (json?.ok === true && Array.isArray(json.names) && Array.isArray(json.fields)) {
    base = {
      slugs: Array.isArray(json.slugs) ? (json.slugs as string[]) : canonicalSlugs,
      names: json.names as string[],
      fields: json.fields as FieldRow[],
    };
    ai = null;
  }

  if (fetchError || !base || base.fields.length === 0) {
    return (
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <h1 className="mb-4 text-xl font-semibold">Compare tools</h1>
        <ComparePickerUrl />
        <div className="rounded-md border bg-red-50 p-4 text-sm text-red-700">
          <p className="font-medium">Failed to generate comparison.</p>
          {fetchError ? <p className="mt-1">Details: {fetchError}</p> : null}
          {!fetchError && (json as any)?.error ? (
            <p className="mt-1">Details: {(json as any).error}</p>
          ) : null}
          {!fetchError && (!base || base.fields.length === 0) ? (
            <p className="mt-1">
              The server did not return comparable fields for {canonicalSlugs.join(", ")}. Try
              adding a third tool or changing selection.
            </p>
          ) : null}
        </div>
      </main>
    );
  }

  const headerMeta = getHeaderMeta(base);

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
      <ClearCompareOnMount />

      <h1 className="mb-4 text-xl font-semibold">Compare tools</h1>
      <ComparePickerUrl />

      {ai ? (
        <section className="mb-8">
          <CompareAiSummary ai={ai} />
        </section>
      ) : null}

      <section aria-labelledby="facts-title" className="rounded-xl border bg-white p-4 shadow-sm">
        <h2 id="facts-title" className="mb-3 text-sm font-semibold text-gray-700">Facts</h2>
        <div className="overflow-x-auto relative">
          <table className="min-w-full table-fixed border-collapse">
            <thead>
              <tr className="border-b border-gray-300 sticky top-0 z-30 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60 shadow-sm">
                <th
                  className="sticky left-0 top-0 z-40 w-56 bg-transparent text-left text-base font-semibold text-gray-700 px-4 py-3"
                  scope="col"
                >
                  Field
                </th>
                {headerMeta.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3" scope="col" title={h.name}>
                    <Link href={h.href} className="group block">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-md ring-1 ${A.ring}`}>
                          {h.iconUrl ? (
                            // use <img> to avoid next/image domain config
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={h.iconUrl}
                              alt={`${h.name} logo`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className={`h-full w-full grid place-items-center text-xs font-semibold ${A.avatar}`}
                            >
                              {initials(h.name)}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div
                            className="text-base font-semibold text-gray-800 truncate group-hover:underline group-hover:underline-offset-2"
                            title={h.name}
                          >
                            {h.name}
                          </div>
                        </div>
                      </div>
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {base.fields.map((f, r) => {
                const label = getFieldLabel(f, r);
                const cols = base.names.length;
                return (
                  <tr
                    key={r}
                    className={`align-middle odd:bg-white ${A.even} ${A.hover} border-b border-gray-200 last:border-b-0`}
                  >
                    <td className="sticky left-0 z-20 w-56 bg-inherit px-4 py-3 text-base font-semibold text-gray-900 align-middle">
                      {label}
                    </td>
                    {Array.from({ length: cols }).map((_, c) => {
                      const v = (f.values && f.values[c]) ?? null;
                      return (
                        <td key={c} className="px-4 py-3 text-base text-gray-900 align-middle bg-inherit">
                          {renderCell(v)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
