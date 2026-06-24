"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { JsonOrPlainTextBlock } from "@/app/components/JsonSyntaxBlock";
import { BrandLogo } from "@/app/components/BrandLogo";
import { Button } from "@/app/components/ui/button";
import {
  createResultToken,
  formatWorkflowToolOutputForDisplay,
  friendlyToolName,
  listBindablePaths,
  removeValueAtPath,
  setValueAtPath,
  workflowStepRunStatusLabel,
  type WorkflowDraft,
  type WorkflowStepDraft,
  type WorkflowStepExecutionInfo,
  type WorkflowTool,
} from "./workflowsUtils";
import { getChainingPathsForWorkflowTool } from "./workflowChainingPaths.utils";
import { WorkflowDynamicValueInserter } from "./WorkflowDynamicValueInserter";
import { findResultLinkFromArgs, WorkflowSchemaEditor } from "./WorkflowSchemaForm";
import {
  WORKFLOW_INFO_COPY,
  WorkflowAboutToolPanel,
  workflowModalOverlayClassConfig,
  workflowModalPanelClassConfig,
} from "./workflow-info";

type WorkflowStepConfigModalProps = {
  isOpen: boolean;
  onClose: () => void;
  draft: WorkflowDraft;
  stepLocalId: string | null;
  toolLibrary: WorkflowTool[];
  onSave: (next: WorkflowDraft) => void;
  /** Latest run snapshot for this step (from canvas execution state). */
  execution?: WorkflowStepExecutionInfo;
};

type ConfigModalTab = "configure" | "response" | "lastRun";

function workflowStepConfigActiveTabId(tab: ConfigModalTab): string {
  if (tab === "configure") return "workflow-step-config-tab-configure";
  if (tab === "response") return "workflow-step-config-tab-response";
  return "workflow-step-config-tab-last-run";
}

function WorkflowStepConfigLastRunPanel({ execution }: { execution?: WorkflowStepExecutionInfo }) {
  const err = execution?.error?.trim() ?? "";
  const result = execution?.result?.trim() ?? "";
  const displayErr = useMemo(() => (err ? formatWorkflowToolOutputForDisplay(err) : ""), [err]);
  const displayResult = useMemo(() => (result ? formatWorkflowToolOutputForDisplay(result) : ""), [result]);

  if (!execution) {
    return (
      <p className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">
        Run the workflow once to capture this step&apos;s result or error here.
      </p>
    );
  }

  const showError = execution.status === "failed" || err.length > 0;
  const showResult = result.length > 0 && execution.status !== "failed";
  const statusLabel = workflowStepRunStatusLabel(execution.status);

  const idleHint =
    execution.status === "pending"
      ? "This step has not run yet."
      : execution.status === "running"
        ? "This step is running…"
        : execution.status === "skipped"
          ? "This step was skipped."
          : execution.status === "completed" && !showResult && !showError
            ? "No output was recorded for this run."
            : null;

  return (
    <div className="space-y-4">
      <p className="text-[11px] text-stone-600">
        Status:{" "}
        <span className="font-semibold text-stone-800">{statusLabel}</span>
      </p>

      {showError ? (
        <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-rose-800">Error</p>
          <div className="workflow-scroll-light mt-1 max-h-[min(50vh,280px)] overflow-y-auto">
            {err ? (
              <JsonOrPlainTextBlock
                text={displayErr}
                preClassName="max-h-none border-rose-200/80 bg-white/95 text-rose-950"
                codeClassName="text-[11px] text-rose-950"
              />
            ) : (
              <p className="text-[11px] text-rose-950">No error message was returned.</p>
            )}
          </div>
        </div>
      ) : null}

      {showResult ? (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-600">Result</p>
          <div className="workflow-scroll-light mt-1 max-h-[min(50vh,280px)] overflow-y-auto">
            <JsonOrPlainTextBlock
              text={displayResult}
              preClassName="max-h-none border-slate-200/80 bg-white/95 text-slate-800"
              codeClassName="text-[11px] text-slate-800"
            />
          </div>
        </div>
      ) : null}

      {!showError && !showResult && idleHint ? (
        <p className="rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-xs leading-relaxed text-slate-600">{idleHint}</p>
      ) : null}
    </div>
  );
}

