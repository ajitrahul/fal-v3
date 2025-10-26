// components/SimilarToolCard.tsx
import Link from "next/link";
import Image from "next/image";

export default function SimilarToolCard({
  tool,
}: {
  tool: { slug: string; name: string; logo_url?: string; tagline?: string };
}) {
  const safeLogo =
    tool.logo_url && tool.logo_url.trim() !== ""
      ? tool.logo_url
      : `data:image/svg+xml;utf8,${encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
            <rect width="100%" height="100%" fill="#f3f4f6"/>
            <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="10" fill="#9ca3af">Logo</text>
          </svg>`
        )}`;

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="flex items-center gap-3 rounded-md border bg-white p-3 hover:bg-gray-50"
    >
      {/* No compare icon or wrapper here */}
      <Image
        src={safeLogo}
        alt={tool.name}
        width={40}
        height={40}
        className="rounded border bg-white object-contain"
      />
      <div className="min-w-0">
        <div className="truncate font-medium">{tool.name}</div>
        {tool.tagline ? <div className="truncate text-sm text-gray-600">{tool.tagline}</div> : null}
      </div>
    </Link>
  );
}
