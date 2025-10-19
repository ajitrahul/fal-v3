"use client";
// components/Stars.tsx
import React from "react";

type StarsProps = {
  rating?: number | null;   // 0..5
  votes?: number | null;    // review count
  size?: number;            // px size per star (default 14)
  showCount?: boolean;      // show "(123 reviews)"
  className?: string;
};

export default function Stars({
  rating,
  votes,
  size = 14,
  showCount = true,
  className = "",
}: StarsProps) {
  const val = typeof rating === "number" && !Number.isNaN(rating) ? Math.max(0, Math.min(5, rating)) : null;
  if (val == null) return null;

  const full = Math.floor(val);
  const hasHalf = val - full >= 0.5;

  const Star = ({ filled = false, half = false }: { filled?: boolean; half?: boolean }) => (
    <span aria-hidden="true" className="inline-block" style={{ width: size, height: size, lineHeight: 0 }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="block">
        {/* empty */}
        <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.239l-7.19-.617L12 2 9.19 8.622 2 9.239l5.46 4.73L5.82 21z" fill="#e5e7eb" />
        {/* full */}
        {filled && (
          <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.239l-7.19-.617L12 2 9.19 8.622 2 9.239l5.46 4.73L5.82 21z" fill="#fbbf24" />
        )}
        {/* half */}
        {half && (
          <>
            <defs>
              <clipPath id="half">
                <rect x="0" y="0" width="12" height="24" />
              </clipPath>
            </defs>
            <path
              d="M12 17.27 18.18 21l-1.64-7.03L22 9.239l-7.19-.617L12 2 9.19 8.622 2 9.239l5.46 4.73L5.82 21z"
              fill="#fbbf24"
              clipPath="url(#half)"
            />
          </>
        )}
      </svg>
    </span>
  );

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="flex items-center">
        {[0, 1, 2, 3, 4].map((i) => {
          if (i < full) return <Star key={i} filled />;
          if (i === full && hasHalf) return <Star key={i} half />;
          return <Star key={i} />;
        })}
      </div>
      <div className="text-xs text-gray-600">
        {val.toFixed(1)}
        {showCount && typeof votes === "number" && votes > 0 ? (
          <span className="ml-1 text-gray-500">({votes} reviews)</span>
        ) : null}
      </div>
    </div>
  );
}
