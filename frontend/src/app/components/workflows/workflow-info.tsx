/**
 * Central workflow UI: shared copy, dialog chrome (overlay / panel / accent bar), and info sections
 * (step dialog subtitles, canvas “Values” / “About this tool” panels).
 */
"use client";

import type { CSSProperties } from "react";
import React, { useState } from "react";
import { JsonSyntaxBlock } from "@/app/components/JsonSyntaxBlock";
import { cn } from "@/lib/utils";

const WORKFLOW_BG_URL = (process.env.NEXT_PUBLIC_WORKFLOW_BG_IMAGE ?? "").trim();

/** Outer page shell — matches workflow studio + list routes. */
export function workflowShellBgStyle(): CSSProperties {
  return WORKFLOW_BG_URL
    ? {
        backgroundImage: `url(${WORKFLOW_BG_URL})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: "var(--workflow-shell-gradient)" };
}

/**
 * Studio canvas “board”: dot grid on #f0f4f8, optional env background (see WorkflowsStudio).
 * Use for list views that should sit on the same surface as the editor canvas.
 */
export function workflowCanvasSurfaceStyle(): CSSProperties {
  /* Dot grid ~45% softer so long-form chat text stays primary (see chat typography PRD). */
  const dotGrid =
    "radial-gradient(circle, var(--workflow-canvas-dot) 1px, transparent 1px)";
  return WORKFLOW_BG_URL
    ? {
        backgroundColor: "var(--workflow-canvas-bg)",
        backgroundImage: `${dotGrid}, url(${WORKFLOW_BG_URL})`,
        backgroundSize: "22px 22px, cover",
        backgroundPosition: "0 0, center",
        backgroundRepeat: "repeat, no-repeat",
      }
    : {
        backgroundColor: "var(--workflow-canvas-bg)",
        backgroundImage: dotGrid,
        backgroundSize: "22px 22px",
      };
}

/** Shared user-facing copy for workflow dialogs and canvas cards. */
export const WORKFLOW_INFO_COPY = {
  stepConfigDialogSubtitleLead: "Changes apply to this workflow as you type. Use",
  stepConfigDialogSubtitleDone: "Done",
  stepConfigDialogSubtitleTrail: "when you are finished.",
  addToolsDialogSubtitle:
    "Search or filter by category, then pick a tool. It is added where you opened this dialog.",
  valuesHeading: "Values",
  aboutToolHeading: "About this tool",
  aboutToolExamplesHeading: "Example uses",
  aboutToolTitle: "About this tool",
  aboutToolAriaShow: "About this tool",
  aboutToolAriaHide: "Hide tool description",
  noApiDescription: "No API description for this tool.",
} as const;

/** Teal → emerald → deep slate — distinct from generic “AI purple”. */
export const workflowAccentBarClass =
  "h-1 w-full shrink-0 bg-gradient-to-r from-teal-600 via-emerald-700/95 to-slate-800";

export const workflowModalOverlayClass =
  "fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-[3px] sm:p-4";

/** Step configure dialog: strong scrim so canvas chrome (hooks, edges) does not read through. */
export const workflowModalOverlayClassConfig =
  "fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-2 backdrop-blur-[6px] sm:p-4";

/** Warmer, calmer panel for the step editor (pairs with `workflowModalOverlayClassConfig`). */
export const workflowModalPanelClassConfig =
  "relative isolate flex max-h-[min(90vh,920px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-stone-200/90 bg-gradient-to-b from-white via-stone-50/80 to-stone-100/50 shadow-[0_32px_72px_-16px_rgba(0,0,0,0.45)] ring-1 ring-stone-900/[0.06]";

export const workflowModalOverlayClassTools =
  "fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-2 backdrop-blur-[3px] sm:p-4";

export const workflowModalPanelClass =
  "relative isolate flex max-h-[min(90vh,920px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-300/60 bg-gradient-to-b from-white to-slate-50/90 shadow-[0_24px_56px_-12px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/[0.04]";

export const workflowModalPanelClassWide =
  "relative isolate flex max-h-[min(85vh,900px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-300/60 bg-gradient-to-b from-white to-slate-50/90 shadow-[0_24px_56px_-12px_rgba(15,23,42,0.2)] ring-1 ring-slate-900/[0.04]";

const dialogSubtitleClass = "mt-1 text-xs leading-relaxed text-slate-600";

const sectionHeadingClass =
  "text-[10px] font-semibold uppercase tracking-wide text-teal-900/55";

const valuesSurfaceClass =
  "border-b border-teal-900/[0.06] bg-gradient-to-b from-slate-50/95 via-white to-slate-50/40 px-3 py-2.5";

export function WorkflowAccentBar() {
  return <div className={workflowAccentBarClass} aria-hidden />;
}

/** `aria-describedby` target for the step editor dialog. */
export function WorkflowStepConfigDialogSubtitle({ id }: { id: string }) {
  return (
    <p id={id} className="mt-1 text-[11px] leading-snug text-slate-600">
      {WORKFLOW_INFO_COPY.stepConfigDialogSubtitleLead}{" "}
      <span className="font-medium text-slate-600">{WORKFLOW_INFO_COPY.stepConfigDialogSubtitleDone}</span>{" "}
      {WORKFLOW_INFO_COPY.stepConfigDialogSubtitleTrail}
    </p>
  );
}

/** `aria-describedby` target for the add-tools dialog. */
export function WorkflowAddToolsDialogSubtitle({ id }: { id: string }) {
  return (
    <p id={id} className={dialogSubtitleClass}>
      {WORKFLOW_INFO_COPY.addToolsDialogSubtitle}
    </p>
  );
}

export function WorkflowSectionHeading({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={cn(sectionHeadingClass, className)}>{children}</p>;
}

export function WorkflowValuesPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn(valuesSurfaceClass, className)}>
      <WorkflowSectionHeading className="mb-2">{WORKFLOW_INFO_COPY.valuesHeading}</WorkflowSectionHeading>
      {children}
    </div>
  );
}

type WorkflowAboutToolTab = "about" | "chaining" | "structure";

export function WorkflowAboutToolPanel({
  body,
  examples,
  returnShapeSummary,
  chainingPaths,
  exampleJson,
  resultJsonSchema,
  className,
}: {
  body: string;
  examples?: string[];
  /** Success payload description (same as tool catalog `summary`). */
  returnShapeSummary?: string;
  /** Suggested `{{ last.<path> }}` / `{{ steps.id.result.<path> }}` segments. */
  chainingPaths?: string[];
  /** Pretty example of JSON result (full sample in Chaining tab). */
  exampleJson?: string;
  /** Declared JSON Schema for a successful tool result (when provided by the API). */
  resultJsonSchema?: Record<string, unknown> | null;
  className?: string;
}) {
  const [activeTab, setActiveTab] = useState<WorkflowAboutToolTab>("about");
  const normalizedExamples = (examples ?? []).map((item) => item.trim()).filter(Boolean);
  const paths = (chainingPaths ?? []).filter((p) => p.trim().length > 0);
  const jsonPreview = exampleJson?.trim() ?? "";
  const hasChainingContent =
    Boolean(returnShapeSummary?.trim()) || paths.length > 0 || jsonPreview.length > 0;
  const hasSchema = resultJsonSchema != null && Object.keys(resultJsonSchema).length > 0;

  const tabBtn = (id: WorkflowAboutToolTab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={activeTab === id}
      className={cn(
        "rounded-md px-2 py-1 text-[10px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/35",
        activeTab === id
          ? "bg-white text-teal-950 shadow-sm ring-1 ring-teal-900/10"
          : "text-slate-600 hover:bg-white/80 hover:text-slate-900",
      )}
      onClick={() => setActiveTab(id)}
    >
      {label}
    </button>
  );

  return (
    <div
      className={cn(
        "border-t border-teal-900/[0.08] bg-gradient-to-b from-teal-50/50 to-white px-3 py-2.5",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-1" role="tablist" aria-label="Tool reference sections">
        {tabBtn("about", "About")}
        {tabBtn("chaining", "Chaining")}
        {tabBtn("structure", "Structure")}
      </div>

      {activeTab === "about" ? (
        <div role="tabpanel">
          <WorkflowSectionHeading className="mb-1">{WORKFLOW_INFO_COPY.aboutToolHeading}</WorkflowSectionHeading>
          <p className="text-[11px] leading-relaxed text-slate-700">{body}</p>
          {normalizedExamples.length > 0 ? (
            <div className="mt-2.5">
              <WorkflowSectionHeading className="mb-1">{WORKFLOW_INFO_COPY.aboutToolExamplesHeading}</WorkflowSectionHeading>
              <ul className="space-y-1 text-[11px] leading-relaxed text-slate-700">
                {normalizedExamples.map((example) => (
                  <li key={example} className="flex gap-1.5">
                    <span className="mt-[2px] shrink-0 text-teal-700">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "chaining" ? (
        <div role="tabpanel" className="space-y-2">
          <WorkflowSectionHeading className="mb-1">Return shape (chaining)</WorkflowSectionHeading>
          {!hasChainingContent ? (
            <p className="text-[11px] leading-relaxed text-slate-600">
              No chaining hints are available for this tool yet. Use{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">{"{{ last }}"}</code> or{" "}
              <code className="rounded bg-slate-100 px-1 font-mono text-[10px]">{"{{ steps.<id>.result }}"}</code>{" "}
              to pass the full prior result.
            </p>
          ) : null}
          {returnShapeSummary?.trim() ? (
            <p className="text-[11px] leading-relaxed text-slate-700">{returnShapeSummary.trim()}</p>
          ) : null}
          {paths.length > 0 ? (
            <p className="text-[10px] leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">Paths:</span>{" "}
              <span className="font-mono text-[9px] text-teal-900 [overflow-wrap:anywhere]">{paths.join(", ")}</span>
            </p>
          ) : null}
          {jsonPreview ? (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-teal-900/55">Example JSON</p>
              <JsonSyntaxBlock
                value={jsonPreview}
                preClassName="workflow-scroll-light max-h-40 border-slate-200/80"
                codeClassName="text-[10px] leading-snug"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "structure" ? (
        <div role="tabpanel" className="space-y-2">
          <WorkflowSectionHeading className="mb-1">Response JSON Schema</WorkflowSectionHeading>
          {hasSchema ? (
            <JsonSyntaxBlock
              value={resultJsonSchema}
              preClassName="workflow-scroll-light max-h-48 border-slate-200/80"
              codeClassName="text-[10px] leading-snug"
            />
          ) : (
            <p className="text-[11px] leading-relaxed text-slate-600">
              No formal JSON Schema is published for this tool&apos;s response. Check the{" "}
              <span className="font-medium text-slate-800">Chaining</span> tab for a text summary and example payload, or inspect
              raw output after a run.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
