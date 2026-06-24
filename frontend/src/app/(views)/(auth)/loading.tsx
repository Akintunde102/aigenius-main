/** Shown immediately on client navigation while login/signup chunks load. */
export default function AuthSegmentLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col justify-center bg-[#0b0e14] px-4 py-12">
      <div className="mx-auto w-full max-w-lg">
        <div className="animate-pulse space-y-6 rounded-2xl border border-zinc-800/80 bg-zinc-950 p-8 sm:p-10">
          <div className="space-y-3">
            <div className="mx-auto h-8 w-48 rounded-lg bg-zinc-800" />
            <div className="mx-auto h-4 w-64 max-w-full rounded bg-zinc-800/70" />
          </div>
          <div className="h-14 w-full rounded-xl bg-zinc-800/80" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-zinc-800/60" />
            <div className="h-3 w-11/12 rounded bg-zinc-800/60" />
          </div>
        </div>
      </div>
    </div>
  );
}
