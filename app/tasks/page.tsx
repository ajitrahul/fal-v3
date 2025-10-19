// app/tasks/page.tsx
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // SSR only
export const prerender = false;         // do NOT prerender at build time
export const revalidate = 0;

export default async function TasksPage() {
  // Render a simple, safe page that doesn’t assume any data.
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold">Tasks</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        This page is server-rendered and currently disabled for prerendering.
      </p>
    </main>
  );
}