export function WorkflowStepConfigModal({
  isOpen,
  onClose,
  draft,
  stepLocalId,
  toolLibrary,
  onSave,
  execution,
}: WorkflowStepConfigModalProps) {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<ConfigModalTab>("configure");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) setActiveTab("configure");
  }, [isOpen, stepLocalId]);

  const step = useMemo(
    () => (stepLocalId ? draft.steps.find((s) => s.localId === stepLocalId) ?? null : null),
    [draft.steps, stepLocalId],
  );

  const stepTool = useMemo(
    () => (step ? toolLibrary.find((t) => t.function.name === step.toolName) : undefined),
    [step, toolLibrary],
  );

  const previousSteps = useMemo(() => {
    if (!step) return [];
    const idx = draft.steps.findIndex((s) => s.localId === step.localId);
    return idx >= 0 ? draft.steps.slice(0, idx) : [];
  }, [draft.steps, step]);

  const bindablePaths = useMemo(
    () => (stepTool ? listBindablePaths(stepTool.function.parameters) : []),
    [stepTool],
  );

  const jsonTextareaRef = useRef<HTMLTextAreaElement>(null);

  const updateStep = useCallback(
    (updater: (s: WorkflowStepDraft, all: WorkflowStepDraft[]) => WorkflowStepDraft) => {
      if (!stepLocalId) return;
      onSave({
        ...draft,
        steps: draft.steps.map((s) => (s.localId === stepLocalId ? updater(s, draft.steps) : s)),
      });
    },
    [draft, onSave, stepLocalId],
  );

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, handleClose]);

  if (!mounted || !isOpen || !step) return null;

  const content = (
    <div
      className={workflowModalOverlayClassConfig}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workflow-step-config-title"
      aria-describedby="workflow-step-config-desc"
      onClick={handleClose}
    >
      <div className={workflowModalPanelClassConfig} onClick={(e) => e.stopPropagation()}>
        <h2 id="workflow-step-config-title" className="sr-only">
          Configure step
        </h2>
        <p id="workflow-step-config-desc" className="sr-only">
          Edit tool fields for this step. Use the Response tab for return shape, example JSON, and response schema.
          Changes apply as you type.
        </p>
        <div className="flex shrink-0 items-center gap-3 border-b border-stone-200/80 bg-gradient-to-r from-white via-stone-50/90 to-white px-3 py-3 sm:px-4">
          <BrandLogo size="compact" asStatic className="min-w-0 shrink [&_span]:sr-only" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold tracking-tight text-stone-800">
              {stepTool ? friendlyToolName(stepTool.function.name) : friendlyToolName(step.toolName)}
            </p>
            <p className="truncate text-[11px] text-stone-500">{step.toolName}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-stone-500 transition hover:bg-stone-100 hover:text-stone-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
            onClick={handleClose}
            title="Close"
          >
            <X className="h-5 w-5" aria-hidden />
            <span className="sr-only">Close</span>
          </button>
        </div>

        <div
          className="flex shrink-0 gap-1 border-b border-stone-200/80 bg-stone-50/40 px-2 py-1.5 sm:px-3"
          role="tablist"
          aria-label="Configure step sections"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "configure"}
            id="workflow-step-config-tab-configure"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
              activeTab === "configure"
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/90"
                : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
            }`}
            onClick={() => setActiveTab("configure")}
          >
            Configure
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "response"}
            id="workflow-step-config-tab-response"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
              activeTab === "response"
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/90"
                : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
            }`}
            onClick={() => setActiveTab("response")}
          >
            Response
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "lastRun"}
            id="workflow-step-config-tab-last-run"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 ${
              activeTab === "lastRun"
                ? "bg-white text-stone-900 shadow-sm ring-1 ring-stone-200/90"
                : "text-stone-600 hover:bg-white/70 hover:text-stone-900"
            }`}
            onClick={() => setActiveTab("lastRun")}
          >
            Last run
          </button>
        </div>

        <div
          role="tabpanel"
          id="workflow-step-config-tabpanel"
          aria-labelledby={workflowStepConfigActiveTabId(activeTab)}
          className="workflow-scroll-light min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-stone-50/90 via-white to-stone-50/50 px-3.5 py-4 sm:px-4"
        >
          {activeTab === "lastRun" ? (
            <WorkflowStepConfigLastRunPanel execution={execution} />
          ) : activeTab === "response" ? (
            <div className="space-y-3">
              {!stepTool ? (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950/90">
                  This step has no tool metadata. Remove it from the canvas and add a tool again.
                </p>
              ) : (
                <WorkflowAboutToolPanel
                  body={
                    stepTool.workflowDescription?.trim() ||
                    stepTool.function.description?.trim() ||
                    WORKFLOW_INFO_COPY.noApiDescription
                  }
                  examples={stepTool.workflowExamples ?? []}
                  returnShapeSummary={stepTool.workflowToolResponse?.summary}
                  chainingPaths={getChainingPathsForWorkflowTool(stepTool)}
                  exampleJson={stepTool.workflowToolResponse?.exampleJson}
                  resultJsonSchema={stepTool.workflowToolResponse?.resultJsonSchema ?? null}
                  className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/80 to-white shadow-sm"
                />
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {!stepTool ? (
                <p className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-xs leading-relaxed text-amber-950/90">
                  This step has no tool metadata. Remove it from the canvas and add a tool again.
                </p>
              ) : null}

              {stepTool && (
                <>
                  <WorkflowSchemaEditor
                    schema={stepTool.function.parameters}
                    value={step.args}
                    onChange={(nextArgs) => updateStep((current) => ({ ...current, args: nextArgs }))}
                    previousSteps={previousSteps}
                    toolLibrary={toolLibrary}
                    resultLink={step.resultLink}
                    bindablePaths={bindablePaths}
                    onResultLinkChange={(nextLink) =>
                      updateStep((current) => {
                        const cleanedArgs =
                          current.resultLink?.targetPath ? removeValueAtPath(current.args, current.resultLink.targetPath) : current.args;
                        const nextArgs =
                          nextLink?.sourceStepId && nextLink.targetPath
                            ? setValueAtPath(cleanedArgs, nextLink.targetPath, createResultToken(nextLink.sourceStepId))
                            : cleanedArgs;
                        return {
                          ...current,
                          args: nextArgs,
                          resultLink: nextLink,
                        };
                      })
                    }
                  />

                  <details className="group rounded-xl border border-dashed border-slate-200/90 bg-slate-50/50">
                    <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[11px] text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-800 [&::-webkit-details-marker]:hidden">
                      <span className="font-mono text-[10px] tracking-tight text-slate-500 group-open:text-slate-700">
                        {"{…}"}
                      </span>
                      <span className="ml-1.5 font-medium">Args as JSON</span>
                      <span className="ml-1.5 text-[10px] font-normal text-slate-400">advanced</span>
                    </summary>
                    <div className="border-t border-slate-200/80 px-3 pb-3 pt-2">
                      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 text-[10px] leading-relaxed text-slate-500">
                          Raw JSON only when needed. Invalid JSON is ignored until it parses. You can insert{" "}
                          <code className="rounded bg-slate-100 px-1 font-mono text-[9px] text-slate-700">{"{{ last }}"}</code> or{" "}
                          <code className="rounded bg-slate-100 px-1 font-mono text-[9px] text-slate-700">{"{{steps.<id>.result}}"}</code>{" "}
                          at the caret.
                        </p>
                        <WorkflowDynamicValueInserter
                          compact
                          className="shrink-0"
                          inputRef={jsonTextareaRef}
                          value={JSON.stringify(step.args, null, 2)}
                          toolLibrary={toolLibrary}
                          onInsert={(next) => {
                            try {
                              const parsed = JSON.parse(next) as Record<string, unknown>;
                              updateStep((current) => ({
                                ...current,
                                args: parsed,
                                resultLink: findResultLinkFromArgs(parsed),
                              }));
                            } catch {
                              /* invalid */
                            }
                          }}
                          previousSteps={previousSteps}
                        />
                      </div>
                      <textarea
                        ref={jsonTextareaRef}
                        value={JSON.stringify(step.args, null, 2)}
                        onChange={(e) => {
                          try {
                            const parsed = JSON.parse(e.target.value) as Record<string, unknown>;
                            updateStep((current) => ({
                              ...current,
                              args: parsed,
                              resultLink: findResultLinkFromArgs(parsed),
                            }));
                          } catch {
                            /* invalid */
                          }
                        }}
                        spellCheck={false}
                        aria-label="Step arguments as JSON"
                        className="block min-h-[140px] w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 font-mono text-[11px] leading-relaxed text-slate-800 shadow-[inset_0_1px_2px_rgba(15,23,42,0.06)] outline-none focus:border-sky-400/80 focus:ring-2 focus:ring-sky-500/25"
                      />
                    </div>
                  </details>
                </>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-stone-200/80 bg-stone-100/40 px-3.5 py-3 sm:px-4">
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-stone-700 bg-stone-900 text-sm font-medium text-white shadow-md hover:bg-stone-800 hover:text-white focus-visible:ring-teal-500/45"
            onClick={handleClose}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(content as any, document.body);
}
