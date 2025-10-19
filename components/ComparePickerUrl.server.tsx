// components/ComparePickerUrl.server.tsx
import ComparePickerUrl from "@/components/ComparePickerUrl.client";
import { DB } from "@/lib/data";

type ToolLite = { slug: string; name?: string | null; aliases?: string[] | null };

export default function ComparePickerUrlServer() {
  const tools = (DB.tools as any[]) ?? [];

  const aliasIndex: Record<string, string> = {};
  const all: ToolLite[] = tools.map((t) => {
    const canonical = String(t.slug);
    const aliasesRaw = []
      .concat(t.aliases ?? [])
      .concat(t.alt_slugs ?? [])
      .concat(t.short_slug ? [t.short_slug] : [])
      .concat(t.slug_short ? [t.slug_short] : [])
      .concat(t.short ? [t.short] : [])
      .concat(t.abbrev ? [t.abbrev] : []);

    const aliases = aliasesRaw
      .filter((v) => typeof v === "string")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    // index canonical + aliases → canonical
    aliasIndex[canonical.toLowerCase()] = canonical;
    for (const a of aliases) aliasIndex[a] = canonical;

    return {
      slug: canonical, // always canonical
      name: t.name ? String(t.name) : t.title ? String(t.title) : undefined,
      aliases: aliases.length ? aliases : undefined,
    };
  });

  return <ComparePickerUrl all={all} aliasIndex={aliasIndex} />;
}
