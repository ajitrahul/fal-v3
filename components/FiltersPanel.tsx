// components/FiltersPanel.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

type Option = { label: string; value: string };

const PRICING: Option[] = [
  { label: "Free", value: "free" },
  { label: "Freemium", value: "freemium" },
  { label: "Paid", value: "paid" },
  { label: "Open-source", value: "open-source" },
  { label: "Contact", value: "contact" },
];

const QUICK_TAGS: Option[] = [
  { label: "Open-source", value: "open_source" },
  { label: "No-signup", value: "no_signup" },
  { label: "API", value: "api" },
  { label: "Mobile app", value: "mobile" },
  { label: "On-device", value: "on_device" },
];

export default function FiltersPanel({
  categories,
  platforms,
  models,
  languages,
}: {
  categories: Option[];
  platforms: Option[];
  models: Option[];
  languages: Option[];
}) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedCategory = sp.get("category") || "";
  const selectedPricing = (sp.get("pricing") || "").split(",").filter(Boolean);
  const selectedTags = (sp.get("tags") || "").split(",").filter(Boolean);
  const selectedPlatforms = (sp.get("platforms") || "").split(",").filter(Boolean);
  const selectedModels = (sp.get("models") || "").split(",").filter(Boolean);
  const selectedLangs = (sp.get("languages") || "").split(",").filter(Boolean);
  const verified = sp.get("verified");
  const launchSince = sp.get("launch_since") || "";

  const setParam = (key: string, val?: string | string[]) => {
    const u = new URL(window.location.href);
    if (!val || (Array.isArray(val) && val.length === 0)) u.searchParams.delete(key);
    else if (Array.isArray(val)) u.searchParams.set(key, val.join(","));
    else u.searchParams.set(key, val);
    router.push(`${pathname}?${u.searchParams.toString()}`, { scroll: false });
  };

  const toggleMulti = (key: string, value: string, current: string[]) => {
    const set = new Set(current);
    if (set.has(value)) set.delete(value);
    else set.add(value);
    setParam(key, Array.from(set));
  };

  return (
    <aside className="md:sticky md:top-20 space-y-4">
      {/* Category */}
      <div className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">Category</div>
        <select
          className="w-full rounded-md border px-2 py-2 text-sm"
          value={selectedCategory}
          onChange={(e) => setParam("category", e.target.value || undefined)}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Pricing */}
      <div className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">Pricing</div>
        <div className="flex flex-wrap gap-2">
          {PRICING.map((p) => {
            const active = selectedPricing.includes(p.value);
            return (
              <button
                key={p.value}
                onClick={() => toggleMulti("pricing", p.value, selectedPricing)}
                className={`text-xs rounded px-2 py-1 border ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick tags */}
      <div className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">Quick tags</div>
        <div className="flex flex-wrap gap-2">
          {QUICK_TAGS.map((t) => {
            const active = selectedTags.includes(t.value);
            return (
              <button
                key={t.value}
                onClick={() => toggleMulti("tags", t.value, selectedTags)}
                className={`text-xs rounded px-2 py-1 border ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"}`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Platforms */}
      <div className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">Platforms</div>
        <div className="flex flex-wrap gap-2">
          {platforms.map((p) => {
            const active = selectedPlatforms.includes(p.value);
            return (
              <button
                key={p.value}
                onClick={() => toggleMulti("platforms", p.value, selectedPlatforms)}
                className={`text-xs rounded px-2 py-1 border ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Models */}
      <div className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">Models</div>
        <div className="flex flex-wrap gap-2">
          {models.map((m) => {
            const active = selectedModels.includes(m.value);
            return (
              <button
                key={m.value}
                onClick={() => toggleMulti("models", m.value, selectedModels)}
                className={`text-xs rounded px-2 py-1 border ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"}`}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Languages */}
      <div className="rounded-lg border p-3 bg-white">
        <div className="font-medium mb-2">Languages</div>
        <div className="flex flex-wrap gap-2">
          {languages.map((l) => {
            const active = selectedLangs.includes(l.value);
            return (
              <button
                key={l.value}
                onClick={() => toggleMulti("languages", l.value, selectedLangs)}
                className={`text-xs rounded px-2 py-1 border ${active ? "bg-gray-900 text-white border-gray-900" : "bg-white hover:bg-gray-50"}`}
              >
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Verified, Launch since */}
      <div className="rounded-lg border p-3 bg-white space-y-2">
        <div className="font-medium">More</div>
        <div className="flex items-center gap-2 text-sm">
          <input
            id="verified"
            type="checkbox"
            checked={verified === "true"}
            onChange={(e) => setParam("verified", e.target.checked ? "true" : undefined)}
          />
          <label htmlFor="verified">Verified only</label>
        </div>
        <div className="text-sm">
          <label className="block mb-1">Launched since</label>
          <input
            type="date"
            value={launchSince}
            onChange={(e) => setParam("launch_since", e.target.value || undefined)}
            className="w-full rounded-md border px-2 py-1"
          />
        </div>
        <button
          onClick={() => {
            const u = new URL(window.location.href);
            ["category","pricing","tags","platforms","models","languages","verified","launch_since"].forEach((k)=>u.searchParams.delete(k));
            // leave q & sort intact
            window.location.assign(`${u.pathname}?${u.searchParams.toString()}`);
          }}
          className="mt-2 text-xs text-gray-600 underline"
        >
          Clear filters
        </button>
      </div>
    </aside>
  );
}
