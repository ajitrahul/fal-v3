// app/category/[slug]/page.tsx
import { redirect } from "next/navigation";

export default async function LegacyCategoryRedirect({
  params,
}: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/categories/${encodeURIComponent(slug)}`);
}
