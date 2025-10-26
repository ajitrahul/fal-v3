// components/CompareAiSummary.tsx
import React from "react";

type CompareAI = {
  overview?: string;
  key_differences?: string[];
  strengths?: Record<string, string[]>;
  best_for?: Array<{ audience: string; pick: string; why: string }>;
  considerations?: string[];
  data_used?: string[];
  // confidence?: string; // intentionally ignored
};

export default function CompareAiSummary({
  ai,
  title = "Comparison Summary", // <- renamed from "AI Summary"
  className = "",
}: {
  ai: CompareAI | undefined;
  title?: string;
  className?: string;
}) {
  if (
    !ai ||
    (!ai.overview && !ai.key_differences?.length && !ai.best_for?.length && !ai.considerations?.length)
  ) {
    return null;
  }

  return (
    <section className={`rounded-lg border bg-white p-4 shadow-sm ${className}`}>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>

      <div className="mt-2 text-sm text-gray-800">
        {ai.overview && <p className="mb-2">{ai.overview}</p>}

        {Array.isArray(ai.key_differences) && ai.key_differences.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-900">Key differences</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {ai.key_differences.map((k, i) => (
                <li key={i}>{k}</li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(ai.best_for) && ai.best_for.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-900">Best for</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {ai.best_for.map((b, i) => (
                <li key={i}>
                  <span className="font-medium">{b.audience}:</span> {b.pick}
                  {b.why ? ` — ${b.why}` : ""}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Array.isArray(ai.considerations) && ai.considerations.length > 0 && (
          <div className="mt-3">
            <h3 className="text-sm font-medium text-gray-900">Considerations</h3>
            <ul className="mt-1 list-disc pl-5 space-y-1">
              {ai.considerations.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* NOTE: intentionally NOT rendering model or confidence */}
    </section>
  );
}
