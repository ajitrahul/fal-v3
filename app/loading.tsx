// app/loading.tsx
import SkeletonCard from "@/components/SkeletonCard";

export default function Loading() {
  return (
    <div className="space-y-8">
      {/* Hero skeleton */}
      <section className="text-center space-y-3">
        <div className="mx-auto h-6 w-48 animate-pulse rounded bg-gray-100" />
        <div className="mx-auto h-4 w-72 animate-pulse rounded bg-gray-100" />
        <div className="mx-auto h-9 w-[640px] max-w-[90%] animate-pulse rounded bg-gray-100" />
      </section>

      {/* Grid skeletons */}
      <section className="space-y-3">
        <div className="mx-auto h-5 w-40 animate-pulse rounded bg-gray-100" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    </div>
  );
}
