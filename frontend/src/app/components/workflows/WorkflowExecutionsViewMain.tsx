"use client";

import axios from "axios";
import { memo, useCallback, useEffect, useMemo, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  Clock3,
  History,
  Loader2,
  Play,
  Plug,
  Coins,
  RotateCw,
  SkipForward,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { refreshAccessToken } from "@/lib/api/auth-client";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { Button } from "@/app/components/ui/button";
import IntegrationsModal from "@/app/components/ChatHistorySidebar/IntegrationsModal";
import WalletModal from "@/app/components/ChatHistorySidebar/WalletModal";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import { useWalletSocket } from "@/lib/hooks/useWalletSocket";
import { useWalletTopUpReturn } from "@/lib/hooks/useWalletTopUpReturn";
import { themeForWorkflowCategory } from "./workflow-studio.theme";
import {
  categorizeTool,
  formatWorkflowBilledUsd,
  formatWorkflowWalletBalance,
  formatWorkflowToolOutputForDisplay,
  friendlyToolName,
  summarizeWorkflowStepArgsForDisplay,
  workflowStepRunStatusLabel,
} from "./workflowsUtils";
import {
  fetchWorkflow,
  fetchWorkflowRun,
  fetchWorkflowRuns,
  deleteWorkflowRun,
  deleteWorkflowRuns,
  WorkflowsApiError,
  type WorkflowRecord,
  type WorkflowRunDetailResponse,
  type WorkflowRunListItem,
} from "./workflowsApi";
import {
  getConnectorGeometry,
  getTailAppendConnectorGeometry,
} from "./workflowsCanvasGeometry";
import {
  WorkflowValuesPanel,
  workflowCanvasSurfaceStyle,
  workflowShellBgStyle,
} from "./workflow-info";
import type { WorkflowStepDraft } from "./workflowsUtils";
import {
  HistoryTimelinePanel,
  WorkflowSnapshotCanvas,
  formatDateTime,
  formatTriggerLabel,
  isAuthProblem,
  isTerminalWorkflowRun,
  statusTone,
} from "./WorkflowExecutionsViewPanels";


export function WorkflowExecutionsViewMain() {
  useTokenHandler();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const workflowId = typeof params?.id === "string" ? params.id : "";
  const requestedRunId = searchParams.get("runId");

  const updateUrlWithRunId = useCallback((runId?: string | null) => {
    const next = runId
      ? `/workflow/${workflowId}/executions?runId=${encodeURIComponent(runId)}`
      : `/workflow/${workflowId}/executions`;
    router.replace(next, { scroll: false });
  }, [router, workflowId]);

  const [workflow, setWorkflow] = useState<WorkflowRecord | null>(null);
  const [runs, setRuns] = useState<WorkflowRunListItem[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<WorkflowRunDetailResponse | null>(null);
  const [selectedRunIds, setSelectedRunIds] = useState<string[]>([]);
  const [scheduleFilter, setScheduleFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<"idle" | "deleting">("idle");
  const [deleteMode, setDeleteMode] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletCredits, setWalletCredits] = useState<number | null>(null);
  const [walletCreditsLoading, setWalletCreditsLoading] = useState(false);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  useWalletTopUpReturn(setShowWalletModal, 'sidebar');
  const [timelineMinimized, setTimelineMinimized] = useState(true);

  const requestedRunIdRef = useRef<string | null>(requestedRunId);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    requestedRunIdRef.current = requestedRunId;
  }, [requestedRunId]);

  const loadRunDetail = useCallback(async (runId: string, options?: { signal?: AbortSignal; silent?: boolean }) => {
    const { signal, silent } = options || {};
    try {
      const detail = await fetchWorkflowRun(workflowId, runId, signal);
      startTransition(() => {
        setSelectedRun(detail);
        setSelectedRunId(runId);
      });
    } catch (error) {
      if (axios.isCancel(error)) return;
      if (isAuthProblem(error)) {
        try {
          await refreshAccessToken();
          const detail = await fetchWorkflowRun(workflowId, runId, signal);
          startTransition(() => {
            setSelectedRun(detail);
            setSelectedRunId(runId);
          });
        } catch (retryError) {
          if (axios.isCancel(retryError)) return;
          if (!silent) {
            toast.error(retryError instanceof Error ? retryError.message : "Could not load execution details.");
          }
        }
      } else if (!silent) {
        toast.error(error instanceof Error ? error.message : "Could not load execution details.");
      }
    } finally {
      setDetailLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (!requestedRunId || requestedRunId === selectedRunId) return;

    // Cancel previous fetch if user clicked something else
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    void loadRunDetail(requestedRunId, { signal: controller.signal });

    return () => {
      controller.abort();
    };
  }, [loadRunDetail, requestedRunId, selectedRunId, runs]);

  const syncRuns = useCallback(async (runItems: WorkflowRunListItem[], options?: { refreshSelectedDetail?: boolean }) => {
    setRuns(runItems);
    setSelectedRunIds((current) => current.filter((runId) => runItems.some((run) => run.id === runId)));

    const requestedId = requestedRunIdRef.current;
    const requestedExists = Boolean(requestedId && runItems.some((run) => run.id === requestedId));
    const selectedExists = Boolean(selectedRunId && runItems.some((run) => run.id === selectedRunId));
    const nextRunId = requestedExists ? requestedId! : selectedExists ? selectedRunId! : runItems[0]?.id ?? null;

    if (!nextRunId) {
      setSelectedRun(null);
      setSelectedRunId(null);
      if (requestedId) {
        updateUrlWithRunId(null);
      }
      return;
    }

    if (nextRunId !== selectedRunId) {
      // background syncs use silent: true but loadRunDetail expects signal as 2nd arg
      await loadRunDetail(nextRunId, { silent: true });
      if (requestedId !== nextRunId) {
        updateUrlWithRunId(nextRunId);
      }
      return;
    }

    if (options?.refreshSelectedDetail) {
      await loadRunDetail(nextRunId, { silent: true });
    }
  }, [loadRunDetail, selectedRunId, workflowId]);

  const loadPage = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [workflowRecord, runItems] = await Promise.all([
        fetchWorkflow(workflowId),
        fetchWorkflowRuns(workflowId),
      ]);
      setWorkflow(workflowRecord);
      await syncRuns(runItems, { refreshSelectedDetail: true });
    } catch (error) {
      if (isAuthProblem(error)) {
        await refreshAccessToken();
        const [workflowRecord, runItems] = await Promise.all([
          fetchWorkflow(workflowId),
          fetchWorkflowRuns(workflowId),
        ]);
        setWorkflow(workflowRecord);
        await syncRuns(runItems, { refreshSelectedDetail: true });
      } else {
        setLoadError(error instanceof Error ? error.message : "Could not load execution history.");
      }
    } finally {
      setLoading(false);
    }
  }, [syncRuns, workflowId]);

  const refreshRunHistoryBoard = useCallback(async (options?: { notifyError?: boolean; refreshSelectedDetail?: boolean }) => {
    try {
      const runItems = await fetchWorkflowRuns(workflowId);
      await syncRuns(runItems, { refreshSelectedDetail: options?.refreshSelectedDetail });
    } catch (error) {
      if (isAuthProblem(error)) {
        await refreshAccessToken();
        const runItems = await fetchWorkflowRuns(workflowId);
        await syncRuns(runItems, { refreshSelectedDetail: options?.refreshSelectedDetail });
      } else if (options?.notifyError) {
        toast.error(error instanceof Error ? error.message : "Could not refresh execution history.");
      }
    }
  }, [syncRuns, workflowId]);

  useEffect(() => {
    if (!workflowId) return;
    void loadPage();
  }, [loadPage, workflowId]);

  useEffect(() => {
    if (!requestedRunId || requestedRunId === selectedRunId) return;
    if (!runs.some((run) => run.id === requestedRunId)) return;
    void loadRunDetail(requestedRunId, { silent: true });
  }, [loadRunDetail, requestedRunId, runs, selectedRunId]);

  const selectedRunListItem = useMemo(
    () => runs.find((run) => run.id === selectedRunId) ?? null,
    [runs, selectedRunId],
  );

  const scheduleNameById = useMemo(
    () =>
      new Map(
        (workflow?.schedules ?? []).map((schedule) => [
          schedule.id,
          schedule.name?.trim() || "Untitled schedule",
        ]),
      ),
    [workflow?.schedules],
  );

  const visibleRuns = useMemo(() => {
    if (scheduleFilter === "all") {
      return runs;
    }
    if (scheduleFilter === "unscheduled") {
      return runs.filter((run) => !run.triggeringScheduleId);
    }
    return runs.filter((run) => run.triggeringScheduleId === scheduleFilter);
  }, [runs, scheduleFilter]);

  const creditsHoverTitle = useMemo(() => {
    if (walletCreditsLoading) return "Loading credits…";
    if (walletCredits === null) return "Click to open wallet and add credits";
    const formatted = walletCredits.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `Available credits: ${formatted}. Click to add credits.`;
  }, [walletCredits, walletCreditsLoading]);

  const refreshWalletCredits = useCallback(async () => {
    try {
      const userDetails = await getUserDetails(true);
      const w = userDetails?.config?.wallet;
      const n = typeof w === "number" ? w : Number(w);
      setWalletCredits(Number.isFinite(n) ? n : null);
    } catch {
      /* keep existing balance */
    }
  }, []);

  useWalletSocket({
    onWalletUpdated: (payload) => setWalletCredits(payload.newBalance),
  });

  useEffect(() => {
    let cancelled = false;
    setWalletCreditsLoading(true);
    void (async () => {
      try {
        const userDetails = await getUserDetails(false);
        if (cancelled) return;
        const w = userDetails?.config?.wallet;
        const n = typeof w === "number" ? w : Number(w);
        setWalletCredits(Number.isFinite(n) ? n : null);
      } catch {
        if (!cancelled) setWalletCredits(null);
      } finally {
        if (!cancelled) setWalletCreditsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!workflowId) return;
    const handle = setInterval(() => {
      void refreshRunHistoryBoard({
        refreshSelectedDetail: selectedRun ? !isTerminalWorkflowRun(selectedRun.run.status) : false,
      });
    }, 10000);
    return () => clearInterval(handle);
  }, [refreshRunHistoryBoard, selectedRun, workflowId]);

  const toggleRunSelection = useCallback((runId: string) => {
    setSelectedRunIds((current) =>
      current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId],
    );
  }, []);

  const handleDeleteRuns = useCallback(async (runIds: string[]) => {
    const normalizedRunIds = Array.from(new Set(runIds.filter(Boolean)));
    if (!workflowId || normalizedRunIds.length === 0 || deleteState === "deleting") {
      return;
    }

    setDeleteState("deleting");
    try {
      if (normalizedRunIds.length === 1) {
        await deleteWorkflowRun(workflowId, normalizedRunIds[0]);
      } else {
        await deleteWorkflowRuns(workflowId, normalizedRunIds);
      }

      const nextRuns = await fetchWorkflowRuns(workflowId);
      setRuns(nextRuns);
      setSelectedRunIds((current) => current.filter((id) => !normalizedRunIds.includes(id)));

      if (selectedRunId && normalizedRunIds.includes(selectedRunId)) {
        const nextSelected = nextRuns[0]?.id ?? null;
        if (nextSelected) {
          await loadRunDetail(nextSelected);
          updateUrlWithRunId(nextSelected);
        } else {
          setSelectedRunId(null);
          setSelectedRun(null);
          updateUrlWithRunId(null);
        }
      }

      toast.success(normalizedRunIds.length === 1 ? "Execution deleted." : `${normalizedRunIds.length} executions deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete those executions.");
    } finally {
      setDeleteState("idle");
    }
  }, [deleteState, loadRunDetail, selectedRunId, workflowId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={workflowShellBgStyle()}>
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center" style={workflowShellBgStyle()}>
        <p className="max-w-md text-sm text-slate-700">{loadError}</p>
        <Button type="button" variant="outline" onClick={() => void loadPage()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <>
      {/* h-screen + overflow-hidden locks the layout to the viewport — prevents
        the header from jumping and sidebars from extending past the screen. */}
      <div className="flex h-screen flex-col overflow-hidden" style={workflowShellBgStyle()}>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white/80 backdrop-blur-[2px]">
          <div className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-200/90 bg-white/95 text-slate-800 shadow-sm backdrop-blur-md dark:border-slate-800/90 dark:bg-[#141416] dark:text-slate-200 dark:shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
            <div className="flex h-9 min-h-9 flex-nowrap items-center gap-x-1.5 px-2.5 sm:h-10 sm:min-h-10 sm:gap-x-2 sm:px-3">
              <Link
                href="/"
                className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-100"
              >
                <ArrowLeft className="h-3 w-3" aria-hidden />
                Back
              </Link>
              <span className="select-none text-slate-400 dark:text-slate-600" aria-hidden>
                ›
              </span>
              <Link
                href="/workflows"
                className="shrink-0 text-[11px] font-normal text-slate-500 transition hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
              >
                Workflows
              </Link>
              <span className="select-none text-slate-400 dark:text-slate-600" aria-hidden>
                ›
              </span>
              <Link
                href={`/workflow/${workflowId}`}
                className="shrink-0 text-[11px] font-normal text-slate-500 transition hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
              >
                {workflow?.name || "Workflow"}
              </Link>
              <span className="select-none text-slate-400 dark:text-slate-600" aria-hidden>
                ›
              </span>
              <span className="truncate text-[12px] font-medium text-slate-900 dark:text-slate-100">History</span>
              <button
                type="button"
                className="inline-flex h-6 items-center gap-1 rounded bg-slate-200 px-1.5 text-[10px] font-medium text-teal-800 dark:bg-white/15 dark:text-sky-300"
                aria-pressed
                title="Viewing workflow history"
              >
                <History className="h-3.5 w-3.5" aria-hidden />
                History
              </button>
              <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-0.5 sm:gap-2">
                <span className="hidden rounded border border-slate-200/90 bg-slate-100/80 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-400 sm:inline-flex">
                  Read only
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 rounded-md border-slate-200/90 bg-slate-100/80 px-2 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white sm:px-2.5"
                  onClick={() => setIntegrationsOpen(true)}
                  title="Manage integrations"
                >
                  <Plug className="h-3 w-3 sm:mr-1" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:inline">Integrations</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 rounded-md border-slate-200/90 bg-slate-100/80 px-2 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white sm:px-2.5"
                  onClick={() => {
                    setShowWalletModal(true);
                    void refreshWalletCredits();
                  }}
                  title={creditsHoverTitle}
                >
                  <Coins className="h-3 w-3 sm:mr-1" aria-hidden />
                  <span className="sr-only sm:not-sr-only sm:inline">Credits</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled
                  className="h-7 rounded-md border-slate-200/90 bg-slate-100/80 px-2.5 text-[11px] font-medium text-slate-400 opacity-100 dark:border-slate-700/80 dark:bg-slate-900/60 dark:text-slate-400"
                  title="Execution history is not playable"
                >
                  <Play className="mr-1 h-3 w-3" aria-hidden />
                  Play
                </Button>
                <Link
                  href={`/workflow/${workflowId}`}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-slate-200/90 bg-slate-100/80 px-2.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
                >
                  Open live canvas
                </Link>
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <section className="relative min-w-0 flex-1 overflow-hidden">
              {/* Timeline overlay — outside the scroll area so it's never clipped */}
              {selectedRun && !detailLoading ? (
                <div className="pointer-events-none absolute inset-0 z-20">
                  <div className="pointer-events-auto absolute left-3 top-3">
                    <HistoryTimelinePanel
                      detail={selectedRun}
                      runListItem={selectedRunListItem}
                      minimized={timelineMinimized}
                      onToggleMinimized={() => setTimelineMinimized((c) => !c)}
                    />
                  </div>
                </div>
              ) : null}
              {detailLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
                </div>
              ) : selectedRun ? (
                <div className="workflow-scroll-light relative h-full w-full overflow-auto">
                  <div className="relative min-h-full min-w-full">
                    <div
                      className="absolute left-0 top-0"
                      style={{
                        ...workflowCanvasSurfaceStyle(),
                        width: "100%",
                        height: "100%",
                        minWidth: 1200,
                        minHeight: 900,
                      }}
                    />
                    <WorkflowSnapshotCanvas
                      detail={selectedRun}
                      runListItem={selectedRunListItem}
                    />
                  </div>
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center px-4 py-12 sm:px-6">
                  <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/85 px-8 py-12 text-center shadow-lg backdrop-blur-[2px] dark:border-slate-800/90 dark:bg-[#18191c]/90 dark:text-slate-200">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
                      <History className="h-7 w-7 text-slate-500 dark:text-slate-400" aria-hidden />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Select an execution</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      Pick a historical run to inspect the exact canvas snapshot and step outputs.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Aside: fixed width, full height of the content area, internally scrollable */}
            <aside className="flex w-[22rem] shrink-0 flex-col overflow-hidden border-l border-slate-200/90 bg-slate-50/90 text-slate-800 dark:border-slate-800/90 dark:bg-[#141416] dark:text-slate-200">
              <div className="border-b border-slate-200/80 px-3 py-3 dark:border-slate-700/80">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">Execution history</p>
                    <p className="mt-1 text-[12px] font-medium text-slate-800 dark:text-slate-100">
                      {visibleRuns.length} run{visibleRuns.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 rounded-md border-slate-200/80 bg-white px-0 text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700"
                    onClick={() => void refreshRunHistoryBoard({ notifyError: true, refreshSelectedDetail: true })}
                    title="Refresh runs"
                  >
                    <RotateCw className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    className={`inline-flex h-7 w-7 items-center justify-center rounded-md border transition ${deleteMode
                        ? "border-rose-700/70 bg-rose-950/25 text-rose-100"
                        : "border-slate-200/80 bg-white text-slate-700 shadow-sm hover:bg-slate-100 dark:border-slate-600/80 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700"
                      }`}
                    onClick={() => {
                      setDeleteMode((current) => !current);
                      setSelectedRunIds([]);
                    }}
                    title={deleteMode ? "Exit delete mode" : "Choose executions to delete"}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                    <span className="sr-only">{deleteMode ? "Exit delete mode" : "Enter delete mode"}</span>
                  </button>
                  {deleteMode ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={selectedRunIds.length === 0 || deleteState === "deleting"}
                      className="h-7 rounded-md border-rose-700/70 bg-rose-950/20 px-2 text-[11px] text-rose-100 hover:bg-rose-900/40 disabled:opacity-50"
                      onClick={() => void handleDeleteRuns(selectedRunIds)}
                    >
                      {deleteState === "deleting" ? (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="mr-1 h-3 w-3" aria-hidden />
                      )}
                      Delete selected
                    </Button>
                  ) : null}
                </div>
              </div>

              {/* Scrollable run list — flex-1 min-h-0 ensures it shrinks to available space */}
              <div className="workflow-scroll min-h-0 flex-1 overflow-y-auto">
                <div className="border-b border-slate-200/80 p-3 dark:border-slate-700/80">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScheduleFilter("all")}
                      className={`rounded border px-2 py-1 text-[10px] font-medium transition ${scheduleFilter === "all"
                          ? "border-teal-600/60 bg-teal-50 text-teal-900 font-semibold dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200"
                          : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/30 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                      All runs
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleFilter("unscheduled")}
                      className={`rounded border px-2 py-1 text-[10px] font-medium transition ${scheduleFilter === "unscheduled"
                          ? "border-teal-600/60 bg-teal-50 text-teal-900 font-semibold dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200"
                          : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/30 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                        }`}
                    >
                      Manual / API
                    </button>
                    {(workflow?.schedules ?? []).map((schedule) => (
                      <button
                        key={schedule.id}
                        type="button"
                        onClick={() => setScheduleFilter(schedule.id)}
                        className={`max-w-[10rem] truncate rounded border px-2 py-1 text-[10px] font-medium transition ${scheduleFilter === schedule.id
                            ? "border-teal-600/60 bg-teal-50 text-teal-900 font-semibold dark:border-sky-500/50 dark:bg-sky-500/10 dark:text-sky-200"
                            : "border-slate-200/80 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-slate-700/80 dark:bg-slate-950/30 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-slate-200"
                          }`}
                        title={schedule.name}
                      >
                        {schedule.name}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {visibleRuns.length === 0 ? (
                      <div className="rounded border border-slate-200/80 bg-white p-3 text-[11px] text-slate-500 dark:border-slate-700/80 dark:bg-slate-900/45 dark:text-slate-400">
                        No executions match this filter.
                      </div>
                    ) : (
                      visibleRuns.map((run) => (
                        <div
                          key={run.id}
                          className={`block w-full rounded border px-2.5 py-2 text-left transition ${selectedRunId === run.id
                              ? "border-teal-500/60 bg-teal-50/80 shadow-sm dark:border-sky-500/60 dark:bg-sky-500/10"
                              : "border-slate-200/90 bg-white shadow-sm hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-700/80 dark:bg-slate-950/30 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
                            }`}
                        >
                          <div className="flex items-start gap-2">
                            {deleteMode && isTerminalWorkflowRun(run.status) ? (
                              <input
                                type="checkbox"
                                checked={selectedRunIds.includes(run.id)}
                                onChange={() => toggleRunSelection(run.id)}
                                className="mt-1 shrink-0"
                                aria-label={`Select execution ${run.id}`}
                              />
                            ) : (
                              <span className="mt-1 inline-block h-4 w-4 shrink-0" aria-hidden />
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                updateUrlWithRunId(run.id);
                              }}
                              className="min-w-0 flex-1 text-left"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium text-slate-800 dark:text-slate-100">{workflowStepRunStatusLabel(run.status as never)}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{formatDateTime(run.createdAt)}</p>
                              <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-slate-500">
                                {run.failureSummary ?? "Completed without a recorded failure."}
                              </p>
                              <div className="mt-2 flex items-end justify-between gap-2">
                                <span className="max-w-[10rem] truncate rounded border border-slate-200 bg-slate-100/80 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-slate-600 dark:border-slate-700/70 dark:bg-slate-900/45 dark:text-slate-400">
                                  {run.triggeringScheduleId
                                    ? run.triggeringScheduleName ?? scheduleNameById.get(run.triggeringScheduleId) ?? "Scheduled"
                                    : "Manual"}
                                </span>
                                <span className="text-[8px] uppercase tracking-[0.18em] text-slate-500">
                                  {formatTriggerLabel(run.triggerType)}
                                </span>
                              </div>
                            </button>
                            {deleteMode && isTerminalWorkflowRun(run.status) ? (
                              <button
                                type="button"
                                onClick={() => void handleDeleteRuns([run.id])}
                                disabled={deleteState === "deleting"}
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

              </div>
            </aside>
          </div>
        </div>
      </div>
      {integrationsOpen ? (
        <IntegrationsModal onClose={() => setIntegrationsOpen(false)} />
      ) : null}
      {showWalletModal ? (
        <WalletModal
          showWalletModal={showWalletModal}
          setShowWalletModal={setShowWalletModal}
          onWalletUpdate={refreshWalletCredits}
          paymentModalLoading={paymentModalLoading}
          setPaymentModalLoading={setPaymentModalLoading}
        />
      ) : null}
    </>
  );
}

