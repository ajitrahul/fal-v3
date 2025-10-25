// app/ai-news/loading.tsx
export default function LoadingAiNews() {
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8">
      <header className="mb-4">
        <div className="h-7 w-48 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
        <div className="mt-2 h-4 w-96 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
      </header>

      {/* Headlines skeleton */}
      <section className="mb-8 rounded-2xl border border-gray-200 p-4 dark:border-zinc-800">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-200 p-3 dark:border-zinc-800">
              <div className="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>

      {/* Category/Source columns skeleton */}
      {Array.from({ length: 3 }).map((_, s) => (
        <section key={s} className="mb-10">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-6 w-1.5 rounded bg-gray-300 dark:bg-zinc-700" />
            <div className="h-5 w-28 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 p-3 dark:border-zinc-800">
                {Array.from({ length: 6 }).map((__, j) => (
                  <div key={j} className="mb-2 h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-zinc-800" />
                ))}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
