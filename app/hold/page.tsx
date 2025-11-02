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
          We’re putting the final touches on Find AI List. You can access the latest build at our
          preview site while we prepare the main site for launch.
        </p>
        <div className="pt-2">
          <a
            href="https://preview.findailist.com"
            className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium
                       bg-black text-white hover:bg-gray-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200
                       focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black dark:focus:ring-white
                       dark:focus:ring-offset-zinc-900"
          >
            Go to Preview
          </a>
        </div>
        <p className="text-xs opacity-60">
          If you expected production here, it’s temporarily on hold. Thanks for your patience!
        </p>
      </div>
    </main>
  );
}
