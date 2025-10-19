// components/Logo.tsx
import Image from "next/image";

type Props = {
  src?: string | null;
  alt?: string;
  size?: number;            // square size in px
  className?: string;       // extra classes for the wrapper
  imgClassName?: string;    // extra classes for the img when present
};

/**
 * Safe logo renderer:
 * - Renders <Image> only if src is a non-empty string.
 * - Otherwise shows a simple letter fallback (first letter of alt).
 * - Avoids Next/Image errors for empty/undefined src.
 */
export default function Logo({
  src,
  alt = "",
  size = 40,
  className = "",
  imgClassName = "",
}: Props) {
  const validSrc = typeof src === "string" && src.trim().length > 0;

  if (validSrc) {
    return (
      <Image
        src={src as string}
        alt={alt || "logo"}
        width={size}
        height={size}
        className={imgClassName}
      />
    );
  }

  const letter =
    typeof alt === "string" && alt.trim().length > 0
      ? alt.trim().charAt(0).toUpperCase()
      : "?";

  return (
    <div
      aria-label={alt || "logo"}
      className={[
        "flex items-center justify-center rounded border bg-gray-100 text-gray-600",
        className,
      ].join(" ")}
      style={{ width: size, height: size, fontSize: Math.max(12, Math.floor(size * 0.45)) }}
    >
      {letter}
    </div>
  );
}
