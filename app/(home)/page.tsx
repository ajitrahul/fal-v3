// app/(home)/page.tsx
// Do NOT add "use client" here
export const runtime = "nodejs";
export const revalidate = 0;

import { readAllTools } from "@/lib/tools-data";
import HomeClient from "@/components/HomeClient"; // this one can be "use client"

export default async function HomePage() {
  const tools = await readAllTools();
  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6">
      <HomeClient initialTools={tools as any} />
    </main>
  );
}
