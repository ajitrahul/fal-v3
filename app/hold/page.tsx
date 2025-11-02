// app/hold/page.tsx
export const metadata = {
  title: "Coming Soon • Find AI List",
  description:
    "We’re polishing the experience. ",
};

export default function ComingSoonPage() {
  return (
    <main className="min-h-[80vh] w-full flex items-center justify-center px-4 py-16 bg-white text-gray-900 dark:bg-zinc-900 dark:text-zinc-100">
      <div className="max-w-xl text-center space-y-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={process.env.NEXT_PUBLIC_LOGO_SRC || "/brand/findailist-logo.svg"}
          alt="Find AI List"
          className="mx-auto h-10 w-auto opacity-90"
        />
        <h1 className="text-3xl font-semibold tracking-tight">Coming Soon</h1>
        <p className="text-base leading-relaxed opacity-80">
          We’re putting the final touches on Find AI List.
        </p>
        <p className="text-xs opacity-60">
          The live page is currently undergoing some updates and improvements. Our team is actively working behind the scenes to resolve the remaining issues. As soon as the fixes are complete, the live version will be available again. We truly appreciate your patience and understanding in the meantime.
        </p>
      </div>
    </main>
  );
}
