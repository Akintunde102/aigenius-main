type WorkflowRouteLoadingProps = {
  message: string;
};

/** Server-safe loading shell for workflow dashboard route segments. */
export function WorkflowRouteLoading({ message }: WorkflowRouteLoadingProps) {
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "var(--workflow-shell-gradient)" }}
    >
      <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-[2px]">
        <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-800/90 bg-[#141416] px-3 py-2.5">
          <div className="flex h-8 animate-pulse items-center gap-3">
            <div className="h-4 w-16 rounded bg-slate-700/80" />
            <div className="h-4 w-28 rounded bg-slate-700/60" />
            <div className="ml-auto h-7 w-24 rounded-md bg-slate-700/70" />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"
            role="status"
            aria-label="Loading"
          />
          <p className="text-sm text-slate-600">{message}</p>
        </div>
      </div>
    </div>
  );
}
