export default function PublishedConversationDetailLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-zinc-800" />
        <div className="h-10 flex-1 rounded bg-zinc-800/80" />
      </div>
      <div className="mb-6 space-y-2">
        <div className="h-10 w-3/4 max-w-md rounded-lg bg-zinc-800" />
        <div className="h-4 w-48 rounded bg-zinc-800/70" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-zinc-700/60 bg-zinc-900/50 p-4">
            <div className="mb-2 h-4 w-24 rounded bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-zinc-800/80" />
              <div className="h-3 w-full rounded bg-zinc-800/80" />
              <div className="h-3 w-2/3 rounded bg-zinc-800/80" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
