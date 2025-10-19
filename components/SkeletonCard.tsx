// components/SkeletonCard.tsx
export default function SkeletonCard() {
  return (
    <div className="rounded-lg border bg-white p-3 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 animate-pulse rounded border bg-gray-100" />
        <div className="min-w-0 flex-1">
          <div className="h-3 w-40 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-gray-100" />
          <div className="mt-2 h-3 w-24 animate-pulse rounded bg-gray-100" />
        </div>
      </div>
    </div>
  );
}
