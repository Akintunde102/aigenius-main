import Link from "next/link";
import {
  ArrowLeft,
  Clock3,
  Coins,
  History,
  Info,
  Loader2,
  Play,
  Plug,
  Plus,
  Save,
  Square,
} from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type WorkflowDraft,
  type WorkflowScheduleDraft,
} from "./workflowsUtils";
import { type WorkflowRunListItem } from "./workflowsApi";
import { formatShortTime } from "./workflowsStudio.utils";
import { WorkflowsStudioSchedulePanels } from "./WorkflowsStudioSchedulePanels";
import { WorkflowsStudioHistoryPanel } from "./WorkflowsStudioHistoryPanel";

export type SaveState = "idle" | "saving" | "saved" | "error";

export type WorkflowsStudioHeaderProps = {
  draft: WorkflowDraft;
  setDraft: React.Dispatch<React.SetStateAction<WorkflowDraft>>;
  descriptionOpen: boolean;
  setDescriptionOpen: React.Dispatch<React.SetStateAction<boolean>>;
  headerMenuOpen: boolean;
  handleHeaderMenuToggle: () => void;
  saveState: SaveState;
  saveMessage: string;
  lastSavedAt: Date | null;
  saveStatusLabel: string;
  setIntegrationsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleOpenCreditsModal: () => void;
  creditsHoverTitle: string;
  playState: "idle" | "running";
  cancelState: "idle" | "cancelling";
  activeManualRunId: string | null;
  runReadiness: { isValid: boolean; issues: string[] };
  handleStopRun: () => void | Promise<void>;
  handlePlay: () => void | Promise<void>;
  persistDraft: (mode: "auto" | "manual") => void | Promise<unknown>;
  persistValidation: { isValid: boolean; issues: string[] };
  scheduleOpen: boolean;
  setScheduleOpen: React.Dispatch<React.SetStateAction<boolean>>;
  scheduleAddOpen: boolean;
  createAndOpenSchedule: () => void;
  historyOpen: boolean;
  setHistoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  runHistory: WorkflowRunListItem[];
  headerPanelMaxHeight: string;
  enabledScheduleCount: number;
  selectedSchedule: WorkflowScheduleDraft | null;
  openScheduleEditor: (scheduleId: string) => void;
  setScheduleAddOpen: React.Dispatch<React.SetStateAction<boolean>>;
  updateSelectedSchedule: (updater: (schedule: WorkflowScheduleDraft) => WorkflowScheduleDraft) => void;
  timezoneOverrideOpenForScheduleId: string | null;
  setTimezoneOverrideOpenForScheduleId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedScheduleId: React.Dispatch<React.SetStateAction<string | null>>;
  scheduleSaving: boolean;
  handleScheduleSave: () => void | Promise<void>;
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

export function WorkflowsStudioHeader(props: WorkflowsStudioHeaderProps) {
  const {
    draft,
    setDraft,
    descriptionOpen,
    setDescriptionOpen,
    headerMenuOpen,
    handleHeaderMenuToggle,
    saveState,
    saveMessage,
    lastSavedAt,
    saveStatusLabel,
    setIntegrationsOpen,
    handleOpenCreditsModal,
    creditsHoverTitle,
    playState,
    cancelState,
    activeManualRunId,
    runReadiness,
    handleStopRun,
    handlePlay,
    persistDraft,
    persistValidation,
    scheduleOpen,
    setScheduleOpen,
    scheduleAddOpen,
    createAndOpenSchedule,
    historyOpen,
    setHistoryOpen,
    runHistory,
    headerPanelMaxHeight,
    enabledScheduleCount,
    selectedSchedule,
    openScheduleEditor,
    setScheduleAddOpen,
    updateSelectedSchedule,
    timezoneOverrideOpenForScheduleId,
    setTimezoneOverrideOpenForScheduleId,
    setSelectedScheduleId,
    scheduleSaving,
    handleScheduleSave,
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
  } = props;

  return (
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDescriptionOpen((o) => !o);
          }}
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md p-0 transition ${descriptionOpen ? "bg-slate-200 text-teal-800 dark:bg-white/15 dark:text-cyan-300" : "text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-white/10 dark:hover:text-slate-100"
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
          className="h-6 min-w-0 flex-1 border-0 bg-transparent px-0.5 py-0 text-[12px] font-medium leading-none text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:ring-1 focus:ring-cyan-500/50 focus:ring-offset-0 rounded-sm dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="ml-auto flex shrink-0 items-center gap-1.5 pl-0.5 sm:gap-2">
          <span
            role="status"
            aria-live="polite"
            aria-relevant="text"
            className={cn(
              "min-w-[8.5rem] text-right text-[10px] leading-tight sm:min-w-[11rem]",
              saveState === "error" ? "text-amber-500 dark:text-amber-400/95" : "text-slate-500",
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
            className={`inline-flex h-7 shrink-0 items-center rounded-md border px-2.5 shadow-sm transition ${headerMenuOpen
                ? "border-cyan-500/60 bg-slate-100 text-cyan-800 dark:bg-slate-700/95 dark:text-cyan-200"
                : "border-slate-200/90 bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
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
            className="h-7 shrink-0 rounded-md border-slate-200/90 bg-slate-100/80 px-2 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white sm:px-2.5"
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
            className="h-7 shrink-0 rounded-md border-slate-200/90 bg-slate-100/80 px-2 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white sm:px-2.5"
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
                ? "border-rose-600 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-900 dark:border-rose-600/70 dark:bg-rose-950/40 dark:text-rose-100 dark:hover:bg-rose-900/60 dark:hover:text-white"
                : "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 dark:border-emerald-600/70 dark:bg-emerald-950/40 dark:text-emerald-100 dark:hover:bg-emerald-900/60 dark:hover:text-white"
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
            className="h-7 rounded-md border-slate-200/90 bg-slate-100/80 px-2.5 text-[11px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-200/80 hover:text-slate-900 dark:border-slate-600/90 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:bg-slate-700 dark:hover:text-white"
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
        <div id="workflow-header-menu-panel" className="border-t border-slate-200/90 bg-white/95 text-slate-800 backdrop-blur-md px-2.5 py-2 dark:border-slate-800/90 dark:bg-[#141416] dark:text-slate-200 sm:px-3">
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
                  className="w-full resize-y rounded border border-slate-200 bg-white px-2 py-1.5 text-[11px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-400 focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 dark:border-slate-600/80 dark:bg-slate-900/60 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-cyan-500/50 dark:focus:ring-cyan-500/30"
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
                          ? "border-teal-500/60 bg-teal-50 text-teal-900 font-semibold dark:border-cyan-500/60 dark:bg-cyan-500/10 dark:text-cyan-200"
                          : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
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
                          ? "border-teal-500/60 bg-teal-50 text-teal-900 font-semibold dark:border-cyan-500/60 dark:bg-cyan-500/10 dark:text-cyan-200"
                          : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/35 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
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
                        ? "border-teal-500/60 bg-teal-50 text-teal-900 font-semibold dark:border-cyan-500/60 dark:bg-cyan-500/10 dark:text-cyan-200"
                        : "border-slate-200/90 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700/80 dark:bg-slate-950/35 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-900/60"
                      }`}
                  >
                    <History className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    History
                    <sup className="ml-1 text-[8px] font-semibold leading-none">{Math.min(runHistory.length, 99)}</sup>
                  </button>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">

                      <WorkflowsStudioSchedulePanels
                        scheduleOpen={scheduleOpen}
                        scheduleAddOpen={scheduleAddOpen}
                        headerPanelMaxHeight={headerPanelMaxHeight}
                        draft={draft}
                        enabledScheduleCount={enabledScheduleCount}
                        selectedSchedule={selectedSchedule}
                        openScheduleEditor={openScheduleEditor}
                        setScheduleAddOpen={setScheduleAddOpen}
                        updateSelectedSchedule={updateSelectedSchedule}
                        timezoneOverrideOpenForScheduleId={timezoneOverrideOpenForScheduleId}
                        setTimezoneOverrideOpenForScheduleId={setTimezoneOverrideOpenForScheduleId}
                        setDraft={setDraft}
                        setSelectedScheduleId={setSelectedScheduleId}
                        scheduleSaving={scheduleSaving}
                        handleScheduleSave={handleScheduleSave}
                      />
                      <WorkflowsStudioHistoryPanel
                        historyOpen={historyOpen}
                        headerPanelMaxHeight={headerPanelMaxHeight}
                        draft={draft}
                        runHistory={runHistory}
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

                </div>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
