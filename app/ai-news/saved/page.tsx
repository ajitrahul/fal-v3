// app/ai-news/saved/page.tsx
export const runtime = "nodejs";
export const revalidate = 0;

import SavedNewsClient from "@/components/SavedNewsClient";

export default function SavedNewsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6">
      <header className="mb-4">
        <h1 className="text-xl font-semibold tracking-tight">Saved News</h1>
        <p className="text-sm text-gray-600 dark:text-zinc-400">
          Items you bookmarked on this device.
        </p>
      </header>
      <SavedNewsClient />
    </main>
  );
}
