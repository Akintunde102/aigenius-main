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

function isAuthProblem(error: unknown) {
  if (error instanceof WorkflowsApiError && error.statusCode === 401) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("authentication required") || message.includes("authorization error");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatTriggerLabel(triggerType?: string) {
  if (!triggerType) return "Manual";
  return triggerType.charAt(0).toUpperCase() + triggerType.slice(1);
}

// Note: replaceRunIdInUrl function was removed in favor of direct router.replace calls
// inside the component to ensure Next.js state synchronization.

function statusTone(status?: string) {
  if (status === "completed") return "text-emerald-700 bg-emerald-50 border-emerald-200";
  if (status === "failed") return "text-rose-700 bg-rose-50 border-rose-200";
  if (status === "running") return "text-sky-700 bg-sky-50 border-sky-200";
  return "text-slate-700 bg-slate-50 border-slate-200";
}

function isTerminalWorkflowRun(status?: string) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

function StatusGlyph({ status }: { status?: string }) {
  if (status === "completed") {
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />;
  }
  if (status === "failed") {
    return <AlertCircle className="h-3.5 w-3.5 text-rose-600" aria-hidden />;
  }
  if (status === "running") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" aria-hidden />;
  }
  if (status === "skipped") {
    return <SkipForward className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
  }
  return <CircleDashed className="h-3.5 w-3.5 text-slate-400" aria-hidden />;
}

const HistoryHookConnector = memo(function HistoryHookConnector({ orientation }: { orientation: "horizontal" | "vertical" }) {
  const isHorizontal = orientation === "horizontal";
  return (
    <div className={`flex items-center justify-center ${isHorizontal ? "h-4 w-12" : "h-12 w-4"}`}>
      <div className={`rounded-full bg-slate-300 shadow-sm ${isHorizontal ? "h-1.5 w-1.5" : "h-1.5 w-1.5"}`} />
      <div className={`absolute bg-slate-200/50 ${isHorizontal ? "h-[1px] w-full" : "h-full w-[1px]"}`} />
    </div>
  );
});

