import React, { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Loader2,
  MoreHorizontal,
  SkipForward,
} from "lucide-react";
import {
  categorizeTool,
  friendlyToolName,
  summarizeWorkflowStepArgsForDisplay,
  workflowStepRunStatusLabel,
  type WorkflowStepDraft,
  type WorkflowStepExecutionInfo,
  type WorkflowTool,
} from "./workflowsUtils";
import { themeForWorkflowCategory } from "./workflow-studio.theme";
import {
  WORKFLOW_INFO_COPY,
  WorkflowAboutToolPanel,
  WorkflowValuesPanel,
} from "./workflow-info";
import { WorkflowSuiteInfoIcon } from "./WorkflowSuiteInfoIcon";
import { WorkflowToolIcon } from "./WorkflowToolIcon";
import { getChainingPathsForWorkflowTool } from "./workflowChainingPaths.utils";
import { WorkflowStepExecutionOutput } from "./WorkflowStepExecutionOutput";

/** Canvas step card: header + values summary; info icon toggles API description only. */
export function WorkflowStepChatCard({
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
        className="my-0 w-full overflow-hidden rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/40 shadow-[0_10px_32px_-14px_rgba(15,23,42,0.22)] ring-1 ring-slate-900/[0.04] transition hover:shadow-[0_14px_36px_-12px_rgba(15,23,42,0.28)] dark:border-slate-800/90 dark:from-[#18191c] dark:to-[#141518] dark:shadow-[0_10px_32px_-14px_rgba(0,0,0,0.6)] dark:ring-0"
        title="Double-click the title to rename; double-click values to configure"
      >
        <div className="flex items-center gap-2 border-b border-slate-200/70 bg-white/95 px-2.5 py-2 sm:px-3 dark:border-slate-800/80 dark:bg-[#1e2024]">
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
                className="w-full rounded-md border border-teal-400/80 bg-white px-1.5 py-0.5 text-sm font-semibold text-[var(--app-ink-800)] shadow-sm outline-none ring-2 ring-teal-500/25 dark:bg-slate-900 dark:text-slate-100"
                aria-label="Step label"
              />
            ) : (
              <>
                <p className="truncate text-sm font-semibold leading-tight text-[var(--app-ink-800)] dark:text-slate-100">{displayTitle}</p>
                <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-slate-400">{category}</p>
              </>
            )}
          </div>
          <span className="shrink-0 tabular-nums text-[10px] text-slate-500 dark:text-slate-400" title={`Step ${index + 1} of ${total}`}>
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
            className={`shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35 dark:hover:bg-teal-950/60 dark:hover:text-teal-200 ${aboutOpen ? "text-teal-800 dark:text-teal-300" : ""
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
            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35 dark:hover:bg-slate-800 dark:hover:text-slate-200"
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
            <ul className="divide-y divide-slate-200/70 text-[11px] leading-snug dark:divide-slate-800">
              {summaryLines.map((line, i) => (
                <li
                  key={`${line.label}-${i}`}
                  className="flex flex-col gap-1 py-2.5 first:pt-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3"
                >
                  <span className="shrink-0 font-medium text-teal-950/70 dark:text-slate-400">{line.label}</span>
                  <span className="min-w-0 tabular-nums text-slate-800 [overflow-wrap:anywhere] sm:text-right dark:text-slate-200">
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
