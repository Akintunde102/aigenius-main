"use client";

import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from "react";
import toast from "react-hot-toast";
import {
  cancelWorkflowRun,
  deleteWorkflowRun,
  deleteWorkflowRuns,
  executeWorkflow,
  fetchWorkflowRun,
  streamWorkflowRunEvents,
  WorkflowsApiError,
  type WorkflowRunListItem,
} from "./workflowsApi";
import {
  normalizeWorkflowStepExecutionInfo,
  sanitizeWorkflowErrorMessage,
  tryInvokeCodeFromToolResultJson,
  validateWorkflowDraft,
  type WorkflowDraft,
  type WorkflowStepExecutionInfo,
} from "./workflowsUtils";
import { isAbortError, loadWorkflowHistory } from "./workflowsStudio.utils";

type PlayState = "idle" | "running";
type CancelState = "idle" | "cancelling";

export function useWorkflowsStudioRun({
  draft,
  routeWorkflowId,
  persistDraft,
  currentWorkflowIdRef,
}: {
  draft: WorkflowDraft;
  routeWorkflowId: string | undefined;
  persistDraft: (mode: "auto" | "manual") => Promise<import("./workflowsApi").WorkflowRecord | null>;
  currentWorkflowIdRef: MutableRefObject<string | undefined>;
}) {
  const [playState, setPlayState] = useState<PlayState>("idle");
  const [activeManualRunId, setActiveManualRunId] = useState<string | null>(null);
  const [cancelState, setCancelState] = useState<CancelState>("idle");
  const [stepExecutionByStepId, setStepExecutionByStepId] = useState<Record<string, WorkflowStepExecutionInfo>>({});
  const [runHistory, setRunHistory] = useState<WorkflowRunListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySelectedRunId, setHistorySelectedRunId] = useState<string | null>(null);
  const [historySelection, setHistorySelection] = useState<string[]>([]);
  const [historyDeleteState, setHistoryDeleteState] = useState<"idle" | "deleting">("idle");
  const [historyDeleteMode, setHistoryDeleteMode] = useState(false);

  const runMonitorRef = useRef<AbortController | null>(null);

  const applyRunDetailToCanvas = useCallback((detail: Awaited<ReturnType<typeof fetchWorkflowRun>>) => {
    const initial: Record<string, WorkflowStepExecutionInfo> = {};
    for (const row of detail.steps) {
      initial[row.stepId] = normalizeWorkflowStepExecutionInfo({
        status: row.status,
        result: row.result ?? null,
        error: row.error ?? null,
        invokeCode: tryInvokeCodeFromToolResultJson(row.result) ?? null,
        billedUsd: row.billedUsd ?? null,
        walletAfter: row.walletAfter ?? null,
      });
    }
    setStepExecutionByStepId(initial);
    setHistorySelectedRunId(detail.run.id);
  }, []);

  const refreshRunHistory = useCallback(async (workflowId: string) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const rows = await loadWorkflowHistory(workflowId);
      setRunHistory(rows);
      setHistorySelection((current) => current.filter((runId) => rows.some((run) => run.id === runId)));
    } catch (error) {
      setHistoryError(error instanceof Error ? error.message : "Could not load workflow history.");
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const resetRunStateForRoute = useCallback(() => {
    setRunHistory([]);
    setHistorySelectedRunId(null);
    setHistorySelection([]);
    setStepExecutionByStepId({});
    runMonitorRef.current?.abort();
    runMonitorRef.current = null;
  }, []);

  useEffect(() => {
    setStepExecutionByStepId({});
    runMonitorRef.current?.abort();
    runMonitorRef.current = null;
  }, [routeWorkflowId]);

  useEffect(() => {
    return () => {
      runMonitorRef.current?.abort();
    };
  }, []);

  const handlePlay = useCallback(async () => {
    if (playState === "running") return;
    const readiness = validateWorkflowDraft(draft);
    if (!readiness.isValid) {
      toast.error(readiness.issues[0] ?? "Complete the workflow first.");
      return;
    }
    setPlayState("running");
    let monitor: AbortController | null = null;
    try {
      const saved = await persistDraft("manual");
      if (!saved) {
        return;
      }
      const result = await executeWorkflow(saved.id);
      toast.success(`Run started (${result.status})`);
      setActiveManualRunId(result.runId);
      setCancelState("idle");
      setStepExecutionByStepId({});
      runMonitorRef.current?.abort();
      monitor = new AbortController();
      runMonitorRef.current = monitor;

      try {
        const detail = await fetchWorkflowRun(saved.id, result.runId);
        applyRunDetailToCanvas(detail);
      } catch {
        /* Stream may still deliver updates if hydration fails. */
      }

      void refreshRunHistory(saved.id);

      try {
        await streamWorkflowRunEvents(
          saved.id,
          result.runId,
          (ev) => {
            setStepExecutionByStepId((prev) => {
              if (!ev.stepId) {
                return prev;
              }
              const next = { ...prev };
              if (ev.type === "step_started") {
                next[ev.stepId] = {
                  status: "running",
                  result: null,
                  error: null,
                  invokeCode: null,
                  billedUsd: null,
                  walletAfter: null,
                };
              } else if (ev.type === "step_completed") {
                next[ev.stepId] = normalizeWorkflowStepExecutionInfo({
                  status: "completed",
                  result: ev.result ?? null,
                  error: null,
                  invokeCode: ev.invokeCode ?? tryInvokeCodeFromToolResultJson(ev.result) ?? null,
                  billedUsd: ev.billedUsd ?? null,
                  walletAfter: ev.walletAfter ?? null,
                });
              } else if (ev.type === "step_failed") {
                next[ev.stepId] = {
                  status: "failed",
                  result: null,
                  error: sanitizeWorkflowErrorMessage(ev.error) ?? "Step failed",
                  invokeCode: ev.invokeCode ?? null,
                  billedUsd: ev.billedUsd ?? null,
                  walletAfter: ev.walletAfter ?? null,
                };
              }
              return next;
            });
            if (ev.type === "run_failed" && ev.error) {
              toast.error(sanitizeWorkflowErrorMessage(ev.error));
            }
            if (ev.type === "run_cancelled") {
              toast.success("Run stopped.");
            }
          },
          { signal: monitor.signal },
        );
      } catch (streamErr) {
        if (!isAbortError(streamErr)) {
          const message =
            streamErr instanceof WorkflowsApiError
              ? streamErr.message
              : streamErr instanceof Error
                ? streamErr.message
                : "Run progress stream ended unexpectedly.";
          toast.error(sanitizeWorkflowErrorMessage(message));
        }
      }
      void refreshRunHistory(saved.id);
    } catch (e) {
      toast.error(sanitizeWorkflowErrorMessage(e instanceof Error ? e.message : "Could not start the run."));
    } finally {
      if (monitor != null && runMonitorRef.current === monitor) {
        runMonitorRef.current = null;
      }
      setActiveManualRunId(null);
      setCancelState("idle");
      setPlayState("idle");
    }
  }, [draft, playState, persistDraft, applyRunDetailToCanvas, refreshRunHistory]);

  const handleStopRun = useCallback(async () => {
    const workflowId = currentWorkflowIdRef.current ?? draft.workflowId;
    if (!workflowId || !activeManualRunId || cancelState === "cancelling") {
      return;
    }
    setCancelState("cancelling");
    try {
      await cancelWorkflowRun(workflowId, activeManualRunId);
    } catch (error) {
      setCancelState("idle");
      toast.error(error instanceof Error ? error.message : "Could not stop the run.");
    }
  }, [activeManualRunId, cancelState, currentWorkflowIdRef, draft.workflowId]);

  const handleLoadHistoryRun = useCallback(
    async (runId: string) => {
      const workflowId = currentWorkflowIdRef.current;
      if (!workflowId) {
        return;
      }
      try {
        const detail = await fetchWorkflowRun(workflowId, runId);
        applyRunDetailToCanvas(detail);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load that run.");
      }
    },
    [applyRunDetailToCanvas, currentWorkflowIdRef],
  );

  const toggleHistorySelection = useCallback((runId: string) => {
    setHistorySelection((current) =>
      current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId],
    );
  }, []);

  const handleDeleteHistoryRuns = useCallback(
    async (runIds: string[]) => {
      const workflowId = currentWorkflowIdRef.current ?? draft.workflowId;
      const normalizedRunIds = Array.from(new Set(runIds.filter(Boolean)));
      if (!workflowId || normalizedRunIds.length === 0 || historyDeleteState === "deleting") {
        return;
      }

      setHistoryDeleteState("deleting");
      try {
        if (normalizedRunIds.length === 1) {
          await deleteWorkflowRun(workflowId, normalizedRunIds[0]);
        } else {
          await deleteWorkflowRuns(workflowId, normalizedRunIds);
        }

        const nextHistory = await loadWorkflowHistory(workflowId);
        setRunHistory(nextHistory);
        setHistorySelection((current) => current.filter((id) => !normalizedRunIds.includes(id)));

        if (historySelectedRunId && normalizedRunIds.includes(historySelectedRunId)) {
          setHistorySelectedRunId(null);
          setStepExecutionByStepId({});
        }

        toast.success(
          normalizedRunIds.length === 1 ? "Execution deleted." : `${normalizedRunIds.length} executions deleted.`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not delete those executions.");
      } finally {
        setHistoryDeleteState("idle");
      }
    },
    [draft.workflowId, historyDeleteState, historySelectedRunId, currentWorkflowIdRef],
  );

  return {
    playState,
    activeManualRunId,
    cancelState,
    stepExecutionByStepId,
    setStepExecutionByStepId,
    runHistory,
    setRunHistory,
    historyLoading,
    historyError,
    historySelectedRunId,
    setHistorySelectedRunId,
    historySelection,
    setHistorySelection,
    historyDeleteState,
    historyDeleteMode,
    setHistoryDeleteMode,
    applyRunDetailToCanvas,
    refreshRunHistory,
    resetRunStateForRoute,
    handlePlay,
    handleStopRun,
    handleLoadHistoryRun,
    toggleHistorySelection,
    handleDeleteHistoryRuns,
    runMonitorRef,
  };
}