const HistorySnapshotStepCard = memo(function HistorySnapshotStepCard({
  step,
  stepIndex,
  stepCount,
  runStep,
  resolveStepLabel,
}: {
  step: WorkflowStepDraft;
  stepIndex: number;
  stepCount: number;
  runStep: WorkflowRunDetailResponse["steps"][number] | undefined;
  resolveStepLabel: (stepId: string) => string | undefined;
}) {
  const category = categorizeTool(step.toolName);
  const theme = themeForWorkflowCategory(category);
  const displayTitle =
    typeof step.label === "string" && step.label.trim() ? step.label : friendlyToolName(step.toolName);
  const summaryLines = summarizeWorkflowStepArgsForDisplay(step.args ?? {}, undefined, resolveStepLabel);
  const output = runStep?.error?.trim()
    ? formatWorkflowToolOutputForDisplay(runStep.error)
    : runStep?.result?.trim()
      ? formatWorkflowToolOutputForDisplay(String(runStep.result))
      : "";
  const billedUsd = formatWorkflowBilledUsd(
    typeof runStep?.billedUsd === "number" ? runStep.billedUsd : null,
  );
  const walletAfter = formatWorkflowWalletBalance(
    typeof runStep?.walletAfter === "number" ? runStep.walletAfter : null,
  );

  return (
    <div className="w-full max-w-[20rem]">
      <div className="my-0 w-full overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_10px_32px_-14px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.04]">
        <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/95 px-2.5 py-2 sm:px-3">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md text-[10px] font-semibold ${theme.tileIconBg} ${theme.tileIconText}`}
          >
            {stepIndex + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--app-ink-800)]">{displayTitle}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500">{category}</p>
          </div>
          <span
            className="shrink-0 tabular-nums text-[10px] text-slate-500"
            title={`Step ${stepIndex + 1} of ${stepCount}`}
          >
            {stepIndex + 1}/{stepCount}
          </span>
          <span
            className="flex shrink-0 items-center justify-center"
            title={workflowStepRunStatusLabel((runStep?.status as never) ?? "pending")}
          >
            <StatusGlyph status={runStep?.status ?? "pending"} />
          </span>
        </div>

        <WorkflowValuesPanel>
          <ul className="divide-y divide-slate-200/70 text-[11px] leading-snug">
            {summaryLines.map((line, index) => (
              <li
                key={`${line.label}-${index}`}
                className="flex flex-col gap-1 py-2.5 first:pt-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="shrink-0 font-medium text-teal-950/70">{line.label}</span>
                <span className="min-w-0 tabular-nums text-slate-800 [overflow-wrap:anywhere] sm:text-right">
                  {line.value}
                </span>
              </li>
            ))}
          </ul>
        </WorkflowValuesPanel>

        {billedUsd || walletAfter ? (
          <div className="border-t border-slate-200/70 bg-slate-50/85 px-2.5 py-2">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
              {billedUsd ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium">
                  Cost {billedUsd}
                </span>
              ) : null}
              {walletAfter ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium">
                  Wallet {walletAfter}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {output ? (
          <div className="border-t border-slate-200/70">
            {runStep?.error ? (
              <div className="bg-rose-50/90 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-800">Error</p>
                <pre className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-rose-950 [overflow-wrap:anywhere]">
                  {output}
                </pre>
              </div>
            ) : (
              <div className="bg-white/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Output</p>
                <pre className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-slate-700 [overflow-wrap:anywhere]">
                  {output}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
});

function HistoryTimelinePanel({
  detail,
  runListItem,
  minimized,
  onToggleMinimized,
}: {
  detail: WorkflowRunDetailResponse;
  runListItem: WorkflowRunListItem | null;
  minimized: boolean;
  onToggleMinimized: () => void;
}) {
  if (minimized) {
    return (
      <div className="rounded-xl border border-slate-800/90 bg-[#141416]/95 p-1 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.4)] backdrop-blur-sm">
        <button
          type="button"
          onClick={onToggleMinimized}
          className="rounded-lg px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:bg-white/10 hover:text-white"
        >
          Show Steps timeline
        </button>
      </div>
    );
  }

  return (
    <div className="w-[20rem] rounded-xl border border-slate-800/90 bg-[#141416]/95 p-3 text-slate-200 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.4)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">Steps timeline</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusTone(detail.run.status)}`}>
              {workflowStepRunStatusLabel(detail.run.status as never)}
            </span>
            <span className="text-[10px] uppercase tracking-wide text-slate-500">
              {formatTriggerLabel(detail.run.triggerType)}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-slate-400">{formatDateTime(runListItem?.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onToggleMinimized}
          className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
          aria-label="Minimize steps timeline"
        >
          Minimize
        </button>
      </div>

      {detail.failureSummary ? (
        <p className="mt-3 rounded-lg border border-slate-700/80 bg-slate-950/30 px-2.5 py-2 text-[10px] leading-relaxed text-slate-300">
          {detail.failureSummary}
        </p>
      ) : null}

      <div className="workflow-scroll mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {detail.steps.map((step) => (
          <div key={`${step.stepId}-${step.stepIndex}`} className="rounded border border-slate-700/80 bg-slate-950/30 px-2.5 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-100">{step.stepId}</p>
                <p className="truncate text-[10px] text-slate-500">{friendlyToolName(step.toolName)}</p>
              </div>
              <span className="shrink-0">
                <StatusGlyph status={step.status} />
              </span>
            </div>
            {typeof step.billedUsd === "number" || typeof step.walletAfter === "number" ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
                {typeof step.billedUsd === "number" ? (
                  <span className="rounded border border-slate-700/80 bg-slate-900/70 px-1.5 py-0.5">
                    Cost {formatWorkflowBilledUsd(step.billedUsd)}
                  </span>
                ) : null}
                {typeof step.walletAfter === "number" ? (
                  <span className="rounded border border-slate-700/80 bg-slate-900/70 px-1.5 py-0.5">
                    Wallet {formatWorkflowWalletBalance(step.walletAfter)}
                  </span>
                ) : null}
              </div>
            ) : null}
            {step.error ? (
              <p className="mt-2 text-[10px] leading-relaxed text-rose-300">{step.error}</p>
            ) : step.result ? (
              <pre className="workflow-scroll mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-900/80 p-2 text-[10px] leading-relaxed text-slate-300">
                {formatWorkflowToolOutputForDisplay(String(step.result))}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const WorkflowSnapshotCanvas = memo(function WorkflowSnapshotCanvas({
  detail,
  runListItem,
}: {
  detail: WorkflowRunDetailResponse;
  runListItem: WorkflowRunListItem | null;
}) {
  const snapshot = detail.run.workflowSnapshot;
  const steps = snapshot && Array.isArray(snapshot.steps) ? snapshot.steps : [];
  const canvasSteps = useMemo<WorkflowStepDraft[]>(
    () =>
      steps.map((step) => ({
        localId: step.stepId,
        stepId: step.stepId,
        toolName: step.toolName,
        args: step.args ?? {},
        label: typeof step.label === "string" ? step.label : "",
        canvasX: Number(step.canvasX ?? 0),
        canvasY: Number(step.canvasY ?? 0),
      })),
    [steps],
  );

  const bounds = useMemo(() => {
    if (canvasSteps.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = 0;
    let maxY = 0;
    for (const step of canvasSteps) {
      const x = Number(step.canvasX ?? 0);
      const y = Number(step.canvasY ?? 0);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 320);
      maxY = Math.max(maxY, y + 260);
    }
    return { minX, minY, width: maxX - minX + 160, height: maxY - minY + 160 };
  }, [canvasSteps]);

  const tailAppendGeometry = useMemo(
    () => getTailAppendConnectorGeometry(canvasSteps, false),
    [canvasSteps],
  );

  const stepMap = useMemo(
    () => new Map(detail.steps.map((step) => [step.stepId, step])),
    [detail.steps],
  );

  const stepLabelMap = useMemo(
    () =>
      new Map(
        steps.map((step) => [
          step.stepId,
          typeof step.label === "string" && step.label.trim() ? step.label : friendlyToolName(step.toolName),
        ]),
      ),
    [steps],
  );

  const resolveStepLabel = useCallback(
    (stepId: string) => stepLabelMap.get(stepId),
    [stepLabelMap],
  );

  if (!bounds || steps.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-4 py-12 sm:px-6">
        <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/85 px-8 py-12 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)] backdrop-blur-[2px]">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
            <History className="h-7 w-7 text-slate-500" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900">No historical canvas snapshot</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            This run was recorded before visual workflow snapshots were stored.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Read-only badge — does NOT block pointer events on the canvas */}
      <div className="pointer-events-none absolute right-3 top-3 z-10">
        <div className="rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.18)] backdrop-blur-sm">
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-slate-400"
            title="History is read-only"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Play
          </button>
        </div>
      </div>

      <div
        className="absolute left-0 top-0"
        style={{
          width: bounds.width,
          height: bounds.height,
        }}
      >
        <svg
          className="pointer-events-none absolute left-0 top-0 z-[0]"
          width={bounds.width}
          height={bounds.height}
          aria-hidden
        >
          {canvasSteps.map((step, index) => {
            const nextStep = canvasSteps[index + 1];
            if (!nextStep) return null;
            const { pathD } = getConnectorGeometry(step, nextStep, false, index, index + 1);
            return (
              <path
                key={`edge-${step.localId}-${nextStep.localId}`}
                d={pathD}
                transform={`translate(${48 - bounds.minX}, ${56 - bounds.minY})`}
                fill="none"
                stroke="rgba(58, 71, 87, 0.38)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })}
          {tailAppendGeometry ? (
            <path
              d={tailAppendGeometry.pathD}
              transform={`translate(${48 - bounds.minX}, ${56 - bounds.minY})`}
              fill="none"
              stroke="rgba(58, 71, 87, 0.28)"
              strokeWidth={2}
              strokeDasharray="6 5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
        </svg>
        {canvasSteps.map((step, index) => {
          const runStep = stepMap.get(step.stepId);
          const left = Number(step.canvasX ?? 0) - bounds.minX + 48;
          const top = Number(step.canvasY ?? 0) - bounds.minY + 56;
          return (
            <div key={step.stepId} className="absolute" style={{ left, top, width: 320 }}>
              <HistorySnapshotStepCard
                step={step}
                stepIndex={index}
                stepCount={steps.length}
                runStep={runStep}
                resolveStepLabel={resolveStepLabel}
              />
            </div>
          );
        })}
        {canvasSteps.map((step, index) => {
          const nextStep = canvasSteps[index + 1];
          if (!nextStep) return null;
          const { hookLeft, hookTop } = getConnectorGeometry(step, nextStep, false, index, index + 1);
          return (
            <div
              key={`hook-${step.localId}-${nextStep.localId}`}
              className="pointer-events-none absolute z-[30]"
              style={{
                left: hookLeft - bounds.minX + 48,
                top: hookTop - bounds.minY + 56,
              }}
            >
              <HistoryHookConnector orientation="horizontal" />
            </div>
          );
        })}
        {tailAppendGeometry ? (
          <div
            className="pointer-events-none absolute z-[30]"
            style={{
              left: tailAppendGeometry.hookLeft - bounds.minX + 48,
              top: tailAppendGeometry.hookTop - bounds.minY + 56,
            }}
          >
            <HistoryHookConnector orientation="horizontal" />
          </div>
        ) : null}
      </div>
    </>
  );
});

export default function WorkflowExecutionsView() {
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

  useWalletSocket({ onWalletUpdated: setWalletCredits });

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
          <div className="sticky top-0 z-30 w-full shrink-0 border-b border-slate-800/90 bg-[#141416] text-slate-200 shadow-[0_1px_0_0_rgba(0,0,0,0.4)]">
            <div className="flex h-9 min-h-9 flex-nowrap items-center gap-x-1.5 px-2.5 sm:h-10 sm:min-h-10 sm:gap-x-2 sm:px-3">
              <Link
                href="/"
                className="inline-flex shrink-0 items-center gap-0.5 rounded px-1 py-0.5 text-[11px] font-medium text-slate-400 transition hover:bg-white/10 hover:text-slate-100"
              >
                <ArrowLeft className="h-3 w-3" aria-hidden />
                Back
              </Link>
              <span className="select-none text-slate-600" aria-hidden>
                ›
              </span>
              <Link
                href="/workflows"
                className="shrink-0 text-[11px] font-normal text-slate-400 transition hover:text-slate-100 hover:underline"
              >
                Workflows
              </Link>
              <span className="select-none text-slate-600" aria-hidden>
                ›
              </span>
              <Link
                href={`/workflow/${workflowId}`}
                className="shrink-0 text-[11px] font-normal text-slate-400 transition hover:text-slate-100 hover:underline"
              >
                {workflow?.name || "Workflow"}
              </Link>
              <span className="select-none text-slate-600" aria-hidden>
                ›
              </span>
              <span className="truncate text-[12px] font-medium text-slate-100">History</span>
              <button
                type="button"
                className="inline-flex h-6 items-center gap-1 rounded bg-white/15 px-1.5 text-[10px] font-medium text-sky-300"
                aria-pressed
                title="Viewing workflow history"
              >
                <History className="h-3.5 w-3.5" aria-hidden />
                History
              </button>
              <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-0.5 sm:gap-2">
                <span className="hidden rounded border border-slate-700/80 bg-slate-900/60 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400 sm:inline-flex">
                  Read only
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 shrink-0 rounded-md border-slate-600/90 bg-slate-800/90 px-2 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white sm:px-2.5"
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
                  className="h-7 shrink-0 rounded-md border-slate-600/90 bg-slate-800/90 px-2 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white sm:px-2.5"
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
                  className="h-7 rounded-md border-slate-700/80 bg-slate-900/60 px-2.5 text-[11px] font-medium text-slate-400 opacity-100"
                  title="Execution history is not playable"
                >
                  <Play className="mr-1 h-3 w-3" aria-hidden />
                  Play
                </Button>
                <Link
                  href={`/workflow/${workflowId}`}
                  className="inline-flex h-7 items-center justify-center rounded-md border border-slate-600/90 bg-slate-800/90 px-2.5 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white"
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
                  <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/85 px-8 py-12 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)] backdrop-blur-[2px]">
                    <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
                      <History className="h-7 w-7 text-slate-500" aria-hidden />
                    </div>
                    <h2 className="text-lg font-semibold tracking-tight text-slate-900">Select an execution</h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">
                      Pick a historical run to inspect the exact canvas snapshot and step outputs.
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Aside: fixed width, full height of the content area, internally scrollable */}
            <aside className="flex w-[22rem] shrink-0 flex-col overflow-hidden border-l border-slate-800/90 bg-[#141416] text-slate-200">
              <div className="border-b border-slate-700/80 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-500">Execution history</p>
                    <p className="mt-1 text-[12px] font-medium text-slate-100">
                      {visibleRuns.length} run{visibleRuns.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 rounded-md border-slate-600/80 bg-slate-800/90 px-0 text-slate-100"
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
                        : "border-slate-600/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700"
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
                <div className="border-b border-slate-700/80 p-3">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setScheduleFilter("all")}
                      className={`rounded border px-2 py-1 text-[10px] font-medium transition ${scheduleFilter === "all"
                          ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                          : "border-slate-700/80 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                        }`}
                    >
                      All runs
                    </button>
                    <button
                      type="button"
                      onClick={() => setScheduleFilter("unscheduled")}
                      className={`rounded border px-2 py-1 text-[10px] font-medium transition ${scheduleFilter === "unscheduled"
                          ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                          : "border-slate-700/80 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
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
                            ? "border-sky-500/50 bg-sky-500/10 text-sky-200"
                            : "border-slate-700/80 bg-slate-950/30 text-slate-400 hover:border-slate-600 hover:text-slate-200"
                          }`}
                        title={schedule.name}
                      >
                        {schedule.name}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-2">
                    {visibleRuns.length === 0 ? (
                      <div className="rounded border border-slate-700/80 bg-slate-900/45 p-3 text-[11px] text-slate-400">
                        No executions match this filter.
                      </div>
                    ) : (
                      visibleRuns.map((run) => (
                        <div
                          key={run.id}
                          className={`block w-full rounded border px-2.5 py-2 text-left transition ${selectedRunId === run.id
                              ? "border-sky-500/60 bg-sky-500/10"
                              : "border-slate-700/80 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/60"
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
                                <span className="text-[11px] font-medium text-slate-100">{workflowStepRunStatusLabel(run.status as never)}</span>
                              </div>
                              <p className="mt-1 text-[10px] text-slate-400">{formatDateTime(run.createdAt)}</p>
                              <p className="mt-1 line-clamp-3 text-[10px] leading-relaxed text-slate-500">
                                {run.failureSummary ?? "Completed without a recorded failure."}
                              </p>
                              <div className="mt-2 flex items-end justify-between gap-2">
                                <span className="max-w-[10rem] truncate rounded border border-slate-700/70 bg-slate-900/45 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-slate-400">
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
