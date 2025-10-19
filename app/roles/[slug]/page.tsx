// app/roles/[slug]/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import ToolCard from "@/components/ToolCard";
import { listRolesWithCounts, resolveEntityNameFromSlug, toolsByRoleName } from "@/lib/entities";
import { listPageMetadata, itemListJsonLd, breadcrumbsJsonLd } from "@/lib/seo";

export async function generateStaticParams() {
  return listRolesWithCounts().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const name = resolveEntityNameFromSlug(params.slug, "role");
  if (!name) return {};
  const title = `AI tools for ${name}`;
  const description = `A curated list of AI tools for ${name}. Compare features, pricing, and integrations.`;
  return listPageMetadata({ title, description, path: `/roles/${params.slug}` });
}

export default async function RolePage({ params }: { params: { slug: string } }) {
  const name = resolveEntityNameFromSlug(params.slug, "role");
  if (!name) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Role not found</h1>
        <p className="text-gray-600">
          Try the <Link href="/roles" className="underline">roles index</Link> or{" "}
          <Link href="/tools" className="underline">explore all tools</Link>.
        </p>
      </div>
    );
  }

  const tools = toolsByRoleName(name);

  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || "";
  const items = tools.slice(0, 100).map((t) => ({
    name: t.name,
    url: `${base}/tools/${t.slug}`,
  }));
  const listJson = itemListJsonLd({ title: `AI tools for ${name}`, items });
  const crumbs = breadcrumbsJsonLd([
    { name: "Home", url: `${base}/` },
    { name: "Roles", url: `${base}/roles` },
    { name, url: `${base}/roles/${params.slug}` },
  ]);

  return (
    <div className="space-y-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJson) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(crumbs) }} />

      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">AI tools for {name}</h1>
        <p className="text-gray-600">
          Discover tools that help <strong>{name.toLowerCase()}</strong> get more done.
        </p>
      </header>

      {tools.length === 0 ? (
        <div className="rounded-lg border p-6 bg-white">
          <div className="font-medium">No tools yet for this role.</div>
          <div className="text-sm text-gray-600 mt-1">
            Try <Link href="/tools" className="underline">Explore</Link> or{" "}
            <Link href="/submit" className="underline">submit a tool</Link>.
          </div>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tools.map((t) => <ToolCard key={t.id} tool={t} />)}
        </div>
      )}
    </div>
  );
}
