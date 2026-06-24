"use client";

import React, { startTransition, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleDashed,
  Clock3,
  Coins,
  History,
  Info,
  Layers,
  Loader2,
  MoreHorizontal,
  Move,
  Play,
  Plug,
  Plus,
  RotateCw,
  Save,
  Square,
  SkipForward,
  Trash2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { refreshAccessToken } from "@/lib/api/auth-client";
import { getUserDetails } from "@/lib/calls/get-logged-user-details";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import { useWalletSocket } from "@/lib/hooks/useWalletSocket";
import { storage } from "@/lib/utils/store";
import { JsonOrPlainTextBlock } from "@/app/components/JsonSyntaxBlock";
import { Button } from "@/app/components/ui/button";
import {
  categorizeTool,
  computeInsertCanvasPosition,
  createStepDraft,
  ensureStepCanvasPositions,
  ensureUniqueStepId,
  resolveStepCanvasCoords,
  formatWorkflowDraftForApi,
  formatWorkflowToolOutputForDisplay,
  formatScheduleSummary,
  formatIntervalScheduleLabel,
  formatWorkflowBilledUsd,
  formatWorkflowWalletBalance,
  friendlyToolName,
  getEmptyScheduleDraft,
  getEmptyWorkflowDraft,
  hydrateDraftFromWorkflow,
  mergeSavedWorkflowIntoDraft,
  normalizeWorkflowStepExecutionInfo,
  summarizeWorkflowStepArgsForDisplay,
  shouldAnimateConnectorPipeFlow,
  tryInvokeCodeFromToolResultJson,
  validateWorkflowDraft,
  validateWorkflowDraftForRemotePersist,
  workflowStepRunStatusLabel,
  WORKFLOW_DRAFT_STORAGE_KEY,
  type WorkflowDraft,
  type WorkflowScheduleDraft,
  type WorkflowStepDraft,
  type WorkflowStepExecutionInfo,
  type WorkflowTool,
} from "./workflowsUtils";
import {
  getConnectorGeometry,
  getTailAppendConnectorGeometry,
  getWorkflowWorldBounds,
  WORKFLOW_CANVAS_CARD_WIDTH,
} from "./workflowsCanvasGeometry";
import { themeForWorkflowCategory } from "./workflow-studio.theme";
import {
  WORKFLOW_INFO_COPY,
  workflowCanvasSurfaceStyle,
  workflowShellBgStyle,
  WorkflowAboutToolPanel,
  WorkflowValuesPanel,
} from "./workflow-info";
import {
  clearWorkflowShellBootstrapCache,
  cancelWorkflowRun,
  createWorkflow,
  deleteWorkflowRun,
  deleteWorkflowRuns,
  executeWorkflow,
  fetchWorkflow,
  fetchWorkflowRun,
  fetchWorkflowRuns,
  fetchWorkflowToolsCached,
  type WorkflowRunListItem,
  streamWorkflowRunEvents,
  updateWorkflow,
  WorkflowsApiError,
  type WorkflowRecord,
} from "./workflowsApi";
import IntegrationsModal from "@/app/components/ChatHistorySidebar/IntegrationsModal";
import WalletModal from "@/app/components/ChatHistorySidebar/WalletModal";
import { useWalletTopUpReturn } from "@/lib/hooks/useWalletTopUpReturn";
import { scheduleWorkflowShellPrefetch } from "@/lib/workflow-shell-prefetch";
import { WorkflowAddToolsModal } from "./WorkflowAddToolsModal";
import { WorkflowStepConfigModal } from "./WorkflowStepConfigModal";
import { WorkflowSuiteInfoIcon } from "./WorkflowSuiteInfoIcon";
import { WorkflowToolIcon } from "./WorkflowToolIcon";
import { getChainingPathsForWorkflowTool } from "./workflowChainingPaths.utils";
import { cn } from "@/lib/utils";

type SaveState = "idle" | "saving" | "saved" | "error";

function formatShortTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function isTerminalWorkflowRun(status?: string) {
  return status === "completed" || status === "failed" || status === "cancelled";
}

async function loadToolsOnly() {
  try {
    return await fetchWorkflowToolsCached();
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflowToolsCached();
  }
}

async function loadWorkflowById(workflowId: string) {
  try {
    return await fetchWorkflow(workflowId);
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflow(workflowId);
  }
}

async function loadWorkflowHistory(workflowId: string) {
  try {
    return await fetchWorkflowRuns(workflowId);
  } catch (error) {
    if (!isAuthProblem(error)) {
      throw error;
    }
    await refreshAccessToken();
    return fetchWorkflowRuns(workflowId);
  }
}

const VIEWPORT_MENU_PAD = 8;

/** Approximate card footprint on the canvas (world px) for connectors and bounds. */
/** Pixels of movement before a step card drag activates; avoids stealing double-clicks from inner controls. */
const CARD_DRAG_SLOP_PX = 8;
/** World px — grab handle at the bounding top-left of all steps (2+ steps). */
const GROUP_MOVE_HANDLE_SIZE = 28;
const CANVAS_MIN_SCALE = 0.12;
const CANVAS_MAX_SCALE = 3;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function clampMenuToViewport(
  x: number,
  y: number,
  width: number,
  height: number,
  vw: number,
  vh: number,
) {
  const maxX = Math.max(VIEWPORT_MENU_PAD, vw - width - VIEWPORT_MENU_PAD);
  const maxY = Math.max(VIEWPORT_MENU_PAD, vh - height - VIEWPORT_MENU_PAD);
  return {
    x: Math.min(Math.max(VIEWPORT_MENU_PAD, x), maxX),
    y: Math.min(Math.max(VIEWPORT_MENU_PAD, y), maxY),
  };
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

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

/** Connector tail: hook shape — desktop points right, mobile points down */
function HookConnector({
  orientation,
  onClick,
}: {
  orientation: "horizontal" | "vertical";
  onClick: () => void;
}) {
  const isV = orientation === "vertical";
  return (
    <button
      type="button"
      data-no-workflow-drag
      onClick={onClick}
      className={`group relative flex shrink-0 items-center justify-center rounded-lg border border-dashed border-[rgba(58,71,87,0.18)] bg-[rgba(255,255,255,0.55)] text-[rgba(58,71,87,0.35)] shadow-sm transition hover:border-teal-400/50 hover:bg-white/90 hover:text-teal-700 ${isV ? "mx-auto h-16 w-full max-w-[3.5rem]" : "h-10 w-14"
        }`}
      title="Add next step"
      aria-label="Add next step"
    >
      <svg
        viewBox="0 0 64 32"
        className="pointer-events-none absolute left-1/2 top-1/2 h-4 w-10 -translate-x-1/2 -translate-y-1/2 text-current"
        style={{ transform: isV ? "translate(-50%, -50%) rotate(90deg)" : "translate(-50%, -50%)" }}
        fill="none"
        aria-hidden
      >
        <path
          d="M4 16h36c8 0 12-4 12-12M4 16h36c8 0 12 4 12 12"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M44 8l8-4v8l-8-4z" fill="currentColor" opacity="0.35" />
      </svg>
      <Plus className="relative z-10 h-4 w-4 opacity-60 transition group-hover:opacity-100" />
    </button>
  );
}

/** Last run output / error under the args panel (scrollable; avoids runaway card height). */
function WorkflowStepExecutionOutput({ execution }: { execution: WorkflowStepExecutionInfo }) {
  const err = execution.error?.trim() ?? "";
  const result = execution.result?.trim() ?? "";
  const showFailed = execution.status === "failed";
  const showOutput = execution.status === "completed" && result.length > 0;
  const billedUsd = formatWorkflowBilledUsd(execution.billedUsd);
  const walletAfter = formatWorkflowWalletBalance(execution.walletAfter);
  const showMeta = billedUsd !== null || walletAfter !== null;

  const displayErr = useMemo(() => (err ? formatWorkflowToolOutputForDisplay(err) : ""), [err]);
  const displayResult = useMemo(() => formatWorkflowToolOutputForDisplay(result), [result]);

  if (!showFailed && !showOutput && !showMeta) {
    return null;
  }

  return (
    <div
      data-no-workflow-drag
      className="border-t border-slate-200/70"
      onPointerDown={(e) => e.stopPropagation()}
    >
      {showMeta ? (
        <div className="border-b border-slate-200/60 bg-slate-50/85 px-2.5 py-2">
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
      {showFailed ? (
        <div className="bg-rose-50/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-800">Error</p>
          <div className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto">
            {err ? (
              <JsonOrPlainTextBlock
                text={displayErr}
                preClassName="max-h-none border-rose-200/80 bg-white/95 text-rose-950"
                codeClassName="text-[10px] text-rose-950"
              />
            ) : (
              <p className="text-[10px] text-rose-950">No error message was returned.</p>
            )}
          </div>
        </div>
      ) : null}
      {showOutput ? (
        <div className="border-t border-slate-200/60 bg-slate-50/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Output</p>
          <div className="workflow-scroll-light mt-1 max-h-40 overflow-y-auto">
            <JsonOrPlainTextBlock
              text={displayResult}
              preClassName="max-h-none border-slate-200/80 bg-white/95 text-slate-800"
              codeClassName="text-[10px] text-slate-800"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** Canvas step card: header + values summary; info icon toggles API description only. */
function WorkflowStepChatCard({
  step,
  index,
  total,
  tool,
  execution,
  onOpenMenu,
  onEditStep,
  onUpdateLabel,
  resolveStepLabel,
}: {
  step: WorkflowStepDraft;
  index: number;
  total: number;
  tool: WorkflowTool | undefined;
  execution?: WorkflowStepExecutionInfo;
  onOpenMenu: (e: React.MouseEvent) => void;
  onEditStep: () => void;
  onUpdateLabel: (localId: string, label: string) => void;
  resolveStepLabel: (stepId: string) => string | undefined;
}) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const displayTitle = step.label?.trim() || (tool ? friendlyToolName(tool.function.name) : "Step");
  const aboutHint = tool?.workflowDescription?.trim() || tool?.function.description?.trim() || WORKFLOW_INFO_COPY.noApiDescription;
  const aboutExamples = tool?.workflowExamples ?? [];
  const category = categorizeTool(step.toolName);
  const th = themeForWorkflowCategory(category);

  const summaryLines = useMemo(
    () => summarizeWorkflowStepArgsForDisplay(step.args, tool?.function.parameters, resolveStepLabel),
    [step.args, tool?.function.parameters, resolveStepLabel],
  );

  const commitLabel = useCallback(() => {
    const trimmed = labelDraft.trim();
    const prev = (step.label ?? "").trim();
    if (trimmed !== prev) {
      onUpdateLabel(step.localId, trimmed);
    }
    setEditingLabel(false);
  }, [labelDraft, onUpdateLabel, step.label, step.localId]);

  return (
    <div className="w-full max-w-[min(100%,22rem)]">
      <div
        className="my-0 w-full overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_10px_32px_-14px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.04] transition hover:shadow-[0_14px_36px_-12px_rgba(15,23,42,0.28)]"
        title="Double-click the title to rename; double-click values to configure"
      >
        <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/95 px-2.5 py-2 sm:px-3">
          <div
            className={`flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md ${th.tileIconBg} ${th.tileIconText}`}
          >
            <WorkflowToolIcon
              tool={tool}
              className="h-7 w-7 rounded-md"
              fallbackClassName={`${th.tileIconBg} ${th.tileIconText}`}
            />
          </div>
          <div
            className="min-w-0 flex-1"
            onDoubleClick={(e) => {
              e.stopPropagation();
              setLabelDraft(step.label ?? "");
              setEditingLabel(true);
            }}
          >
            {editingLabel ? (
              <input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={commitLabel}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitLabel();
                  }
                  if (e.key === "Escape") {
                    setEditingLabel(false);
                    setLabelDraft(step.label ?? "");
                  }
                }}
                className="w-full rounded-md border border-teal-400/80 bg-white px-1.5 py-0.5 text-sm font-semibold text-[var(--app-ink-800)] shadow-sm outline-none ring-2 ring-teal-500/25"
                aria-label="Step label"
              />
            ) : (
              <>
                <p className="truncate text-sm font-semibold leading-tight text-[var(--app-ink-800)]">{displayTitle}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500">{category}</p>
              </>
            )}
          </div>
          <span className="shrink-0 tabular-nums text-[10px] text-slate-500" title={`Step ${index + 1} of ${total}`}>
            {index + 1}/{total}
          </span>
          {execution ? (
            <span
              className="flex shrink-0 items-center justify-center"
              title={workflowStepRunStatusLabel(execution.status)}
            >
              {execution.status === "pending" ? (
                <CircleDashed className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              ) : null}
              {execution.status === "running" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-600" aria-hidden />
              ) : null}
              {execution.status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
              ) : null}
              {execution.status === "failed" ? (
                <AlertCircle className="h-3.5 w-3.5 text-rose-600" aria-hidden />
              ) : null}
              {execution.status === "skipped" ? (
                <SkipForward className="h-3.5 w-3.5 text-slate-400" aria-hidden />
              ) : null}
              <span className="sr-only">{workflowStepRunStatusLabel(execution.status)}</span>
            </span>
          ) : null}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              setAboutOpen((o) => !o);
            }}
            className={`shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35 ${aboutOpen ? "text-teal-800" : ""
              }`}
            aria-expanded={aboutOpen}
            aria-label={aboutOpen ? WORKFLOW_INFO_COPY.aboutToolAriaHide : WORKFLOW_INFO_COPY.aboutToolAriaShow}
            title={WORKFLOW_INFO_COPY.aboutToolTitle}
          >
            <WorkflowSuiteInfoIcon name={tool?.workflowInfoIcon} className="h-4 w-4" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu(e);
            }}
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35"
            aria-label="Step actions"
            title="Step actions"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div
          onDoubleClick={(e) => {
            e.stopPropagation();
            onEditStep();
          }}
        >
          <WorkflowValuesPanel>
            <ul className="divide-y divide-slate-200/70 text-[11px] leading-snug">
              {summaryLines.map((line, i) => (
                <li
                  key={`${line.label}-${i}`}
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

          {execution ? <WorkflowStepExecutionOutput execution={execution} /> : null}

          {aboutOpen ? (
            <WorkflowAboutToolPanel
              body={aboutHint}
              examples={aboutExamples}
              returnShapeSummary={tool?.workflowToolResponse?.summary}
              chainingPaths={tool ? getChainingPathsForWorkflowTool(tool) : []}
              exampleJson={tool?.workflowToolResponse?.exampleJson}
              resultJsonSchema={tool?.workflowToolResponse?.resultJsonSchema ?? null}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsStudio() {
  useTokenHandler();
  const params = useParams();
  const router = useRouter();
  const routeWorkflowId = typeof params?.id === "string" ? params.id : undefined;

  useEffect(() => {
    scheduleWorkflowShellPrefetch(router, routeWorkflowId ? [routeWorkflowId] : []);
  }, [router, routeWorkflowId]);

  const [draft, setDraft] = useState<WorkflowDraft>(getEmptyWorkflowDraft);
  const [toolLibrary, setToolLibrary] = useState<WorkflowTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [authBlocked, setAuthBlocked] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [playState, setPlayState] = useState<"idle" | "running">("idle");
  const [activeManualRunId, setActiveManualRunId] = useState<string | null>(null);
  const [cancelState, setCancelState] = useState<"idle" | "cancelling">("idle");
  /** Latest run snapshot per logical `stepId` (from GET run + SSE). */
  const [stepExecutionByStepId, setStepExecutionByStepId] = useState<Record<string, WorkflowStepExecutionInfo>>({});
  const [hydrated, setHydrated] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const [configStepId, setConfigStepId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ stepId: string; x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isNarrow, setIsNarrow] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [paymentModalLoading, setPaymentModalLoading] = useState(false);
  useWalletTopUpReturn(setShowWalletModal, 'sidebar');
  const [walletCredits, setWalletCredits] = useState<number | null>(null);
  const [walletCreditsLoading, setWalletCreditsLoading] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [runHistory, setRunHistory] = useState<WorkflowRunListItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [historySelectedRunId, setHistorySelectedRunId] = useState<string | null>(null);
  const [historySelection, setHistorySelection] = useState<string[]>([]);
  const [historyDeleteState, setHistoryDeleteState] = useState<"idle" | "deleting">("idle");
  const [historyDeleteMode, setHistoryDeleteMode] = useState(false);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [scheduleAddOpen, setScheduleAddOpen] = useState(false);
  const [timezoneOverrideOpenForScheduleId, setTimezoneOverrideOpenForScheduleId] = useState<string | null>(null);
  const headerPanelMaxHeight = "min(32rem, calc(100vh - 11.5rem))";

  /** Pan/zoom view transform (screen space: x,y are top-left of scaled world). */
  const [view, setView] = useState({ x: 0, y: 0, scale: 0.88 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stepCardElementsRef = useRef(new Map<string, HTMLDivElement>());
  const [stepCardHeights, setStepCardHeights] = useState<Record<string, number>>({});
  const didInitialCanvasViewRef = useRef(false);
  const canvasPanRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const cardDragRef = useRef<{
    pointerId: number;
    localId: string;
    startClientX: number;
    startClientY: number;
    originX: number;
    originY: number;
    activated: boolean;
  } | null>(null);
  const cardDragSlopCleanupRef = useRef<(() => void) | null>(null);
  const groupDragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    origins: Map<string, { x: number; y: number }>;
  } | null>(null);
  const spacePressedRef = useRef(false);
  const canvasViewportHoveredRef = useRef(false);
  const [spacePanHeld, setSpacePanHeld] = useState(false);

  const lastRemotePayloadRef = useRef("");
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentWorkflowIdRef = useRef<string | undefined>(undefined);
  const runMonitorRef = useRef<AbortController | null>(null);
  const persistDraftPromiseRef = useRef<Promise<WorkflowRecord | null> | null>(null);

  const persistValidation = useMemo(() => validateWorkflowDraftForRemotePersist(draft), [draft]);
  const runReadiness = useMemo(() => validateWorkflowDraft(draft), [draft]);

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

  const refreshRunHistory = useCallback(
    async (workflowId: string) => {
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
    },
    [],
  );

  const selectedSchedule = useMemo<WorkflowScheduleDraft | null>(() => {
    if (draft.schedules.length === 0) {
      return null;
    }
    return draft.schedules.find((schedule) => schedule.id === selectedScheduleId) ?? draft.schedules[0] ?? null;
  }, [draft.schedules, selectedScheduleId]);

  const updateSelectedSchedule = useCallback((updater: (schedule: WorkflowScheduleDraft) => WorkflowScheduleDraft) => {
    if (!selectedSchedule) {
      return;
    }
    setDraft((current) => ({
      ...current,
      schedules: current.schedules.map((schedule) =>
        schedule.id === selectedSchedule.id ? updater(schedule) : schedule,
      ),
    }));
  }, [selectedSchedule]);

  const resolveStepLabelForCard = useCallback((stepId: string) => {
    const s = draft.steps.find((x) => x.stepId === stepId);
    if (!s) return undefined;
    return s.label?.trim() || friendlyToolName(s.toolName);
  }, [draft.steps]);

  const configStepExecution = useMemo(() => {
    if (!configStepId) return undefined;
    const s = draft.steps.find((x) => x.localId === configStepId);
    if (!s) return undefined;
    return stepExecutionByStepId[s.stepId];
  }, [configStepId, draft.steps, stepExecutionByStepId]);

  const tailAppendGeometry = useMemo(
    () => getTailAppendConnectorGeometry(draft.steps, isNarrow, stepCardHeights),
    [draft.steps, isNarrow, stepCardHeights],
  );

  const saveStatusLabel = useMemo(() => {
    if (saveState === "saving") return "Saving…";
    if (saveState === "error") return saveMessage || "Could not save — try again";
    if (saveState === "saved") {
      return lastSavedAt ? `Saved ${formatShortTime(lastSavedAt)}` : saveMessage || "Saved";
    }
    if (saveMessage) return saveMessage;
    if (!draft.workflowId) return "Save keeps a copy on your account";
    return "Autosaves when you edit";
  }, [saveState, saveMessage, lastSavedAt, draft.workflowId]);

  const enabledScheduleCount = useMemo(
    () => draft.schedules.filter((schedule) => schedule.enabled).length,
    [draft.schedules],
  );
  const selectedHistoryCount = historySelection.length;

  const creditsHoverTitle = useMemo(() => {
    if (walletCreditsLoading) return "Loading credits…";
    if (walletCredits === null) return "Click to open wallet and add credits";
    const formatted = walletCredits.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `Available credits: ${formatted}. Click to add credits.`;
  }, [walletCredits, walletCreditsLoading]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const blocksSpacePan = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      Boolean(el.closest("input, textarea, [contenteditable], select, button, a[href], [role='dialog']"));

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      if (!canvasViewportHoveredRef.current) return;
      if (blocksSpacePan(e.target)) return;
      e.preventDefault();
      spacePressedRef.current = true;
      setSpacePanHeld(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePressedRef.current = false;
        setSpacePanHeld(false);
      }
    };
    const onBlur = () => {
      spacePressedRef.current = false;
      setSpacePanHeld(false);
    };
    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("keyup", onKeyUp, { capture: true });
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("keyup", onKeyUp, { capture: true });
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      setAuthBlocked(false);
      setRunHistory([]);
      setHistorySelectedRunId(null);
      setHistorySelection([]);
      try {
        if (routeWorkflowId) {
          clearWorkflowShellBootstrapCache();
          const [tools, record] = await Promise.all([
            loadToolsOnly(),
            loadWorkflowById(routeWorkflowId),
          ]);
          if (cancelled) return;
          setToolLibrary(tools);
          const next = hydrateDraftFromWorkflow(record);
          setDraft(next);
          setSelectedScheduleId(next.schedules[0]?.id ?? null);
          currentWorkflowIdRef.current = next.workflowId;
          lastRemotePayloadRef.current = JSON.stringify(formatWorkflowDraftForApi(next));
          void refreshRunHistory(record.id);
        } else {
          const tools = await loadToolsOnly();
          if (cancelled) return;
          setToolLibrary(tools);
          setDraft(getEmptyWorkflowDraft());
          setSelectedScheduleId(null);
          currentWorkflowIdRef.current = undefined;
          lastRemotePayloadRef.current = "";
          setRunHistory([]);
          setHistorySelectedRunId(null);
          setHistorySelection([]);
        }
      } catch (error) {
        if (cancelled) return;
        if (isAuthProblem(error)) {
          setAuthBlocked(true);
        } else {
          const message = error instanceof Error ? error.message : "Could not load.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setHydrated(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [routeWorkflowId, refreshRunHistory]);

  useEffect(() => {
    didInitialCanvasViewRef.current = false;
  }, [routeWorkflowId]);

  const refreshWalletCredits = useCallback(async () => {
    try {
      const userDetails = await getUserDetails(true);
      const w = userDetails?.config?.wallet;
      const n = typeof w === "number" ? w : Number(w);
      setWalletCredits(Number.isFinite(n) ? n : null);
    } catch {
      /* keep existing balance in UI */
    }
  }, []);

  const handleSocketWalletCredits = useCallback((newBalance: number) => {
    setWalletCredits(newBalance);
  }, []);

  useWalletSocket({ onWalletUpdated: handleSocketWalletCredits });

  const handleOpenCreditsModal = useCallback(() => {
    setShowWalletModal(true);
    void refreshWalletCredits();
  }, [refreshWalletCredits]);

  useEffect(() => {
    if (!hydrated || authBlocked) {
      setWalletCreditsLoading(false);
      return;
    }
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
  }, [hydrated, authBlocked]);

  useEffect(() => {
    if (!hydrated) return;
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!userTimezone) return;
    setDraft((current) => {
      let changed = false;
      const schedules = current.schedules.map((schedule) => {
        if (schedule.timezone?.trim()) {
          return schedule;
        }
        changed = true;
        return { ...schedule, timezone: userTimezone };
      });
      return changed ? { ...current, schedules } : current;
    });
  }, [hydrated]);

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

  useEffect(() => {
    if (!hydrated) return;
    setDraft((d) => {
      const next = ensureStepCanvasPositions(d.steps);
      return next === d.steps ? d : { ...d, steps: next };
    });
  }, [hydrated, routeWorkflowId]);

  useLayoutEffect(() => {
    const activeLocalIds = new Set(draft.steps.map((step) => step.localId));
    setStepCardHeights((current) => {
      const nextEntries = Object.entries(current).filter(([localId]) => activeLocalIds.has(localId));
      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [draft.steps]);

  useLayoutEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;

    const collectElements = () =>
      draft.steps
        .map((step) => [step.localId, stepCardElementsRef.current.get(step.localId)] as const)
        .filter((entry): entry is readonly [string, HTMLDivElement] => entry[1] instanceof HTMLDivElement);

    const measure = () => {
      const elements = collectElements();
      if (elements.length === 0) {
        return;
      }
      setStepCardHeights((current) => {
        let changed = false;
        const next = { ...current };
        for (const [localId, element] of elements) {
          // offsetHeight is layout px — getBoundingClientRect is skewed by canvas zoom.
          const height = Math.round(element.offsetHeight);
          if (height > 0 && next[localId] !== height) {
            next[localId] = height;
            changed = true;
          }
        }
        return changed ? next : current;
      });
    };

    const bindObserver = () => {
      measure();
      if (typeof ResizeObserver === "undefined") {
        return;
      }
      observer?.disconnect();
      observer = new ResizeObserver(measure);
      for (const [, element] of collectElements()) {
        observer.observe(element);
      }
    };

    bindObserver();
    const frame = requestAnimationFrame(() => {
      if (!cancelled) {
        bindObserver();
      }
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [draft.steps, stepExecutionByStepId, configStepId, addModalOpen]);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!hydrated || !el || draft.steps.length === 0 || didInitialCanvasViewRef.current) return;
    const steps = ensureStepCanvasPositions(draft.steps);
    const bounds = getWorkflowWorldBounds(steps, stepCardHeights);
    if (!bounds) return;
    const { minX, minY, maxX, maxY } = bounds;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const scale = 0.88;
    setView({ x: vw / 2 - cx * scale, y: vh / 2 - cy * scale, scale });
    didInitialCanvasViewRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit `draft.steps` so view does not reset on every drag; length + route are enough.
  }, [hydrated, draft.steps.length, routeWorkflowId, stepCardHeights]);

  useEffect(() => {
    if (!hydrated) return;
    storage(WORKFLOW_DRAFT_STORAGE_KEY).setObject(draft);
  }, [draft, hydrated]);

  const persistDraft = useCallback(
    async (mode: "auto" | "manual") => {
      const nextValidation = validateWorkflowDraftForRemotePersist(draft);
      if (!nextValidation.isValid) {
        if (mode === "manual") {
          toast.error(nextValidation.issues[0] ?? "Complete required fields first.");
        }
        return null;
      }
      const payload = formatWorkflowDraftForApi(draft);
      const serializedPayload = JSON.stringify(payload);
      if (mode === "auto" && serializedPayload === lastRemotePayloadRef.current) {
        return null;
      }
      if (persistDraftPromiseRef.current) {
        return persistDraftPromiseRef.current;
      }

      const persistPromise = (async () => {
        try {
          setSaveState("saving");
          setSaveMessage("Saving…");
          const saved = draft.workflowId
            ? await updateWorkflow(draft.workflowId, payload)
            : await createWorkflow(payload);
          currentWorkflowIdRef.current = saved.id;
          lastRemotePayloadRef.current = serializedPayload;
          setSaveState("saved");
          setSaveMessage("Saved");
          setLastSavedAt(new Date());
          // Wrap the draft merge in startTransition so React treats it as a
          // non-urgent update — canvas layout effects don't fire synchronously
          // mid-paint, eliminating the step-card flash on auto-save.
          startTransition(() => {
            setDraft((current) => mergeSavedWorkflowIntoDraft(current, saved));
          });
          return saved;
        } catch (error) {
          setSaveState("error");
          setSaveMessage("Save paused");
          if (mode === "manual") {
            toast.error(error instanceof Error ? error.message : "Could not save.");
          }
          return null;
        } finally {
          persistDraftPromiseRef.current = null;
        }
      })();

      persistDraftPromiseRef.current = persistPromise;
      return persistPromise;
    },
    [draft],
  );

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
                  error: ev.error ?? "Step failed",
                  invokeCode: ev.invokeCode ?? null,
                  billedUsd: ev.billedUsd ?? null,
                  walletAfter: ev.walletAfter ?? null,
                };
              }
              return next;
            });
            if (ev.type === "run_failed" && ev.error) {
              toast.error(ev.error);
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
          toast.error(message);
        }
      }
      void refreshRunHistory(saved.id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not start the run.");
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
  }, [activeManualRunId, cancelState, draft.workflowId]);

  const handleScheduleSave = useCallback(async () => {
    if (scheduleSaving) return;
    setScheduleSaving(true);
    try {
      const saved = await persistDraft("manual");
      if (!saved) {
        return;
      }
      await refreshRunHistory(saved.id);
      toast.success("Workflow schedules saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the schedule.");
    } finally {
      setScheduleSaving(false);
    }
  }, [persistDraft, refreshRunHistory, scheduleSaving]);

  const handleLoadHistoryRun = useCallback(
    async (runId: string) => {
      const workflowId = currentWorkflowIdRef.current;
      if (!workflowId) {
        return;
      }

      try {
        const detail = await fetchWorkflowRun(workflowId, runId);
        applyRunDetailToCanvas(detail);
        setHistoryOpen(true);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not load that run.");
      }
    },
    [applyRunDetailToCanvas],
  );

  const toggleHistorySelection = useCallback((runId: string) => {
    setHistorySelection((current) =>
      current.includes(runId) ? current.filter((id) => id !== runId) : [...current, runId],
    );
  }, []);

  const handleDeleteHistoryRuns = useCallback(async (runIds: string[]) => {
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

      toast.success(normalizedRunIds.length === 1 ? "Execution deleted." : `${normalizedRunIds.length} executions deleted.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete those executions.");
    } finally {
      setHistoryDeleteState("idle");
    }
  }, [draft.workflowId, historyDeleteState, historySelectedRunId]);

  const openScheduleEditor = useCallback((scheduleId: string) => {
    setHeaderMenuOpen(true);
    setScheduleOpen(true);
    setScheduleAddOpen(true);
    setSelectedScheduleId(scheduleId);
    setTimezoneOverrideOpenForScheduleId(null);
  }, []);

  const createAndOpenSchedule = useCallback(() => {
    let next = getEmptyScheduleDraft();
    setDraft((current) => {
      next = getEmptyScheduleDraft(current.schedules);
      return { ...current, schedules: [...current.schedules, next] };
    });
    openScheduleEditor(next.id);
  }, [openScheduleEditor]);

  const handleHeaderMenuToggle = useCallback(() => {
    if (headerMenuOpen) {
      setHeaderMenuOpen(false);
      setScheduleAddOpen(false);
      return;
    }

    setHeaderMenuOpen(true);
  }, [headerMenuOpen]);

  useEffect(() => {
    if (!selectedScheduleId) {
      setTimezoneOverrideOpenForScheduleId(null);
      return;
    }

    setTimezoneOverrideOpenForScheduleId((current) =>
      current === selectedScheduleId ? current : null,
    );
  }, [selectedScheduleId]);

  useEffect(() => {
    const workflowId = draft.workflowId;
    if (!workflowId || !headerMenuOpen || !historyOpen || playState === "running") {
      return;
    }

    const handle = setInterval(() => {
      void refreshRunHistory(workflowId);
    }, 10000);

    return () => clearInterval(handle);
  }, [draft.workflowId, headerMenuOpen, historyOpen, playState, refreshRunHistory]);

  useEffect(() => {
    if (!hydrated) return;
    if (!persistValidation.isValid) return;
    const payload = JSON.stringify(formatWorkflowDraftForApi(draft));
    if (payload === lastRemotePayloadRef.current) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistDraft("auto");
    }, 2500);
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draft, hydrated, persistValidation.isValid, persistDraft]);

  const openAddModal = useCallback((atIndex: number) => {
    setInsertIndex(atIndex);
    setAddModalOpen(true);
  }, []);

  const addToolAt = useCallback(
    (tool: WorkflowTool) => {
      let configLocalId: string | null = null;
      setDraft((current) => {
        const canvas = computeInsertCanvasPosition(current.steps, insertIndex);
        const nextStep = createStepDraft(
          tool,
          current.steps.map((s) => s.stepId),
          canvas,
        );
        configLocalId = nextStep.localId;
        const nextSteps = [...current.steps];
        nextSteps.splice(insertIndex, 0, nextStep);
        return { ...current, steps: nextSteps };
      });
      if (configLocalId) {
        setConfigStepId(configLocalId);
      }
    },
    [insertIndex],
  );

  useEffect(() => {
    if (loading || authBlocked || loadError) return;
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY;
        const zoomFactor = 1 + delta * 0.001;
        setView((v) => {
          const nextScale = clamp(v.scale * zoomFactor, CANVAS_MIN_SCALE, CANVAS_MAX_SCALE);
          const worldX = (mx - v.x) / v.scale;
          const worldY = (my - v.y) / v.scale;
          return {
            scale: nextScale,
            x: mx - worldX * nextScale,
            y: my - worldY * nextScale,
          };
        });
      } else {
        setView((v) => ({
          ...v,
          x: v.x - e.deltaX,
          y: v.y - e.deltaY,
        }));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [loading, authBlocked, loadError]);

  const startCanvasPan = useCallback((e: React.PointerEvent, captureTarget: HTMLElement) => {
    const v = viewRef.current;
    canvasPanRef.current = {
      pointerId: e.pointerId,
      startClientX: e.clientX,
      startClientY: e.clientY,
      originX: v.x,
      originY: v.y,
    };
    captureTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleCanvasBackgroundPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      const vp = viewportRef.current;
      if (!vp) return;
      startCanvasPan(e, vp);
    },
    [startCanvasPan],
  );

  const handleViewportPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 1) return;
      e.preventDefault();
      startCanvasPan(e, e.currentTarget);
    },
    [startCanvasPan],
  );

  const handleViewportPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const p = canvasPanRef.current;
    if (p && p.pointerId === e.pointerId) {
      setView({
        ...viewRef.current,
        x: p.originX + (e.clientX - p.startClientX),
        y: p.originY + (e.clientY - p.startClientY),
      });
      return;
    }
    const cd = cardDragRef.current;
    if (cd && cd.pointerId === e.pointerId) {
      if (!cd.activated) return;
      const scale = viewRef.current.scale;
      const dx = (e.clientX - cd.startClientX) / scale;
      const dy = (e.clientY - cd.startClientY) / scale;
      setDraft((prev) => ({
        ...prev,
        steps: prev.steps.map((s) =>
          s.localId === cd.localId ? { ...s, canvasX: cd.originX + dx, canvasY: cd.originY + dy } : s,
        ),
      }));
      return;
    }
    const gd = groupDragRef.current;
    if (gd && gd.pointerId === e.pointerId) {
      const scale = viewRef.current.scale;
      const dx = (e.clientX - gd.startClientX) / scale;
      const dy = (e.clientY - gd.startClientY) / scale;
      setDraft((prev) => ({
        ...prev,
        steps: prev.steps.map((s) => {
          const o = gd.origins.get(s.localId);
          if (!o) return s;
          return { ...s, canvasX: o.x + dx, canvasY: o.y + dy };
        }),
      }));
    }
  }, []);

  const clearCardDragSlopListeners = useCallback(() => {
    cardDragSlopCleanupRef.current?.();
    cardDragSlopCleanupRef.current = null;
  }, []);

  useEffect(() => () => clearCardDragSlopListeners(), [clearCardDragSlopListeners]);

  const handleViewportPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (canvasPanRef.current?.pointerId === e.pointerId) {
        canvasPanRef.current = null;
      }
      if (cardDragRef.current?.pointerId === e.pointerId) {
        clearCardDragSlopListeners();
        cardDragRef.current = null;
      }
      if (groupDragRef.current?.pointerId === e.pointerId) {
        groupDragRef.current = null;
      }
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [clearCardDragSlopListeners],
  );

  const handleCardPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, localId: string) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest("[data-no-workflow-drag]")) return;

      if (spacePressedRef.current) {
        e.preventDefault();
        e.stopPropagation();
        const vp = viewportRef.current;
        if (!vp) return;
        startCanvasPan(e, vp);
        return;
      }

      if (e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        clearCardDragSlopListeners();
        const origins = new Map<string, { x: number; y: number }>();
        draft.steps.forEach((s, i) => {
          const r = resolveStepCanvasCoords(s, i);
          origins.set(s.localId, { x: r.x, y: r.y });
        });
        groupDragRef.current = {
          pointerId: e.pointerId,
          startClientX: e.clientX,
          startClientY: e.clientY,
          origins,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      e.stopPropagation();
      const stepIndex = draft.steps.findIndex((s) => s.localId === localId);
      const step = stepIndex >= 0 ? draft.steps[stepIndex] : undefined;
      if (!step) return;

      clearCardDragSlopListeners();

      const captureEl = e.currentTarget;
      const pointerId = e.pointerId;
      const origin = resolveStepCanvasCoords(step, stepIndex);
      cardDragRef.current = {
        pointerId,
        localId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        originX: origin.x,
        originY: origin.y,
        activated: false,
      };

      const onWindowMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const cd = cardDragRef.current;
        if (!cd || cd.pointerId !== pointerId || cd.activated) return;
        const dist = Math.hypot(ev.clientX - cd.startClientX, ev.clientY - cd.startClientY);
        if (dist < CARD_DRAG_SLOP_PX) return;
        cd.activated = true;
        try {
          captureEl.setPointerCapture(pointerId);
        } catch {
          /* ignore */
        }
        clearCardDragSlopListeners();
        ev.preventDefault();
      };
      const onWindowUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const cd = cardDragRef.current;
        if (!cd || cd.pointerId !== pointerId) return;
        clearCardDragSlopListeners();
        if (!cd.activated) {
          cardDragRef.current = null;
        }
      };
      const cleanup = () => {
        window.removeEventListener("pointermove", onWindowMove);
        window.removeEventListener("pointerup", onWindowUp);
        window.removeEventListener("pointercancel", onWindowUp);
      };
      window.addEventListener("pointermove", onWindowMove);
      window.addEventListener("pointerup", onWindowUp);
      window.addEventListener("pointercancel", onWindowUp);
      cardDragSlopCleanupRef.current = cleanup;
    },
    [draft.steps, startCanvasPan, clearCardDragSlopListeners],
  );

  /** Move all steps together (same as Shift-drag on a card); handle sits at the bbox top-left. */
  const handleBundleCornerPointerDown = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const vp = viewportRef.current;
      if (!vp) return;

      if (spacePressedRef.current) {
        startCanvasPan(e, vp);
        return;
      }

      const origins = new Map<string, { x: number; y: number }>();
      draft.steps.forEach((s, i) => {
        const r = resolveStepCanvasCoords(s, i);
        origins.set(s.localId, { x: r.x, y: r.y });
      });
      groupDragRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origins,
      };
      vp.setPointerCapture(e.pointerId);
    },
    [draft.steps, startCanvasPan],
  );

  const handleZoomStep = useCallback((direction: "in" | "out") => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const mx = rect.width / 2;
    const my = rect.height / 2;
    const factor = direction === "in" ? 1.12 : 1 / 1.12;
    setView((v) => {
      const nextScale = clamp(v.scale * factor, CANVAS_MIN_SCALE, CANVAS_MAX_SCALE);
      const worldX = (mx - v.x) / v.scale;
      const worldY = (my - v.y) / v.scale;
      return {
        scale: nextScale,
        x: mx - worldX * nextScale,
        y: my - worldY * nextScale,
      };
    });
  }, []);

  const removeStep = useCallback((stepLocalId: string) => {
    setDraft((current) => {
      const nextSteps = current.steps.filter((s) => s.localId !== stepLocalId);
      const nextDraft = {
        ...current,
        steps: nextSteps.map((step) => {
          if (step.resultLink?.sourceStepId && !nextSteps.some((c) => c.stepId === step.resultLink?.sourceStepId)) {
            return { ...step, resultLink: null };
          }
          return step;
        }),
      };
      return nextDraft;
    });
  }, []);

  const moveStep = useCallback((stepLocalId: string, direction: "up" | "down") => {
    setDraft((current) => {
      const index = current.steps.findIndex((s) => s.localId === stepLocalId);
      if (index < 0) return current;
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= current.steps.length) return current;
      const nextSteps = [...current.steps];
      const [step] = nextSteps.splice(index, 1);
      nextSteps.splice(target, 0, step);
      return { ...current, steps: nextSteps };
    });
  }, []);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [menu]);

  useLayoutEffect(() => {
    if (!menu) return;
    const apply = () => {
      const el = menuRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setMenu((m) => {
        if (!m) return m;
        const { x, y } = clampMenuToViewport(m.x, m.y, rect.width, rect.height, window.innerWidth, window.innerHeight);
        if (x === m.x && y === m.y) return m;
        return { ...m, x, y };
      });
    };
    apply();
    window.addEventListener("resize", apply);
    return () => window.removeEventListener("resize", apply);
  }, [menu]);

  const connectorOrientation = isNarrow ? "vertical" : "horizontal";

  const worldSize = useMemo(() => {
    let maxR = 4000;
    let maxB = 4000;
    draft.steps.forEach((s, i) => {
      const { x, y } = resolveStepCanvasCoords(s, i);
      maxR = Math.max(maxR, x + WORKFLOW_CANVAS_CARD_WIDTH + 1600);
      maxB = Math.max(maxB, y + (stepCardHeights[s.localId] ?? 112) + 1600);
    });
    return { width: maxR, height: maxB };
  }, [draft.steps, stepCardHeights]);

  /** Top-left of the axis-aligned bounding box of all step cards (world px). */
  const allStepsTopLeft = useMemo(() => {
    if (draft.steps.length === 0) return null;
    let minX = Infinity;
    let minY = Infinity;
    draft.steps.forEach((s, i) => {
      const { x, y } = resolveStepCanvasCoords(s, i);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
    });
    return { x: minX, y: minY };
  }, [draft.steps]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-hidden />
        <p className="text-sm text-slate-600">Loading workflow…</p>
      </div>
    );
  }

  if (authBlocked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4 text-center">
        <p className="text-sm text-slate-700">Sign in to build and save workflows.</p>
        <Link
          href="/login"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50"
        >
          Go to login
        </Link>
      </div>
    );
  }

  if (loadError && !loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[linear-gradient(180deg,#f4f6f9_0%,#eef1f6_100%)] px-4 text-center">
        <p className="max-w-md text-sm leading-relaxed text-slate-700">{loadError}</p>
        <Button
          type="button"
          variant="outline"
          className="rounded-lg border-slate-200 shadow-sm"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
        <Link
          href="/"
          className="text-sm font-medium text-slate-700 underline underline-offset-4 transition hover:text-slate-900"
        >
          Back home
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={workflowShellBgStyle()}>
      <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-[2px]">
        {/* Fixed title bar — stays at top; canvas scrolls/pans beneath */}
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
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setDescriptionOpen((o) => !o);
              }}
              className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-0 transition ${descriptionOpen ? "bg-white/15 text-cyan-300" : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
                }`}
              aria-expanded={descriptionOpen}
              aria-controls="workflow-description-panel"
              title={descriptionOpen ? "Hide description" : "Edit description"}
            >
              <Info className="h-3.5 w-3.5" aria-hidden />
              <span className="sr-only">{descriptionOpen ? "Hide description" : "Edit description"}</span>
            </button>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Untitled workflow"
              aria-label="Workflow name"
              className="h-6 min-w-0 flex-1 border-0 bg-transparent px-0.5 py-0 text-[12px] font-medium leading-none text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:ring-1 focus:ring-cyan-500/50 focus:ring-offset-0 rounded-sm"
            />
            <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-0.5 sm:gap-2">
              <span
                role="status"
                aria-live="polite"
                aria-relevant="text"
                className={cn(
                  "min-w-[8.5rem] text-right text-[10px] leading-tight sm:min-w-[11rem]",
                  saveState === "error" ? "text-amber-400/95" : "text-slate-500",
                )}
                title={
                  saveState === "saved" && lastSavedAt
                    ? `Last saved at ${formatShortTime(lastSavedAt)}`
                    : saveMessage || undefined
                }
              >
                {saveStatusLabel}
              </span>
              <button
                type="button"
                onClick={handleHeaderMenuToggle}
                className={`inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 text-slate-100 shadow-sm transition ${headerMenuOpen
                    ? "border-cyan-500/60 bg-slate-700/95 text-cyan-200"
                    : "border-slate-600/90 bg-slate-800/90 hover:bg-slate-700 hover:text-white"
                  }`}
                aria-expanded={headerMenuOpen}
                aria-controls="workflow-header-menu-panel"
                title={headerMenuOpen ? "Close workflow header menu" : "Open workflow header menu"}
              >
                <span className="flex h-3.5 w-3.5 flex-col items-center justify-between" aria-hidden>
                  <span className="block h-[1.5px] w-3 rounded-full bg-current" />
                  <span className="block h-[1.5px] w-3 rounded-full bg-current" />
                  <span className="block h-[1.5px] w-3 rounded-full bg-current" />
                </span>
                <span className="sr-only">{headerMenuOpen ? "Close workflow header menu" : "Open workflow header menu"}</span>
              </button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 rounded-md border-slate-600/90 bg-slate-800/90 px-2 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white sm:px-2.5"
                onClick={() => setIntegrationsOpen(true)}
                title="Manage integrations (e.g. Gmail)"
              >
                <Plug className="h-3 w-3 sm:mr-1" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:inline">Integrations</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 shrink-0 rounded-md border-slate-600/90 bg-slate-800/90 px-2 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white sm:px-2.5"
                onClick={handleOpenCreditsModal}
                title={creditsHoverTitle}
              >
                <Coins className="h-3 w-3 sm:mr-1" aria-hidden />
                <span className="sr-only sm:not-sr-only sm:inline">Credits</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={
                  playState === "running"
                    ? cancelState === "cancelling" || !activeManualRunId
                    : !runReadiness.isValid
                }
                className={`h-7 rounded-md px-2.5 text-[11px] font-medium shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${playState === "running"
                    ? "border-rose-600/70 bg-rose-950/30 text-rose-100 hover:bg-rose-900/50 hover:text-white"
                    : "border-emerald-600/70 bg-emerald-950/30 text-emerald-100 hover:bg-emerald-900/50 hover:text-white"
                  }`}
                onClick={() => void (playState === "running" ? handleStopRun() : handlePlay())}
                title={
                  playState === "running"
                    ? cancelState === "cancelling"
                      ? "Stopping run…"
                      : "Stop this manual run"
                    : !runReadiness.isValid
                      ? runReadiness.issues[0] ?? "Complete the workflow first"
                      : "Save and run this workflow"
                }
              >
                {playState === "running" ? (
                  cancelState === "cancelling" ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden />
                  ) : (
                    <Square className="mr-1 h-3 w-3" aria-hidden />
                  )
                ) : (
                  <Play className="mr-1 h-3 w-3" aria-hidden />
                )}
                {playState === "running" ? "Stop" : "Play"}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 rounded-md border-slate-600/90 bg-slate-800/90 px-2.5 text-[11px] font-medium text-slate-100 shadow-sm transition hover:bg-slate-700 hover:text-white"
                onClick={() => void persistDraft("manual")}
                title={
                  persistValidation.isValid
                    ? "Save now (also autosaves after edits)"
                    : persistValidation.issues[0] ?? "Fix issues before saving"
                }
              >
                <Save className="mr-1 h-3 w-3" aria-hidden />
                Save
              </Button>
            </div>
          </div>
          {descriptionOpen || headerMenuOpen ? (
            <div id="workflow-header-menu-panel" className="border-t border-slate-700/80 bg-[#141416] px-2.5 py-2 sm:px-3">
              <div className="flex flex-col gap-3">
                {descriptionOpen ? (
                  <label id="workflow-description-panel" className="block">
                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                      Description
                    </span>
                    <textarea
                      aria-labelledby="workflow-description-panel"
                      value={draft.description}
                      onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                      placeholder="What does this workflow do? Shown when you need context for this automation."
                      rows={4}
                      className="w-full resize-y rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] leading-relaxed text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] outline-none placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                    />
                  </label>
                ) : null}

                {headerMenuOpen ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => setScheduleOpen((open) => !open)}
                          className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition ${scheduleOpen
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                              : "border-slate-700/80 bg-slate-950/35 text-slate-300 hover:border-slate-600 hover:bg-slate-900/60"
                            }`}
                        >
                          <Clock3 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                          Schedule
                          <sup className="ml-1 text-[8px] font-semibold leading-none">{draft.schedules.length}</sup>
                        </button>
                        <button
                          type="button"
                          onClick={createAndOpenSchedule}
                          className={`inline-flex h-7 items-center rounded-md border px-2 text-[11px] font-medium transition ${scheduleAddOpen
                              ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                              : "border-slate-700/80 bg-slate-950/35 text-slate-200 hover:border-slate-600 hover:bg-slate-900/60"
                            }`}
                          title="Add schedule"
                        >
                          <Plus className="h-3.5 w-3.5" aria-hidden />
                          <span className="sr-only">Add schedule</span>
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setHistoryOpen((open) => !open)}
                        className={`inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition ${historyOpen
                            ? "border-cyan-500/60 bg-cyan-500/10 text-cyan-200"
                            : "border-slate-700/80 bg-slate-950/35 text-slate-300 hover:border-slate-600 hover:bg-slate-900/60"
                          }`}
                      >
                        <History className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                        History
                        <sup className="ml-1 text-[8px] font-semibold leading-none">{Math.min(runHistory.length, 99)}</sup>
                      </button>
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">

                      {scheduleOpen ? (
                        <div
                          id="workflow-schedule-panel"
                          className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-700/80 bg-slate-900/45 p-3"
                          style={{ maxHeight: headerPanelMaxHeight }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Schedules</p>
                              <p className="mt-1 text-[11px] text-slate-300">
                                {draft.schedules.length === 0
                                  ? "No schedules yet"
                                  : `${enabledScheduleCount} active · ${draft.schedules.length - enabledScheduleCount} paused`}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 min-h-0 flex-1">
                            <div className="flex h-full min-h-0 flex-col rounded border border-slate-700/80 bg-slate-950/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                              <div className="border-b border-slate-700/80 px-2.5 py-2">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Schedule list</p>
                              </div>
                              <div className="workflow-scroll workflow-header-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-2.5 py-2 pr-1.5">
                                {draft.schedules.length === 0 ? (
                                  <p className="text-[11px] text-slate-400">Add a one-time or recurring schedule.</p>
                                ) : (
                                  draft.schedules.map((schedule) => (
                                    <button
                                      key={schedule.id}
                                      type="button"
                                      onClick={() => openScheduleEditor(schedule.id)}
                                      className={`block w-full rounded-lg border px-2.5 py-2 text-left transition ${selectedSchedule?.id === schedule.id
                                          ? "border-cyan-500/60 bg-cyan-500/10 shadow-[0_0_0_1px_rgba(6,182,212,0.08)]"
                                          : "border-slate-700/80 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/60"
                                        }`}
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-medium text-slate-100">{schedule.name || "Untitled schedule"}</span>
                                        <div className="flex items-center gap-1.5">
                                          <span
                                            className={`rounded border px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide ${schedule.enabled
                                                ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
                                                : "border-slate-600/60 bg-slate-800/70 text-slate-400"
                                              }`}
                                          >
                                            {schedule.enabled ? "Active" : "Paused"}
                                          </span>
                                          <span className="text-[10px] uppercase tracking-wide text-slate-500">
                                            {schedule.mode === "once" ? "once" : "recurring"}
                                          </span>
                                        </div>
                                      </div>
                                      <p className="mt-1 text-[10px] text-slate-400">{formatScheduleSummary(schedule)}</p>
                                      <div className="mt-2 space-y-1 text-[9px] uppercase tracking-wide text-slate-500">
                                        <p>Created {formatDateTime(schedule.createdAt)}</p>
                                        <p>Updated {formatDateTime(schedule.updatedAt)}</p>
                                      </div>
                                    </button>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : null}

                      {scheduleAddOpen ? (
                        <div
                          id="workflow-schedule-add-panel"
                          className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-700/80 bg-slate-900/45 p-3"
                          style={{ maxHeight: headerPanelMaxHeight }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Add schedule</p>
                              <p className="mt-1 text-[11px] text-slate-300">Create a one-time or recurring run without replacing the list or history panels.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setScheduleAddOpen(false)}
                              className="inline-flex h-7 items-center rounded-md border border-slate-700/80 bg-slate-950/35 px-2.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900/60"
                            >
                              Close
                            </button>
                          </div>

                          <div className="workflow-scroll workflow-header-scroll mt-3 min-h-0 flex-1 overflow-y-auto pr-1.5">
                            {selectedSchedule ? (
                              <div className="space-y-3 rounded border border-slate-700/80 bg-slate-950/30 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                                <div className="space-y-2">
                                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Name</span>
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                                    <input
                                      id="schedule-name-input"
                                      type="text"
                                      value={selectedSchedule.name}
                                      onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, name: e.target.value }))}
                                      aria-label="Schedule name"
                                      className="min-h-[34px] min-w-0 flex-1 rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                    />
                                    <label className="flex shrink-0 cursor-pointer items-center gap-2 text-[11px] text-slate-300">
                                      <input
                                        type="checkbox"
                                        checked={selectedSchedule.enabled}
                                        onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, enabled: e.target.checked }))}
                                        className="rounded border-slate-600"
                                      />
                                      Enabled
                                    </label>
                                  </div>
                                </div>

                                <div className="rounded border border-slate-700/70 bg-slate-900/50 px-2 py-1.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Timezone</p>
                                      <p className="truncate text-[11px] leading-snug text-slate-300">{selectedSchedule.timezone || "Auto-detected"}</p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTimezoneOverrideOpenForScheduleId((current) =>
                                          current === selectedSchedule.id ? null : selectedSchedule.id,
                                        );
                                      }}
                                      className="inline-flex h-7 shrink-0 items-center rounded-md border border-slate-700/80 bg-slate-950/35 px-2.5 text-[11px] font-medium text-slate-300 transition hover:border-slate-600 hover:bg-slate-900/60"
                                    >
                                      {timezoneOverrideOpenForScheduleId === selectedSchedule.id ? "Hide timezone" : "Pick different timezone"}
                                    </button>
                                  </div>
                                  {timezoneOverrideOpenForScheduleId === selectedSchedule.id ? (
                                    <label className="mt-2 block">
                                      <input
                                        id="schedule-timezone-input"
                                        type="text"
                                        value={selectedSchedule.timezone}
                                        onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, timezone: e.target.value }))}
                                        className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                      />
                                    </label>
                                  ) : null}
                                </div>

                                <div className="space-y-1.5">
                                  <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-500">Frequency</span>
                                  <div className="grid grid-cols-2 gap-1 rounded-md border border-slate-700/70 bg-slate-900/40 p-1" role="group" aria-label="Schedule frequency">
                                    <button
                                      type="button"
                                      className={`min-h-[34px] rounded px-2 py-1.5 text-[11px] font-medium transition ${selectedSchedule.mode === "once"
                                          ? "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-500/40"
                                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                                        }`}
                                      onClick={() => updateSelectedSchedule((schedule) => ({ ...schedule, mode: "once" }))}
                                    >
                                      Once
                                    </button>
                                    <button
                                      type="button"
                                      className={`min-h-[34px] rounded px-2 py-1.5 text-[11px] font-medium transition ${selectedSchedule.mode === "repeat"
                                          ? "bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-500/40"
                                          : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                                        }`}
                                      onClick={() => updateSelectedSchedule((schedule) => ({ ...schedule, mode: "repeat" }))}
                                    >
                                      Repeat
                                    </button>
                                  </div>
                                </div>

                                {selectedSchedule.mode === "once" ? (
                                  <label className="block">
                                    <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Date and time</span>
                                    <input
                                      id="schedule-once-datetime"
                                      type="datetime-local"
                                      value={selectedSchedule.scheduledAt}
                                      onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, scheduledAt: e.target.value }))}
                                      className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                    />
                                  </label>
                                ) : (
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <label className={`block ${selectedSchedule.repeatPreset === "interval" ? "sm:col-span-2" : ""}`}>
                                      <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Pattern</span>
                                      {selectedSchedule.repeatPreset === "interval" ? (
                                        <>
                                          <div className="flex items-center gap-2">
                                            <select
                                              id="schedule-repeat-preset"
                                              value={selectedSchedule.repeatPreset}
                                              onChange={(e) => updateSelectedSchedule((schedule) => ({
                                                ...schedule,
                                                repeatPreset: e.target.value as WorkflowScheduleDraft["repeatPreset"],
                                              }))}
                                              className="w-32 shrink-0 rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                            >
                                              <option value="daily">Daily</option>
                                              <option value="weekdays">Weekdays</option>
                                              <option value="weekly">Weekly</option>
                                              <option value="interval">Every…</option>
                                              <option value="custom">Custom cron</option>
                                            </select>
                                            <input
                                              id="schedule-repeat-interval"
                                              type="number"
                                              min="1"
                                              step="1"
                                              value={selectedSchedule.repeatInterval}
                                              onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatInterval: e.target.value }))}
                                              className="h-[34px] w-20 shrink-0 rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                            />
                                            <select
                                              id="schedule-repeat-unit"
                                              value={selectedSchedule.repeatUnit}
                                              onChange={(e) => updateSelectedSchedule((schedule) => ({
                                                ...schedule,
                                                repeatUnit: e.target.value as WorkflowScheduleDraft["repeatUnit"],
                                              }))}
                                              className="min-w-0 flex-1 rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                            >
                                              <option value="seconds">Seconds</option>
                                              <option value="minutes">Minutes</option>
                                              <option value="hours">Hours</option>
                                              <option value="days">Days</option>
                                              <option value="months">Months</option>
                                              <option value="years">Years</option>
                                              <option value="decades">Decades</option>
                                              <option value="centuries">Centuries</option>
                                            </select>
                                          </div>
                                          <p className="mt-1 text-[10px] text-slate-400">
                                            {formatIntervalScheduleLabel(selectedSchedule)}
                                          </p>
                                        </>
                                      ) : (
                                        <select
                                          id="schedule-repeat-preset-select"
                                          value={selectedSchedule.repeatPreset}
                                          onChange={(e) => updateSelectedSchedule((schedule) => ({
                                            ...schedule,
                                            repeatPreset: e.target.value as WorkflowScheduleDraft["repeatPreset"],
                                          }))}
                                          className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                        >
                                          <option value="daily">Daily</option>
                                          <option value="weekdays">Weekdays</option>
                                          <option value="weekly">Weekly</option>
                                          <option value="interval">Every…</option>
                                          <option value="custom">Custom cron</option>
                                        </select>
                                      )}
                                    </label>
                                    {selectedSchedule.repeatPreset === "interval" ? (
                                      <>
                                        {selectedSchedule.repeatUnit === "months" ? (
                                          <label className="block sm:col-span-2">
                                            <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Time</span>
                                            <input
                                              id="schedule-repeat-time"
                                              type="time"
                                              value={selectedSchedule.repeatTime}
                                              onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatTime: e.target.value }))}
                                              className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                            />
                                            <p className="mt-1 text-[10px] text-slate-500">Monthly intervals run on day 1 at the chosen time.</p>
                                          </label>
                                        ) : null}
                                        {["years", "decades", "centuries"].includes(selectedSchedule.repeatUnit) ? (
                                          <p className="text-[10px] leading-relaxed text-amber-300 sm:col-span-2">
                                            These units are visible here, but cron-based workflow schedules cannot represent them yet.
                                          </p>
                                        ) : null}
                                      </>
                                    ) : (
                                      <label className="block">
                                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Time</span>
                                        <input
                                          id="schedule-repeat-time-select"
                                          type="time"
                                          value={selectedSchedule.repeatTime}
                                          onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatTime: e.target.value }))}
                                          disabled={selectedSchedule.repeatPreset === "custom"}
                                          className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 disabled:opacity-50"
                                        />
                                      </label>
                                    )}
                                    {selectedSchedule.repeatPreset === "weekly" ? (
                                      <label className="block">
                                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Weekday</span>
                                        <select
                                          id="schedule-repeat-weekday"
                                          value={selectedSchedule.repeatWeekday}
                                          onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, repeatWeekday: e.target.value }))}
                                          className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                        >
                                          <option value="0">Sunday</option>
                                          <option value="1">Monday</option>
                                          <option value="2">Tuesday</option>
                                          <option value="3">Wednesday</option>
                                          <option value="4">Thursday</option>
                                          <option value="5">Friday</option>
                                          <option value="6">Saturday</option>
                                        </select>
                                      </label>
                                    ) : null}
                                    {selectedSchedule.repeatPreset === "custom" ? (
                                      <label className="block sm:col-span-2">
                                        <span className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">Cron</span>
                                        <input
                                          id="schedule-custom-cron"
                                          type="text"
                                          value={selectedSchedule.customCron}
                                          onChange={(e) => updateSelectedSchedule((schedule) => ({ ...schedule, customCron: e.target.value }))}
                                          placeholder="15 9 * * 1-5"
                                          className="w-full rounded border border-slate-600/80 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
                                        />
                                      </label>
                                    ) : null}
                                  </div>
                                )}

                                <div className="mt-1 border-t border-slate-700/60 pt-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 rounded-md border-rose-700/70 bg-rose-950/20 px-2.5 text-[11px] font-medium text-rose-100 hover:bg-rose-900/40"
                                      onClick={() => {
                                        setDraft((current) => ({
                                          ...current,
                                          schedules: current.schedules.filter((schedule) => schedule.id !== selectedSchedule.id),
                                        }));
                                        setSelectedScheduleId((current) =>
                                          current === selectedSchedule.id ? draft.schedules.find((schedule) => schedule.id !== selectedSchedule.id)?.id ?? null : current,
                                        );
                                      }}
                                    >
                                      Remove
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-7 rounded-md bg-cyan-600 px-2.5 text-[11px] font-medium text-white hover:bg-cyan-500"
                                      disabled={scheduleSaving}
                                      onClick={() => void handleScheduleSave()}
                                    >
                                      {scheduleSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" aria-hidden /> : <Clock3 className="mr-1 h-3 w-3" aria-hidden />}
                                      Save schedules
                                    </Button>
                                  </div>
                                  <div className="mt-3 space-y-0.5 border-t border-slate-700/40 pt-3 text-[10px] text-slate-500">
                                    <p>Created {formatDateTime(selectedSchedule.createdAt)}</p>
                                    <p>Updated {formatDateTime(selectedSchedule.updatedAt)}</p>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="rounded border border-dashed border-slate-700/80 bg-slate-950/20 px-3 py-6 text-[11px] text-slate-400">
                                Click the plus button to start a new schedule.
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}

                      {historyOpen ? (
                        <div
                          id="workflow-history-panel"
                          className="flex min-h-0 flex-col overflow-hidden rounded border border-slate-700/80 bg-slate-900/45 p-3"
                          style={{ maxHeight: headerPanelMaxHeight }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">Recent runs</p>
                              <p className="mt-1 text-[11px] text-slate-300">Inspect previous runs and their historical canvas state.</p>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {draft.workflowId ? (
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-600/80 bg-slate-800/90 text-slate-100 transition hover:bg-slate-700"
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
                                    : "border-slate-600/80 bg-slate-800/90 text-slate-100 hover:bg-slate-700"
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
                              <p className="text-[11px] text-slate-400">Loading history…</p>
                            ) : historyError ? (
                              <p className="text-[11px] text-rose-300">{historyError}</p>
                            ) : runHistory.length === 0 ? (
                              <p className="text-[11px] text-slate-400">No runs yet.</p>
                            ) : (
                              runHistory.map((run) => (
                                <div
                                  key={run.id}
                                  className={`block w-full rounded border px-2.5 py-2 text-left transition ${historySelectedRunId === run.id
                                      ? "border-cyan-500/60 bg-cyan-500/10"
                                      : "border-slate-700/80 bg-slate-950/30 hover:border-slate-600 hover:bg-slate-900/60"
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
                                        <span className="text-[11px] font-medium text-slate-100">{run.status}</span>
                                      </div>
                                      <p className="mt-1 text-[10px] text-slate-400">Created {formatDateTime(run.createdAt)}</p>
                                      <div className="mt-2 flex items-end justify-between gap-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="rounded border border-slate-700/70 bg-slate-900/45 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-[0.18em] text-slate-400">
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
                      ) : null}
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div
          ref={viewportRef}
          className="relative flex min-h-0 flex-1 touch-none overflow-hidden overscroll-none"
          data-workflow-canvas
          role="region"
          aria-label="Workflow canvas — drag empty space or hold Space and drag to pan, middle-click drag to pan, drag a step card to move it, Shift-drag a card or use the top-left move handle to move all steps, Ctrl+scroll to zoom"
          onPointerDown={handleViewportPointerDown}
          onPointerMove={handleViewportPointerMove}
          onPointerUp={handleViewportPointerUp}
          onPointerCancel={handleViewportPointerUp}
          onMouseEnter={() => {
            canvasViewportHoveredRef.current = true;
          }}
          onMouseLeave={() => {
            canvasViewportHoveredRef.current = false;
            spacePressedRef.current = false;
            setSpacePanHeld(false);
          }}
        >
          {draft.steps.length > 0 ? (
            <div className="pointer-events-none absolute right-3 top-3 z-10">
              <div className="pointer-events-auto flex flex-col gap-0.5 rounded-xl border border-slate-200/90 bg-white/95 p-1 shadow-[0_8px_30px_-8px_rgba(15,23,42,0.18)] backdrop-blur-sm">
                <button
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => handleZoomStep("in")}
                  title="Zoom in"
                >
                  <ZoomIn className="mx-auto h-4 w-4" aria-hidden />
                  <span className="sr-only">Zoom in</span>
                </button>
                <button
                  type="button"
                  className="rounded-lg px-2 py-1.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  onClick={() => handleZoomStep("out")}
                  title="Zoom out"
                >
                  <ZoomOut className="mx-auto h-4 w-4" aria-hidden />
                  <span className="sr-only">Zoom out</span>
                </button>
              </div>
            </div>
          ) : null}

          {draft.steps.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center px-4 py-12 sm:px-6">
              <div className="w-full max-w-lg rounded-2xl border border-slate-200/90 bg-white/85 px-8 py-12 text-center shadow-[0_24px_64px_-16px_rgba(15,23,42,0.14)] backdrop-blur-[2px]">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.9)]">
                  <Layers className="h-7 w-7 text-slate-500" aria-hidden />
                </div>
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Start your workflow</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Add tools to run in order. Pan the canvas, connect steps, and changes save automatically when you edit.
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tip: hold <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">Space</kbd>{" "}
                  and drag to move the board.
                </p>
                <Button
                  type="button"
                  className="mt-8 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-md transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/50 focus-visible:ring-offset-2"
                  onClick={() => openAddModal(0)}
                >
                  <Plus className="mr-2 h-4 w-4" aria-hidden />
                  Add first step
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={`relative h-full min-h-[240px] w-full ${spacePanHeld ? "cursor-grab" : ""}`}
              data-workflow-viewport-root
            >
              <div
                className="absolute left-0 top-0 h-full w-full will-change-transform"
                style={{
                  transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
                  transformOrigin: "0 0",
                }}
              >
                <div
                  data-workflow-canvas-bg
                  className="absolute left-0 top-0 cursor-grab active:cursor-grabbing"
                  style={{
                    ...workflowCanvasSurfaceStyle(),
                    width: worldSize.width,
                    height: worldSize.height,
                  }}
                  onPointerDown={handleCanvasBackgroundPointerDown}
                />
                {!addModalOpen ? (
                  <>
                    <svg
                      key={draft.steps.map((step) => step.localId).join("|")}
                      className="pointer-events-none absolute left-0 top-0 z-[0]"
                      width={worldSize.width}
                      height={worldSize.height}
                      aria-hidden
                    >
                      <defs>
                        <style>
                          {`
                            @keyframes workflow-pipe-flow {
                              to {
                                stroke-dashoffset: -40;
                              }
                            }
                            .workflow-pipe-flow-stroke {
                              animation: workflow-pipe-flow 1.05s linear infinite;
                            }
                            @media (prefers-reduced-motion: reduce) {
                              .workflow-pipe-flow-stroke {
                                animation: none;
                              }
                            }
                          `}
                        </style>
                      </defs>
                      {draft.steps.map((step, index) => {
                        const nextStep = draft.steps[index + 1];
                        if (!nextStep) return null;
                        const { pathD } = getConnectorGeometry(
                          step,
                          nextStep,
                          isNarrow,
                          index,
                          index + 1,
                          stepCardHeights,
                        );
                        const execUp = stepExecutionByStepId[step.stepId];
                        const execDown = stepExecutionByStepId[nextStep.stepId];
                        const flowActive = shouldAnimateConnectorPipeFlow(playState, execUp, execDown);
                        return (
                          <g key={`edge-${step.localId}-${nextStep.localId}`}>
                            <path
                              d={pathD}
                              fill="none"
                              stroke="rgba(58, 71, 87, 0.38)"
                              strokeWidth={2}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {flowActive ? (
                              <path
                                d={pathD}
                                fill="none"
                                stroke="rgb(34 197 94)"
                                strokeOpacity={0.92}
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeDasharray="10 14"
                                className="workflow-pipe-flow-stroke"
                              />
                            ) : null}
                          </g>
                        );
                      })}
                      {tailAppendGeometry ? (
                        <path
                          key="edge-tail-append"
                          d={tailAppendGeometry.pathD}
                          fill="none"
                          stroke="rgba(58, 71, 87, 0.28)"
                          strokeWidth={2}
                          strokeDasharray="6 5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      ) : null}
                    </svg>
                    {draft.steps.map((step, index) => {
                      const nextStep = draft.steps[index + 1];
                      if (!nextStep) return null;
                      const { hookLeft, hookTop } = getConnectorGeometry(
                        step,
                        nextStep,
                        isNarrow,
                        index,
                        index + 1,
                        stepCardHeights,
                      );
                      return (
                        <div
                          key={`hook-${step.localId}-${nextStep.localId}`}
                          className="pointer-events-auto absolute z-[30]"
                          style={{ left: hookLeft, top: hookTop }}
                        >
                          <HookConnector orientation={connectorOrientation} onClick={() => openAddModal(index + 1)} />
                        </div>
                      );
                    })}
                    {tailAppendGeometry ? (
                      <div
                        className="pointer-events-auto absolute z-[30]"
                        style={{ left: tailAppendGeometry.hookLeft, top: tailAppendGeometry.hookTop }}
                      >
                        <HookConnector
                          orientation={connectorOrientation}
                          onClick={() => openAddModal(draft.steps.length)}
                        />
                      </div>
                    ) : null}
                  </>
                ) : null}
                {allStepsTopLeft && draft.steps.length >= 2 ? (
                  <button
                    type="button"
                    className="pointer-events-auto absolute z-[25] flex cursor-grab touch-none items-center justify-center rounded-md border border-slate-400/70 bg-white/95 p-0 shadow-md active:cursor-grabbing"
                    style={{
                      left: allStepsTopLeft.x,
                      top: allStepsTopLeft.y,
                      width: GROUP_MOVE_HANDLE_SIZE,
                      height: GROUP_MOVE_HANDLE_SIZE,
                    }}
                    onPointerDown={handleBundleCornerPointerDown}
                    title="Move all steps"
                    aria-label="Move all steps"
                  >
                    <Move className="h-3.5 w-3.5 text-slate-600" aria-hidden />
                  </button>
                ) : null}
                {draft.steps.map((step, index) => {
                  const canvasPos = resolveStepCanvasCoords(step, index);
                  return (
                    <div
                      key={step.localId}
                      ref={(node) => {
                        if (node) {
                          stepCardElementsRef.current.set(step.localId, node);
                        } else {
                          stepCardElementsRef.current.delete(step.localId);
                        }
                      }}
                      data-workflow-step-card
                      className="absolute z-[20] cursor-grab touch-none active:cursor-grabbing"
                      style={{
                        left: canvasPos.x,
                        top: canvasPos.y,
                        width: WORKFLOW_CANVAS_CARD_WIDTH,
                      }}
                      onPointerDown={(e) => handleCardPointerDown(e, step.localId)}
                      onPointerMove={handleViewportPointerMove}
                      onPointerUp={handleViewportPointerUp}
                      onPointerCancel={handleViewportPointerUp}
                    >
                      <WorkflowStepChatCard
                        step={step}
                        index={index}
                        total={draft.steps.length}
                        tool={toolLibrary.find((t) => t.function.name === step.toolName)}
                        execution={stepExecutionByStepId[step.stepId]}
                        resolveStepLabel={resolveStepLabelForCard}
                        onOpenMenu={(e) => {
                          e.stopPropagation();
                          setMenu({ stepId: step.localId, x: e.clientX, y: e.clientY });
                        }}
                        onEditStep={() => {
                          setConfigStepId(step.localId);
                          setMenu(null);
                        }}
                        onUpdateLabel={(localId, label) => {
                          setDraft((d) => ({
                            ...d,
                            steps: d.steps.map((s) => {
                              if (s.localId !== localId) return s;
                              const others = d.steps.filter((x) => x.localId !== localId).map((x) => x.stepId);
                              return {
                                ...s,
                                label,
                                stepId: ensureUniqueStepId(label.trim() || friendlyToolName(s.toolName), others),
                              };
                            }),
                          }));
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {menu && (
        <div
          ref={menuRef}
          className="fixed z-[200] min-w-[10rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg"
          style={{ left: menu.x, top: menu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
            onClick={() => {
              setConfigStepId(menu.stepId);
              setMenu(null);
            }}
          >
            Edit…
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
            onClick={() => {
              moveStep(menu.stepId, "up");
              setMenu(null);
            }}
          >
            <ChevronUp className="mr-2 inline h-4 w-4" />
            Move up
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
            onClick={() => {
              moveStep(menu.stepId, "down");
              setMenu(null);
            }}
          >
            <ChevronDown className="mr-2 inline h-4 w-4" />
            Move down
          </button>
          <button
            type="button"
            className="flex w-full px-3 py-2 text-left text-rose-600 hover:bg-rose-50"
            onClick={() => {
              removeStep(menu.stepId);
              setMenu(null);
            }}
          >
            Remove step
          </button>
        </div>
      )}

      <WorkflowAddToolsModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        tools={toolLibrary}
        onPick={(tool) => addToolAt(tool)}
      />

      <WorkflowStepConfigModal
        isOpen={configStepId !== null}
        onClose={() => setConfigStepId(null)}
        draft={draft}
        stepLocalId={configStepId}
        toolLibrary={toolLibrary}
        onSave={(next) => setDraft(next)}
        execution={configStepExecution}
      />

      {integrationsOpen ? (
        <IntegrationsModal onClose={() => setIntegrationsOpen(false)} />
      ) : null}

      <WalletModal
        showWalletModal={showWalletModal}
        setShowWalletModal={setShowWalletModal}
        onWalletUpdate={refreshWalletCredits}
        paymentModalLoading={paymentModalLoading}
        setPaymentModalLoading={setPaymentModalLoading}
      />
    </div>
  );
}
