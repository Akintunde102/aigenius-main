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

export function isAuthProblem(error: unknown) {
  if (error instanceof WorkflowsApiError && error.statusCode === 401) {
    return true;
  }
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("authentication required") || message.includes("authorization error");
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function formatTriggerLabel(triggerType?: string) {
  if (!triggerType) return "Manual";
  return triggerType.charAt(0).toUpperCase() + triggerType.slice(1);
}

// Note: replaceRunIdInUrl function was removed in favor of direct router.replace calls
// inside the component to ensure Next.js state synchronization.

export function statusTone(status?: string) {
  if (status === "completed") return "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/70";
  if (status === "failed") return "text-rose-700 bg-rose-50 border-rose-200 dark:text-rose-300 dark:bg-rose-950/50 dark:border-rose-800/70";
  if (status === "running") return "text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/50 dark:border-sky-800/70";
  return "text-slate-700 bg-slate-50 border-slate-200 dark:text-slate-300 dark:bg-slate-900/60 dark:border-slate-700";
}

export function isTerminalWorkflowRun(status?: string) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

export function StatusGlyph({ status }: { status?: string }) {
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

export const HistoryHookConnector = memo(function HistoryHookConnector({ orientation }: { orientation: "horizontal" | "vertical" }) {
  const isHorizontal = orientation === "horizontal";
  return (
    <div className={`flex items-center justify-center ${isHorizontal ? "h-4 w-12" : "h-12 w-4"}`}>
      <div className={`rounded-full bg-slate-300 shadow-sm ${isHorizontal ? "h-1.5 w-1.5" : "h-1.5 w-1.5"}`} />
      <div className={`absolute bg-slate-200/50 ${isHorizontal ? "h-[1px] w-full" : "h-full w-[1px]"}`} />
    </div>
  );
});

export const HistorySnapshotStepCard = memo(function HistorySnapshotStepCard({
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
      <div className="my-0 w-full overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_10px_32px_-14px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.04] dark:border-slate-800/90 dark:from-[#18191c] dark:to-[#141518] dark:ring-0">
        <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/95 px-2.5 py-2 sm:px-3 dark:border-slate-800/80 dark:bg-[#1e2024]">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md text-[10px] font-semibold ${theme.tileIconBg} ${theme.tileIconText}`}
          >
            {stepIndex + 1}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-tight text-[var(--app-ink-800)] dark:text-slate-100">{displayTitle}</p>
            <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{category}</p>
          </div>
          <span
            className="shrink-0 tabular-nums text-[10px] text-slate-500 dark:text-slate-400"
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
          <ul className="divide-y divide-slate-200/70 text-[11px] leading-snug dark:divide-slate-800/80">
            {summaryLines.map((line, index) => (
              <li
                key={`${line.label}-${index}`}
                className="flex flex-col gap-1 py-2.5 first:pt-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
              >
                <span className="shrink-0 font-medium text-teal-950/70 dark:text-teal-300">{line.label}</span>
                <span className="min-w-0 tabular-nums text-slate-800 dark:text-slate-200 [overflow-wrap:anywhere] sm:text-right">
                  {line.value}
                </span>
              </li>
            ))}
          </ul>
        </WorkflowValuesPanel>

        {billedUsd || walletAfter ? (
          <div className="border-t border-slate-200/70 bg-slate-50/85 px-2.5 py-2 dark:border-slate-800/80 dark:bg-[#141518]">
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400">
              {billedUsd ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200">
                  Cost {billedUsd}
                </span>
              ) : null}
              {walletAfter ? (
                <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 font-medium dark:border-slate-700/80 dark:bg-slate-800 dark:text-slate-200">
                  Wallet {walletAfter}
                </span>
              ) : null}
            </div>
          </div>
        ) : null}

        {output ? (
          <div className="border-t border-slate-200/70 dark:border-slate-800/80">
            {runStep?.error ? (
              <div className="bg-rose-50/90 px-2.5 py-2 dark:bg-rose-950/80">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-800 dark:text-rose-200">Error</p>
                <pre className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-rose-950 dark:text-rose-200 [overflow-wrap:anywhere]">
                  {output}
                </pre>
              </div>
            ) : (
              <div className="bg-white/80 px-2.5 py-2 dark:bg-[#141518]">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Output</p>
                <pre className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-slate-700 dark:text-slate-200 [overflow-wrap:anywhere]">
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

export function HistoryTimelinePanel({
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
      <div className="rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur-sm dark:border-slate-800/90 dark:bg-[#141416]/95 dark:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.4)]">
        <button
          type="button"
          onClick={onToggleMinimized}
          className="rounded-lg px-3 py-2 text-[11px] font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-white/10 dark:hover:text-white"
        >
          Show Steps timeline
        </button>
      </div>
    );
  }

  return (
    <div className="w-[20rem] rounded-xl border border-slate-200/90 bg-white/95 p-3 text-slate-800 shadow-md backdrop-blur-sm dark:border-slate-800/90 dark:bg-[#141416]/95 dark:text-slate-200 dark:shadow-[0_8px_30px_-8px_rgba(15,23,42,0.4)]">
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
          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">{formatDateTime(runListItem?.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onToggleMinimized}
          className="shrink-0 rounded-lg px-2 py-1 text-[10px] font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Minimize steps timeline"
        >
          Minimize
        </button>
      </div>

      {detail.failureSummary ? (
        <p className="mt-3 rounded-lg border border-rose-200/80 bg-rose-50/90 px-2.5 py-2 text-[10px] leading-relaxed text-rose-950 dark:border-slate-700/80 dark:bg-slate-950/30 dark:text-slate-300">
          {detail.failureSummary}
        </p>
      ) : null}

      <div className="workflow-scroll mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {detail.steps.map((step) => (
          <div key={`${step.stepId}-${step.stepIndex}`} className="rounded border border-slate-200/80 bg-slate-50/80 px-2.5 py-2 dark:border-slate-700/80 dark:bg-slate-950/30">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] font-medium text-slate-800 dark:text-slate-100">{step.stepId}</p>
                <p className="truncate text-[10px] text-slate-500">{friendlyToolName(step.toolName)}</p>
              </div>
              <span className="shrink-0">
                <StatusGlyph status={step.status} />
              </span>
            </div>
            {typeof step.billedUsd === "number" || typeof step.walletAfter === "number" ? (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                {typeof step.billedUsd === "number" ? (
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 dark:border-slate-700/80 dark:bg-slate-900/70">
                    Cost {formatWorkflowBilledUsd(step.billedUsd)}
                  </span>
                ) : null}
                {typeof step.walletAfter === "number" ? (
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-0.5 dark:border-slate-700/80 dark:bg-slate-900/70">
                    Wallet {formatWorkflowWalletBalance(step.walletAfter)}
                  </span>
                ) : null}
              </div>
            ) : null}
            {step.error ? (
              <p className="mt-2 text-[10px] leading-relaxed text-rose-600 dark:text-rose-300">{step.error}</p>
            ) : step.result ? (
              <pre className="workflow-scroll mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-words rounded bg-slate-100 p-2 text-[10px] leading-relaxed text-slate-700 dark:bg-slate-900/80 dark:text-slate-300">
                {formatWorkflowToolOutputForDisplay(String(step.result))}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export const WorkflowSnapshotCanvas = memo(function WorkflowSnapshotCanvas({
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
        <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/85 px-8 py-12 text-center shadow-lg backdrop-blur-[2px] dark:border-slate-800/90 dark:bg-[#18191c]/90 dark:text-slate-200">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)] dark:border-slate-700 dark:from-slate-800 dark:to-slate-900">
            <History className="h-7 w-7 text-slate-500 dark:text-slate-400" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">No historical canvas snapshot</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
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
        <div className="rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-md backdrop-blur-sm dark:border-slate-800/90 dark:bg-[#141416]/95 dark:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.4)]">
          <button
            type="button"
            disabled
            className="flex cursor-not-allowed items-center gap-1.5 rounded-lg px-2 py-1.5 text-[11px] text-slate-400 dark:text-slate-400"
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
