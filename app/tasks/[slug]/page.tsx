// app/tasks/[slug]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import ToolCard from "@/components/ToolCard";
import AdSlot from "@/components/AdSlot";
import { DB } from "@/lib/data";
import { getSponsoredSet } from "@/lib/ads";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export default async function TaskPage({ params }: { params: { slug: string } }) {
  const tasks = Array.isArray(DB.tasks) ? DB.tasks : [];
  const task = tasks.find((t: string) => slugify(t) === params.slug);
  if (!task) notFound();

  const list = DB.tools.filter((tool) => (tool.tasks || []).includes(task));
  const sponsored = await getSponsoredSet();

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{task}</h1>
        <Link href="/tools" className="underline text-sm">Back to Explore</Link>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {list.length === 0 ? (
            <div className="rounded-lg border bg-white p-6 text-sm text-gray-700">No tools found.</div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {list.map((t) => (
                <ToolCard
                  key={t.id}
                  tool={t}
                  sponsored={sponsored.has(t.slug)}
                  ctx={`task_${params.slug}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Contextual sponsor with fallback */}
        <div className="space-y-4">
          <AdSlot placement={`task_${params.slug}`} fallback="category_sidebar" />
        </div>
      </div>
    </div>
  );
}
