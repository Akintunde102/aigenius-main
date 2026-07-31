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
      <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-[2px] dark:bg-slate-950/80">
        <header className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-200/90 bg-white/95 px-3 py-2.5 backdrop-blur-md dark:border-slate-800/90 dark:bg-[#141416]">
          <div className="flex h-8 animate-pulse items-center gap-3">
            <div className="h-4 w-16 rounded bg-slate-200 dark:bg-slate-700/80" />
            <div className="h-4 w-28 rounded bg-slate-200 dark:bg-slate-700/60" />
            <div className="ml-auto h-7 w-24 rounded-md bg-slate-200 dark:bg-slate-700/70" />
          </div>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600 dark:border-slate-700 dark:border-t-slate-300"
            role="status"
            aria-label="Loading"
          />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
        </div>
      </div>
    </div>
  );
}
