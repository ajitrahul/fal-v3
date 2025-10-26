// app/loading.tsx
export default function GlobalLoading() {
  return (
    <div className="fixed inset-x-0 top-0 z-50">
      {/* Top progress bar */}
      <div className="h-0.5 w-full overflow-hidden bg-transparent">
        <div className="h-0.5 w-full animate-[progress_1.2s_ease-in-out_infinite] bg-black dark:bg-white" />
      </div>

      {/* Small corner spinner (optional, subtle) */}
      <div className="pointer-events-none fixed right-3 top-3 rounded-full bg-white/70 p-2 shadow-sm dark:bg-zinc-900/70">
        <div className="h-3 w-3 animate-spin rounded-full border-2 border-black/30 border-r-transparent dark:border-white/40 dark:border-r-transparent" />
      </div>

      {/* Progress keyframes */}
      <style>{`
        @keyframes progress {
          0%   { transform: translateX(-100%); }
          50%  { transform: translateX(-30%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
