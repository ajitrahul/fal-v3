// app/roles/page.tsx
// Disable prerender to avoid build-time crashes while we finish the data layer.
export const runtime = "nodejs";
export const prerender = false;        // don't render at build
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function RolesPage() {
  // Keep this minimal for now. Add your real UI once the data source is stable.
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Roles</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-zinc-400">
        This page is server-rendered at request time. Prerendering is disabled to
        prevent build errors while the data source is being finalized.
      </p>
    </main>
  );
}
