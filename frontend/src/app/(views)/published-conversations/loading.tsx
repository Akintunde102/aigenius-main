export default function PublishedConversationsLoading() {
  return (
    <div className="relative w-full animate-pulse pb-12 text-[14px]">
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-8 w-64 rounded-lg bg-zinc-800" />
              <div className="h-5 w-96 max-w-full rounded bg-zinc-800/80" />
            </div>
          </div>
          <div className="h-12 max-w-lg rounded-xl bg-zinc-800/80" />
        </div>
      </div>
      <div className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-zinc-700/80 bg-zinc-900/70 p-6"
              >
                <div className="mb-3 h-7 w-4/5 rounded bg-zinc-800" />
                <div className="mb-4 h-4 w-full rounded bg-zinc-800/70" />
                <div className="mb-4 h-4 w-4/5 rounded bg-zinc-800/60" />
                <div className="mb-5 space-y-2 rounded-xl border border-zinc-700/50 bg-zinc-800/40 p-4">
                  <div className="h-3 w-full rounded bg-zinc-800/80" />
                  <div className="h-3 w-11/12 rounded bg-zinc-800/80" />
                  <div className="h-3 w-3/4 rounded bg-zinc-800/80" />
                </div>
                <div className="flex gap-2">
                  <div className="h-4 w-24 rounded bg-zinc-800/70" />
                  <div className="h-4 w-20 rounded bg-zinc-800/70" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
