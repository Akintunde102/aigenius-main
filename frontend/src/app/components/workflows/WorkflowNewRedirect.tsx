"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { beginNewWorkflowShell, resetWorkflowShellBootstrap } from "./workflowsApi";

/**
 * Creates an empty workflow on the server and navigates to `/workflow/:id`.
 * Used by `/workflows/new` (not a modal).
 */
export default function WorkflowNewRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navigationToken = useMemo(
    () => searchParams.get("fresh") ?? searchParams.get("t"),
    [searchParams],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const record = await beginNewWorkflowShell(navigationToken);
        if (cancelled) return;
        router.replace(`/workflow/${record.id}`);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Could not start a workflow.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, navigationToken]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4 text-center dark:bg-slate-950 dark:bg-none">
        <p className="max-w-md text-sm leading-relaxed text-slate-700 dark:text-slate-300">{error}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              resetWorkflowShellBootstrap();
              void beginNewWorkflowShell(navigationToken ?? String(Date.now()))
                .then((record) => router.replace(`/workflow/${record.id}`))
                .catch((e) =>
                  setError(e instanceof Error ? e.message : "Could not start a workflow."),
                );
            }}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Try again
          </button>
          <a
            href="/workflows"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Back to workflows
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4 dark:bg-slate-950 dark:bg-none">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400 dark:text-slate-500" aria-hidden />
      <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Creating your workflow…</p>
    </div>
  );
}
