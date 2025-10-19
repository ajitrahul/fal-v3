// components/JsonLd.tsx
// Renders JSON-LD without changing page look.
export default function JsonLd({ data }: { data: any }) {
  return (
    <script
      type="application/ld+json"
      // Stringify without indentation to keep payload small
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
