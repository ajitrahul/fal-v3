"use client";

type Props = {
  selected: string[];
  onRemove: (slug: string) => void;
  className?: string;
};
export default function CompareSelectedChips({ selected, onRemove, className }: Props) {
  if (!selected.length) return null;
  return (
    <div className={["mt-3 flex flex-wrap gap-2", className].filter(Boolean).join(" ")}>
      {selected.map((slug) => (
        <span
          key={slug}
          className="inline-flex items-center gap-2 rounded-full border border-gray-300 bg-gray-50 px-2.5 py-1 text-xs"
        >
          {slug}
          <button
            type="button"
            onClick={() => onRemove(slug)}
            aria-label={`Remove ${slug} from compare`}
            className="rounded-full px-1 text-gray-500 hover:bg-gray-200"
          >
            ✕
          </button>
        </span>
      ))}
    </div>
  );
}
