import { useRouter } from "next/navigation";
import { Loader2, RotateCw, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { type WorkflowDraft } from "./workflowsUtils";
import { type WorkflowRunListItem } from "./workflowsApi";
import { formatDateTime, isTerminalWorkflowRun } from "./workflowsStudio.utils";

export type WorkflowsStudioHistoryPanelProps = {
  historyOpen: boolean;
  headerPanelMaxHeight: string;
  draft: WorkflowDraft;
  runHistory: WorkflowRunListItem[];
  historyLoading: boolean;
  historyError: string | null;
  historySelectedRunId: string | null;
  historyDeleteMode: boolean;
  historyDeleteState: "idle" | "deleting";
  selectedHistoryCount: number;
  historySelection: string[];
  refreshRunHistory: (workflowId: string) => void | Promise<void>;
  setHistoryDeleteMode: React.Dispatch<React.SetStateAction<boolean>>;
  setHistorySelection: React.Dispatch<React.SetStateAction<string[]>>;
  handleDeleteHistoryRuns: (runIds: string[]) => void | Promise<void>;
  toggleHistorySelection: (runId: string) => void;
  handleLoadHistoryRun: (runId: string) => void | Promise<void>;
};

export function WorkflowsStudioHistoryPanel({
  historyOpen,
  headerPanelMaxHeight,
  draft,
  runHistory,
  historyLoading,
  historyError,
  historySelectedRunId,
  historyDeleteMode,
  historyDeleteState,
  selectedHistoryCount,
  historySelection,
  refreshRunHistory,
  setHistoryDeleteMode,
  setHistorySelection,
  handleDeleteHistoryRuns,
  toggleHistorySelection,
  handleLoadHistoryRun,
}: WorkflowsStudioHistoryPanelProps) {
  const router = useRouter();

  if (!historyOpen) return null;

  return (
    <div
      id="workflow-history-panel"
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200/90 bg-white p-3 shadow-md dark:border-slate-700/80 dark:bg-slate-900/45"
      style={{ maxHeight: headerPanelMaxHeight }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Recent runs</p>
          <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">Inspect previous runs and their historical canvas state.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {draft.workflowId ? (
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200/90 bg-white text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700"
              onClick={() => {
                if (draft.workflowId) {
                  void refreshRunHistory(draft.workflowId);
                }
              }}
              title="Refresh history"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">Refresh history</span>
            </button>
          ) : null}
          <button
            type="button"
            className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${historyDeleteMode
                ? "border-rose-700/70 bg-rose-950/25 text-rose-100"
                : "border-slate-200/90 bg-white text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700"
              }`}
            onClick={() => {
              setHistoryDeleteMode((current) => !current);
              setHistorySelection([]);
            }}
            title={historyDeleteMode ? "Exit delete mode" : "Choose executions to delete"}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
            <span className="sr-only">{historyDeleteMode ? "Exit delete mode" : "Enter delete mode"}</span>
          </button>
          {historyDeleteMode ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={selectedHistoryCount === 0 || historyDeleteState === "deleting"}
              className="h-7 rounded-md border-rose-700/70 bg-rose-950/20 px-2 text-[11px] text-rose-100 hover:bg-rose-900/40 disabled:opacity-50"
              onClick={() => void handleDeleteHistoryRuns(historySelection)}
            >
              {historyDeleteState === "deleting" ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
              ) : (
                <Trash2 className="mr-1 h-3 w-3" aria-hidden />
              )}
              Delete selected
            </Button>
          ) : null}
        </div>
      </div>

      <div className="workflow-scroll mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {historyLoading ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Loading history…</p>
        ) : historyError ? (
          <p className="text-[11px] text-rose-600 dark:text-rose-300">{historyError}</p>
        ) : runHistory.length === 0 ? (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">No runs yet.</p>
        ) : (
          runHistory.map((run) => (
            <div
              key={run.id}
              className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${historySelectedRunId === run.id
                  ? "border-teal-500/60 bg-teal-50/80 shadow-sm dark:border-cyan-500/60 dark:bg-cyan-500/10"
                  : "border-slate-200/90 bg-white text-slate-800 shadow-sm hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-950/30 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
                }`}
            >
              <div className="flex items-start gap-2">
                {historyDeleteMode && isTerminalWorkflowRun(run.status) ? (
                  <input
                    type="checkbox"
                    checked={historySelection.includes(run.id)}
                    onChange={() => toggleHistorySelection(run.id)}
                    className="mt-1 shrink-0"
                    aria-label={`Select run ${run.id}`}
                  />
                ) : (
                  <span className="mt-1 inline-block h-4 w-4 shrink-0" aria-hidden />
                )}
                <button
                  type="button"
                  onClick={() => void handleLoadHistoryRun(run.id)}
                  onDoubleClick={() => {
                    if (draft.workflowId) {
                      router.push(`/workflow/${draft.workflowId}/executions?runId=${encodeURIComponent(run.id)}`);
                    }
                  }}
                  className="min-w-0 flex-1 text-left"
                  title="Click to inspect here. Double-click to open full history."
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-800 dark:text-slate-100">{run.status}</span>
                  </div>
                  <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Created {formatDateTime(run.createdAt)}</p>
                  <div className="mt-2 flex items-end justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/45 dark:text-slate-400">
                        {run.triggeringScheduleId ? (run.triggeringScheduleName ?? "Scheduled") : "Manual"}
                      </span>
                      {run.scheduledAt ? (
                        <span className="text-[9px] text-slate-500">For {formatDateTime(run.scheduledAt)}</span>
                      ) : null}
                    </div>
                    <span className="text-[8px] uppercase tracking-[0.18em] text-slate-500">{run.triggerType}</span>
                  </div>
                </button>
                {historyDeleteMode && isTerminalWorkflowRun(run.status) ? (
                  <button
                    type="button"
                    onClick={() => void handleDeleteHistoryRuns([run.id])}
                    disabled={historyDeleteState === "deleting"}
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-rose-700/60 bg-rose-950/20 text-rose-100 transition hover:bg-rose-900/40 disabled:opacity-50"
                    title="Delete execution"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
