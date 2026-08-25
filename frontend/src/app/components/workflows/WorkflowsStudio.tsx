"use client";

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useTokenHandler from "@/lib/hooks/useTokenHandler";
import {
  ensureStepCanvasPositions,
  computeInsertCanvasPosition,
  createStepDraft,
  formatWorkflowDraftForApi,
  friendlyToolName,
  resolveStepCanvasCoords,
  getEmptyScheduleDraft,
  getEmptyWorkflowDraft,
  hydrateDraftFromWorkflow,
  validateWorkflowDraft,
  type WorkflowDraft,
  type WorkflowScheduleDraft,
  type WorkflowStepExecutionInfo,
  type WorkflowTool,
} from "./workflowsUtils";
import {
  getTailAppendConnectorGeometry,
  getWorkflowWorldBounds,
  WORKFLOW_CANVAS_CARD_WIDTH,
} from "./workflowsCanvasGeometry";
import { workflowShellBgStyle } from "./workflow-info";
import { clearWorkflowShellBootstrapCache } from "./workflowsApi";
import IntegrationsModal from "@/app/components/ChatHistorySidebar/IntegrationsModal";
import WalletModal from "@/app/components/ChatHistorySidebar/WalletModal";
import { scheduleWorkflowShellPrefetch } from "@/lib/workflow-shell-prefetch";
import { FEATURE_FLAGS } from "@/lib/config/features";
import { WorkflowAddToolsModal } from "./WorkflowAddToolsModal";
import { WorkflowStepConfigModal } from "./WorkflowStepConfigModal";
import { useWorkflowsStudioCanvas } from "./useWorkflowsStudioCanvas";
import { useWorkflowsStudioPersistence } from "./useWorkflowsStudioPersistence";
import { useWorkflowsStudioRun } from "./useWorkflowsStudioRun";
import { useWorkflowsStudioWallet } from "./useWorkflowsStudioWallet";
import { useWorkflowsStudioStepMenu } from "./useWorkflowsStudioStepMenu";
import {
  isAuthProblem,
  loadToolsOnly,
  loadWorkflowById,
} from "./workflowsStudio.utils";
import {
  WorkflowsStudioAuthBlockedGate,
  WorkflowsStudioLoadErrorGate,
  WorkflowsStudioLoadingGate,
} from "./WorkflowsStudioGateStates";
import { WorkflowsStudioHeader } from "./WorkflowsStudioHeader";
import { WorkflowsStudioCanvas } from "./WorkflowsStudioCanvas";
import { WorkflowsStudioStepMenuPanel } from "./WorkflowsStudioStepMenuPanel";

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
  const [hydrated, setHydrated] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [insertIndex, setInsertIndex] = useState(0);
  const [configStepId, setConfigStepId] = useState<string | null>(null);
  const { menu, setMenu, menuRef } = useWorkflowsStudioStepMenu();
  const [isNarrow, setIsNarrow] = useState(false);
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [integrationsOpen, setIntegrationsOpen] = useState(false);
  const {
    showWalletModal,
    setShowWalletModal,
    paymentModalLoading,
    setPaymentModalLoading,
    walletCredits,
    walletCreditsLoading,
    creditsHoverTitle,
    handleOpenCreditsModal,
    refreshWalletCredits,
  } = useWorkflowsStudioWallet(hydrated, authBlocked);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [selectedScheduleId, setSelectedScheduleId] = useState<string | null>(null);
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [scheduleAddOpen, setScheduleAddOpen] = useState(false);
  const [timezoneOverrideOpenForScheduleId, setTimezoneOverrideOpenForScheduleId] = useState<string | null>(null);
  const headerPanelMaxHeight = "min(32rem, calc(100vh - 11.5rem))";

  const stepCardElementsRef = useRef(new Map<string, HTMLDivElement>());
  const [stepCardHeights, setStepCardHeights] = useState<Record<string, number>>({});
  const didInitialCanvasViewRef = useRef(false);

  const {
    view,
    setView,
    viewportRef,
    spacePanHeld,
    handleCanvasBackgroundPointerDown,
    handleViewportPointerDown,
    handleViewportPointerMove,
    handleViewportPointerUp,
    handleCardPointerDown,
    handleBundleCornerPointerDown,
    handleZoomStep,
    handleViewportMouseEnter,
    handleViewportMouseLeave,
  } = useWorkflowsStudioCanvas({
    loading,
    authBlocked,
    loadError,
    draftSteps: draft.steps,
    setDraft,
  });

  const {
    saveState,
    saveMessage,
    lastSavedAt,
    saveStatusLabel,
    persistValidation,
    persistDraft,
    currentWorkflowIdRef,
    lastRemotePayloadRef,
    resetPersistenceForWorkflow,
  } = useWorkflowsStudioPersistence(draft, setDraft, hydrated);

  const {
    playState,
    activeManualRunId,
    cancelState,
    stepExecutionByStepId,
    runHistory,
    historyLoading,
    historyError,
    historySelectedRunId,
    historySelection,
    historyDeleteState,
    historyDeleteMode,
    setHistoryDeleteMode,
    setHistorySelection,
    refreshRunHistory,
    resetRunStateForRoute,
    handlePlay,
    handleStopRun,
    handleLoadHistoryRun: loadHistoryRun,
    toggleHistorySelection,
    handleDeleteHistoryRuns,
  } = useWorkflowsStudioRun({
    draft,
    routeWorkflowId,
    persistDraft,
    currentWorkflowIdRef,
  });

  const runReadiness = useMemo(() => validateWorkflowDraft(draft), [draft]);

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

  const enabledScheduleCount = useMemo(
    () => draft.schedules.filter((schedule) => schedule.enabled).length,
    [draft.schedules],
  );
  const selectedHistoryCount = historySelection.length;

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsNarrow(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      setAuthBlocked(false);
      resetRunStateForRoute();
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
          resetPersistenceForWorkflow(next.workflowId, JSON.stringify(formatWorkflowDraftForApi(next)));
          void refreshRunHistory(record.id);
        } else {
          const tools = await loadToolsOnly();
          if (cancelled) return;
          setToolLibrary(tools);
          setDraft(getEmptyWorkflowDraft());
          setSelectedScheduleId(null);
          resetPersistenceForWorkflow(undefined, "");
          resetRunStateForRoute();
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
  }, [routeWorkflowId, refreshRunHistory, resetPersistenceForWorkflow, resetRunStateForRoute]);

  useEffect(() => {
    didInitialCanvasViewRef.current = false;
  }, [routeWorkflowId]);

  const handleLoadHistoryRun = useCallback(
    async (runId: string) => {
      await loadHistoryRun(runId);
      setHistoryOpen(true);
    },
    [loadHistoryRun],
  );

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
  }, [hydrated, draft.steps.length, routeWorkflowId, stepCardHeights, setView, viewportRef]);

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
    return <WorkflowsStudioLoadingGate />;
  }

  if (authBlocked) {
    return <WorkflowsStudioAuthBlockedGate />;
  }

  if (loadError && !loading) {
    return <WorkflowsStudioLoadErrorGate loadError={loadError} />;
  }

  return (
    <div className="flex min-h-screen flex-col" style={workflowShellBgStyle()}>
      <div className="flex min-h-0 flex-1 flex-col bg-white/80 backdrop-blur-[2px]">
        <WorkflowsStudioHeader
          draft={draft}
          setDraft={setDraft}
          descriptionOpen={descriptionOpen}
          setDescriptionOpen={setDescriptionOpen}
          headerMenuOpen={headerMenuOpen}
          handleHeaderMenuToggle={handleHeaderMenuToggle}
          saveState={saveState}
          saveMessage={saveMessage}
          lastSavedAt={lastSavedAt}
          saveStatusLabel={saveStatusLabel}
          setIntegrationsOpen={setIntegrationsOpen}
          handleOpenCreditsModal={handleOpenCreditsModal}
          creditsHoverTitle={creditsHoverTitle}
          playState={playState}
          cancelState={cancelState}
          activeManualRunId={activeManualRunId}
          runReadiness={runReadiness}
          handleStopRun={handleStopRun}
          handlePlay={handlePlay}
          persistDraft={persistDraft}
          persistValidation={persistValidation}
          scheduleOpen={scheduleOpen}
          setScheduleOpen={setScheduleOpen}
          scheduleAddOpen={scheduleAddOpen}
          createAndOpenSchedule={createAndOpenSchedule}
          historyOpen={historyOpen}
          setHistoryOpen={setHistoryOpen}
          runHistory={runHistory}
          headerPanelMaxHeight={headerPanelMaxHeight}
          enabledScheduleCount={enabledScheduleCount}
          selectedSchedule={selectedSchedule}
          openScheduleEditor={openScheduleEditor}
          setScheduleAddOpen={setScheduleAddOpen}
          updateSelectedSchedule={updateSelectedSchedule}
          timezoneOverrideOpenForScheduleId={timezoneOverrideOpenForScheduleId}
          setTimezoneOverrideOpenForScheduleId={setTimezoneOverrideOpenForScheduleId}
          setSelectedScheduleId={setSelectedScheduleId}
          scheduleSaving={scheduleSaving}
          handleScheduleSave={handleScheduleSave}
          historyLoading={historyLoading}
          historyError={historyError}
          historySelectedRunId={historySelectedRunId}
          historyDeleteMode={historyDeleteMode}
          historyDeleteState={historyDeleteState}
          selectedHistoryCount={selectedHistoryCount}
          historySelection={historySelection}
          refreshRunHistory={refreshRunHistory}
          setHistoryDeleteMode={setHistoryDeleteMode}
          setHistorySelection={setHistorySelection}
          handleDeleteHistoryRuns={handleDeleteHistoryRuns}
          toggleHistorySelection={toggleHistorySelection}
          handleLoadHistoryRun={handleLoadHistoryRun}
        />

        <WorkflowsStudioCanvas
          viewportRef={viewportRef}
          draft={draft}
          setDraft={setDraft}
          view={view}
          spacePanHeld={spacePanHeld}
          handleViewportPointerDown={handleViewportPointerDown}
          handleViewportPointerMove={handleViewportPointerMove}
          handleViewportPointerUp={handleViewportPointerUp}
          handleViewportMouseEnter={handleViewportMouseEnter}
          handleViewportMouseLeave={handleViewportMouseLeave}
          handleZoomStep={handleZoomStep}
          handleCanvasBackgroundPointerDown={handleCanvasBackgroundPointerDown}
          handleBundleCornerPointerDown={handleBundleCornerPointerDown}
          handleCardPointerDown={handleCardPointerDown}
          stepCardElementsRef={stepCardElementsRef}
          worldSize={worldSize}
          allStepsTopLeft={allStepsTopLeft}
          isNarrow={isNarrow}
          connectorOrientation={connectorOrientation}
          stepCardHeights={stepCardHeights}
          tailAppendGeometry={tailAppendGeometry}
          playState={playState}
          stepExecutionByStepId={stepExecutionByStepId}
          addModalOpen={addModalOpen}
          openAddModal={openAddModal}
          toolLibrary={toolLibrary}
          resolveStepLabelForCard={resolveStepLabelForCard}
          setMenu={setMenu}
          setConfigStepId={setConfigStepId}
        />
      </div>

      {menu && (
        <WorkflowsStudioStepMenuPanel
          menu={menu}
          menuRef={menuRef}
          setMenu={setMenu}
          setConfigStepId={setConfigStepId}
          moveStep={moveStep}
          removeStep={removeStep}
        />
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

      {FEATURE_FLAGS.INTEGRATIONS && integrationsOpen ? (
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
